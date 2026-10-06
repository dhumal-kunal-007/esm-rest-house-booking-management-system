import { Router } from "express";
import { pool } from "../config/db.js";
import {
  type DailyReportType,
  buildLiveDailyReportSnapshot,
  persistDailyReportSnapshot,
} from "../services/dailyReport.js";

const router = Router();

/*
|--------------------------------------------------------------------------
| DASHBOARD SUMMARY
|--------------------------------------------------------------------------
| All dashboard figures are calculated from PostgreSQL.
|--------------------------------------------------------------------------
*/

router.get("/summary", async (req, res) => {
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
            AND r.is_under_maintenance = FALSE
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


        /* Beds and room-only allotments waiting for housekeeping */
        (
          (
            SELECT COUNT(*)
            FROM beds b
            INNER JOIN rooms r
              ON r.id = b.room_id
            WHERE
              b.is_active = TRUE
              AND r.is_active = TRUE
              AND UPPER(b.bed_status) = 'NEEDS_CLEANING'
          ) +
          (
            SELECT COUNT(*)
            FROM (
              SELECT DISTINCT ON (a.room_id)
                UPPER(REPLACE(ht.task_status, ' ', '_'))
                  AS task_status
              FROM housekeeping_tasks ht
              INNER JOIN allotments a
                ON a.id = ht.allotment_id
              INNER JOIN rooms r
                ON r.id = a.room_id
              WHERE
                a.bed_id IS NULL
                AND r.is_active = TRUE
              ORDER BY
                a.room_id,
                ht.assigned_at DESC,
                ht.id DESC
            ) latest_room_tasks
            WHERE task_status = 'NEEDS_CLEANING'
          )
        )::INTEGER AS needs_cleaning_beds,


        /* Beds and room-only allotments currently being cleaned */
        (
          (
            SELECT COUNT(*)
            FROM beds b
            INNER JOIN rooms r
              ON r.id = b.room_id
            WHERE
              b.is_active = TRUE
              AND r.is_active = TRUE
              AND UPPER(b.bed_status) = 'CLEANING'
          ) +
          (
            SELECT COUNT(*)
            FROM (
              SELECT DISTINCT ON (a.room_id)
                UPPER(REPLACE(ht.task_status, ' ', '_'))
                  AS task_status
              FROM housekeeping_tasks ht
              INNER JOIN allotments a
                ON a.id = ht.allotment_id
              INNER JOIN rooms r
                ON r.id = a.room_id
              WHERE
                a.bed_id IS NULL
                AND r.is_active = TRUE
              ORDER BY
                a.room_id,
                ht.assigned_at DESC,
                ht.id DESC
            ) latest_room_tasks
            WHERE task_status = 'CLEANING'
          )
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
        CASE
          WHEN
            (b.created_by = $1 OR $2 = 'ADMIN')
            AND b.booking_status = 'PENDING_APPROVAL'
            AND b.approval_status = 'APPROVED'
            AND accepted.accepted_guest_count =
              b.number_of_guests
            AND pricing.booking_id IS NOT NULL
            AND NOT EXISTS (
              SELECT 1 FROM payments p WHERE p.booking_id = b.id
            )
          THEN 'PAYMENT'
          WHEN
            (b.created_by = $1 OR $2 = 'ADMIN')
            AND b.booking_status = 'PENDING_APPROVAL'
            AND b.approval_status = 'PENDING'
            AND NOT EXISTS (
              SELECT 1 FROM payments p WHERE p.booking_id = b.id
            )
          THEN
            CASE
              WHEN accepted.accepted_guest_count < b.number_of_guests
                THEN 'AVAILABILITY'
              WHEN
                wp.current_step = 'COMPLETED'
                AND pricing.booking_id IS NOT NULL
                THEN 'BOOKING_CONFIRMATION'
              WHEN wp.current_step = 'AVAILABILITY'
                THEN 'AVAILABILITY'
              WHEN wp.current_step = 'RATE'
                THEN 'RATE'
              WHEN wp.current_step = 'GUEST_TYPE'
                THEN 'GUEST_TYPE'
              WHEN
                wp.current_step = 'BOOKING_CONFIRMATION'
                AND pricing.booking_id IS NOT NULL
                THEN 'BOOKING_CONFIRMATION'
              WHEN pricing.booking_id IS NULL
                THEN 'GUEST_TYPE'
              ELSE NULL
            END
          ELSE NULL
        END AS resume_step,

        COALESCE(
          primary_guest.guest_name,
          'Guest not assigned'
        ) AS guest_name,

        COALESCE(
          allotted_room.room_number,
          'Not allotted'
        ) AS room_number

      FROM bookings b
      LEFT JOIN booking_workflow_progress wp
        ON wp.booking_id = b.id
      LEFT JOIN LATERAL (
        SELECT COUNT(DISTINCT ba.guest_id)::INTEGER AS accepted_guest_count
        FROM booking_acceptances ba
        WHERE
          ba.booking_id = b.id
          AND ba.acceptance_status = 'ACCEPTED'
      ) accepted ON TRUE
      LEFT JOIN booking_pricing pricing
        ON pricing.booking_id = b.id

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
    `, [req.authUser?.id, req.authUser?.role]);


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

router.get("/collections", async (req, res) => {
  if (req.authUser?.role !== "ADMIN") {
    return res.status(403).json({
      success: false,
      message: "Only an ADMIN can view collection summaries.",
    });
  }

  try {
    const constraintResult = await pool.query(
      `
      SELECT pg_get_constraintdef(oid) AS definition
      FROM pg_constraint
      WHERE conname = 'payments_status_check'
        AND conrelid = 'payments'::regclass
      LIMIT 1
      `
    );
    const constraint = constraintResult.rows[0]?.definition;
    if (typeof constraint !== "string") {
      throw new Error("payments_status_check constraint was not found.");
    }
    const allowedStatuses = (constraint.match(/'([^']+)'/g) ?? [])
      .map((value: string) => value.slice(1, -1));
    const successfulStatus = [
      "SUCCESS",
      "COMPLETED",
      "PAID",
      "RECEIVED",
    ].find((status) => allowedStatuses.includes(status));
    if (!successfulStatus) {
      throw new Error(
        `No successful payment status was found. Allowed statuses: ${allowedStatuses.join(", ")}`
      );
    }

    const result = await pool.query(
      `
      SELECT
        COALESCE(SUM(amount) FILTER (
          WHERE payment_date::date = CURRENT_DATE
        ), 0) AS today_total,
        COALESCE(SUM(amount) FILTER (
          WHERE payment_date::date = CURRENT_DATE
            AND payment_method = 'CASH'
        ), 0) AS today_cash,
        COALESCE(SUM(amount) FILTER (
          WHERE payment_date::date = CURRENT_DATE
            AND payment_method = 'UPI'
        ), 0) AS today_upi_qr,
        COALESCE(SUM(amount) FILTER (
          WHERE payment_date::date = CURRENT_DATE
            AND payment_method NOT IN ('CASH', 'UPI')
        ), 0) AS today_other,
        COALESCE(SUM(amount) FILTER (
          WHERE DATE_TRUNC('month', payment_date::date) =
                DATE_TRUNC('month', CURRENT_DATE)
            AND payment_method = 'CASH'
        ), 0) AS month_cash,
        COALESCE(SUM(amount) FILTER (
          WHERE DATE_TRUNC('month', payment_date::date) =
                DATE_TRUNC('month', CURRENT_DATE)
            AND payment_method = 'UPI'
        ), 0) AS month_upi_qr,
        COALESCE(SUM(amount) FILTER (
          WHERE DATE_TRUNC('month', payment_date::date) =
                DATE_TRUNC('month', CURRENT_DATE)
            AND payment_method NOT IN ('CASH', 'UPI')
        ), 0) AS month_other,
        COALESCE(SUM(amount) FILTER (
          WHERE DATE_TRUNC('month', payment_date::date) =
                DATE_TRUNC('month', CURRENT_DATE)
        ), 0) AS month_total
      FROM payments
      WHERE payment_status = $1
      `,
      [successfulStatus]
    );
    const row = result.rows[0];
    return res.json({
      success: true,
      collections: {
        todayTotal: Number(row.today_total),
        todayCash: Number(row.today_cash),
        todayUpiQr: Number(row.today_upi_qr),
        todayOther: Number(row.today_other),
        monthCash: Number(row.month_cash),
        monthUpiQr: Number(row.month_upi_qr),
        monthOther: Number(row.month_other),
        monthTotal: Number(row.month_total),
      },
    });
  } catch (error) {
    console.error("Dashboard collection summary error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load collection summaries.",
    });
  }
});

router.get("/daily-report", async (req, res) => {
  const reportDate = String(req.query.date ?? "");
  const requestedType = String(req.query.period ?? "daily").toUpperCase();
  if (!["DAILY", "WEEKLY", "MONTHLY"].includes(requestedType)) {
    return res.status(400).json({
      success: false,
      message: "Report period must be daily, weekly, or monthly.",
    });
  }
  const reportType = requestedType as DailyReportType;
  const parsedDate = new Date(`${reportDate}T00:00:00.000Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(reportDate) ||
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== reportDate
  ) {
    return res.status(400).json({
      success: false,
      message: "A valid report date in YYYY-MM-DD format is required.",
    });
  }

  try {
    const scheduleResult = await pool.query<{
      today: string;
      report_due: boolean;
      normalized_report_date: string;
    }>(`
      SELECT
        (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::DATE::TEXT AS today,
        (
          CASE $2::TEXT
            WHEN 'WEEKLY' THEN
              (date_trunc('week', $1::DATE)::DATE + 6)
            WHEN 'MONTHLY' THEN
              (date_trunc('month', $1::DATE) + INTERVAL '1 month - 1 day')::DATE
            ELSE $1::DATE
          END
          < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::DATE
          OR (
            CASE $2::TEXT
              WHEN 'WEEKLY' THEN
                (date_trunc('week', $1::DATE)::DATE + 6)
              WHEN 'MONTHLY' THEN
                (date_trunc('month', $1::DATE) + INTERVAL '1 month - 1 day')::DATE
              ELSE $1::DATE
            END =
              (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::DATE
            AND (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::TIME
              >= TIME '21:00'
          )
        ) AS report_due,
        CASE $2::TEXT
          WHEN 'WEEKLY' THEN
            (date_trunc('week', $1::DATE)::DATE + 6)::TEXT
          WHEN 'MONTHLY' THEN
            (date_trunc('month', $1::DATE) + INTERVAL '1 month - 1 day')::DATE::TEXT
          ELSE $1::DATE::TEXT
        END AS normalized_report_date
    `, [reportDate, reportType]);
    const {
      today,
      report_due: reportDue,
      normalized_report_date: normalizedReportDate,
    } = scheduleResult.rows[0];
    if (reportDate > today) {
      return res.status(400).json({
        success: false,
        message: "The daily report date cannot be in the future.",
      });
    }
    const savedResult = await pool.query<{
      snapshot: Awaited<ReturnType<typeof persistDailyReportSnapshot>>;
    }>(
      `
      SELECT snapshot
      FROM daily_report_snapshots
      WHERE report_type = $1
        AND report_date = $2::DATE
      `,
      [reportType, normalizedReportDate]
    );

    const snapshot =
      savedResult.rows[0]?.snapshot ??
      (reportDue
        ? await persistDailyReportSnapshot(normalizedReportDate, reportType)
        : await buildLiveDailyReportSnapshot(reportDate, reportType));

    const { feedback, ...reportData } = snapshot;
    return res.json({
      success: true,
      ...reportData,
      feedback: req.authUser?.role === "ADMIN" ? feedback : [],
      snapshotSaved: Boolean(savedResult.rows[0]) || reportDue,
    });
  } catch (error) {
    console.error("Daily report load error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load the daily report.",
    });
  }
});

export default router;