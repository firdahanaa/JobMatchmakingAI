-- =====================================================
-- Migrasi: Revisi Alur Status, Pengerjaan Proyek & Pembayaran
-- Tanggal: 2026-10-09
-- =====================================================

-- 1. Perluas tipe enum application_status jika nilai belum ada
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'application_status' AND e.enumlabel = 'submitted'
  ) THEN
    ALTER TYPE application_status ADD VALUE 'submitted';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'application_status' AND e.enumlabel = 'approved'
  ) THEN
    ALTER TYPE application_status ADD VALUE 'approved';
  END IF;
END $$;

-- 2. Buat enum payment_status jika belum ada
DO $$
BEGIN
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

-- 3. Tambahkan kolom payment_status & dokumentasi pengerjaan pada tabel applications
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS payment_status payment_status NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS submission_url text,
  ADD COLUMN IF NOT EXISTS submission_notes text,
  ADD COLUMN IF NOT EXISTS revision_notes text,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- 4. Indeks performa untuk query payment & status workflow
CREATE INDEX IF NOT EXISTS idx_applications_payment_status ON applications (payment_status);
CREATE INDEX IF NOT EXISTS idx_applications_workflow_status ON applications (status);
