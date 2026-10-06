BEGIN;

DROP INDEX IF EXISTS public.allotments_active_whole_room_unique;

CREATE UNIQUE INDEX allotments_active_whole_room_guest_unique
    ON public.allotments (booking_id, room_id, guest_id)
    WHERE bed_id IS NULL
      AND allotment_status = 'ALLOTTED';

COMMIT;
