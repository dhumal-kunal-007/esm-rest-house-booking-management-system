BEGIN;

ALTER TABLE public.booking_service_members
    ADD COLUMN IF NOT EXISTS mobile_number TEXT;

DO $migration$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'booking_service_members_mobile_format_check'
          AND conrelid = 'public.booking_service_members'::regclass
    ) THEN
        ALTER TABLE public.booking_service_members
            ADD CONSTRAINT booking_service_members_mobile_format_check
            CHECK (mobile_number IS NULL OR mobile_number ~ '^[0-9]{10}$');
    END IF;
END;
$migration$;

COMMIT;
