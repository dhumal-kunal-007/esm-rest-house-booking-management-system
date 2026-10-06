BEGIN;

CREATE TABLE IF NOT EXISTS booking_pricing (
    booking_id UUID PRIMARY KEY REFERENCES bookings(id),
    guest_type TEXT NOT NULL
        CHECK (guest_type IN ('ESM', 'SERVING', 'CIVILIAN')),
    accommodation_category TEXT NOT NULL
        CHECK (
            accommodation_category IN (
                'AC',
                'NON_AC',
                'DORMITORY',
                'HALL'
            )
        ),
    accommodation_rate NUMERIC(10, 2) NOT NULL
        CHECK (accommodation_rate > 0),
    accommodation_days INTEGER NOT NULL
        CHECK (accommodation_days > 0),
    accommodation_amount NUMERIC(12, 2) NOT NULL
        CHECK (accommodation_amount >= 0),
    additional_retired_members INTEGER NOT NULL DEFAULT 0
        CHECK (additional_retired_members >= 0),
    additional_retired_amount NUMERIC(12, 2) NOT NULL DEFAULT 0
        CHECK (additional_retired_amount >= 0),
    additional_other_relations INTEGER NOT NULL DEFAULT 0
        CHECK (additional_other_relations >= 0),
    additional_other_relation_amount NUMERIC(12, 2) NOT NULL DEFAULT 0
        CHECK (additional_other_relation_amount >= 0),
    additional_member_amount NUMERIC(12, 2) NOT NULL
        CHECK (additional_member_amount >= 0),
    total_amount NUMERIC(12, 2) NOT NULL
        CHECK (total_amount > 0),
    calculated_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT booking_pricing_amounts_match
        CHECK (
            total_amount =
                accommodation_amount + additional_member_amount
        )
);

ALTER TABLE booking_pricing
    DROP CONSTRAINT IF EXISTS booking_pricing_member_amounts_match;

ALTER TABLE booking_pricing
    ADD CONSTRAINT booking_pricing_member_amounts_match
        CHECK (
            additional_member_amount =
                additional_retired_amount +
                additional_other_relation_amount
        );

COMMIT;
