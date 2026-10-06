import { Router } from "express";
import { pool } from "../config/db.js";

const router = Router();

interface RequestedDateRange {
  checkIn: string | null;
  checkOut: string | null;
}

const readRequestedDateRange = (
  req: {
    query: Record<string, unknown>;
  }
): RequestedDateRange | null => {
  const checkInValue =
    req.query.check_in_date;
  const checkOutValue =
    req.query.expected_check_out_date;

  if (
    checkInValue === undefined &&
    checkOutValue === undefined
  ) {
    return {
      checkIn: null,
      checkOut: null,
    };
  }

  const checkIn =
    typeof checkInValue === "string"
      ? checkInValue
      : "";
  const checkOut =
    typeof checkOutValue === "string"
      ? checkOutValue
      : "";
  const validDate = (value: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(
      Date.parse(`${value}T00:00:00.000Z`)
    ) &&
    new Date(`${value}T00:00:00.000Z`)
      .toISOString()
      .startsWith(value);

  if (
    !validDate(checkIn) ||
    !validDate(checkOut) ||
    checkOut <= checkIn
  ) {
    return null;
  }

  return {
    checkIn,
    checkOut,
  };
};

router.get("/rate-card", async (req, res) => {
  if (req.authUser?.role !== "ADMIN") {
    return res.status(403).json({
      success: false,
      message: "Only an ADMIN can view rate cards.",
    });
  }

  try {
    const result = await pool.query(
      `
      SELECT
        r.id,
        r.room_number,
        r.total_beds,
        rc.category_name,
        r.is_under_maintenance,
        card.room_capacity,
        card.bed_capacity,
        card.esm_room_rate,
        card.serving_room_rate,
        card.civilian_room_rate
      FROM rooms r
      INNER JOIN room_categories rc
        ON rc.id = r.category_id
      LEFT JOIN room_rate_cards card
        ON card.room_id = r.id
      WHERE
        r.is_active = TRUE
      ORDER BY rc.category_name, r.room_number
      `
    );

    return res.json({ success: true, rooms: result.rows });
  } catch (error) {
    console.error("Room rate-card fetch error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch room rates.",
    });
  }
});

router.get("/capacities", async (req, res) => {
  const roleName = req.authUser?.role;
  if (!roleName) {
    return res.status(401).json({
      success: false,
      message: "Authentication is required.",
    });
  }

  try {
    const result = await pool.query(
      `
      SELECT
        r.id AS room_id,
        card.room_capacity,
        card.bed_capacity
      FROM rooms r
      LEFT JOIN room_rate_cards card
        ON card.room_id = r.id
      WHERE
        r.is_active = TRUE
        AND (
          $1 = 'ADMIN'
          OR EXISTS (
            SELECT 1
            FROM room_permissions rp
            WHERE rp.room_id = r.id
              AND rp.role_name = $1
              AND (rp.can_book = TRUE OR rp.can_allot = TRUE)
          )
        )
      `,
      [roleName]
    );

    return res.json({ success: true, capacities: result.rows });
  } catch (error) {
    console.error("Room capacity fetch error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch room capacity settings.",
    });
  }
});

router.put("/rate-card/category/dormitory", async (req, res) => {
  if (req.authUser?.role !== "ADMIN") {
    return res.status(403).json({
      success: false,
      message: "Only an ADMIN can update room rates.",
    });
  }

  const parseRate = (value: unknown, field: string): number | null => {
    if (value === null || value === undefined || value === "") return null;
    const rate = Number(value);
    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error(`Invalid value for ${field}.`);
    }
    return rate;
  };

  let esmRate: number | null;
  let servingRate: number | null;
  let civilianRate: number | null;
  try {
    esmRate = parseRate(
      req.body.esm_room_rate,
      "esm_room_rate"
    );
    servingRate = parseRate(
      req.body.serving_room_rate,
      "serving_room_rate"
    );
    civilianRate = parseRate(
      req.body.civilian_room_rate,
      "civilian_room_rate"
    );
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Invalid room rate.",
    });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const roomsResult = await client.query(
      `
      SELECT r.id
      FROM rooms r
      INNER JOIN room_categories rc ON rc.id = r.category_id
      WHERE r.is_active = TRUE
        AND (
          UPPER(REPLACE(REPLACE(TRIM(rc.category_name), '-', '_'), ' ', '_'))
              IN ('DORMITORY', 'DM')
          OR UPPER(rc.category_name) LIKE '%DORMITORY%'
          OR UPPER(TRIM(r.room_number)) LIKE 'DM%'
        )
      ORDER BY r.id
      FOR UPDATE OF r
      `
    );

    if (roomsResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "No active DM rooms were found.",
      });
    }

    const updateResult = await client.query(
      `
      INSERT INTO room_rate_cards (
        room_id,
        esm_room_rate,
        serving_room_rate,
        civilian_room_rate,
        updated_by,
        updated_at
      )
      SELECT
        r.id,
        $1,
        $2,
        $3,
        $4,
        CURRENT_TIMESTAMP
      FROM rooms r
      INNER JOIN room_categories rc ON rc.id = r.category_id
      WHERE r.is_active = TRUE
        AND (
          UPPER(REPLACE(REPLACE(TRIM(rc.category_name), '-', '_'), ' ', '_'))
              IN ('DORMITORY', 'DM')
          OR UPPER(rc.category_name) LIKE '%DORMITORY%'
          OR UPPER(TRIM(r.room_number)) LIKE 'DM%'
        )
      ON CONFLICT (room_id)
      DO UPDATE SET
        esm_room_rate = EXCLUDED.esm_room_rate,
        serving_room_rate = EXCLUDED.serving_room_rate,
        civilian_room_rate = EXCLUDED.civilian_room_rate,
        updated_by = EXCLUDED.updated_by,
        updated_at = CURRENT_TIMESTAMP
      `,
      [esmRate, servingRate, civilianRate, req.authUser.id]
    );

    await client.query("COMMIT");
    return res.json({
      success: true,
      updatedRooms: updateResult.rowCount ?? roomsResult.rowCount ?? 0,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("DM room rate update error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to update the shared DM room rates.",
    });
  } finally {
    client.release();
  }
});

router.put("/:roomId/maintenance", async (req, res) => {
  if (req.authUser?.role !== "ADMIN") {
    return res.status(403).json({
      success: false,
      message: "Only an ADMIN can change room maintenance status.",
    });
  }

  const { roomId } = req.params;
  const isUnderMaintenance = req.body?.is_under_maintenance;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      roomId
    ) ||
    typeof isUnderMaintenance !== "boolean"
  ) {
    return res.status(400).json({
      success: false,
      message: "A valid room ID and maintenance status are required.",
    });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const roomResult = await client.query(
      `
      SELECT id, room_number
      FROM rooms
      WHERE id = $1 AND is_active = TRUE
      FOR UPDATE
      `,
      [roomId]
    );
    if (roomResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "Active room was not found.",
      });
    }

    if (isUnderMaintenance) {
      const conflictingBooking = await client.query(
        `
        SELECT 1
        FROM booking_acceptances ba
        INNER JOIN bookings b ON b.id = ba.booking_id
        WHERE ba.room_id = $1
          AND ba.acceptance_status = 'ACCEPTED'
          AND b.expected_check_out_date >= CURRENT_DATE
        UNION ALL
        SELECT 1
        FROM allotments a
        INNER JOIN bookings b ON b.id = a.booking_id
        WHERE a.room_id = $1
          AND a.allotment_status = 'ALLOTTED'
          AND b.expected_check_out_date >= CURRENT_DATE
          AND NOT EXISTS (
            SELECT 1 FROM check_outs co
            WHERE co.allotment_id = a.id
          )
        LIMIT 1
        `,
        [roomId]
      );
      if ((conflictingBooking.rowCount ?? 0) > 0) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          success: false,
          message:
            "This room has an accepted or active booking that has not checked out. It cannot be placed under maintenance yet.",
        });
      }
    }

    const updatedRoom = await client.query(
      `
      UPDATE rooms
      SET is_under_maintenance = $2
      WHERE id = $1
      RETURNING id, room_number, is_under_maintenance
      `,
      [roomId, isUnderMaintenance]
    );
    await client.query("COMMIT");
    return res.json({
      success: true,
      room: updatedRoom.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Room maintenance status update error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to update room maintenance status.",
    });
  } finally {
    client.release();
  }
});

router.put("/:roomId/rate-card", async (req, res) => {
  if (req.authUser?.role !== "ADMIN") {
    return res.status(403).json({
      success: false,
      message: "Only an ADMIN can update room rates and capacities.",
    });
  }

  const { roomId } = req.params;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      roomId
    )
  ) {
    return res.status(400).json({
      success: false,
      message: "A valid room ID is required.",
    });
  }

  const fields = [
    "room_capacity",
    "bed_capacity",
    "esm_room_rate",
    "serving_room_rate",
    "civilian_room_rate",
  ] as const;
  const values: (number | null)[] = [];

  for (const field of fields) {
    const value: unknown = req.body[field];
    if (value === undefined || value === null || value === "") {
      values.push(null);
      continue;
    }

    const numberValue = Number(value);
    const isCapacity = field.endsWith("_capacity");
    if (
      !Number.isFinite(numberValue) ||
      (isCapacity
        ? !Number.isInteger(numberValue) ||
          numberValue < (field === "bed_capacity" ? 0 : 1)
        : numberValue <= 0)
    ) {
      return res.status(400).json({
        success: false,
        message: `Invalid value for ${field}.`,
      });
    }
    values.push(numberValue);
  }

  try {
    const roomResult = await pool.query(
      "SELECT 1 FROM rooms WHERE id = $1 AND is_active = TRUE",
      [roomId]
    );
    if (roomResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Active room was not found.",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO room_rate_cards (
        room_id,
        room_capacity,
        bed_capacity,
        esm_room_rate,
        serving_room_rate,
        civilian_room_rate,
        updated_by,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      ON CONFLICT (room_id)
      DO UPDATE SET
        room_capacity = EXCLUDED.room_capacity,
        bed_capacity = EXCLUDED.bed_capacity,
        esm_room_rate = EXCLUDED.esm_room_rate,
        serving_room_rate = EXCLUDED.serving_room_rate,
        civilian_room_rate = EXCLUDED.civilian_room_rate,
        updated_by = EXCLUDED.updated_by,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
      `,
      [roomId, ...values, req.authUser!.id]
    );

    return res.json({ success: true, rateCard: result.rows[0] });
  } catch (error) {
    console.error("Room rate-card update error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to update the room rate card.",
    });
  }
});

/*
=========================================================
GET ROOMS FOR LOGGED-IN USER
=========================================================

IMPORTANT ROOM STATUS RULE:

1. Actual checked-in guest
   -> OCCUPIED

2. Allotted but not checked-in
   -> RESERVED

3. Checked-out / housekeeping required
   -> NEEDS_CLEANING

4. Housekeeping in progress
   -> CLEANING

5. No active occupant / allotment / cleaning task
   -> AVAILABLE

The database room_status is also updated so old stale
"OCCUPIED" values do not remain forever.
=========================================================
*/

router.get("/", async (req, res) => {
  try {
    const requestedDates =
      readRequestedDateRange(req);

    if (!requestedDates) {
      return res.status(400).json({
        success: false,
        message:
          "Provide valid check_in_date and expected_check_out_date values in YYYY-MM-DD format.",
      });
    }

    const roleName = req.authUser?.role;

    if (!roleName) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user is required",
      });
    }

    /*
    =====================================================
    1. GET ROOMS
    =====================================================
    */

    const result = await pool.query(
      `
      SELECT
        r.id,
        r.room_number,
        r.total_beds,
        r.room_status,
        r.room_status AS current_status,
        r.is_under_maintenance,
        r.is_active,

        rc.category_name,

        rp.can_book,
        rp.can_allot,
        rp.can_approve,
        rp.emergency_allot,
        approving_authority.role_name AS approval_authority_role,
        (
          $1 = 'RECEPTIONIST'
          AND rp.can_book = FALSE
          AND rp.can_allot = TRUE
          AND approving_authority.role_name IS NOT NULL
        ) AS is_other_authority_room

      FROM rooms r

      INNER JOIN room_categories rc
        ON rc.id = r.category_id

      INNER JOIN room_permissions rp
        ON rp.room_id = r.id
       AND rp.role_name = $1

      LEFT JOIN LATERAL (
        SELECT authority.role_name
        FROM room_permissions authority
        WHERE authority.room_id = r.id
          AND authority.role_name <> 'RECEPTIONIST'
          AND authority.can_approve = TRUE
        ORDER BY authority.role_name
        LIMIT 1
      ) approving_authority
        ON TRUE

      WHERE
        r.is_active = TRUE
        AND (
          r.total_beds > 0
          OR r.room_status = 'STORE'
        )
        AND (
          rp.can_book = TRUE
          OR (
            $1 = 'RECEPTIONIST'
            AND rp.can_allot = TRUE
            AND rp.can_book = FALSE
            AND approving_authority.role_name IS NOT NULL
          )
        )

      ORDER BY
        CASE rc.category_name
          WHEN 'AC' THEN 1
          WHEN 'VIP' THEN 2
          WHEN 'NON_AC' THEN 3
          WHEN 'DORMITORY' THEN 4
          WHEN 'HALL' THEN 5
          ELSE 6
        END,
        r.room_number;
      `,
      [roleName]
    );

    const roomIds =
      result.rows.map(
        (room) => room.id
      );

    const assignmentResult =
      roomIds.length > 0
        ? await pool.query(
            `
            SELECT
              a.room_id,
              a.id AS allotment_id,
              a.allotment_status,
              b.booking_reference,
              g.id AS guest_id,
              g.guest_name,
              g.mobile_number,
              b.check_in_date,
              b.expected_check_out_date,
              ci.check_in_time,
              CASE
                WHEN ci.id IS NULL
                  THEN 'NOT_CHECKED_IN'
                ELSE 'CHECKED_IN'
              END AS check_in_status
            FROM allotments a
            INNER JOIN bookings b
              ON b.id = a.booking_id
            LEFT JOIN LATERAL (
              SELECT bg.guest_id
              FROM booking_guests bg
              WHERE bg.booking_id = a.booking_id
              ORDER BY bg.is_primary_guest DESC,
                bg.created_at ASC
              LIMIT 1
            ) primary_guest
              ON a.guest_id IS NULL
            LEFT JOIN guests g
              ON g.id = COALESCE(
                a.guest_id,
                primary_guest.guest_id
              )
            LEFT JOIN LATERAL (
              SELECT
                ci.id,
                ci.check_in_time
              FROM check_ins ci
              WHERE ci.allotment_id = a.id
                AND ci.guest_id = g.id
              ORDER BY ci.check_in_time DESC
              LIMIT 1
            ) ci ON TRUE
            WHERE a.room_id = ANY($1::uuid[])
              AND a.allotment_status = 'ALLOTTED'
              AND NOT EXISTS (
                SELECT 1
                FROM check_outs co
                WHERE co.allotment_id = a.id
              )
            ORDER BY
              a.room_id,
              b.booking_reference,
              g.guest_name
            `,
            [roomIds]
          )
        : { rows: [] };

    const assignmentsByRoom =
      new Map<string, typeof assignmentResult.rows>();

    for (const assignment of assignmentResult.rows) {
      const roomAssignments =
        assignmentsByRoom.get(
          assignment.room_id
        ) || [];

      roomAssignments.push(
        assignment
      );

      assignmentsByRoom.set(
        assignment.room_id,
        roomAssignments
      );
    }

    /*
    =====================================================
    2. PROCESS EACH ROOM
    =====================================================
    */

    const rooms = [];

    for (const room of result.rows) {
      /*
      -----------------------------------------------------
      CURRENT CHECKED-IN GUESTS
      -----------------------------------------------------
      */

      const checkedInResult =
        await pool.query(
          `
          SELECT
            COUNT(*)::INTEGER AS count

          FROM check_ins ci

          INNER JOIN allotments a
            ON a.id = ci.allotment_id

          LEFT JOIN check_outs co
            ON co.allotment_id = ci.allotment_id

          WHERE
            a.room_id = $1
            AND a.allotment_status = 'ALLOTTED'
            AND co.id IS NULL
          `,
          [room.id]
        );

      const checkedInCount = Number(
        checkedInResult.rows[0]?.count || 0
      );

      /*
      -----------------------------------------------------
      ACTIVE ALLOTMENTS
      -----------------------------------------------------

      This includes guests who are allotted but have
      not checked in yet.
      -----------------------------------------------------
      */

      const activeAllotmentResult =
        await pool.query(
          `
          SELECT
            COUNT(*)::INTEGER AS count

          FROM allotments a

          WHERE
            a.room_id = $1
            AND a.allotment_status = 'ALLOTTED'
            AND NOT EXISTS (
              SELECT 1
              FROM check_outs co
              WHERE co.allotment_id = a.id
            )
          `,
          [room.id]
        );

      const activeAllotmentCount = Number(
        activeAllotmentResult.rows[0]?.count || 0
      );

      /*
      -----------------------------------------------------
      HOUSEKEEPING STATUS
      -----------------------------------------------------

      Take the latest active housekeeping task.

      We do NOT consider old completed tasks.
      -----------------------------------------------------
      */

      const housekeepingResult =
        await pool.query(
          `
          SELECT
            task_status,
            assigned_at

          FROM housekeeping_tasks

          WHERE room_id = $1

          ORDER BY assigned_at DESC

          LIMIT 1
          `,
          [room.id]
        );

      const latestHousekeeping =
        housekeepingResult.rows[0] || null;

      const housekeepingStatus =
        latestHousekeeping?.task_status
          ? String(
              latestHousekeeping.task_status
            ).toUpperCase()
          : null;
      const storedRoomStatus = String(
        room.room_status || ""
      ).toUpperCase();

      /*
      -----------------------------------------------------
      DETERMINE REAL ROOM STATUS
      -----------------------------------------------------
      */

      let calculatedRoomStatus =
        "AVAILABLE";

      /*
      Priority 1:
      REAL CHECKED-IN GUEST
      */

      if (room.is_under_maintenance) {
        calculatedRoomStatus = "MAINTENANCE";
      } else if (checkedInCount > 0) {
        calculatedRoomStatus =
          "OCCUPIED";
      }

      else if (
        storedRoomStatus === "OUT" ||
        storedRoomStatus === "OUT_OF_SERVICE" ||
        storedRoomStatus === "OUT OF SERVICE"
      ) {
        calculatedRoomStatus =
          "OUT_OF_SERVICE";
      }

      /*
      Priority 2:
      HOUSEKEEPING CURRENTLY IN PROGRESS
      */

      else if (
        housekeepingStatus === "CLEANING" ||
        housekeepingStatus ===
          "HOUSEKEEPING" ||
        housekeepingStatus ===
          "HOUSEKEEPING / CLEANING"
      ) {
        calculatedRoomStatus =
          "CLEANING";
      }

      /*
      Priority 3:
      ROOM NEEDS CLEANING
      */

      else if (
        housekeepingStatus ===
          "NEEDS CLEANING" ||
        housekeepingStatus ===
          "NEEDS_CLEANING" ||
        storedRoomStatus === "NEEDS CLEANING" ||
        storedRoomStatus === "NEEDS_CLEANING"
      ) {
        calculatedRoomStatus =
          "NEEDS_CLEANING";
      }

      /*
      Priority 4:
      ACTIVE ALLOTMENT BUT NO CHECK-IN

      This is NOT OCCUPIED.
      */

      else if (
        activeAllotmentCount > 0
      ) {
        calculatedRoomStatus =
          "RESERVED";
      }

      /*
      Priority 5:
      NO OCCUPANT / ALLOTMENT /
      ACTIVE CLEANING TASK
      */

      else {
        calculatedRoomStatus =
          "AVAILABLE";
      }

      /*
      -----------------------------------------------------
      GET BEDS
      -----------------------------------------------------
      */

      const bedsResult =
        await pool.query(
          `
          SELECT
            b.id,
            b.room_id,
            b.bed_number,
            b.bed_status,
            b.is_active

          FROM beds b

          WHERE
            b.room_id = $1
            AND b.is_active = TRUE

          ORDER BY
            b.bed_number
          `,
          [room.id]
        );

      const beds = room.is_under_maintenance
        ? bedsResult.rows.map((bed) => ({
            ...bed,
            bed_status: "OUT_OF_SERVICE",
          }))
        : bedsResult.rows;

      /*
      -----------------------------------------------------
      ACTIVE BED ALLOTMENTS
      -----------------------------------------------------

      Only currently ALLOTTED beds count as occupied.

      RELEASED allotments do NOT count.
      -----------------------------------------------------
      */

      const activeBedResult =
        await pool.query(
          `
          SELECT
            a.bed_id

          FROM allotments a

          WHERE
            a.room_id = $1
            AND a.allotment_status = 'ALLOTTED'
            AND a.bed_id IS NOT NULL
            AND NOT EXISTS (
              SELECT 1
              FROM check_outs co
              WHERE co.allotment_id = a.id
            )
          `,
          [room.id]
        );

      const activeBedIds = new Set(
        activeBedResult.rows.map(
          (row) => row.bed_id
        )
      );

      /*
      -----------------------------------------------------
      AVAILABLE BED COUNT
      -----------------------------------------------------

      A bed is available only when:

      1. active
      2. AVAILABLE
      3. not actively allotted
      -----------------------------------------------------
      */

      const availableBeds = beds.filter(
        (bed) =>
          String(
            bed.bed_status
          ).toUpperCase() ===
            "AVAILABLE" &&
          !activeBedIds.has(bed.id)
      );

      /*
      -----------------------------------------------------
      IMPORTANT FOR ROOM-LEVEL AC / NAC / VIP
      -----------------------------------------------------

      For these rooms the receptionist selects the room,
      not individual beds.

      If room is OCCUPIED / RESERVED /
      NEEDS_CLEANING / CLEANING,

      the room itself is unavailable even if individual
      bed rows still say AVAILABLE.

      Therefore the frontend gets a correct availability
      number based on room status.
      -----------------------------------------------------
      */

      let availableBedCount =
        availableBeds.length;

      const roomLevelCategory =
        String(
          room.category_name || ""
        ).toUpperCase();

      const isRoomLevel =
        roomLevelCategory.includes(
          "AC"
        ) ||
        roomLevelCategory.includes(
          "NAC"
        ) ||
        roomLevelCategory.includes(
          "VIP"
        );

      if (
        isRoomLevel &&
        calculatedRoomStatus !==
          "AVAILABLE"
      ) {
        availableBedCount = 0;
      }

      /*
      -----------------------------------------------------
      RETURN ROOM
      -----------------------------------------------------
      */

      rooms.push({
        ...room,

        room_status:
          calculatedRoomStatus,

        total_beds:
          Number(room.total_beds),

        available_beds:
          availableBedCount,

        available_bed_count:
          availableBedCount,

        occupied_bed_count:
          Math.max(
            0,
            Number(room.total_beds) -
              availableBedCount
          ),

        checked_in_count:
          checkedInCount,

        active_allotment_count:
          activeAllotmentCount,

        assignments:
          assignmentsByRoom.get(
            room.id
          ) || [],

        current_status:
          room.room_status === "STORE"
            ? "STORE"
            : calculatedRoomStatus,

        beds,
      });
    }

    /*
    =====================================================
    FINAL RESPONSE
    =====================================================
    */

    return res.json({
      success: true,
      role: roleName,
      rooms,
    });

  } catch (error) {
    console.error(
      "Room fetch error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to fetch rooms",
    });
  }
});


/*
=========================================================
GET OTHER AUTHORITY ROOMS
RECEPTIONIST EXPLICIT ALLOTMENT
=========================================================
*/

router.get(
  "/authority-rooms",
  async (req, res) => {
    try {
      const roleName = req.authUser?.role;

      if (!roleName) {
        return res.status(401).json({
          success: false,
          message:
            "Authenticated user is required",
        });
      }

      /*
      Only Receptionist can use this endpoint.
      */

      if (
        roleName !==
        "RECEPTIONIST"
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Only the Receptionist can access other authority rooms",
        });
      }

      const result =
        await pool.query(
          `
          SELECT
            r.id,
            r.room_number,
            r.total_beds,
            r.room_status,
            r.room_status AS current_status,
            r.is_active,

            rc.category_name,

            rp.can_book
              AS receptionist_can_book,

            rp.can_allot
              AS receptionist_can_allot,

            rp.emergency_allot
              AS receptionist_emergency_allot,

            authority.role_name
              AS authority_role,

            authority.can_book
              AS authority_can_book,

            authority.can_allot
              AS authority_can_allot,

            authority.can_approve
              AS authority_can_approve

          FROM rooms r

          INNER JOIN room_categories rc
            ON rc.id = r.category_id

          INNER JOIN room_permissions rp
            ON rp.room_id = r.id
           AND rp.role_name =
               'RECEPTIONIST'

          INNER JOIN room_permissions authority
            ON authority.room_id = r.id
           AND authority.role_name <>
               'RECEPTIONIST'
           AND authority.can_approve = TRUE

          WHERE
            r.is_active = TRUE
            AND r.total_beds > 0
            AND rp.can_allot = TRUE
            AND rp.can_book = FALSE

          ORDER BY
            CASE rc.category_name
              WHEN 'AC' THEN 1
              WHEN 'VIP' THEN 2
              WHEN 'NON_AC' THEN 3
              WHEN 'DORMITORY' THEN 4
              WHEN 'HALL' THEN 5
              ELSE 6
            END,

            r.room_number;
          `
        );

      return res.json({
        success: true,
        role: roleName,
        rooms: result.rows,
      });

    } catch (error) {
      console.error(
        "Authority room fetch error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to fetch other authority rooms",
      });
    }
  }
);


/*
=========================================================
GET BEDS FOR A ROOM
=========================================================
*/

router.get(
  "/:roomId/beds",
  async (req, res) => {
    try {
      const requestedDates =
        readRequestedDateRange(req);

      if (!requestedDates) {
        return res.status(400).json({
          success: false,
          message:
            "Provide valid check_in_date and expected_check_out_date values in YYYY-MM-DD format.",
        });
      }

      const {
        roomId,
      } = req.params;

      const result =
        await pool.query(
          `
          SELECT
            b.id,
            b.room_id,
            b.bed_number,
            CASE
              WHEN EXISTS (
                SELECT 1
                FROM allotments a
                INNER JOIN bookings bk
                  ON bk.id = a.booking_id
                WHERE a.room_id = b.room_id
                  AND (
                    a.bed_id = b.id
                    OR a.bed_id IS NULL
                  )
                  AND a.allotment_status = 'ALLOTTED'
                  AND NOT EXISTS (
                    SELECT 1
                    FROM check_outs co
                    WHERE co.allotment_id = a.id
                  )
                  AND (
                    (
                      $2::date IS NULL
                      AND $3::date IS NULL
                    )
                    OR EXISTS (
                      SELECT 1
                      FROM check_ins ci
                      WHERE ci.allotment_id = a.id
                        AND ci.check_in_time::date <
                          $3::date
                    )
                    OR (
                      NOT EXISTS (
                        SELECT 1
                        FROM check_ins ci
                        WHERE ci.allotment_id = a.id
                          AND NOT EXISTS (
                            SELECT 1
                            FROM check_outs co
                            WHERE co.allotment_id =
                              ci.allotment_id
                          )
                      )
                      AND bk.check_in_date < $3::date
                      AND bk.expected_check_out_date >
                        $2::date
                    )
                    OR EXISTS (
                      SELECT 1
                      FROM booking_acceptances ba
                      INNER JOIN bookings accepted_booking
                        ON accepted_booking.id =
                          ba.booking_id
                      WHERE ba.room_id = b.room_id
                        AND (
                          ba.bed_id = b.id
                          OR ba.bed_id IS NULL
                        )
                        AND ba.acceptance_status =
                          'ACCEPTED'
                        AND accepted_booking.approval_status
                          <> 'REJECTED'
                        AND accepted_booking.booking_status
                          NOT IN (
                            'CHECKED_OUT',
                            'CANCELLED',
                            'REJECTED'
                          )
                        AND accepted_booking.check_in_date
                          < $3::date
                        AND accepted_booking.expected_check_out_date
                          > $2::date
                        AND NOT EXISTS (
                          SELECT 1
                          FROM allotments accepted_allotment
                          WHERE
                            accepted_allotment.booking_id =
                              accepted_booking.id
                            AND accepted_allotment.room_id =
                              ba.room_id
                            AND accepted_allotment.allotment_status =
                              'ALLOTTED'
                            AND (
                              accepted_allotment.bed_id =
                                ba.bed_id
                              OR accepted_allotment.bed_id
                                IS NULL
                            )
                            AND NOT EXISTS (
                              SELECT 1
                              FROM check_outs accepted_checkout
                              WHERE accepted_checkout.allotment_id =
                                accepted_allotment.id
                            )
                        )
                    )
                  )
              )
                THEN CASE
                  WHEN EXISTS (
                    SELECT 1
                    FROM allotments a
                    INNER JOIN check_ins ci
                      ON ci.allotment_id = a.id
                    WHERE a.room_id = b.room_id
                      AND (
                        a.bed_id = b.id
                        OR a.bed_id IS NULL
                      )
                      AND a.allotment_status =
                        'ALLOTTED'
                      AND NOT EXISTS (
                        SELECT 1
                        FROM check_outs co
                        WHERE co.allotment_id = a.id
                      )
                  )
                    THEN 'OCCUPIED'
                  ELSE 'RESERVED'
                END
              WHEN UPPER(b.bed_status) IN (
                'NEEDS_CLEANING',
                'NEEDS CLEANING',
                'CLEANING',
                'OUT',
                'OUT_OF_SERVICE',
                'OUT OF SERVICE'
              )
                THEN UPPER(b.bed_status)
              ELSE 'AVAILABLE'
            END AS bed_status,
            b.is_active

          FROM beds b

          WHERE
            b.room_id = $1
            AND b.is_active = TRUE

          ORDER BY
            b.bed_number;
          `,
          [
            roomId,
            requestedDates.checkIn,
            requestedDates.checkOut,
          ]
        );

      return res.json({
        success: true,
        beds: result.rows,
      });

    } catch (error) {
      console.error(
        "Bed fetch error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to fetch beds",
      });
    }
  }
);


export default router;