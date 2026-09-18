import { Router, Request, Response } from "express";
import { pool } from "../config/db.js";

const router = Router();


/* =========================================
   GET ELIGIBLE GUESTS FOR CHECK-IN

   Only APPROVED bookings are eligible.
========================================= */

router.get(
  "/eligible",
  async (
    _req: Request,
    res: Response
  ) => {

    try {

      const result = await pool.query(`
        SELECT
          a.id AS allotment_id,
          a.booking_id,
          b.booking_reference,
          a.guest_id,
          g.guest_name,
          g.mobile_number,
          a.room_id,
          r.room_number,
          a.bed_id,
          bd.bed_number,
          b.check_in_date,
          b.expected_check_out_date,
          b.approval_status,
          a.allotment_status,

          CASE
            WHEN ci.id IS NOT NULL
              THEN 'CHECKED_IN'
            ELSE 'NOT_CHECKED_IN'
          END AS check_in_status

        FROM allotments a

        INNER JOIN bookings b
          ON b.id = a.booking_id

        INNER JOIN guests g
          ON g.id = a.guest_id

        INNER JOIN rooms r
          ON r.id = a.room_id

        INNER JOIN beds bd
          ON bd.id = a.bed_id

        LEFT JOIN check_ins ci
          ON ci.allotment_id = a.id

        WHERE
          a.allotment_status = 'ALLOTTED'
          AND b.approval_status = 'APPROVED'

        ORDER BY
          b.check_in_date ASC,
          r.room_number ASC,
          bd.bed_number ASC,
          g.guest_name ASC
      `);


      res.json({
        guests: result.rows,
      });

    } catch (error) {

      console.error(
        "GET /api/check-ins/eligible error:",
        error
      );

      res.status(500).json({
        message:
          "Unable to load guests eligible for check-in.",
      });

    }

  }
);


/* =========================================
   POST CHECK-IN
========================================= */

router.post(
  "/",
  async (
    req: Request,
    res: Response
  ) => {

    const {
      allotment_id,
      booking_id,
      guest_id,
      room_id,
      bed_id,
      checked_in_by,
      remarks,
    } = req.body;


    if (!allotment_id) {

      return res.status(400).json({
        message:
          "Allotment ID is required.",
      });

    }


    if (!booking_id) {

      return res.status(400).json({
        message:
          "Booking ID is required.",
      });

    }


    if (!guest_id) {

      return res.status(400).json({
        message:
          "Guest ID is required.",
      });

    }


    if (!room_id) {

      return res.status(400).json({
        message:
          "Room ID is required.",
      });

    }


    if (!bed_id) {

      return res.status(400).json({
        message:
          "Bed ID is required.",
      });

    }


    if (!checked_in_by) {

      return res.status(400).json({
        message:
          "Checked-in user ID is required.",
      });

    }


    const client =
      await pool.connect();


    try {

      await client.query(
        "BEGIN"
      );


      /* =========================================
         LOCK AND VERIFY ALLOTMENT
      ========================================= */

      const allotmentResult =
        await client.query(
          `
          SELECT
            a.id,
            a.booking_id,
            a.guest_id,
            a.room_id,
            a.bed_id,
            a.allotment_status

          FROM allotments a

          WHERE a.id = $1

          FOR UPDATE
          `,
          [
            allotment_id,
          ]
        );


      if (
        allotmentResult.rows.length ===
        0
      ) {

        await client.query(
          "ROLLBACK"
        );

        return res.status(404).json({
          message:
            "The selected allotment was not found.",
        });

      }


      const allotment =
        allotmentResult.rows[0];


      /* =========================================
         VERIFY ALLOTMENT STATUS
      ========================================= */

      if (
        allotment.allotment_status !==
        "ALLOTTED"
      ) {

        await client.query(
          "ROLLBACK"
        );

        return res.status(400).json({
          message:
            "This allotment is no longer active.",
        });

      }


      /* =========================================
         VERIFY REQUEST MATCHES DATABASE
      ========================================= */

      if (
        allotment.booking_id !==
        booking_id ||
        allotment.guest_id !==
        guest_id ||
        allotment.room_id !==
        room_id ||
        allotment.bed_id !==
        bed_id
      ) {

        await client.query(
          "ROLLBACK"
        );

        return res.status(400).json({
          message:
            "The check-in information does not match the active allotment.",
        });

      }


      /* =========================================
         LOCK AND VERIFY BOOKING APPROVAL

         CHECK-IN IS ALLOWED ONLY WHEN
         approval_status = APPROVED
      ========================================= */

      const bookingResult =
        await client.query(
          `
          SELECT
            id,
            booking_reference,
            booking_status,
            approval_status,
            check_in_date,
            expected_check_out_date

          FROM bookings

          WHERE id = $1

          FOR UPDATE
          `,
          [
            booking_id,
          ]
        );


      if (
        bookingResult.rows.length ===
        0
      ) {

        await client.query(
          "ROLLBACK"
        );

        return res.status(404).json({
          message:
            "The booking associated with this allotment was not found.",
        });

      }


      const booking =
        bookingResult.rows[0];


      /* =========================================
         APPROVAL GATE
      ========================================= */

      if (
        booking.approval_status !==
        "APPROVED"
      ) {

        await client.query(
          "ROLLBACK"
        );

        if (
          booking.approval_status ===
          "PENDING"
        ) {

          return res.status(403).json({
            message:
              "Check-in is not allowed because this booking is awaiting approval.",
            approval_status:
              booking.approval_status,
            booking_reference:
              booking.booking_reference,
          });

        }


        if (
          booking.approval_status ===
          "REJECTED"
        ) {

          return res.status(403).json({
            message:
              "Check-in is not allowed because this booking has been rejected.",
            approval_status:
              booking.approval_status,
            booking_reference:
              booking.booking_reference,
          });

        }


        return res.status(403).json({
          message:
            "Check-in is not allowed until the booking is approved.",
          approval_status:
            booking.approval_status,
          booking_reference:
            booking.booking_reference,
        });

      }


      /* =========================================
         CHECK WHETHER ALREADY CHECKED IN
      ========================================= */

      const existingCheckIn =
        await client.query(
          `
          SELECT
            id,
            check_in_time

          FROM check_ins

          WHERE allotment_id = $1

          LIMIT 1

          FOR UPDATE
          `,
          [
            allotment_id,
          ]
        );


      if (
        existingCheckIn.rows.length >
        0
      ) {

        await client.query(
          "ROLLBACK"
        );

        return res.status(409).json({
          message:
            "This guest has already been checked in.",
          checkIn:
            existingCheckIn.rows[0],
        });

      }


      /* =========================================
         VERIFY USER EXISTS
      ========================================= */

      const userResult =
        await client.query(
          `
          SELECT
            id,
            is_active

          FROM users

          WHERE id = $1
          `,
          [
            checked_in_by,
          ]
        );


      if (
        userResult.rows.length ===
        0
      ) {

        await client.query(
          "ROLLBACK"
        );

        return res.status(404).json({
          message:
            "The checking-in user was not found.",
        });

      }


      if (
        !userResult.rows[0].is_active
      ) {

        await client.query(
          "ROLLBACK"
        );

        return res.status(403).json({
          message:
            "The checking-in user is inactive.",
        });

      }


      /* =========================================
         CREATE CHECK-IN RECORD
      ========================================= */

      const checkInResult =
        await client.query(
          `
          INSERT INTO check_ins (
            booking_id,
            guest_id,
            allotment_id,
            check_in_time,
            checked_in_by,
            remarks
          )

          VALUES (
            $1,
            $2,
            $3,
            CURRENT_TIMESTAMP,
            $4,
            $5
          )

          RETURNING
            id,
            booking_id,
            guest_id,
            allotment_id,
            check_in_time,
            checked_in_by,
            remarks
          `,
          [
            booking_id,
            guest_id,
            allotment_id,
            checked_in_by,
            remarks ?? null,
          ]
        );


      /* =========================================
         UPDATE BOOKING STATUS

         Only change to CHECKED_IN when
         all currently allotted guests
         of the booking have checked in.
      ========================================= */

      const bookingGuestsResult =
        await client.query(
          `
          SELECT
            COUNT(*)::INTEGER AS total_guests

          FROM booking_guests

          WHERE booking_id = $1
          `,
          [
            booking_id,
          ]
        );


      const checkedInGuestsResult =
        await client.query(
          `
          SELECT
            COUNT(*)::INTEGER AS checked_in_guests

          FROM check_ins

          WHERE booking_id = $1
          `,
          [
            booking_id,
          ]
        );


      const totalGuests =
        bookingGuestsResult.rows[0]
          .total_guests;

      const checkedInGuests =
        checkedInGuestsResult.rows[0]
          .checked_in_guests;


      if (
        checkedInGuests >=
        totalGuests
      ) {

        await client.query(
          `
          UPDATE bookings

          SET
            booking_status = 'CHECKED_IN',
            updated_at = CURRENT_TIMESTAMP

          WHERE id = $1
          `,
          [
            booking_id,
          ]
        );

      }


      await client.query(
        "COMMIT"
      );


      return res.status(201).json({

        message:
          "Check-in completed successfully.",

        checkIn:
          checkInResult.rows[0],

      });

    } catch (error) {

      await client.query(
        "ROLLBACK"
      );

      console.error(
        "POST /api/check-ins error:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to complete check-in.",
      });

    } finally {

      client.release();

    }

  }
);


export default router;