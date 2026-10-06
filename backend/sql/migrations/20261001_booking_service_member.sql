BEGIN;

CREATE TABLE IF NOT EXISTS booking_service_members (
    booking_id UUID PRIMARY KEY REFERENCES bookings(id),
    service_number TEXT NOT NULL,
    rank TEXT NOT NULL,
    full_name TEXT NOT NULL,
    address TEXT NOT NULL,
    identity_number TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMIT;
