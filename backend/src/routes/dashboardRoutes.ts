import { Router } from "express";
import { pool } from "../config/db.js";

const router = Router();

/*
|--------------------------------------------------------------------------
| DASHBOARD SUMMARY
|--------------------------------------------------------------------------
| All dashboard figures are calculated from PostgreSQL.
|--------------------------------------------------------------------------
*/

router.get("/summary", async (_req, res) => {
  try {
    /*
    |--------------------------------------------------------------------------
    | MAIN STATISTICS
    |--------------------------------------------------------------------------
    */

    const summaryResult = await pool.query(`
      SELECT

        /* Total bookings in the system */
        (
          SELECT COUNT(*)
          FROM bookings
        )::INTEGER AS total_bookings,


        /* Beds which are genuinely available */
        (
          SELECT COUNT(*)
          FROM beds b
          INNER JOIN rooms r
            ON r.id = b.room_id
          WHERE
            b.is_active = TRUE
            AND r.is_active = TRUE
            AND UPPER(b.bed_status) = 'AVAILABLE'
        )::INTEGER AS available_beds,


        /* Beds currently occupied */
        (
          SELECT COUNT(*)
          FROM beds b
          INNER JOIN rooms r
            ON r.id = b.room_id
          WHERE
            b.is_active = TRUE
            AND r.is_active = TRUE
            AND UPPER(b.bed_status) = 'OCCUPIED'
        )::INTEGER AS occupied_beds,


        /* Guests who actually checked in today */
        (
          SELECT COUNT(*)
          FROM check_ins ci
          WHERE
            DATE(ci.check_in_time) = CURRENT_DATE
        )::INTEGER AS todays_check_ins,


        /* Beds waiting for housekeeping */
        (
          SELECT COUNT(*)
          FROM beds b
          INNER JOIN rooms r
            ON r.id = b.room_id
          WHERE
            b.is_active = TRUE
            AND r.is_active = TRUE
            AND UPPER(b.bed_status) = 'NEEDS_CLEANING'
        )::INTEGER AS needs_cleaning_beds,


        /* Beds currently being cleaned */
        (
          SELECT COUNT(*)
          FROM beds b
          INNER JOIN rooms r
            ON r.id = b.room_id
          WHERE
            b.is_active = TRUE
            AND r.is_active = TRUE
            AND UPPER(b.bed_status) = 'CLEANING'
        )::INTEGER AS cleaning_beds

    `);


    /*
    |--------------------------------------------------------------------------
    | ROOM CATEGORY COUNTS
    |--------------------------------------------------------------------------
    */

    const roomCategoryResult = await pool.query(`
      SELECT
        LOWER(TRIM(rc.category_name)) AS category_name,
        COUNT(r.id)::INTEGER AS room_count
      FROM rooms r
      INNER JOIN room_categories rc
        ON rc.id = r.category_id
      WHERE
        r.is_active = TRUE
      GROUP BY
        LOWER(TRIM(rc.category_name))
      ORDER BY
        LOWER(TRIM(rc.category_name))
    `);


    /*
    |--------------------------------------------------------------------------
    | RECENT BOOKINGS
    |--------------------------------------------------------------------------
    */

    const recentBookingsResult = await pool.query(`
      SELECT
        b.id,
        b.booking_reference,
        b.booking_status,
        b.approval_status,
        b.booking_type,
        b.check_in_date,
        b.expected_check_out_date,
        b.created_at,

        COALESCE(
          primary_guest.guest_name,
          'Guest not assigned'
        ) AS guest_name,

        COALESCE(
          allotted_room.room_number,
          'Not allotted'
        ) AS room_number

      FROM bookings b

      LEFT JOIN LATERAL (
        SELECT
          g.guest_name
        FROM booking_guests bg
        INNER JOIN guests g
          ON g.id = bg.guest_id
        WHERE
          bg.booking_id = b.id
        ORDER BY
          bg.is_primary_guest DESC,
          bg.created_at ASC
        LIMIT 1
      ) primary_guest
        ON TRUE

      LEFT JOIN LATERAL (
        SELECT
          r.room_number
        FROM allotments a
        INNER JOIN rooms r
          ON r.id = a.room_id
        WHERE
          a.booking_id = b.id
        ORDER BY
          CASE
            WHEN a.allotment_status = 'ALLOTTED'
              THEN 0
            WHEN a.allotment_status = 'RELEASED'
              THEN 1
            ELSE 2
          END,
          a.allotted_at DESC
        LIMIT 1
      ) allotted_room
        ON TRUE

      ORDER BY
        b.created_at DESC

      LIMIT 8
    `);


    /*
    |--------------------------------------------------------------------------
    | NORMALISE ROOM CATEGORIES
    |--------------------------------------------------------------------------
    */

    let acRooms = 0;
    let nonAcRooms = 0;
    let dormitories = 0;
    let hallRooms = 0;

    for (const row of roomCategoryResult.rows) {
      const category = String(
        row.category_name || ""
      )
        .toLowerCase()
        .replace(/[\s_-]/g, "");

      const count = Number(
        row.room_count || 0
      );

      if (category === "ac") {
        acRooms += count;
      } else if (
        category === "nonac" ||
        category === "nonairconditioned"
      ) {
        nonAcRooms += count;
      } else if (
        category === "dorm" ||
        category === "dormitory" ||
        category === "dormitories"
      ) {
        dormitories += count;
      } else if (
        category === "hall"
      ) {
        hallRooms += count;
      }
    }


    const summary = summaryResult.rows[0];


    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */

    res.json({
      success: true,

      summary: {
        totalBookings:
          Number(summary.total_bookings || 0),

        availableBeds:
          Number(summary.available_beds || 0),

        occupiedBeds:
          Number(summary.occupied_beds || 0),

        todaysCheckIns:
          Number(summary.todays_check_ins || 0),

        needsCleaningBeds:
          Number(summary.needs_cleaning_beds || 0),

        cleaningBeds:
          Number(summary.cleaning_beds || 0),
      },

      roomStatus: {
        acRooms,
        nonAcRooms,
        dormitories,
        hallRooms,
      },

      recentBookings:
        recentBookingsResult.rows,
    });

  } catch (error) {

    console.error(
      "Error loading dashboard summary:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Unable to load dashboard information.",
    });
  }
});


export default router;