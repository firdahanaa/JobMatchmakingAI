-- Normalize legacy certificate numbers to a non-sequential public format.
DO $$
DECLARE
  certificate_row record;
  generated_number text;
BEGIN
  FOR certificate_row IN
    SELECT id, issued_at
    FROM certificates
    WHERE certificate_no !~ '^CERT-[0-9]{4}-[A-F0-9]{6}$'
  LOOP
    LOOP
      generated_number := 'CERT-' || to_char(certificate_row.issued_at, 'YYYY') || '-' ||
        upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM certificates WHERE certificate_no = generated_number
      );
    END LOOP;

    UPDATE certificates
      SET certificate_no = generated_number
      WHERE id = certificate_row.id;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_or_create_application_certificate(p_application_id uuid)
RETURNS TABLE (
  certificate_no text,
  issued_at timestamptz,
  project_title text,
  talent_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status application_status;
  v_talent_id uuid;
  v_project_id uuid;
  v_certificate_no text;
BEGIN
  SELECT a.status, a.talent_id, a.project_id
    INTO v_status, v_talent_id, v_project_id
    FROM applications a
    WHERE a.id = p_application_id
    FOR UPDATE;

  IF NOT FOUND OR v_talent_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Application not found or not owned by current talent';
  END IF;

  IF v_status <> 'completed' OR NOT EXISTS (
    SELECT 1 FROM reviews r WHERE r.application_id = p_application_id
  ) THEN
    RAISE EXCEPTION 'Certificate requires a completed application with a vendor review';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM certificates c WHERE c.application_id = p_application_id
  ) THEN
    LOOP
      v_certificate_no := 'CERT-' || to_char(now(), 'YYYY') || '-' ||
        upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM certificates c WHERE c.certificate_no = v_certificate_no
      );
    END LOOP;

    INSERT INTO certificates (application_id, certificate_no)
      VALUES (p_application_id, v_certificate_no)
      ON CONFLICT (application_id) DO NOTHING;
  END IF;

  RETURN QUERY
    SELECT c.certificate_no, c.issued_at, p.title, profile.full_name
    FROM certificates c
    JOIN projects p ON p.id = v_project_id
    JOIN profiles profile ON profile.id = v_talent_id
    WHERE c.application_id = p_application_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_application_certificate(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_or_create_application_certificate(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.verify_certificate(p_certificate_no text)
RETURNS TABLE (
  certificate_no text,
  talent_name text,
  project_title text,
  vendor_name text,
  completed_at timestamptz,
  verification_status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.certificate_no,
         talent.full_name,
         p.title,
         vendor.organization_name,
         a.completed_at,
         'Terverifikasi'::text
  FROM certificates c
  JOIN applications a ON a.id = c.application_id
  JOIN projects p ON p.id = a.project_id
  JOIN profiles talent ON talent.id = a.talent_id
  JOIN vendor_profiles vendor ON vendor.user_id = p.vendor_id
  WHERE c.certificate_no = p_certificate_no
    AND a.status = 'completed'
    AND EXISTS (
      SELECT 1 FROM reviews r WHERE r.application_id = a.id
    );
$$;

REVOKE ALL ON FUNCTION public.verify_certificate(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_certificate(text) TO anon, authenticated;