BEGIN;

UPDATE public.rooms
SET
    is_active = FALSE,
    total_beds = 0,
    room_status = CASE
        WHEN room_number = 'NAC 5' THEN 'STORE'
        ELSE 'OUT_OF_SERVICE'
    END,
    room_usage = CASE
        WHEN room_number = 'NAC 5' THEN 'STORE'
        ELSE 'OUT_OF_SCOPE'
    END,
    updated_at = CURRENT_TIMESTAMP
WHERE room_number IN (
    'NAC 5',
    'NAC 9',
    'NAC 10',
    'NAC 11',
    'NAC 12',
    'NAC 13'
);

UPDATE public.beds beds
SET is_active = FALSE
FROM public.rooms rooms
WHERE beds.room_id = rooms.id
  AND rooms.room_number IN (
      'NAC 5',
      'NAC 9',
      'NAC 10',
      'NAC 11',
      'NAC 12',
      'NAC 13'
  );

UPDATE public.room_rate_cards cards
SET
    room_capacity = NULL,
    bed_capacity = 0,
    updated_at = CURRENT_TIMESTAMP
FROM public.rooms rooms
WHERE cards.room_id = rooms.id
  AND rooms.room_number IN (
      'NAC 5',
      'NAC 9',
      'NAC 10',
      'NAC 11',
      'NAC 12',
      'NAC 13'
  );

UPDATE public.room_permissions permissions
SET
    can_book = FALSE,
    can_allot = FALSE,
    can_approve = FALSE,
    emergency_allot = FALSE
FROM public.rooms rooms
WHERE permissions.room_id = rooms.id
  AND rooms.room_number IN (
      'NAC 5',
      'NAC 9',
      'NAC 10',
      'NAC 11',
      'NAC 12',
      'NAC 13'
  );

COMMIT;