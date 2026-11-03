-- Neraca Salon — skema inti
-- Nominal disimpan sebagai bigint rupiah (tanpa desimal).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS salon_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT salon_branches_name_not_empty CHECK (btrim(name) <> '')
);
CREATE UNIQUE INDEX IF NOT EXISTS salon_branches_name_unique
  ON salon_branches (lower(name));

CREATE TABLE IF NOT EXISTS staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES salon_branches(id) ON DELETE RESTRICT,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT staff_name_not_empty CHECK (btrim(name) <> '')
);
CREATE UNIQUE INDEX IF NOT EXISTS staff_branch_name_unique
  ON staff (branch_id, lower(name));
CREATE INDEX IF NOT EXISTS staff_branch_idx ON staff (branch_id);

CREATE TABLE IF NOT EXISTS treatments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT treatments_name_not_empty CHECK (btrim(name) <> '')
);
CREATE UNIQUE INDEX IF NOT EXISTS treatments_name_unique
  ON treatments (lower(name));

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  password_hash text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL,
  branch_id uuid REFERENCES salon_branches(id) ON DELETE RESTRICT,
  staff_id uuid REFERENCES staff(id) ON DELETE RESTRICT,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'staff')),
  CONSTRAINT profiles_staff_scope_check CHECK (
    (role = 'admin' AND branch_id IS NULL AND staff_id IS NULL)
    OR (role = 'staff' AND branch_id IS NOT NULL AND staff_id IS NOT NULL)
  ),
  CONSTRAINT profiles_full_name_not_empty CHECK (btrim(full_name) <> '')
);
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique ON profiles (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS profiles_staff_unique
  ON profiles (staff_id) WHERE staff_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS profiles_branch_idx ON profiles (branch_id);

CREATE TABLE IF NOT EXISTS transaction_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES salon_branches(id) ON DELETE RESTRICT,
  transaction_date date NOT NULL,
  expected_count integer NOT NULL CHECK (expected_count > 0),
  expected_total bigint NOT NULL CHECK (expected_total > 0),
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES salon_branches(id) ON DELETE RESTRICT,
  transaction_date date NOT NULL,
  staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
  treatment_id uuid NOT NULL REFERENCES treatments(id) ON DELETE RESTRICT,
  total_amount bigint NOT NULL,
  entered_by uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  notes text,
  is_demo boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT transactions_total_positive CHECK (total_amount > 0)
);
CREATE INDEX IF NOT EXISTS transactions_date_idx ON transactions (transaction_date DESC);
CREATE INDEX IF NOT EXISTS transactions_branch_date_idx
  ON transactions (branch_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS transactions_staff_idx ON transactions (staff_id);
CREATE INDEX IF NOT EXISTS transactions_treatment_idx ON transactions (treatment_id);
CREATE INDEX IF NOT EXISTS transactions_entered_by_idx ON transactions (entered_by);
CREATE INDEX IF NOT EXISTS transactions_active_idx
  ON transactions (transaction_date DESC) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS transaction_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  payment_method text NOT NULL,
  amount bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT transaction_payments_method_check
    CHECK (payment_method IN ('cash', 'qris', 'transfer')),
  CONSTRAINT transaction_payments_amount_positive CHECK (amount > 0)
);
CREATE INDEX IF NOT EXISTS transaction_payments_transaction_idx
  ON transaction_payments (transaction_id);
CREATE INDEX IF NOT EXISTS transaction_payments_method_idx
  ON transaction_payments (payment_method);

CREATE TABLE IF NOT EXISTS audit_logs (
  id bigserial PRIMARY KEY,
  actor_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id text NOT NULL,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_record_idx ON audit_logs (table_name, record_id);
