BEGIN;

ALTER TABLE public.booking_service_members
    ALTER COLUMN identity_number DROP NOT NULL;

COMMIT;
