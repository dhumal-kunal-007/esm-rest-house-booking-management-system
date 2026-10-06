BEGIN;

ALTER TABLE public.daily_report_snapshots
    ADD COLUMN IF NOT EXISTS report_type TEXT NOT NULL DEFAULT 'DAILY';

ALTER TABLE public.daily_report_snapshots
    DROP CONSTRAINT IF EXISTS daily_report_snapshot_window_is_24_hours;

ALTER TABLE public.daily_report_snapshots
    DROP CONSTRAINT IF EXISTS daily_report_snapshots_report_type_check;

ALTER TABLE public.daily_report_snapshots
    ADD CONSTRAINT daily_report_snapshots_report_type_check
    CHECK (report_type IN ('DAILY', 'WEEKLY', 'MONTHLY'));

ALTER TABLE public.daily_report_snapshots
    ADD CONSTRAINT daily_report_snapshot_window_is_valid
    CHECK (
        report_type <> 'DAILY'
        OR period_end - period_start = INTERVAL '24 hours'
    );

ALTER TABLE public.daily_report_snapshots
    DROP CONSTRAINT IF EXISTS daily_report_snapshots_pkey;

ALTER TABLE public.daily_report_snapshots
    ADD CONSTRAINT daily_report_snapshots_pkey
    PRIMARY KEY (report_type, report_date);

COMMIT;
