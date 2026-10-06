BEGIN;

ALTER TABLE booking_service_members
    DROP COLUMN IF EXISTS refund_bank_details_encrypted,
    DROP COLUMN IF EXISTS refund_bank_details_iv,
    DROP COLUMN IF EXISTS refund_bank_details_auth_tag;

COMMIT;
