-- Allow deletion of accounts by updating foreign key constraints to CASCADE
-- First drop existing foreign keys
ALTER TABLE account_transfers DROP CONSTRAINT IF EXISTS account_transfers_from_account_id_fkey;
ALTER TABLE account_transfers DROP CONSTRAINT IF EXISTS account_transfers_to_account_id_fkey;
ALTER TABLE booking_payments DROP CONSTRAINT IF EXISTS booking_payments_account_id_fkey;
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_account_id_fkey;
ALTER TABLE income DROP CONSTRAINT IF EXISTS income_account_id_fkey;
ALTER TABLE monthly_rent_payments DROP CONSTRAINT IF EXISTS monthly_rent_payments_account_id_fkey;

-- Recreate with CASCADE delete
ALTER TABLE account_transfers ADD CONSTRAINT account_transfers_from_account_id_fkey 
    FOREIGN KEY (from_account_id) REFERENCES accounts(id) ON DELETE CASCADE;
ALTER TABLE account_transfers ADD CONSTRAINT account_transfers_to_account_id_fkey 
    FOREIGN KEY (to_account_id) REFERENCES accounts(id) ON DELETE CASCADE;
ALTER TABLE booking_payments ADD CONSTRAINT booking_payments_account_id_fkey 
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
ALTER TABLE expenses ADD CONSTRAINT expenses_account_id_fkey 
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
ALTER TABLE income ADD CONSTRAINT income_account_id_fkey 
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
ALTER TABLE monthly_rent_payments ADD CONSTRAINT monthly_rent_payments_account_id_fkey 
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;