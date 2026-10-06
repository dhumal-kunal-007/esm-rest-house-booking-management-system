BEGIN;

CREATE OR REPLACE FUNCTION public.generate_invoice_number(invoice_date DATE)
RETURNS CHARACTER VARYING
LANGUAGE plpgsql
AS $function$
BEGIN
    IF invoice_date IS NULL THEN
        RAISE EXCEPTION 'Invoice date is required to generate an invoice number.';
    END IF;

    RETURN public.generate_bill_number(invoice_date);
END;
$function$;

COMMIT;
