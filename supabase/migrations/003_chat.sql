-- ==============================================================================
-- Migrasi: 003_chat.sql
-- Fitur Chat Talent-Vendor (Percakapan, Pesan, Bacaan, Triggers, RPC, RLS)
-- ==============================================================================

-- 1. ENUM message_kind
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'message_kind'
  ) THEN
    CREATE TYPE message_kind AS ENUM ('text', 'system', 'contact', 'meeting');
  END IF;
END $$;

-- 2. TABEL conversations
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL UNIQUE REFERENCES applications(id) ON DELETE CASCADE,
  talent_id uuid NOT NULL REFERENCES talent_profiles(user_id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES vendor_profiles(user_id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  last_message_preview text
);

CREATE INDEX IF NOT EXISTS idx_conversations_talent_id ON conversations (talent_id);
CREATE INDEX IF NOT EXISTS idx_conversations_vendor_id ON conversations (vendor_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations (last_message_at DESC);

-- 3. TABEL messages
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  kind message_kind NOT NULL DEFAULT 'text',
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages (conversation_id, created_at DESC);

-- 4. TABEL conversation_reads
CREATE TABLE IF NOT EXISTS conversation_reads (
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_reads_user_id ON conversation_reads (user_id);

-- 5. TRIGGER: AUTO-CREATE CONVERSATION SETELAH INSERT applications
CREATE OR REPLACE FUNCTION handle_new_application_conversation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vendor_id uuid;
BEGIN
  -- Ambil vendor_id dari tabel projects pemilik project_id
  SELECT vendor_id INTO v_vendor_id
  FROM projects
  WHERE id = NEW.project_id;

  IF v_vendor_id IS NOT NULL THEN
    INSERT INTO conversations (
      application_id,
      talent_id,
      vendor_id,
      created_at,
      last_message_at,
      last_message_preview
    )
    VALUES (
      NEW.id,
      NEW.talent_id,
      v_vendor_id,
      COALESCE(NEW.created_at, now()),
      COALESCE(NEW.created_at, now()),
      NULL
    )
    ON CONFLICT (application_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_application_conversation ON applications;
CREATE TRIGGER trg_create_application_conversation
  AFTER INSERT ON applications
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_application_conversation();

-- 6. BACKFILL CONVERSATION UNTUK LAMARAN EKSISTING
INSERT INTO conversations (
  application_id,
  talent_id,
  vendor_id,
  created_at,
  last_message_at,
  last_message_preview
)
SELECT
  a.id AS application_id,
  a.talent_id,
  p.vendor_id,
  COALESCE(a.created_at, now()) AS created_at,
  COALESCE(a.created_at, now()) AS last_message_at,
  NULL AS last_message_preview
FROM applications a
JOIN projects p ON a.project_id = p.id
ON CONFLICT (application_id) DO NOTHING;

-- 7. TRIGGER: UPDATE conversations.last_message_at & last_message_preview SETELAH INSERT messages
CREATE OR REPLACE FUNCTION handle_new_message_last_preview()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE conversations
  SET
    last_message_at = NEW.created_at,
    last_message_preview = left(NEW.body, 80)
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_conversation_last_message ON messages;
CREATE TRIGGER trg_update_conversation_last_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_message_last_preview();

-- 8. FUNGSI RPC: get_unread_counts()
CREATE OR REPLACE FUNCTION get_unread_counts()
RETURNS TABLE (
  conversation_id uuid,
  unread_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  RETURN QUERY
  SELECT
    c.id AS conversation_id,
    COUNT(m.id)::bigint AS unread_count
  FROM conversations c
  JOIN messages m ON m.conversation_id = c.id
  LEFT JOIN conversation_reads cr
    ON cr.conversation_id = c.id
   AND cr.user_id = v_user_id
  WHERE (c.talent_id = v_user_id OR c.vendor_id = v_user_id)
    AND (m.sender_id IS NULL OR m.sender_id <> v_user_id)
    AND (cr.last_read_at IS NULL OR m.created_at > cr.last_read_at)
  GROUP BY c.id;
END;
$$;

-- 9. ROW LEVEL SECURITY (RLS)

-- A. conversations
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Peserta dapat melihat percakapannya" ON conversations;
CREATE POLICY "Peserta dapat melihat percakapannya"
  ON conversations
  FOR SELECT
  TO authenticated
  USING (
    talent_id = auth.uid() OR vendor_id = auth.uid()
  );

-- Tidak ada policy INSERT/UPDATE/DELETE dari client untuk conversations

-- B. messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Peserta dapat melihat pesan dalam percakapan" ON messages;
CREATE POLICY "Peserta dapat melihat pesan dalam percakapan"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND (c.talent_id = auth.uid() OR c.vendor_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Peserta dapat mengirim pesan ke percakapan aktif" ON messages;
CREATE POLICY "Peserta dapat mengirim pesan ke percakapan aktif"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND kind IN ('text', 'contact', 'meeting')
    AND EXISTS (
      SELECT 1
      FROM conversations c
      JOIN applications a ON a.id = c.application_id
      WHERE c.id = conversation_id
        AND (c.talent_id = auth.uid() OR c.vendor_id = auth.uid())
        AND a.status IN ('pending', 'accepted', 'submitted', 'approved')
    )
  );

-- Tidak ada policy UPDATE/DELETE dari client untuk messages

-- C. conversation_reads
ALTER TABLE conversation_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User dapat membaca status baca miliknya" ON conversation_reads;
CREATE POLICY "User dapat membaca status baca miliknya"
  ON conversation_reads
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
  );

DROP POLICY IF EXISTS "User dapat menambah status baca miliknya" ON conversation_reads;
CREATE POLICY "User dapat menambah status baca miliknya"
  ON conversation_reads
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
        AND (c.talent_id = auth.uid() OR c.vendor_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "User dapat memperbarui status baca miliknya" ON conversation_reads;
CREATE POLICY "User dapat memperbarui status baca miliknya"
  ON conversation_reads
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
  )
  WITH CHECK (
    user_id = auth.uid()
  );

-- 10. REALTIME PUBLICATION
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE messages;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
  WHEN undefined_object THEN
    NULL;
END $$;

-- 11. AKSES PROFIL LAWAN BICARA (RLS) & NORMALISASI NAMA
-- Memastikan kedua belah pihak dapat melihat nama & avatar lawan bicaranya di chat
DROP POLICY IF EXISTS "profiles: partisipan chat dapat melihat profil" ON profiles;
CREATE POLICY "profiles: partisipan chat dapat melihat profil"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE (c.talent_id = profiles.id AND c.vendor_id = auth.uid())
         OR (c.vendor_id = profiles.id AND c.talent_id = auth.uid())
    )
  );

-- Sinkronisasi nama profil yang masih kosong atau default 'Talenta'/'Talent' dari metadata registrasi
UPDATE profiles p
SET full_name = COALESCE(NULLIF(u.raw_user_meta_data->>'full_name', ''), p.full_name)
FROM auth.users u
WHERE p.id = u.id
  AND (p.full_name IS NULL OR p.full_name = '' OR lower(p.full_name) IN ('talenta', 'talent'))
  AND u.raw_user_meta_data->>'full_name' IS NOT NULL
  AND u.raw_user_meta_data->>'full_name' != '';

