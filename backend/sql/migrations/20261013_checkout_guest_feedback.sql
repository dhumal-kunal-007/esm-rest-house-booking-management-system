BEGIN;

CREATE TABLE IF NOT EXISTS booking_checkout_feedback (
    booking_id UUID PRIMARY KEY REFERENCES bookings(id) ON DELETE CASCADE,
    staff_rating SMALLINT,
    housekeeping_rating SMALLINT,
    facilities_rating SMALLINT,
    food_rating SMALLINT,
    overall_rating SMALLINT,
    comments TEXT,
    feedback_status TEXT NOT NULL,
    submitted_by UUID NOT NULL REFERENCES users(id),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT booking_checkout_feedback_status_check
        CHECK (feedback_status IN ('SUBMITTED', 'SKIPPED')),
    CONSTRAINT booking_checkout_feedback_ratings_check
        CHECK (
            (
                feedback_status = 'SKIPPED'
                AND staff_rating IS NULL
                AND housekeeping_rating IS NULL
                AND facilities_rating IS NULL
                AND food_rating IS NULL
                AND overall_rating IS NULL
                AND comments IS NULL
            )
            OR
            (
                feedback_status = 'SUBMITTED'
                AND staff_rating IS NOT NULL
                AND staff_rating BETWEEN 1 AND 5
                AND housekeeping_rating IS NOT NULL
                AND housekeeping_rating BETWEEN 1 AND 5
                AND facilities_rating IS NOT NULL
                AND facilities_rating BETWEEN 1 AND 5
                AND food_rating IS NOT NULL
                AND food_rating BETWEEN 1 AND 5
                AND overall_rating IS NOT NULL
                AND overall_rating BETWEEN 1 AND 5
            )
        )
);

COMMIT;
