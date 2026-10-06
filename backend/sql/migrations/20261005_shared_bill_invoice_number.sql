BEGIN;

CREATE OR REPLACE FUNCTION public.generate_bill_number(checkout_date DATE)
RETURNS CHARACTER VARYING
LANGUAGE plpgsql
AS $function$
DECLARE
    next_sequence INTEGER;
    attempts INTEGER := 0;
    new_bill_number VARCHAR(8);
BEGIN
    IF checkout_date IS NULL THEN
        RAISE EXCEPTION 'Checkout date is required to generate a bill number.';
    END IF;

    LOOP
        UPDATE public.bill_counters
        SET
            current_sequence = CASE
                WHEN current_sequence >= 9999 THEN 1
                ELSE current_sequence + 1
            END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
        RETURNING current_sequence INTO next_sequence;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Bill counter row with id = 1 was not found.';
        END IF;

        attempts := attempts + 1;

        new_bill_number :=
            TO_CHAR(checkout_date, 'MMDD')
            || LPAD(next_sequence::TEXT, 4, '0');

        IF NOT EXISTS (
            SELECT 1
            FROM public.bills
            WHERE bill_number = new_bill_number
        ) AND NOT EXISTS (
            SELECT 1
            FROM public.booking_invoices
            WHERE invoice_number = new_bill_number
        ) THEN
            RETURN new_bill_number;
        END IF;

        IF attempts >= 9999 THEN
            RAISE EXCEPTION
                'No unused bill or invoice number remains for date %.',
                checkout_date;
        END IF;
    END LOOP;
END;
$function$;

COMMIT;
