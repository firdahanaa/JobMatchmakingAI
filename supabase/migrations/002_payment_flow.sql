-- ==============================================================================
-- Migrasi: 002_payment_flow.sql
-- Revisi Alur Pengerjaan Project, Pembayaran, Sertifikat & Lampiran Lamaran
-- ==============================================================================

-- 1. PERLUAS ENUM application_status & BUAT ENUM payment_status
DO $$
BEGIN
  -- Tambah 'submitted' ke application_status bila belum ada
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'application_status' AND e.enumlabel = 'submitted'
  ) THEN
    ALTER TYPE application_status ADD VALUE 'submitted';
  END IF;

  -- Tambah 'approved' ke application_status bila belum ada
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'application_status' AND e.enumlabel = 'approved'
  ) THEN
    ALTER TYPE application_status ADD VALUE 'approved';
  END IF;
END $$;

DO $$
BEGIN
  -- Buat enum payment_status jika belum ada
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'payment_status'
  ) THEN
    CREATE TYPE payment_status AS ENUM (
      'none',
      'not_requested',
      'awaiting_payment',
      'paid'
    );
  END IF;
END $$;


-- 2. MODIFIKASI TABEL projects
-- Tambah kolom payment_enabled dan portfolio_required
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS payment_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS portfolio_required boolean NOT NULL DEFAULT false;

-- Nominal yang sudah ada menandakan proyek berbayar; jangan mengarang nominal baru.
UPDATE projects
SET payment_enabled = true
WHERE reward_amount > 0;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM projects
    WHERE difficulty = 'advanced'
      AND (reward_amount IS NULL OR reward_amount <= 0)
  ) THEN
    RAISE EXCEPTION 'Advanced projects require a real fee. Set reward_amount or change difficulty before applying this migration.';
  END IF;
END $$;

UPDATE projects
SET payment_enabled = true
WHERE difficulty = 'advanced';

-- Tambahkan CHECK constraint:
-- - jika difficulty = 'advanced' maka payment_enabled = true dan reward_amount > 0
-- - jika payment_enabled = true maka reward_amount > 0
-- - jika payment_enabled = false maka reward_amount boleh 0 (atau null)
ALTER TABLE projects DROP CONSTRAINT IF EXISTS chk_projects_payment_rules;
ALTER TABLE projects ADD CONSTRAINT chk_projects_payment_rules CHECK (
  (difficulty != 'advanced' OR (payment_enabled = true AND reward_amount > 0))
  AND
  (payment_enabled = false OR (reward_amount IS NOT NULL AND reward_amount > 0))
  AND
  (payment_enabled = true OR (reward_amount IS NULL OR reward_amount = 0))
);


-- 3. MODIFIKASI TABEL applications
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS payment_status payment_status NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS cv_path text,
  ADD COLUMN IF NOT EXISTS portfolio_path text,
  ADD COLUMN IF NOT EXISTS related_links text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS submission_links text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS revision_note text,
  ADD COLUMN IF NOT EXISTS submission_url text,
  ADD COLUMN IF NOT EXISTS submission_notes text,
  ADD COLUMN IF NOT EXISTS revision_notes text,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Tambahkan CHECK constraint untuk membatasi maksimal 5 link
ALTER TABLE applications DROP CONSTRAINT IF EXISTS chk_applications_related_links_length;
ALTER TABLE applications ADD CONSTRAINT chk_applications_related_links_length CHECK (
  cardinality(related_links) <= 5
);

ALTER TABLE applications DROP CONSTRAINT IF EXISTS chk_applications_submission_links_length;
ALTER TABLE applications ADD CONSTRAINT chk_applications_submission_links_length CHECK (
  cardinality(submission_links) <= 5
);

CREATE INDEX IF NOT EXISTS idx_applications_payment_status ON applications (payment_status);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications (status);


-- 4. TABEL BARU: payments
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid UNIQUE NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'IDR',
  provider text,
  provider_order_id text UNIQUE,
  provider_ref text,
  redirect_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'expired', 'cancelled')),
  paid_at timestamptz,
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_application_id ON payments (application_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status);
CREATE INDEX IF NOT EXISTS idx_payments_provider_order_id ON payments (provider_order_id);

-- RLS: payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vendor dan Talent terkait boleh melihat payments" ON payments;
CREATE POLICY "Vendor dan Talent terkait boleh melihat payments"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM applications a
      JOIN projects p ON p.id = a.project_id
      WHERE a.id = payments.application_id
        AND (a.talent_id = auth.uid() OR p.vendor_id = auth.uid())
    )
  );
-- Catatan: INSERT dan UPDATE hanya diizinkan via server (service_role bypass RLS), tidak ada policy INSERT/UPDATE client.


-- 5. TABEL BARU: certificates
CREATE TABLE IF NOT EXISTS certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid UNIQUE NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  certificate_no text UNIQUE NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_certificates_application_id ON certificates (application_id);
CREATE INDEX IF NOT EXISTS idx_certificates_certificate_no ON certificates (certificate_no);

-- RLS: certificates
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Talent pemilik boleh melihat sertifikat" ON certificates;
CREATE POLICY "Talent pemilik boleh melihat sertifikat"
  ON certificates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM applications a
      WHERE a.id = certificates.application_id
        AND a.talent_id = auth.uid()
    )
  );
-- Catatan: Pembuatan sertifikat hanya lewat server (service_role).


-- 6. SUPABASE STORAGE BUCKET: application-docs
-- Bucket privat, maksimal 5 MB, hanya MIME type application/pdf
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'application-docs',
  'application-docs',
  false,
  5242880, -- 5 MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['application/pdf'];

-- RLS Storage Objects:
-- Struktur path: {talent_id}/{application_id}/cv.pdf atau portfolio.pdf
DROP POLICY IF EXISTS "Talent dapat mengunggah dokumen aplikasi miliknya" ON storage.objects;
CREATE POLICY "Talent dapat mengunggah dokumen aplikasi miliknya"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'application-docs'
    AND (auth.uid())::text = (storage.foldername(name))[1]
    AND cardinality(storage.foldername(name)) = 2
    AND split_part(name, '/', 3) IN ('cv.pdf', 'portfolio.pdf')
    AND EXISTS (
      SELECT 1 FROM applications a
      WHERE a.id::text = (storage.foldername(name))[2]
        AND a.talent_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Talent dapat memperbarui dokumen aplikasi miliknya" ON storage.objects;
CREATE POLICY "Talent dapat memperbarui dokumen aplikasi miliknya"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'application-docs'
    AND (auth.uid())::text = (storage.foldername(name))[1]
    AND cardinality(storage.foldername(name)) = 2
    AND split_part(name, '/', 3) IN ('cv.pdf', 'portfolio.pdf')
    AND EXISTS (
      SELECT 1 FROM applications a
      WHERE a.id::text = (storage.foldername(name))[2]
        AND a.talent_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'application-docs'
    AND (auth.uid())::text = (storage.foldername(name))[1]
    AND cardinality(storage.foldername(name)) = 2
    AND split_part(name, '/', 3) IN ('cv.pdf', 'portfolio.pdf')
    AND EXISTS (
      SELECT 1 FROM applications a
      WHERE a.id::text = (storage.foldername(name))[2]
        AND a.talent_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Talent dapat menghapus dokumen aplikasi miliknya" ON storage.objects;
CREATE POLICY "Talent dapat menghapus dokumen aplikasi miliknya"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'application-docs'
    AND (auth.uid())::text = (storage.foldername(name))[1]
    AND cardinality(storage.foldername(name)) = 2
    AND split_part(name, '/', 3) IN ('cv.pdf', 'portfolio.pdf')
    AND EXISTS (
      SELECT 1 FROM applications a
      WHERE a.id::text = (storage.foldername(name))[2]
        AND a.talent_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Talent dan Vendor pemilik proyek dapat membaca dokumen aplikasi" ON storage.objects;
CREATE POLICY "Talent dan Vendor pemilik proyek dapat membaca dokumen aplikasi"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'application-docs'
    AND cardinality(storage.foldername(name)) = 2
    AND split_part(name, '/', 3) IN ('cv.pdf', 'portfolio.pdf')
    AND (
      -- Talent pemilik aplikasi atau vendor pemilik proyek dapat membaca dokumen.
      EXISTS (
        SELECT 1 FROM applications a
        JOIN projects p ON p.id = a.project_id
        WHERE a.id::text = (storage.foldername(name))[2]
          AND a.talent_id::text = (storage.foldername(name))[1]
          AND (a.talent_id = auth.uid() OR p.vendor_id = auth.uid())
      )
    )
  );


-- 7. REVIEW INTEGRITY & VIEW TALENT_RATINGS
-- Pastikan reviews unik per application
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reviews_application_id_key'
  ) THEN
    ALTER TABLE reviews ADD CONSTRAINT reviews_application_id_key UNIQUE (application_id);
  END IF;
END $$;

-- Perbarui view talent_ratings
CREATE OR REPLACE VIEW talent_ratings AS
SELECT
  talent_id,
  ROUND(AVG(rating)::numeric, 2) AS avg_rating,
  COUNT(*) AS review_count
FROM reviews
GROUP BY talent_id;
