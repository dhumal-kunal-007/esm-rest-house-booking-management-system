import { Router, Request, Response } from "express";
import { pool } from "../config/db.js";

const router = Router();

/**
 * POST /api/feedback-notifications
 *
 * Creates a WhatsApp feedback notification record.
 *
 * Body:
 * {
 *   booking_id: string,
 *   guest_id: string,
 *   notification_status?: "PENDING" | "SENT" | "SKIPPED"
 * }
 */
router.post(
  "/",
  async (req: Request, res: Response) => {
    const client = await pool.connect();

    try {
      const {
        booking_id,
        guest_id,
        notification_status = "PENDING",
      } = req.body;

      // --------------------------------------------------
      // VALIDATION
      // --------------------------------------------------

      if (!booking_id || !guest_id) {
        return res.status(400).json({
          success: false,
          message:
            "booking_id and guest_id are required.",
        });
      }

      const allowedStatuses = [
        "PENDING",
        "SENT",
        "SKIPPED",
      ];

      const status = String(
        notification_status
      ).toUpperCase();

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message:
            "notification_status must be PENDING, SENT or SKIPPED.",
        });
      }

      await client.query("BEGIN");

      // --------------------------------------------------
      // VERIFY BOOKING
      // --------------------------------------------------

      const bookingResult =
        await client.query(
          `
          SELECT
            id,
            booking_reference
          FROM bookings
          WHERE id = $1
          LIMIT 1
          `,
          [booking_id]
        );

      if (bookingResult.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          success: false,
          message: "Booking not found.",
        });
      }

      // --------------------------------------------------
      // VERIFY GUEST BELONGS TO BOOKING
      // --------------------------------------------------

      const guestResult =
        await client.query(
          `
          SELECT
            bg.booking_id,
            bg.guest_id,
            g.guest_name,
            g.mobile_number AS mobile
          FROM booking_guests bg
          INNER JOIN guests g
            ON g.id = bg.guest_id
          WHERE bg.booking_id = $1
            AND bg.guest_id = $2
            AND EXISTS (
              SELECT 1
              FROM check_outs co
              WHERE
                co.booking_id = bg.booking_id
                AND co.guest_id = bg.guest_id
            )
          LIMIT 1
          `,
          [booking_id, guest_id]
        );

      if (guestResult.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          success: false,
          message:
            "Guest does not belong to the specified booking.",
        });
      }

      // --------------------------------------------------
      // PREVENT DUPLICATE ACTIVE NOTIFICATION
      // --------------------------------------------------

      const existingResult =
        await client.query(
          `
          SELECT
            id,
            booking_id,
            guest_id,
            channel,
            notification_status,
            sent_at,
            created_at
          FROM feedback_notifications
          WHERE booking_id = $1
            AND guest_id = $2
            AND channel = 'WHATSAPP'
          ORDER BY created_at DESC
          LIMIT 1
          `,
          [booking_id, guest_id]
        );

      if (existingResult.rows.length > 0) {
        const existing =
          existingResult.rows[0];

        // ------------------------------------------------
        // ALREADY SENT
        // ------------------------------------------------

        if (
          String(
            existing.notification_status
          ).toUpperCase() === "SENT"
        ) {
          await client.query("COMMIT");

          return res.status(200).json({
            success: true,
            message:
              "WhatsApp feedback notification has already been sent.",
            notification: existing,
            next_stage: "END",
          });
        }

        // ------------------------------------------------
        // UPDATE EXISTING PENDING / SKIPPED
        // ------------------------------------------------

        const updateResult =
          await client.query(
            `
            UPDATE feedback_notifications
            SET
              notification_status = $1::varchar,
              sent_at =
                CASE
                  WHEN $1::varchar = 'SENT'::varchar
                    THEN CURRENT_TIMESTAMP
                  ELSE NULL
                END
            WHERE id = $2
            RETURNING
              id,
              booking_id,
              guest_id,
              channel,
              notification_status,
              sent_at,
              created_at
            `,
            [
              status,
              existing.id,
            ]
          );

        await client.query("COMMIT");

        return res.status(200).json({
          success: true,
          message:
            "WhatsApp feedback notification updated successfully.",
          notification:
            updateResult.rows[0],
          next_stage:
            status === "SENT"
              ? "END"
              : "WHATSAPP_FEEDBACK",
        });
      }

      // --------------------------------------------------
      // CREATE NOTIFICATION
      // --------------------------------------------------

      const insertResult =
  await client.query(
    `
    INSERT INTO feedback_notifications (
      booking_id,
      guest_id,
      channel,
      notification_status,
      sent_at
    )
    VALUES (
      $1,
      $2,
      'WHATSAPP'::varchar,
      $3::varchar,
      CASE
        WHEN $3::varchar = 'SENT'::varchar
          THEN CURRENT_TIMESTAMP
        ELSE NULL
      END
    )
    RETURNING
      id,
      booking_id,
      guest_id,
      channel,
      notification_status,
      sent_at,
      created_at
    `,
    [
      booking_id,
      guest_id,
      status,
    ]
  );
      await client.query("COMMIT");

      return res.status(201).json({
        success: true,
        message:
          "WhatsApp feedback notification created successfully.",
        notification:
          insertResult.rows[0],
        guest: {
          guest_id:
            guestResult.rows[0].guest_id,
          guest_name:
            guestResult.rows[0].guest_name,
          mobile:
            guestResult.rows[0].mobile,
        },
        next_stage:
          status === "SENT"
            ? "END"
            : "WHATSAPP_FEEDBACK",
      });
    } catch (error: any) {
      await client.query("ROLLBACK");

      console.error(
        "Feedback notification error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to create feedback notification.",
      });
    } finally {
      client.release();
    }
  }
);

/**
 * GET /api/feedback-notifications/booking/:bookingId
 *
 * Gets WhatsApp feedback notification history
 * for a booking.
 */
router.get(
  "/booking/:bookingId",
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const bookingId = String(
        req.params.bookingId
      );

      const result =
        await pool.query(
          `
          SELECT
            id,
            booking_id,
            guest_id,
            channel,
            notification_status,
            sent_at,
            created_at
          FROM feedback_notifications
          WHERE booking_id = $1
          ORDER BY created_at DESC
          `,
          [bookingId]
        );

      return res.status(200).json({
        success: true,
        notifications:
          result.rows,
      });
    } catch (error: any) {
      console.error(
        "Get feedback notifications error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch feedback notifications.",
        error:
          error?.message ||
          "Unknown server error.",
      });
    }
  }
);

/**
 * PATCH /api/feedback-notifications/:id/status
 *
 * Updates notification status.
 *
 * Body:
 * {
 *   notification_status: "PENDING" | "SENT" | "SKIPPED"
 * }
 */
router.patch(
  "/:id/status",
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const notificationId =
        String(req.params.id);

      const {
        notification_status,
      } = req.body;

      if (!notification_status) {
        return res.status(400).json({
          success: false,
          message:
            "notification_status is required.",
        });
      }

      const status = String(
        notification_status
      ).toUpperCase();

      const allowedStatuses = [
        "PENDING",
        "SENT",
        "SKIPPED",
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message:
            "notification_status must be PENDING, SENT or SKIPPED.",
        });
      }

      const result =
        await pool.query(
          `
          UPDATE feedback_notifications
          SET
            notification_status = $1::varchar,
            sent_at =
              CASE
                WHEN $1::varchar = 'SENT'::varchar
                  THEN CURRENT_TIMESTAMP
                ELSE sent_at
              END
          WHERE id = $2
          RETURNING
            id,
            booking_id,
            guest_id,
            channel,
            notification_status,
            sent_at,
            created_at
          `,
          [
            status,
            notificationId,
          ]
        );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message:
            "Feedback notification not found.",
        });
      }

      return res.status(200).json({
        success: true,
        message:
          "Feedback notification status updated successfully.",
        notification:
          result.rows[0],
        next_stage:
          status === "SENT"
            ? "END"
            : "WHATSAPP_FEEDBACK",
      });
    } catch (error: any) {
      console.error(
        "Update feedback notification status error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update feedback notification status.",
        error:
          error?.message ||
          "Unknown server error.",
      });
    }
  }
);

export default router;