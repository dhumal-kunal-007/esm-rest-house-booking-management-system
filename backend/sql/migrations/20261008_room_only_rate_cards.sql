BEGIN;

ALTER TABLE public.room_rate_cards
    DROP COLUMN IF EXISTS esm_serving_bed_rate,
    DROP COLUMN IF EXISTS civilian_bed_rate;

COMMIT;
