-- Clear all existing transaction records for fresh start
DELETE FROM booking_payments;
DELETE FROM account_transfers;
DELETE FROM monthly_rent_payments;
DELETE FROM expenses;
DELETE FROM income;
DELETE FROM bookings;

-- Reset sequences if any (this ensures clean ID generation)
-- Note: UUIDs don't need sequence reset but this ensures clean state