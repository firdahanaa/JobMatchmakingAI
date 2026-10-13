-- Complete a paid application and its project atomically after a verified webhook.
CREATE OR REPLACE FUNCTION public.complete_application_payment(
  p_payment_id uuid,
  p_provider_ref text,
  p_raw_payload jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_application_id uuid;
  v_project_id uuid;
  v_application_status application_status;
  v_payment_status payment_status;
  v_record_status text;
BEGIN
  SELECT application_id, status
    INTO v_application_id, v_record_status
    FROM payments
    WHERE id = p_payment_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment record not found';
  END IF;

  SELECT project_id, status, payment_status
    INTO v_project_id, v_application_status, v_payment_status
    FROM applications
    WHERE id = v_application_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  IF v_record_status = 'paid'
     AND v_application_status = 'completed'
     AND v_payment_status = 'paid' THEN
    RETURN;
  END IF;

  IF v_record_status <> 'pending'
     OR v_application_status <> 'approved'
     OR v_payment_status <> 'awaiting_payment' THEN
    RAISE EXCEPTION 'Payment or application is not awaiting settlement';
  END IF;

  UPDATE payments
    SET status = 'paid',
        provider_ref = NULLIF(p_provider_ref, ''),
        paid_at = now(),
        raw_payload = p_raw_payload
    WHERE id = p_payment_id;

  UPDATE applications
    SET status = 'completed',
        payment_status = 'paid',
        completed_at = now()
    WHERE id = v_application_id;

  UPDATE projects
    SET status = 'completed'
    WHERE id = v_project_id;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_application_payment(uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_application_payment(uuid, text, jsonb) TO service_role;

-- Vendors can prepare or retry their own payment through an authenticated RPC.
-- The single payment row is reused, but every new attempt receives a new order ID.
CREATE OR REPLACE FUNCTION public.prepare_application_payment(
  p_application_id uuid,
  p_order_id text,
  p_amount numeric,
  p_provider text
)
RETURNS TABLE (
  payment_id uuid,
  order_id text,
  redirect_url text,
  reused boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vendor_id uuid;
  v_reward_amount numeric;
  v_payment_enabled boolean;
  v_application_status application_status;
  v_application_payment_status payment_status;
  v_existing_payment payments%ROWTYPE;
  v_payment_id uuid;
BEGIN
  SELECT p.vendor_id, p.reward_amount, p.payment_enabled, a.status, a.payment_status
    INTO v_vendor_id, v_reward_amount, v_payment_enabled,
         v_application_status, v_application_payment_status
    FROM applications a
    JOIN projects p ON p.id = a.project_id
    WHERE a.id = p_application_id
    FOR UPDATE OF a, p;

  IF NOT FOUND OR v_vendor_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Application not found or not owned by current vendor';
  END IF;

  IF NOT v_payment_enabled
     OR v_reward_amount IS NULL
     OR v_reward_amount <= 0
     OR v_reward_amount <> p_amount THEN
    RAISE EXCEPTION 'Payment amount does not match project fee';
  END IF;

  IF v_application_status = 'submitted'
     AND v_application_payment_status = 'not_requested' THEN
    UPDATE applications
      SET status = 'approved',
          payment_status = 'awaiting_payment',
          approved_at = now()
      WHERE id = p_application_id;
  ELSIF v_application_status <> 'approved'
     OR v_application_payment_status <> 'awaiting_payment' THEN
    RAISE EXCEPTION 'Application is not awaiting payment';
  END IF;

  SELECT * INTO v_existing_payment
    FROM payments
    WHERE application_id = p_application_id
    FOR UPDATE;

  IF FOUND THEN
    IF v_existing_payment.status = 'paid' THEN
      RAISE EXCEPTION 'Payment is already paid';
    END IF;

    IF v_existing_payment.status = 'pending' THEN
      payment_id := v_existing_payment.id;
      order_id := v_existing_payment.provider_order_id;
      redirect_url := v_existing_payment.redirect_url;
      reused := v_existing_payment.redirect_url IS NOT NULL;
      IF reused THEN
        RETURN NEXT;
        RETURN;
      END IF;
      RETURN NEXT;
      RETURN;
    END IF;

    UPDATE payments
      SET amount = p_amount,
          provider = p_provider,
          provider_order_id = p_order_id,
          provider_ref = NULL,
          redirect_url = NULL,
          status = 'pending',
          paid_at = NULL,
          raw_payload = NULL
      WHERE id = v_existing_payment.id
      RETURNING id INTO v_payment_id;
  ELSE
    INSERT INTO payments (application_id, amount, currency, provider, provider_order_id, status)
      VALUES (p_application_id, p_amount, 'IDR', p_provider, p_order_id, 'pending')
      RETURNING id INTO v_payment_id;
  END IF;

  payment_id := v_payment_id;
  order_id := p_order_id;
  redirect_url := NULL;
  reused := false;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_application_payment_charge(
  p_application_id uuid,
  p_order_id text,
  p_provider_ref text,
  p_redirect_url text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE payments pay
    SET provider_ref = p_provider_ref,
        redirect_url = p_redirect_url,
        status = CASE
          WHEN pay.status = 'paid' THEN 'paid'
          WHEN p_redirect_url IS NULL THEN 'failed'
          ELSE 'pending'
        END
    FROM applications a
    JOIN projects p ON p.id = a.project_id
    WHERE pay.application_id = p_application_id
      AND pay.provider_order_id = p_order_id
      AND a.id = pay.application_id
      AND (
        (pay.status = 'pending' AND a.status = 'approved' AND a.payment_status = 'awaiting_payment')
        OR (pay.status = 'paid' AND a.status = 'completed' AND a.payment_status = 'paid')
      )
      AND p.vendor_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment order not found or not owned by current vendor';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.prepare_application_payment(uuid, text, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prepare_application_payment(uuid, text, numeric, text) TO authenticated;
REVOKE ALL ON FUNCTION public.save_application_payment_charge(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_application_payment_charge(uuid, text, text, text) TO authenticated;

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

  INSERT INTO certificates (application_id, certificate_no)
    VALUES (
      p_application_id,
      'PF-' || upper(replace(gen_random_uuid()::text, '-', ''))
    )
    ON CONFLICT (application_id) DO NOTHING;

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