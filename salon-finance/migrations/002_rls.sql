-- Role aplikasi + Row Level Security.
-- Semua query aplikasi memakai role salon_app dan setelan app.user_id.
-- Fungsi SECURITY DEFINER dimiliki postgres sehingga dapat membaca profil
-- tanpa rekursi kebijakan.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'salon_app') THEN
    CREATE ROLE salon_app LOGIN PASSWORD 'salon_app_local'
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
END
$$;

ALTER ROLE salon_app WITH LOGIN PASSWORD 'salon_app_local'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;

DO $$
BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO salon_app', current_database());
END
$$;
GRANT USAGE ON SCHEMA public TO salon_app;
GRANT SELECT, INSERT, UPDATE ON salon_branches TO salon_app;
GRANT SELECT, INSERT, UPDATE ON staff TO salon_app;
GRANT SELECT, INSERT, UPDATE ON treatments TO salon_app;
GRANT SELECT, INSERT, UPDATE ON profiles TO salon_app;
GRANT SELECT, INSERT, UPDATE ON transactions TO salon_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON transaction_payments TO salon_app;
GRANT SELECT, INSERT ON transaction_batches TO salon_app;
GRANT SELECT, INSERT ON audit_logs TO salon_app;
GRANT USAGE, SELECT ON SEQUENCE audit_logs_id_seq TO salon_app;

CREATE OR REPLACE FUNCTION app_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.user_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION app_is_authenticated()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = app_user_id() AND p.is_active
  )
$$;

CREATE OR REPLACE FUNCTION app_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = app_user_id() AND p.role = 'admin' AND p.is_active
  )
$$;

CREATE OR REPLACE FUNCTION app_branch_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.branch_id
  FROM profiles p
  WHERE p.id = app_user_id() AND p.role = 'staff' AND p.is_active
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION app_can_view_transaction(p_transaction_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM transactions t
    WHERE t.id = p_transaction_id
      AND t.deleted_at IS NULL
      AND (app_is_admin() OR t.branch_id = app_branch_id())
  )
$$;

CREATE OR REPLACE FUNCTION app_can_edit_transaction(p_transaction_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM transactions t
    WHERE t.id = p_transaction_id
      AND t.deleted_at IS NULL
      AND (
        app_is_admin()
        OR (t.entered_by = app_user_id() AND t.branch_id = app_branch_id())
      )
  )
$$;

CREATE OR REPLACE FUNCTION app_login(p_email text)
RETURNS TABLE (
  id uuid,
  email text,
  password_hash text,
  full_name text,
  role text,
  branch_id uuid,
  staff_id uuid,
  is_active boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.email, p.password_hash, p.full_name, p.role,
         p.branch_id, p.staff_id, p.is_active
  FROM profiles p
  WHERE lower(p.email) = lower(btrim(p_email))
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION app_login(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_login(text) TO salon_app;
GRANT EXECUTE ON FUNCTION app_user_id() TO salon_app;
GRANT EXECUTE ON FUNCTION app_is_authenticated() TO salon_app;
GRANT EXECUTE ON FUNCTION app_is_admin() TO salon_app;
GRANT EXECUTE ON FUNCTION app_branch_id() TO salon_app;
GRANT EXECUTE ON FUNCTION app_can_view_transaction(uuid) TO salon_app;
GRANT EXECUTE ON FUNCTION app_can_edit_transaction(uuid) TO salon_app;

ALTER TABLE salon_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE salon_branches FORCE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff FORCE ROW LEVEL SECURITY;
ALTER TABLE treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatments FORCE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions FORCE ROW LEVEL SECURITY;
ALTER TABLE transaction_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_payments FORCE ROW LEVEL SECURITY;
ALTER TABLE transaction_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_batches FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS branches_select ON salon_branches;
CREATE POLICY branches_select ON salon_branches
  FOR SELECT USING (app_is_admin() OR id = app_branch_id());
DROP POLICY IF EXISTS branches_insert ON salon_branches;
CREATE POLICY branches_insert ON salon_branches
  FOR INSERT WITH CHECK (app_is_admin());
DROP POLICY IF EXISTS branches_update ON salon_branches;
CREATE POLICY branches_update ON salon_branches
  FOR UPDATE USING (app_is_admin()) WITH CHECK (app_is_admin());

DROP POLICY IF EXISTS staff_select ON staff;
CREATE POLICY staff_select ON staff
  FOR SELECT USING (app_is_admin() OR branch_id = app_branch_id());
DROP POLICY IF EXISTS staff_insert ON staff;
CREATE POLICY staff_insert ON staff
  FOR INSERT WITH CHECK (app_is_admin());
DROP POLICY IF EXISTS staff_update ON staff;
CREATE POLICY staff_update ON staff
  FOR UPDATE USING (app_is_admin()) WITH CHECK (app_is_admin());

DROP POLICY IF EXISTS treatments_select ON treatments;
CREATE POLICY treatments_select ON treatments
  FOR SELECT USING (app_is_authenticated());
DROP POLICY IF EXISTS treatments_insert ON treatments;
CREATE POLICY treatments_insert ON treatments
  FOR INSERT WITH CHECK (app_is_admin());
DROP POLICY IF EXISTS treatments_update ON treatments;
CREATE POLICY treatments_update ON treatments
  FOR UPDATE USING (app_is_admin()) WITH CHECK (app_is_admin());

DROP POLICY IF EXISTS profiles_select ON profiles;
CREATE POLICY profiles_select ON profiles
  FOR SELECT USING (
    app_is_admin()
    OR id = app_user_id()
    OR (role = 'staff' AND branch_id = app_branch_id())
  );
DROP POLICY IF EXISTS profiles_insert ON profiles;
CREATE POLICY profiles_insert ON profiles
  FOR INSERT WITH CHECK (app_is_admin());
DROP POLICY IF EXISTS profiles_update ON profiles;
CREATE POLICY profiles_update ON profiles
  FOR UPDATE USING (app_is_admin()) WITH CHECK (app_is_admin());

DROP POLICY IF EXISTS batches_select ON transaction_batches;
CREATE POLICY batches_select ON transaction_batches
  FOR SELECT USING (app_is_admin() OR branch_id = app_branch_id());
DROP POLICY IF EXISTS batches_insert ON transaction_batches;
CREATE POLICY batches_insert ON transaction_batches
  FOR INSERT WITH CHECK (
    created_by = app_user_id()
    AND (app_is_admin() OR branch_id = app_branch_id())
  );

DROP POLICY IF EXISTS transactions_select ON transactions;
CREATE POLICY transactions_select ON transactions
  FOR SELECT USING (
    deleted_at IS NULL
    AND (app_is_admin() OR branch_id = app_branch_id())
  );
DROP POLICY IF EXISTS transactions_insert ON transactions;
CREATE POLICY transactions_insert ON transactions
  FOR INSERT WITH CHECK (
    entered_by = app_user_id()
    AND (app_is_admin() OR branch_id = app_branch_id())
  );
DROP POLICY IF EXISTS transactions_update ON transactions;
CREATE POLICY transactions_update ON transactions
  FOR UPDATE USING (
    deleted_at IS NULL
    AND (
      app_is_admin()
      OR (entered_by = app_user_id() AND branch_id = app_branch_id())
    )
  )
  WITH CHECK (
    app_is_admin()
    OR (entered_by = app_user_id() AND branch_id = app_branch_id())
  );

DROP POLICY IF EXISTS payments_select ON transaction_payments;
CREATE POLICY payments_select ON transaction_payments
  FOR SELECT USING (app_can_view_transaction(transaction_id));
DROP POLICY IF EXISTS payments_insert ON transaction_payments;
CREATE POLICY payments_insert ON transaction_payments
  FOR INSERT WITH CHECK (app_can_edit_transaction(transaction_id));
DROP POLICY IF EXISTS payments_update ON transaction_payments;
CREATE POLICY payments_update ON transaction_payments
  FOR UPDATE USING (app_can_edit_transaction(transaction_id))
  WITH CHECK (app_can_edit_transaction(transaction_id));
DROP POLICY IF EXISTS payments_delete ON transaction_payments;
CREATE POLICY payments_delete ON transaction_payments
  FOR DELETE USING (app_can_edit_transaction(transaction_id));

DROP POLICY IF EXISTS audit_select ON audit_logs;
CREATE POLICY audit_select ON audit_logs
  FOR SELECT USING (app_is_admin());
DROP POLICY IF EXISTS audit_insert ON audit_logs;
CREATE POLICY audit_insert ON audit_logs
  FOR INSERT WITH CHECK (actor_user_id = app_user_id());

-- Hak tambahan untuk tabel/sequence baru pada masa mendatang.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE ON TABLES TO salon_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO salon_app;
