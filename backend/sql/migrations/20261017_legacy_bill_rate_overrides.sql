BEGIN;

CREATE TABLE IF NOT EXISTS public.booking_legacy_bill_rates (
    booking_id UUID NOT NULL REFERENCES public.bookings(id),
    room_id UUID NOT NULL REFERENCES public.rooms(id),
    daily_rate NUMERIC(12, 2) NOT NULL CHECK (daily_rate > 0),
    guest_type TEXT NOT NULL
        CHECK (guest_type IN ('ESM', 'SERVING', 'CIVILIAN')),
    accommodation_category TEXT NOT NULL
        CHECK (
            accommodation_category IN (
                'AC',
                'NON_AC',
                'DORMITORY',
                'HALL',
                'VIP'
            )
        ),
    authorization_reason TEXT NOT NULL
        CHECK (char_length(btrim(authorization_reason)) >= 15),
    authorized_by UUID NOT NULL REFERENCES public.users(id),
    authorized_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (booking_id, room_id)
);

CREATE OR REPLACE FUNCTION public.prevent_legacy_bill_rate_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
    RAISE EXCEPTION 'Legacy bill rate audit records cannot be changed or deleted';
END;
$function$;

DROP TRIGGER IF EXISTS booking_legacy_bill_rates_immutable
    ON public.booking_legacy_bill_rates;

CREATE TRIGGER booking_legacy_bill_rates_immutable
    BEFORE UPDATE OR DELETE ON public.booking_legacy_bill_rates
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_legacy_bill_rate_changes();

COMMIT;
