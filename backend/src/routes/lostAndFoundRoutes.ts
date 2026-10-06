import { Router, Request, Response } from "express";
import { pool } from "../config/db.js";

const router = Router();

/* =========================================================
   GET ALL LOST & FOUND ITEMS
   ========================================================= */

router.get("/", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `
      SELECT
        lf.id,
        lf.item_name,
        lf.item_description,
        lf.room_id,
        lf.booking_id,
        lf.guest_id,
        lf.found_date,
        lf.found_by,
        lf.received_by,
        lf.status,
        lf.returned_date,
        lf.returned_to,
        lf.return_remarks,
        lf.created_at,
        lf.updated_at,

        r.room_number,

        g.guest_name,

        u.full_name AS received_by_name,

        b.booking_reference

      FROM lost_and_found_items lf

      LEFT JOIN rooms r
        ON r.id = lf.room_id

      LEFT JOIN guests g
        ON g.id = lf.guest_id

      LEFT JOIN users u
        ON u.id = lf.received_by

      LEFT JOIN bookings b
        ON b.id = lf.booking_id

      ORDER BY
        CASE
          WHEN lf.status = 'FOUND' THEN 0
          ELSE 1
        END,
        lf.found_date DESC,
        lf.created_at DESC
      `
    );

    return res.json({
      success: true,
      items: result.rows,
    });
  } catch (error) {
    console.error("Lost & Found GET error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load Lost & Found records.",
    });
  }
});


/* =========================================================
   GET ROOM OCCUPANTS / BOOKINGS
   Used when receptionist selects a room while
   recording a Lost & Found item.
   ========================================================= */

router.get(
  "/room/:roomId/guests",
  async (req: Request, res: Response) => {
    try {
      const { roomId } = req.params;

      if (!roomId || !String(roomId).trim()) {
        return res.status(400).json({
          success: false,
          message: "Room ID is required.",
        });
      }

      /* ---------------------------------------------
         VERIFY ROOM
      --------------------------------------------- */

      const roomResult = await pool.query(
        `
        SELECT
          id,
          room_number
        FROM rooms
        WHERE id = $1
        `,
        [roomId]
      );

      if (roomResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Selected room was not found.",
        });
      }

      /* ---------------------------------------------
         GET GUESTS CONNECTED TO THIS ROOM

         IMPORTANT:

         Newer allotments may contain guest_id.

         Older allotments may have guest_id = NULL.

         Therefore we use:

         1. allotments.guest_id when available
         2. booking_guests when allotments.guest_id
            is NULL

         This allows Lost & Found to correctly
         identify guests for both old and new records.

         RELEASED allotments are also included because
         an item may be found after checkout.
      --------------------------------------------- */

      const result = await pool.query(
        `
        SELECT DISTINCT ON (
          a.booking_id,
          COALESCE(a.guest_id, bg.guest_id)
        )

          a.booking_id,

          COALESCE(
            a.guest_id,
            bg.guest_id
          ) AS guest_id,

          b.booking_reference,
          b.check_in_date,
          b.expected_check_out_date,
          b.booking_status,
          b.approval_status,

          g.guest_name,
          g.mobile_number,
          g.email,

          a.allotment_status,
          a.allotted_at,
          a.released_at

        FROM allotments a

        INNER JOIN bookings b
          ON b.id = a.booking_id

        LEFT JOIN booking_guests bg
          ON bg.booking_id = a.booking_id
          AND (
            a.guest_id IS NULL
            OR bg.guest_id = a.guest_id
          )

        INNER JOIN guests g
          ON g.id = COALESCE(
            a.guest_id,
            bg.guest_id
          )

        WHERE
          a.room_id = $1

          AND a.allotment_status IN (
            'ALLOTTED',
            'RELEASED'
          )

        ORDER BY
          a.booking_id,

          COALESCE(
            a.guest_id,
            bg.guest_id
          ),

          CASE
            WHEN a.allotment_status = 'ALLOTTED'
              THEN 0
            ELSE 1
          END,

          a.allotted_at DESC
        `,
        [roomId]
      );

      return res.json({
        success: true,
        room: roomResult.rows[0],
        guests: result.rows,
      });
    } catch (error) {
      console.error(
        "Lost & Found room guests error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load guests for the selected room.",
      });
    }
  }
);


/* =========================================================
   GET SINGLE LOST & FOUND ITEM
   ========================================================= */

router.get(
  "/:id",
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `
        SELECT
          lf.id,
          lf.item_name,
          lf.item_description,
          lf.room_id,
          lf.booking_id,
          lf.guest_id,
          lf.found_date,
          lf.found_by,
          lf.received_by,
          lf.status,
          lf.returned_date,
          lf.returned_to,
          lf.return_remarks,
          lf.created_at,
          lf.updated_at,

          r.room_number,

          g.guest_name,

          u.full_name AS received_by_name,

          b.booking_reference

        FROM lost_and_found_items lf

        LEFT JOIN rooms r
          ON r.id = lf.room_id

        LEFT JOIN guests g
          ON g.id = lf.guest_id

        LEFT JOIN users u
          ON u.id = lf.received_by

        LEFT JOIN bookings b
          ON b.id = lf.booking_id

        WHERE lf.id = $1
        `,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Lost & Found item not found.",
        });
      }

      return res.json({
        success: true,
        item: result.rows[0],
      });
    } catch (error) {
      console.error(
        "Lost & Found single item error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Failed to load Lost & Found item.",
      });
    }
  }
);


/* =========================================================
   CREATE LOST & FOUND ITEM
   ========================================================= */

router.post(
  "/",
  async (req: Request, res: Response) => {
    try {
      const {
        item_name,
        item_description,
        room_id,
        booking_id,
        guest_id,
        found_date,
        found_by,
        received_by,
      } = req.body;

      /* ---------------------------------------------
         REQUIRED FIELDS
      --------------------------------------------- */

      if (
        !item_name ||
        !String(item_name).trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Item name is required.",
        });
      }

      if (
        !received_by ||
        !String(received_by).trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Receptionist/user who received the item is required.",
        });
      }

      /* ---------------------------------------------
         VERIFY RECEIVING USER
      --------------------------------------------- */

      const userResult = await pool.query(
        `
        SELECT
          u.id,
          u.full_name,
          u.is_active,
          r.role_name

        FROM users u

        INNER JOIN roles r
          ON r.id = u.role_id

        WHERE u.id = $1
        `,
        [received_by]
      );

      if (userResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Receiving user was not found.",
        });
      }

      const receivingUser = userResult.rows[0];

      if (!receivingUser.is_active) {
        return res.status(400).json({
          success: false,
          message: "The receiving user is inactive.",
        });
      }

      /* ---------------------------------------------
         ROOM VALIDATION
      --------------------------------------------- */

      if (room_id) {
        const roomResult = await pool.query(
          `
          SELECT id
          FROM rooms
          WHERE id = $1
          `,
          [room_id]
        );

        if (roomResult.rows.length === 0) {
          return res.status(400).json({
            success: false,
            message: "Selected room was not found.",
          });
        }
      }

      /* ---------------------------------------------
         BOOKING VALIDATION
      --------------------------------------------- */

      if (booking_id) {
        const bookingResult = await pool.query(
          `
          SELECT id
          FROM bookings
          WHERE id = $1
          `,
          [booking_id]
        );

        if (bookingResult.rows.length === 0) {
          return res.status(400).json({
            success: false,
            message: "Selected booking was not found.",
          });
        }
      }

      /* ---------------------------------------------
         GUEST VALIDATION
      --------------------------------------------- */

      if (guest_id) {
        const guestResult = await pool.query(
          `
          SELECT id
          FROM guests
          WHERE id = $1
          `,
          [guest_id]
        );

        if (guestResult.rows.length === 0) {
          return res.status(400).json({
            success: false,
            message: "Selected guest was not found.",
          });
        }
      }

      /* ---------------------------------------------
         VERIFY BOOKING + GUEST RELATIONSHIP
      --------------------------------------------- */

      if (booking_id && guest_id) {
        const bookingGuestResult =
          await pool.query(
            `
            SELECT id
            FROM booking_guests
            WHERE
              booking_id = $1
              AND guest_id = $2
            `,
            [
              booking_id,
              guest_id,
            ]
          );

        if (
          bookingGuestResult.rows.length === 0
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Selected guest does not belong to the selected booking.",
          });
        }
      }

      /* ---------------------------------------------
         VERIFY ROOM + BOOKING RELATIONSHIP
      --------------------------------------------- */

      if (room_id && booking_id) {
        const roomBookingResult =
          await pool.query(
            `
            SELECT id
            FROM allotments
            WHERE
              room_id = $1
              AND booking_id = $2
            LIMIT 1
            `,
            [
              room_id,
              booking_id,
            ]
          );

        if (
          roomBookingResult.rows.length === 0
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Selected booking was not allotted to the selected room.",
          });
        }
      }

      /* ---------------------------------------------
         VERIFY ROOM + BOOKING + GUEST RELATIONSHIP
      --------------------------------------------- */

      if (
        room_id &&
        booking_id &&
        guest_id
      ) {
        const allotmentResult =
          await pool.query(
            `
            SELECT id
            FROM allotments
            WHERE
              room_id = $1
              AND booking_id = $2
              AND guest_id = $3
            LIMIT 1
            `,
            [
              room_id,
              booking_id,
              guest_id,
            ]
          );

        /*
          Older allotments may have guest_id NULL.

          If that happens, verify the guest through
          booking_guests instead.
        */

        if (
          allotmentResult.rows.length === 0
        ) {
          const fallbackResult =
            await pool.query(
              `
              SELECT bg.id
              FROM booking_guests bg
              INNER JOIN allotments a
                ON a.booking_id = bg.booking_id
              WHERE
                a.room_id = $1
                AND a.booking_id = $2
                AND bg.guest_id = $3
                AND a.allotment_status IN (
                  'ALLOTTED',
                  'RELEASED'
                )
              LIMIT 1
              `,
              [
                room_id,
                booking_id,
                guest_id,
              ]
            );

          if (
            fallbackResult.rows.length === 0
          ) {
            return res.status(400).json({
              success: false,
              message:
                "Selected guest was not allotted to the selected room for this booking.",
            });
          }
        }
      }

      /* ---------------------------------------------
         CREATE RECORD
      --------------------------------------------- */

      const result = await pool.query(
        `
        INSERT INTO lost_and_found_items (
          item_name,
          item_description,
          room_id,
          booking_id,
          guest_id,
          found_date,
          found_by,
          received_by,
          status
        )

        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          COALESCE($6::DATE, CURRENT_DATE),
          $7,
          $8,
          'FOUND'
        )

        RETURNING *
        `,
        [
          String(item_name).trim(),

          item_description
            ? String(item_description).trim()
            : null,

          room_id || null,

          booking_id || null,

          guest_id || null,

          found_date || null,

          found_by
            ? String(found_by).trim()
            : null,

          received_by,
        ]
      );

      return res.status(201).json({
        success: true,
        message:
          "Lost & Found item recorded successfully.",
        item: result.rows[0],
      });
    } catch (error) {
      console.error(
        "Lost & Found create error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to create Lost & Found record.",
      });
    }
  }
);


/* =========================================================
   MARK ITEM AS RETURNED
   ========================================================= */

router.patch(
  "/:id/return",
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const {
        returned_date,
        returned_to,
        return_remarks,
      } = req.body;

      /* ---------------------------------------------
         REQUIRED RETURN INFORMATION
      --------------------------------------------- */

      if (
        !returned_to ||
        !String(returned_to).trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Returned-to information is required.",
        });
      }

      /* ---------------------------------------------
         CHECK ITEM
      --------------------------------------------- */

      const existingResult = await pool.query(
        `
        SELECT
          id,
          item_name,
          status

        FROM lost_and_found_items

        WHERE id = $1
        `,
        [id]
      );

      if (existingResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message:
            "Lost & Found item not found.",
        });
      }

      const existingItem =
        existingResult.rows[0];

      /* ---------------------------------------------
         PREVENT DOUBLE RETURN
      --------------------------------------------- */

      if (
        existingItem.status ===
        "RETURNED"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "This item has already been marked as returned.",
        });
      }

      /* ---------------------------------------------
         UPDATE RECORD
      --------------------------------------------- */

      const result = await pool.query(
        `
        UPDATE lost_and_found_items

        SET
          status = 'RETURNED',

          returned_date =
            COALESCE(
              $1::DATE,
              CURRENT_DATE
            ),

          returned_to =
            $2,

          return_remarks =
            $3,

          updated_at =
            CURRENT_TIMESTAMP

        WHERE id = $4

        RETURNING *
        `,
        [
          returned_date || null,

          String(
            returned_to
          ).trim(),

          return_remarks
            ? String(
                return_remarks
              ).trim()
            : null,

          id,
        ]
      );

      return res.json({
        success: true,
        message:
          "Lost & Found item marked as returned.",
        item: result.rows[0],
      });
    } catch (error) {
      console.error(
        "Lost & Found return error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to mark Lost & Found item as returned.",
      });
    }
  }
);


/* =========================================================
   DELETE LOST & FOUND ITEM
   ========================================================= */

router.delete(
  "/:id",
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `
        DELETE FROM lost_and_found_items
        WHERE id = $1
        RETURNING id
        `,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message:
            "Lost & Found item not found.",
        });
      }

      return res.json({
        success: true,
        message:
          "Lost & Found record deleted successfully.",
      });
    } catch (error) {
      console.error(
        "Lost & Found delete error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to delete Lost & Found record.",
      });
    }
  }
);


export default router;