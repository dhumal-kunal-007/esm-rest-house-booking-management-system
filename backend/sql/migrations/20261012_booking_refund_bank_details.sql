BEGIN;

ALTER TABLE booking_service_members
    ADD COLUMN IF NOT EXISTS refund_bank_details_encrypted BYTEA,
    ADD COLUMN IF NOT EXISTS refund_bank_details_iv BYTEA,
    ADD COLUMN IF NOT EXISTS refund_bank_details_auth_tag BYTEA;

COMMIT;
