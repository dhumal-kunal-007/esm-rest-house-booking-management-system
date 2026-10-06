BEGIN;

CREATE TABLE IF NOT EXISTS booking_workflow_progress (
    booking_id UUID PRIMARY KEY REFERENCES bookings(id) ON DELETE CASCADE,
    current_step TEXT NOT NULL DEFAULT 'AVAILABILITY'
        CHECK (
            current_step IN (
                'AVAILABILITY',
                'GUEST_TYPE',
                'RATE',
                'BOOKING_CONFIRMATION',
                'COMPLETED'
            )
        ),
    progress_data JSONB NOT NULL DEFAULT '{}'::JSONB,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMIT;
