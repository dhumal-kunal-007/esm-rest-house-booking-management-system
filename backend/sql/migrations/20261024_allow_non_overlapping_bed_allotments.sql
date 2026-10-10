BEGIN;

DO $migration$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.allotments'::regclass
          AND conname = 'allotments_active_bed_unique'
    ) THEN
        ALTER TABLE public.allotments
            DROP CONSTRAINT allotments_active_bed_unique;
    ELSE
        DROP INDEX IF EXISTS public.allotments_active_bed_unique;
    END IF;
END;
$migration$;

CREATE UNIQUE INDEX IF NOT EXISTS allotments_active_bed_booking_unique
    ON public.allotments (booking_id, bed_id)
    WHERE bed_id IS NOT NULL
      AND allotment_status = 'ALLOTTED';

COMMIT;
