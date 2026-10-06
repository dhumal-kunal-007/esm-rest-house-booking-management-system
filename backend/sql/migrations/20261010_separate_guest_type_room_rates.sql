BEGIN;

ALTER TABLE public.room_rate_cards
    ADD COLUMN IF NOT EXISTS serving_room_rate NUMERIC(12, 2);

DO $migration$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'room_rate_cards'
          AND column_name = 'esm_serving_room_rate'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'room_rate_cards'
          AND column_name = 'esm_room_rate'
    ) THEN
        ALTER TABLE public.room_rate_cards
            RENAME COLUMN esm_serving_room_rate TO esm_room_rate;

        UPDATE public.room_rate_cards
        SET serving_room_rate = COALESCE(serving_room_rate, esm_room_rate);
    ELSIF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'room_rate_cards'
          AND column_name = 'esm_serving_room_rate'
    ) THEN
        UPDATE public.room_rate_cards
        SET
            esm_room_rate = COALESCE(esm_room_rate, esm_serving_room_rate),
            serving_room_rate = COALESCE(
                serving_room_rate,
                esm_serving_room_rate
            );

        ALTER TABLE public.room_rate_cards
            DROP COLUMN esm_serving_room_rate;
    ELSE
        ALTER TABLE public.room_rate_cards
            ADD COLUMN IF NOT EXISTS esm_room_rate NUMERIC(12, 2);
    END IF;
END;
$migration$;

DO $migration$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'room_rate_cards_esm_room_rate_check'
          AND conrelid = 'public.room_rate_cards'::regclass
    ) THEN
        ALTER TABLE public.room_rate_cards
            ADD CONSTRAINT room_rate_cards_esm_room_rate_check
            CHECK (esm_room_rate IS NULL OR esm_room_rate > 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'room_rate_cards_serving_room_rate_check'
          AND conrelid = 'public.room_rate_cards'::regclass
    ) THEN
        ALTER TABLE public.room_rate_cards
            ADD CONSTRAINT room_rate_cards_serving_room_rate_check
            CHECK (serving_room_rate IS NULL OR serving_room_rate > 0);
    END IF;
END;
$migration$;

COMMIT;
