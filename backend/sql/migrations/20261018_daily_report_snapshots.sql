BEGIN;

CREATE TABLE IF NOT EXISTS public.daily_report_snapshots (
    report_date DATE PRIMARY KEY,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    snapshot JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT daily_report_snapshot_window_is_24_hours
        CHECK (period_end - period_start = INTERVAL '24 hours')
);

CREATE TABLE IF NOT EXISTS public.daily_report_scheduler_state (
    id SMALLINT PRIMARY KEY CHECK (id = 1),
    activated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO public.daily_report_scheduler_state (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

COMMIT;
