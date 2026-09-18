import { Router } from "express";

import { pool } from "../config/db.js";

const router = Router();

/* =========================================
   GET ROOMS FOR LOGGED-IN USER
========================================= */

router.get("/", async (req, res) => {
  try {
    const roleName =
      String(req.query.role || "").trim();

    if (!roleName) {
      return res.status(400).json({
        success: false,
        message: "User role is required",
      });
    }

    const result = await pool.query(
      `
      SELECT
        r.id,
        r.room_number,
        r.total_beds,
        r.room_status,
        r.is_active,
        rc.category_name,
        rp.can_book,
        rp.can_allot,
        rp.can_approve,
        rp.emergency_allot

      FROM rooms r

      JOIN room_categories rc
        ON rc.id = r.category_id

      JOIN room_permissions rp
        ON rp.room_id = r.id
       AND rp.role_name = $1

      WHERE r.is_active = TRUE
        AND r.total_beds > 0
        AND rp.can_book = TRUE

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

    return res.json({
      success: true,
      role: roleName,
      rooms: result.rows,
    });

  } catch (error) {

    console.error(
      "Room fetch error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to fetch rooms",
    });
  }
});


/* =========================================
   GET OTHER AUTHORITY ROOMS
   RECEPTIONIST EXPLICIT ALLOTMENT
========================================= */

router.get(
  "/authority-rooms",
  async (req, res) => {

    try {

      const roleName =
        String(
          req.query.role || ""
        ).trim();

      if (!roleName) {

        return res.status(400).json({

          success: false,

          message:
            "User role is required",

        });

      }

      /*
       * This endpoint is specifically
       * intended for the Receptionist.
       *
       * We verify the role here so that
       * another frontend user cannot simply
       * request the Receptionist inventory.
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

      /*
       * Find rooms where:
       *
       * 1. Receptionist can ALLOT
       * 2. Receptionist does NOT normally BOOK
       * 3. Another authority can APPROVE
       *
       * This keeps the normal Receptionist
       * inventory separate.
       */

      const result =
        await pool.query(
          `
          SELECT
            r.id,
            r.room_number,
            r.total_beds,
            r.room_status,
            r.is_active,

            rc.category_name,

            rp.can_book AS receptionist_can_book,
            rp.can_allot AS receptionist_can_allot,
            rp.emergency_allot AS receptionist_emergency_allot,

            authority.role_name AS authority_role,
            authority.can_book AS authority_can_book,
            authority.can_allot AS authority_can_allot,
            authority.can_approve AS authority_can_approve

          FROM rooms r

          JOIN room_categories rc
            ON rc.id = r.category_id

          JOIN room_permissions rp
            ON rp.room_id = r.id
           AND rp.role_name = 'RECEPTIONIST'

          JOIN room_permissions authority
            ON authority.room_id = r.id
           AND authority.role_name <> 'RECEPTIONIST'
           AND authority.can_approve = TRUE

          WHERE r.is_active = TRUE
            AND r.total_beds > 0

            AND rp.can_allot = TRUE

            /*
             * Exclude rooms that are part of
             * the Receptionist's normal booking
             * inventory.
             */
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

        role:
          roleName,

        rooms:
          result.rows,

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


/* =========================================
   GET BEDS FOR A ROOM
========================================= */

router.get(
  "/:roomId/beds",
  async (req, res) => {

    try {

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
            b.bed_status,
            b.is_active

          FROM beds b

          WHERE b.room_id = $1
            AND b.is_active = TRUE

          ORDER BY
            b.bed_number;
          `,
          [roomId]
        );

      return res.json({

        success: true,

        beds:
          result.rows,

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