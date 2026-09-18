import {
  Router,
  Request,
  Response,
} from "express";

import { pool } from "../config/db.js";

const router = Router();

/* =========================================================
   GET PENDING APPROVALS

   GET /api/approvals/pending/:userId

   Shows bookings that:
   - have been allotted
   - are still PENDING approval
   - belong to a room for which the logged-in user's
     role has can_approve = TRUE

   Example:
   AC 1 -> SUPERINTENDENT
========================================================= */

router.get(
  "/pending/:userId",
  async (
    req: Request,
    res: Response
  ) => {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required.",
      });
    }

    try {
      /* =========================================
         VERIFY USER
      ========================================= */

      const userResult = await pool.query(
        `
        SELECT
          u.id,
          u.full_name,
          u.username,
          u.is_active,
          r.role_name
        FROM users u
        INNER JOIN roles r
          ON r.id = u.role_id
        WHERE u.id = $1
        `,
        [userId]
      );

      if (userResult.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found.",
        });
      }

      const user = userResult.rows[0];

      if (!user.is_active) {
        return res.status(403).json({
          success: false,
          message: "User account is inactive.",
        });
      }

      /* =========================================
         RECEPTIONIST CANNOT APPROVE
      ========================================= */

      if (user.role_name === "RECEPTIONIST") {
        return res.json({
          success: true,
          approvals: [],
        });
      }

      /* =========================================
         PENDING APPROVALS

         IMPORTANT:
         Approval authority comes from
         room_permissions.can_approve.

         We do NOT hard-code Superintendent,
         Welfare Organizer, OLC Manager, etc.
      ========================================= */

      const result = await pool.query(
        `
        SELECT
          bk.id AS booking_id,
          bk.booking_reference,
          bk.booking_type,
          bk.booking_date,
          bk.check_in_date,
          bk.expected_check_out_date,
          bk.number_of_guests,
          bk.booking_status,
          bk.approval_status,
          bk.purpose_of_visit,
          bk.special_requirements,
          bk.is_emergency,
          bk.created_at,

          creator.id AS created_by,
          creator.full_name AS created_by_name,
          creator.username AS created_by_username,

          a.id AS allotment_id,
          a.room_id,
          a.bed_id,
          a.guest_id,
          a.allotted_by,
          a.is_emergency_allotment,
          a.allotted_at,
          a.remarks AS allotment_remarks,

          r.room_number,
          r.room_status,

          b.bed_number,
          b.bed_status,

          rc.category_name,

          g.guest_name,
          g.gender,
          g.mobile_number,
          g.relationship,
          g.rank,

          approver_permission.role_name AS responsible_role

        FROM bookings bk

        INNER JOIN allotments a
          ON a.booking_id = bk.id
          AND a.allotment_status = 'ALLOTTED'

        INNER JOIN rooms r
          ON r.id = a.room_id

        INNER JOIN beds b
          ON b.id = a.bed_id

        INNER JOIN room_categories rc
          ON rc.id = r.category_id

        INNER JOIN guests g
          ON g.id = a.guest_id

        INNER JOIN users creator
          ON creator.id = bk.created_by

        INNER JOIN room_permissions approver_permission
          ON approver_permission.room_id = r.id
          AND approver_permission.can_approve = TRUE

        WHERE
          bk.approval_status = 'PENDING'
          AND approver_permission.role_name = $1

        ORDER BY
          bk.created_at ASC,
          bk.booking_reference ASC,
          r.room_number ASC,
          b.bed_number ASC
        `,
        [user.role_name]
      );

      return res.json({
        success: true,
        approvals: result.rows,
      });
    } catch (error) {
      console.error(
        "Get pending approvals error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to retrieve pending approvals.",
      });
    }
  }
);

/* =========================================================
   GET APPROVAL DETAILS

   GET /api/approvals/:bookingId
========================================================= */

router.get(
  "/:bookingId",
  async (
    req: Request,
    res: Response
  ) => {
    const { bookingId } = req.params;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: "Booking ID is required.",
      });
    }

    try {
      /* =========================================
         BOOKING
      ========================================= */

      const bookingResult = await pool.query(
        `
        SELECT
          bk.id,
          bk.booking_reference,
          bk.booking_type,
          bk.booking_date,
          bk.check_in_date,
          bk.expected_check_out_date,
          bk.number_of_guests,
          bk.booking_status,
          bk.approval_status,
          bk.purpose_of_visit,
          bk.special_requirements,
          bk.is_emergency,
          bk.created_at,

          u.id AS created_by,
          u.full_name AS created_by_name,
          u.username AS created_by_username

        FROM bookings bk

        INNER JOIN users u
          ON u.id = bk.created_by

        WHERE bk.id = $1
        `,
        [bookingId]
      );

      if (bookingResult.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: "Booking not found.",
        });
      }

      /* =========================================
         ALLOTMENTS
      ========================================= */

      const allotmentResult = await pool.query(
        `
        SELECT
          a.id,
          a.room_id,
          a.bed_id,
          a.guest_id,
          a.allotted_by,
          a.allotment_status,
          a.is_emergency_allotment,
          a.allotted_at,
          a.released_at,
          a.remarks,

          r.room_number,
          r.room_status,

          b.bed_number,
          b.bed_status,

          rc.category_name,

          g.guest_name,
          g.gender,
          g.mobile_number,
          g.relationship,
          g.rank,

          au.full_name AS allotted_by_name,

          rp.role_name AS responsible_role

        FROM allotments a

        INNER JOIN rooms r
          ON r.id = a.room_id

        INNER JOIN beds b
          ON b.id = a.bed_id

        INNER JOIN room_categories rc
          ON rc.id = r.category_id

        INNER JOIN guests g
          ON g.id = a.guest_id

        INNER JOIN users au
          ON au.id = a.allotted_by

        LEFT JOIN room_permissions rp
          ON rp.room_id = r.id
          AND rp.can_approve = TRUE

        WHERE
          a.booking_id = $1
          AND a.allotment_status = 'ALLOTTED'

        ORDER BY
          r.room_number,
          b.bed_number
        `,
        [bookingId]
      );

      /* =========================================
         APPROVAL HISTORY
      ========================================= */

      const approvalResult = await pool.query(
        `
        SELECT
          ba.id,
          ba.booking_id,
          ba.approver_id,
          ba.approval_status,
          ba.remarks,
          ba.approved_at,
          ba.created_at,

          u.full_name AS approver_name,
          u.username AS approver_username,

          r.role_name AS approver_role

        FROM booking_approvals ba

        INNER JOIN users u
          ON u.id = ba.approver_id

        INNER JOIN roles r
          ON r.id = u.role_id

        WHERE
          ba.booking_id = $1

        ORDER BY
          ba.created_at DESC
        `,
        [bookingId]
      );

      return res.json({
        success: true,

        booking: bookingResult.rows[0],

        allotments:
          allotmentResult.rows,

        approvals:
          approvalResult.rows,
      });
    } catch (error) {
      console.error(
        "Get approval details error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to retrieve approval details.",
      });
    }
  }
);

/* =========================================================
   APPROVE BOOKING

   POST /api/approvals/:bookingId/approve

   Body:
   {
     "approver_id": "...",
     "remarks": "..."
   }
========================================================= */

router.post(
  "/:bookingId/approve",
  async (
    req: Request,
    res: Response
  ) => {
    const { bookingId } = req.params;

    const {
      approver_id,
      remarks = null,
    } = req.body;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: "Booking ID is required.",
      });
    }

    if (!approver_id) {
      return res.status(400).json({
        success: false,
        message: "Approver ID is required.",
      });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      /* =========================================
         VERIFY APPROVER
      ========================================= */

      const userResult = await client.query(
        `
        SELECT
          u.id,
          u.full_name,
          u.username,
          u.is_active,
          r.role_name
        FROM users u
        INNER JOIN roles r
          ON r.id = u.role_id
        WHERE u.id = $1
        `,
        [approver_id]
      );

      if (userResult.rowCount === 0) {
        throw new Error(
          "Approver was not found."
        );
      }

      const approver = userResult.rows[0];

      if (!approver.is_active) {
        throw new Error(
          "Approver account is inactive."
        );
      }

      if (approver.role_name === "RECEPTIONIST") {
        throw new Error(
          "Receptionist cannot approve bookings."
        );
      }

      /* =========================================
         LOCK BOOKING
      ========================================= */

      const bookingResult =
        await client.query(
          `
          SELECT
            id,
            booking_reference,
            booking_status,
            approval_status
          FROM bookings
          WHERE id = $1
          FOR UPDATE
          `,
          [bookingId]
        );

      if (bookingResult.rowCount === 0) {
        throw new Error(
          "Booking not found."
        );
      }

      const booking = bookingResult.rows[0];

      if (
        booking.approval_status !==
        "PENDING"
      ) {
        throw new Error(
          `This booking is already ${String(
            booking.approval_status
          ).toLowerCase()}.`
        );
      }

      /* =========================================
         VERIFY RESPONSIBLE AUTHORITY

         User's role must have can_approve = TRUE
         for at least one active allotment.
      ========================================= */

      const permissionResult =
        await client.query(
          `
          SELECT DISTINCT
            r.id AS room_id,
            r.room_number,
            rp.role_name
          FROM allotments a

          INNER JOIN rooms r
            ON r.id = a.room_id

          INNER JOIN room_permissions rp
            ON rp.room_id = r.id
            AND rp.can_approve = TRUE

          WHERE
            a.booking_id = $1
            AND a.allotment_status = 'ALLOTTED'
            AND rp.role_name = $2
          `,
          [
            bookingId,
            approver.role_name,
          ]
        );

      if (permissionResult.rowCount === 0) {
        throw new Error(
          "You are not the responsible authority for the room allotted to this booking."
        );
      }

      /* =========================================
         CREATE APPROVAL RECORD
      ========================================= */

      const approvalResult =
        await client.query(
          `
          INSERT INTO booking_approvals (
            booking_id,
            approver_id,
            approval_status,
            remarks,
            approved_at
          )
          VALUES (
            $1,
            $2,
            'APPROVED',
            $3,
            CURRENT_TIMESTAMP
          )
          RETURNING
            id,
            booking_id,
            approver_id,
            approval_status,
            remarks,
            approved_at,
            created_at
          `,
          [
            bookingId,
            approver_id,
            remarks,
          ]
        );

      /* =========================================
         UPDATE BOOKING

         IMPORTANT:
         Booking remains ALLOTTED.
         Only approval_status changes.
      ========================================= */

      await client.query(
        `
        UPDATE bookings
        SET
          approval_status = 'APPROVED',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        `,
        [bookingId]
      );

      await client.query("COMMIT");

      return res.status(200).json({
        success: true,

        message:
          "Booking approved successfully.",

        booking: {
          id: booking.id,

          booking_reference:
            booking.booking_reference,

          booking_status:
            booking.booking_status,

          approval_status:
            "APPROVED",
        },

        approval:
          approvalResult.rows[0],
      });
    } catch (error) {
      await client.query("ROLLBACK");

      console.error(
        "Approve booking error:",
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : "Unable to approve booking.";

      return res.status(400).json({
        success: false,
        message,
      });
    } finally {
      client.release();
    }
  }
);

/* =========================================================
   REJECT BOOKING

   POST /api/approvals/:bookingId/reject

   Body:
   {
     "approver_id": "...",
     "remarks": "Reason for rejection"
   }
========================================================= */

router.post(
  "/:bookingId/reject",
  async (
    req: Request,
    res: Response
  ) => {
    const { bookingId } = req.params;

    const {
      approver_id,
      remarks = null,
    } = req.body;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: "Booking ID is required.",
      });
    }

    if (!approver_id) {
      return res.status(400).json({
        success: false,
        message: "Approver ID is required.",
      });
    }

    if (
      !remarks ||
      String(remarks).trim() === ""
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Rejection remarks are required.",
      });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      /* =========================================
         VERIFY APPROVER
      ========================================= */

      const userResult = await client.query(
        `
        SELECT
          u.id,
          u.full_name,
          u.username,
          u.is_active,
          r.role_name
        FROM users u
        INNER JOIN roles r
          ON r.id = u.role_id
        WHERE u.id = $1
        `,
        [approver_id]
      );

      if (userResult.rowCount === 0) {
        throw new Error(
          "Approver was not found."
        );
      }

      const approver = userResult.rows[0];

      if (!approver.is_active) {
        throw new Error(
          "Approver account is inactive."
        );
      }

      if (approver.role_name === "RECEPTIONIST") {
        throw new Error(
          "Receptionist cannot reject bookings."
        );
      }

      /* =========================================
         LOCK BOOKING
      ========================================= */

      const bookingResult =
        await client.query(
          `
          SELECT
            id,
            booking_reference,
            booking_status,
            approval_status
          FROM bookings
          WHERE id = $1
          FOR UPDATE
          `,
          [bookingId]
        );

      if (bookingResult.rowCount === 0) {
        throw new Error(
          "Booking not found."
        );
      }

      const booking = bookingResult.rows[0];

      if (
        booking.approval_status !==
        "PENDING"
      ) {
        throw new Error(
          `This booking is already ${String(
            booking.approval_status
          ).toLowerCase()}.`
        );
      }

      /* =========================================
         VERIFY RESPONSIBLE AUTHORITY
      ========================================= */

      const permissionResult =
        await client.query(
          `
          SELECT DISTINCT
            r.id AS room_id,
            r.room_number,
            rp.role_name
          FROM allotments a

          INNER JOIN rooms r
            ON r.id = a.room_id

          INNER JOIN room_permissions rp
            ON rp.room_id = r.id
            AND rp.can_approve = TRUE

          WHERE
            a.booking_id = $1
            AND a.allotment_status = 'ALLOTTED'
            AND rp.role_name = $2
          `,
          [
            bookingId,
            approver.role_name,
          ]
        );

      if (permissionResult.rowCount === 0) {
        throw new Error(
          "You are not the responsible authority for the room allotted to this booking."
        );
      }

      /* =========================================
         CREATE REJECTION RECORD
      ========================================= */

      const approvalResult =
        await client.query(
          `
          INSERT INTO booking_approvals (
            booking_id,
            approver_id,
            approval_status,
            remarks,
            approved_at
          )
          VALUES (
            $1,
            $2,
            'REJECTED',
            $3,
            CURRENT_TIMESTAMP
          )
          RETURNING
            id,
            booking_id,
            approver_id,
            approval_status,
            remarks,
            approved_at,
            created_at
          `,
          [
            bookingId,
            approver_id,
            String(remarks).trim(),
          ]
        );

      /* =========================================
         UPDATE BOOKING
      ========================================= */

      await client.query(
        `
        UPDATE bookings
        SET
          approval_status = 'REJECTED',
          booking_status = 'REJECTED',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        `,
        [bookingId]
      );

      /* =========================================
         RELEASE ALLOTMENTS
      ========================================= */

      const allotmentResult =
        await client.query(
          `
          SELECT
            id,
            room_id,
            bed_id
          FROM allotments
          WHERE
            booking_id = $1
            AND allotment_status = 'ALLOTTED'
          FOR UPDATE
          `,
          [bookingId]
        );

      for (
        const allotment
        of allotmentResult.rows
      ) {
        /* =========================================
           RELEASE ALLOTMENT
        ========================================= */

        await client.query(
          `
          UPDATE allotments
          SET
            allotment_status = 'RELEASED',
            released_at = CURRENT_TIMESTAMP
          WHERE id = $1
          `,
          [allotment.id]
        );

        /* =========================================
           FREE BED
        ========================================= */

        await client.query(
          `
          UPDATE beds
          SET
            bed_status = 'AVAILABLE'
          WHERE id = $1
          `,
          [allotment.bed_id]
        );

        /* =========================================
           UPDATE ROOM STATUS
        ========================================= */

        const availableBeds =
          await client.query(
            `
            SELECT COUNT(*) AS count
            FROM beds
            WHERE
              room_id = $1
              AND is_active = TRUE
              AND bed_status = 'AVAILABLE'
            `,
            [allotment.room_id]
          );

        const availableCount =
          Number(
            availableBeds.rows[0].count
          );

        await client.query(
          `
          UPDATE rooms
          SET
            room_status =
              CASE
                WHEN $2 > 0
                  THEN 'AVAILABLE'
                ELSE 'OCCUPIED'
              END,
            updated_at =
              CURRENT_TIMESTAMP
          WHERE id = $1
          `,
          [
            allotment.room_id,
            availableCount,
          ]
        );
      }

      await client.query("COMMIT");

      return res.status(200).json({
        success: true,

        message:
          "Booking rejected and allotted room/bed released successfully.",

        booking: {
          id: booking.id,

          booking_reference:
            booking.booking_reference,

          booking_status:
            "REJECTED",

          approval_status:
            "REJECTED",
        },

        approval:
          approvalResult.rows[0],
      });
    } catch (error) {
      await client.query("ROLLBACK");

      console.error(
        "Reject booking error:",
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : "Unable to reject booking.";

      return res.status(400).json({
        success: false,
        message,
      });
    } finally {
      client.release();
    }
  }
);

export default router;