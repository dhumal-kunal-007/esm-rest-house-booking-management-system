BEGIN;

CREATE TABLE IF NOT EXISTS public.room_rate_cards (
    room_id UUID PRIMARY KEY REFERENCES public.rooms(id) ON DELETE CASCADE,
    room_capacity INTEGER CHECK (room_capacity IS NULL OR room_capacity > 0),
    bed_capacity INTEGER CHECK (bed_capacity IS NULL OR bed_capacity >= 0),
    esm_serving_room_rate NUMERIC(12, 2)
        CHECK (esm_serving_room_rate IS NULL OR esm_serving_room_rate > 0),
    esm_serving_bed_rate NUMERIC(12, 2)
        CHECK (esm_serving_bed_rate IS NULL OR esm_serving_bed_rate > 0),
    civilian_room_rate NUMERIC(12, 2)
        CHECK (civilian_room_rate IS NULL OR civilian_room_rate > 0),
    civilian_bed_rate NUMERIC(12, 2)
        CHECK (civilian_bed_rate IS NULL OR civilian_bed_rate > 0),
    updated_by UUID REFERENCES public.users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.payment_configuration (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    upi_id TEXT NOT NULL,
    payee_name TEXT NOT NULL,
    updated_by UUID NOT NULL REFERENCES public.users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.booking_documents (
    id UUID PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    guest_id UUID REFERENCES public.guests(id) ON DELETE CASCADE,
    person_type TEXT NOT NULL CHECK (person_type IN ('BOOKING_PERSON', 'OCCUPANT')),
    content_type TEXT NOT NULL CHECK (
        content_type IN ('application/pdf', 'image/jpeg', 'image/png')
    ),
    encrypted_content BYTEA NOT NULL,
    iv BYTEA NOT NULL,
    auth_tag BYTEA NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT booking_documents_person_link CHECK (
        (person_type = 'BOOKING_PERSON' AND guest_id IS NULL)
        OR (person_type = 'OCCUPANT' AND guest_id IS NOT NULL)
    )
);

ALTER TABLE public.booking_service_members
    ADD COLUMN IF NOT EXISTS aadhaar_number TEXT;

ALTER TABLE public.guests
    ADD COLUMN IF NOT EXISTS aadhaar_number TEXT;

DO $migration$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'booking_service_members_aadhaar_format_check'
          AND conrelid = 'public.booking_service_members'::regclass
    ) THEN
        ALTER TABLE public.booking_service_members
            ADD CONSTRAINT booking_service_members_aadhaar_format_check
            CHECK (aadhaar_number IS NULL OR aadhaar_number ~ '^[0-9]{12}$');
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'guests_aadhaar_format_check'
          AND conrelid = 'public.guests'::regclass
    ) THEN
        ALTER TABLE public.guests
            ADD CONSTRAINT guests_aadhaar_format_check
            CHECK (aadhaar_number IS NULL OR aadhaar_number ~ '^[0-9]{12}$');
    END IF;
END;
$migration$;

CREATE INDEX IF NOT EXISTS booking_documents_booking_idx
    ON public.booking_documents (booking_id);

ALTER TABLE public.booking_pricing
    DROP CONSTRAINT IF EXISTS booking_pricing_accommodation_category_check;

ALTER TABLE public.booking_pricing
    ADD CONSTRAINT booking_pricing_accommodation_category_check
    CHECK (
        accommodation_category IN (
            'AC',
            'NON_AC',
            'DORMITORY',
            'VIP',
            'HALL'
        )
    );

CREATE OR REPLACE FUNCTION public.generate_invoice_number(invoice_date DATE)
RETURNS CHARACTER VARYING
LANGUAGE plpgsql
AS $function$
DECLARE
    next_sequence INTEGER;
    attempts INTEGER := 0;
    new_invoice_number VARCHAR(6);
BEGIN
    IF invoice_date IS NULL THEN
        RAISE EXCEPTION 'Invoice date is required to generate an invoice number.';
    END IF;

    LOOP
        UPDATE public.bill_counters
        SET
            current_sequence = (current_sequence % 99) + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
        RETURNING current_sequence INTO next_sequence;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Bill counter row with id = 1 was not found.';
        END IF;

        attempts := attempts + 1;
        new_invoice_number :=
            TO_CHAR(invoice_date, 'MMDD')
            || LPAD((((next_sequence - 1) % 99) + 1)::TEXT, 2, '0');

        IF NOT EXISTS (
            SELECT 1
            FROM public.booking_invoices
            WHERE invoice_number = new_invoice_number
        ) THEN
            RETURN new_invoice_number;
        END IF;

        IF attempts >= 99 THEN
            RAISE EXCEPTION
                'No unused invoice number remains for date %.',
                invoice_date;
        END IF;
    END LOOP;
END;
$function$;

COMMIT;
