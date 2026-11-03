-- Perbaikan: hindari referensi OLD pada trigger INSERT.
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
