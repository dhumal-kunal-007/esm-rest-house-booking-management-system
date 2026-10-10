BEGIN;

INSERT INTO public.room_permissions (
    room_id,
    role_name,
    can_book,
    can_allot,
    can_approve,
    emergency_allot,
    created_at
)
SELECT
    rooms.id,
    'RECEPTIONIST',
    FALSE,
    TRUE,
    FALSE,
    TRUE,
    CURRENT_TIMESTAMP
FROM public.rooms rooms
WHERE rooms.room_number IN ('AC 22', 'AC 23')
  AND rooms.is_active = TRUE
ON CONFLICT (room_id, role_name)
DO UPDATE SET
    can_book = EXCLUDED.can_book,
    can_allot = EXCLUDED.can_allot,
    can_approve = EXCLUDED.can_approve,
    emergency_allot = EXCLUDED.emergency_allot;

COMMIT;
