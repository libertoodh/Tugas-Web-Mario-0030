-- Trigger integritas: validasi relasi, keseimbangan pembayaran, updated_at.

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_branches_updated_at ON salon_branches;
CREATE TRIGGER trg_branches_updated_at
  BEFORE UPDATE ON salon_branches
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_staff_updated_at ON staff;
CREATE TRIGGER trg_staff_updated_at
  BEFORE UPDATE ON staff
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_treatments_updated_at ON treatments;
CREATE TRIGGER trg_treatments_updated_at
  BEFORE UPDATE ON treatments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_transactions_updated_at ON transactions;
CREATE TRIGGER trg_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION validate_transaction_refs()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM staff s
    WHERE s.id = NEW.staff_id AND s.branch_id = NEW.branch_id
  ) THEN
    RAISE EXCEPTION 'Staff pelaksana tidak terdaftar pada cabang transaksi'
      USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NOT EXISTS (
      SELECT 1 FROM staff s
      WHERE s.id = NEW.staff_id AND s.is_active
    ) THEN
      RAISE EXCEPTION 'Staff pelaksana tidak aktif'
        USING ERRCODE = '23514';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM treatments t
      WHERE t.id = NEW.treatment_id AND t.is_active
    ) THEN
      RAISE EXCEPTION 'Treatment tidak aktif'
        USING ERRCODE = '23514';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM salon_branches b
      WHERE b.id = NEW.branch_id AND b.is_active
    ) THEN
      RAISE EXCEPTION 'Cabang tidak aktif'
        USING ERRCODE = '23514';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = NEW.entered_by AND p.is_active
    ) THEN
      RAISE EXCEPTION 'Petugas input tidak aktif'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_transactions_validate_refs ON transactions;
CREATE TRIGGER trg_transactions_validate_refs
  BEFORE INSERT OR UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION validate_transaction_refs();

CREATE OR REPLACE FUNCTION check_transaction_balance()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  tx_id uuid;
  tx_total bigint;
  paid bigint;
BEGIN
  IF TG_TABLE_NAME = 'transactions' THEN
    tx_id := NEW.id;
  ELSIF TG_OP = 'DELETE' THEN
    tx_id := OLD.transaction_id;
  ELSE
    tx_id := NEW.transaction_id;
  END IF;

  SELECT t.total_amount INTO tx_total
  FROM transactions t
  WHERE t.id = tx_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(SUM(p.amount), 0) INTO paid
  FROM transaction_payments p
  WHERE p.transaction_id = tx_id;

  IF paid <> tx_total THEN
    RAISE EXCEPTION 'Total alokasi pembayaran (%) tidak sama dengan total transaksi (%)', paid, tx_total
      USING ERRCODE = '23514';
  END IF;

  RETURN NULL;
END
$$;

DROP TRIGGER IF EXISTS trg_transactions_balance ON transactions;
CREATE CONSTRAINT TRIGGER trg_transactions_balance
  AFTER INSERT OR UPDATE ON transactions
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION check_transaction_balance();

DROP TRIGGER IF EXISTS trg_payments_balance ON transaction_payments;
CREATE CONSTRAINT TRIGGER trg_payments_balance
  AFTER INSERT OR UPDATE OR DELETE ON transaction_payments
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION check_transaction_balance();

CREATE OR REPLACE FUNCTION prevent_transaction_hard_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Transaksi tidak boleh dihapus permanen; gunakan soft delete'
    USING ERRCODE = '23514';
END
$$;

DROP TRIGGER IF EXISTS trg_transactions_no_hard_delete ON transactions;
CREATE TRIGGER trg_transactions_no_hard_delete
  BEFORE DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION prevent_transaction_hard_delete();
