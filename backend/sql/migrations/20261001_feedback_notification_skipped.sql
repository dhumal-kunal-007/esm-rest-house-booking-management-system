DO $migration$
DECLARE
    status_constraint RECORD;
BEGIN
    FOR status_constraint IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.feedback_notifications'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%notification_status%'
          AND pg_get_constraintdef(oid) ILIKE '%PENDING%'
          AND pg_get_constraintdef(oid) ILIKE '%SENT%'
          AND pg_get_constraintdef(oid) ILIKE '%FAILED%'
    LOOP
        EXECUTE format(
            'ALTER TABLE public.feedback_notifications DROP CONSTRAINT %I',
            status_constraint.conname
        );
    END LOOP;

    ALTER TABLE public.feedback_notifications
        ADD CONSTRAINT feedback_notifications_status_check
        CHECK (
            notification_status::text IN (
                'PENDING',
                'SENT',
                'FAILED',
                'SKIPPED'
            )
        );
END
$migration$;
