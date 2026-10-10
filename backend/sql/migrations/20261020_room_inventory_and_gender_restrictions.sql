BEGIN;

ALTER TABLE public.rooms
    ADD COLUMN IF NOT EXISTS allowed_gender VARCHAR(10),
    ADD COLUMN IF NOT EXISTS room_usage VARCHAR(40) NOT NULL DEFAULT 'GUEST';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'rooms_allowed_gender_check'
          AND conrelid = 'public.rooms'::regclass
    ) THEN
        ALTER TABLE public.rooms
            ADD CONSTRAINT rooms_allowed_gender_check
            CHECK (allowed_gender IS NULL OR allowed_gender IN ('MALE', 'FEMALE'));
    END IF;
END $$;

WITH desired_rooms(room_number, category_name, total_beds, allowed_gender, room_usage, is_bookable) AS (
    VALUES
        ('NAC 1', 'NON_AC', 3, NULL, 'GUEST', TRUE),
        ('NAC 2', 'NON_AC', 3, NULL, 'GUEST', TRUE),
        ('NAC 3', 'NON_AC', 3, NULL, 'GUEST', TRUE),
        ('NAC 4', 'NON_AC', 3, NULL, 'GUEST', TRUE),
        ('NAC 6', 'NON_AC', 2, NULL, 'GUEST', TRUE),
        ('NAC 7', 'NON_AC', 2, NULL, 'GUEST', TRUE),
        ('NAC 8', 'NON_AC', 2, NULL, 'GUEST', TRUE),
        ('AC 1', 'AC', 2, NULL, 'GUEST', TRUE),
        ('AC 2', 'AC', 2, NULL, 'GUEST', TRUE),
        ('AC 3', 'AC', 2, NULL, 'GUEST', TRUE),
        ('AC 4', 'AC', 2, NULL, 'GUEST', TRUE),
        ('AC 5', 'AC', 2, NULL, 'GUEST', TRUE),
        ('AC 11', 'AC', 3, NULL, 'GUEST', TRUE),
        ('AC 12', 'AC', 3, NULL, 'GUEST', TRUE),
        ('AC 13', 'AC', 3, NULL, 'GUEST', TRUE),
        ('AC 14', 'AC', 3, NULL, 'GUEST', TRUE),
        ('AC 15', 'AC', 2, NULL, 'GUEST', TRUE),
        ('AC 16', 'AC', 2, NULL, 'GUEST', TRUE),
        ('AC 17', 'AC', 3, NULL, 'GUEST', TRUE),
        ('AC 18', 'AC', 3, NULL, 'GUEST', TRUE),
        ('AC 19', 'AC', 2, NULL, 'GUEST', TRUE),
        ('AC 20', 'AC', 2, NULL, 'GUEST', TRUE),
        ('AC 21', 'AC', 2, NULL, 'GUEST', TRUE),
        ('AC 22', 'VIP', 4, NULL, 'GUEST', TRUE),
        ('AC 23', 'VIP', 4, NULL, 'GUEST', TRUE),
        ('AC 24', 'AC', 2, NULL, 'GUEST', TRUE),
        ('DM 1', 'DORMITORY', 12, 'MALE', 'GUEST', TRUE),
        ('DM 2', 'DORMITORY', 12, 'MALE', 'GUEST', TRUE),
        ('DM 3', 'DORMITORY', 12, 'MALE', 'GUEST', TRUE),
        ('DM 4', 'DORMITORY', 12, 'FEMALE', 'GUEST', TRUE),
        ('DM 5', 'DORMITORY', 12, 'FEMALE', 'GUEST', TRUE),
        ('DM 6', 'DORMITORY', 11, 'FEMALE', 'GUEST', TRUE),
        ('DM 7', 'DORMITORY', 12, 'MALE', 'GUEST', TRUE),
        ('DM 8', 'DORMITORY', 12, 'MALE', 'GUEST', TRUE),
        ('DM 9', 'DORMITORY', 12, 'FEMALE', 'GUEST', TRUE),
        ('DM 10', 'DORMITORY', 10, NULL, 'GUEST', TRUE),
        ('DM 11', 'DORMITORY', 3, 'FEMALE', 'GUEST', TRUE),
        ('DM 12', 'DORMITORY', 4, 'FEMALE', 'GUEST', TRUE),
        ('DM 13', 'DORMITORY', 4, 'MALE', 'GUEST', TRUE),
        ('DM 14', 'DORMITORY', 3, 'MALE', 'GUEST', TRUE),
        ('DM 15', 'DORMITORY', 3, 'MALE', 'GUEST', TRUE),
        ('DM 16', 'DORMITORY', 0, NULL, 'STORE', FALSE),
        ('DM 17', 'DORMITORY', 7, NULL, 'WORK_STAFF', FALSE),
        ('DM 18', 'DORMITORY', 3, NULL, 'COOK_STAFF', FALSE),
        ('DM 19', 'DORMITORY', 3, NULL, 'DRIVER_STAFF', FALSE),
        ('DM 20', 'DORMITORY', 12, NULL, 'HOUSEKEEPING_STAFF', FALSE)
)
INSERT INTO public.rooms (
    room_number,
    category_id,
    total_beds,
    room_status,
    is_active,
    created_at,
    updated_at,
    is_under_maintenance,
    allowed_gender,
    room_usage
)
SELECT
    desired.room_number,
    category.id,
    desired.total_beds,
    CASE WHEN desired.room_usage = 'STORE' THEN 'STORE' ELSE 'AVAILABLE' END,
    desired.is_bookable,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    FALSE,
    desired.allowed_gender,
    desired.room_usage
FROM desired_rooms desired
JOIN public.room_categories category
  ON category.category_name = desired.category_name
ON CONFLICT (room_number)
DO UPDATE SET
    category_id = EXCLUDED.category_id,
    total_beds = EXCLUDED.total_beds,
    room_status = EXCLUDED.room_status,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP,
    allowed_gender = EXCLUDED.allowed_gender,
    room_usage = EXCLUDED.room_usage;

WITH desired_capacity(room_number, capacity) AS (
    VALUES
        ('NAC 1', 3), ('NAC 2', 3), ('NAC 3', 3), ('NAC 4', 3),
        ('NAC 6', 2), ('NAC 7', 2), ('NAC 8', 2),
        ('AC 1', 2), ('AC 2', 2), ('AC 3', 2), ('AC 4', 2), ('AC 5', 2),
        ('AC 11', 3), ('AC 12', 3), ('AC 13', 3), ('AC 14', 3),
        ('AC 15', 2), ('AC 16', 2), ('AC 17', 3), ('AC 18', 3),
        ('AC 19', 2), ('AC 20', 2), ('AC 21', 2), ('AC 22', 4),
        ('AC 23', 4), ('AC 24', 2),
        ('DM 1', 12), ('DM 2', 12), ('DM 3', 12), ('DM 4', 12),
        ('DM 5', 12), ('DM 6', 11), ('DM 7', 12), ('DM 8', 12),
        ('DM 9', 12), ('DM 10', 10), ('DM 11', 3), ('DM 12', 4),
        ('DM 13', 4), ('DM 14', 3), ('DM 15', 3), ('DM 16', 0),
        ('DM 17', 7), ('DM 18', 3), ('DM 19', 3), ('DM 20', 12)
)
INSERT INTO public.room_rate_cards (room_id, room_capacity, bed_capacity, updated_at)
SELECT rooms.id, NULLIF(desired.capacity, 0), desired.capacity, CURRENT_TIMESTAMP
FROM desired_capacity desired
JOIN public.rooms rooms ON rooms.room_number = desired.room_number
ON CONFLICT (room_id)
DO UPDATE SET
    room_capacity = EXCLUDED.room_capacity,
    bed_capacity = EXCLUDED.bed_capacity,
    updated_at = CURRENT_TIMESTAMP;

WITH desired_capacity(room_number, capacity) AS (
    VALUES
        ('NAC 1', 3), ('NAC 2', 3), ('NAC 3', 3), ('NAC 4', 3),
        ('NAC 6', 2), ('NAC 7', 2), ('NAC 8', 2),
        ('AC 1', 2), ('AC 2', 2), ('AC 3', 2), ('AC 4', 2), ('AC 5', 2),
        ('AC 11', 3), ('AC 12', 3), ('AC 13', 3), ('AC 14', 3),
        ('AC 15', 2), ('AC 16', 2), ('AC 17', 3), ('AC 18', 3),
        ('AC 19', 2), ('AC 20', 2), ('AC 21', 2), ('AC 22', 4),
        ('AC 23', 4), ('AC 24', 2),
        ('DM 1', 12), ('DM 2', 12), ('DM 3', 12), ('DM 4', 12),
        ('DM 5', 12), ('DM 6', 11), ('DM 7', 12), ('DM 8', 12),
        ('DM 9', 12), ('DM 10', 10), ('DM 11', 3), ('DM 12', 4),
        ('DM 13', 4), ('DM 14', 3), ('DM 15', 3), ('DM 16', 0),
        ('DM 17', 7), ('DM 18', 3), ('DM 19', 3), ('DM 20', 12)
)
INSERT INTO public.beds (room_id, bed_number, bed_status, is_active, created_at)
SELECT rooms.id, series.bed_number, 'AVAILABLE', TRUE, CURRENT_TIMESTAMP
FROM desired_capacity desired
JOIN public.rooms rooms ON rooms.room_number = desired.room_number
CROSS JOIN LATERAL generate_series(1, desired.capacity) AS series(bed_number)
ON CONFLICT (room_id, bed_number)
DO UPDATE SET
    bed_status = 'AVAILABLE',
    is_active = TRUE;

WITH desired_capacity(room_number, capacity) AS (
    VALUES
        ('NAC 1', 3), ('NAC 2', 3), ('NAC 3', 3), ('NAC 4', 3),
        ('NAC 6', 2), ('NAC 7', 2), ('NAC 8', 2),
        ('AC 1', 2), ('AC 2', 2), ('AC 3', 2), ('AC 4', 2), ('AC 5', 2),
        ('AC 11', 3), ('AC 12', 3), ('AC 13', 3), ('AC 14', 3),
        ('AC 15', 2), ('AC 16', 2), ('AC 17', 3), ('AC 18', 3),
        ('AC 19', 2), ('AC 20', 2), ('AC 21', 2), ('AC 22', 4),
        ('AC 23', 4), ('AC 24', 2),
        ('DM 1', 12), ('DM 2', 12), ('DM 3', 12), ('DM 4', 12),
        ('DM 5', 12), ('DM 6', 11), ('DM 7', 12), ('DM 8', 12),
        ('DM 9', 12), ('DM 10', 10), ('DM 11', 3), ('DM 12', 4),
        ('DM 13', 4), ('DM 14', 3), ('DM 15', 3), ('DM 16', 0),
        ('DM 17', 7), ('DM 18', 3), ('DM 19', 3), ('DM 20', 12)
)
UPDATE public.beds beds
SET
    is_active = beds.bed_number <= desired.capacity,
    bed_status = CASE
        WHEN beds.bed_number <= desired.capacity THEN 'AVAILABLE'
        ELSE beds.bed_status
    END
FROM desired_capacity desired
JOIN public.rooms rooms ON rooms.room_number = desired.room_number
WHERE beds.room_id = rooms.id;

INSERT INTO public.room_permissions (
    room_id, role_name, can_book, can_allot, can_approve, emergency_allot, created_at
)
SELECT
    target.id,
    permission.role_name,
    permission.can_book,
    permission.can_allot,
    permission.can_approve,
    permission.emergency_allot,
    CURRENT_TIMESTAMP
FROM public.rooms source
JOIN public.room_permissions permission ON permission.room_id = source.id
JOIN public.rooms target ON target.room_number IN (
    'DM 10', 'DM 11', 'DM 12', 'DM 13', 'DM 14', 'DM 15'
)
WHERE source.room_number = 'DM 9'
ON CONFLICT (room_id, role_name)
DO UPDATE SET
    can_book = EXCLUDED.can_book,
    can_allot = EXCLUDED.can_allot,
    can_approve = EXCLUDED.can_approve,
    emergency_allot = EXCLUDED.emergency_allot;

UPDATE public.room_permissions permission
SET can_book = FALSE, can_allot = FALSE, can_approve = FALSE, emergency_allot = FALSE
FROM public.rooms rooms
WHERE permission.room_id = rooms.id
  AND rooms.room_number IN ('DM 16', 'DM 17', 'DM 18', 'DM 19', 'DM 20');

COMMIT;