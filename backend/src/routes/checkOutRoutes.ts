import express, { Request, Response } from "express";
import { pool } from "../config/db.js";

const router = express.Router();

/*
 * GET /api/check-outs/eligible
 *
 * Returns guests who have been allotted a bed and have
 * not yet checked out.
 */
router.get(
    "/eligible",
    async (_req: Request, res: Response): Promise<void> => {
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
                    r.room_status,

                    a.bed_id,
                    bd.bed_number,
                    bd.bed_status,

                    b.check_in_date,
                    b.expected_check_out_date,

                    a.allotment_status,

                    CASE
                        WHEN ci.id IS NULL THEN 'NOT_CHECKED_IN'
                        ELSE 'CHECKED_IN'
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

                WHERE a.allotment_status = 'ALLOTTED'

                ORDER BY
                    b.check_in_date ASC,
                    r.room_number ASC,
                    bd.bed_number ASC
            `);

            res.json(result.rows);
        } catch (error) {
            console.error(
                "Error loading check-out eligible guests:",
                error
            );

            res.status(500).json({
                message: "Failed to load guests eligible for check-out.",
            });
        }
    }
);

/*
 * POST /api/check-outs
 *
 * Checks out one allotted guest.
 *
 * IMPORTANT:
 *
 * The bed and room are NOT made AVAILABLE immediately.
 *
 * After checkout:
 *
 *     OCCUPIED
 *         ↓
 *     NEEDS_CLEANING
 *
 * The room/bed therefore remains unavailable for a new guest.
 *
 * Later the Receptionist will:
 *
 *     NEEDS_CLEANING
 *         ↓
 *     CLEANING
 *
 * and after cleaning:
 *
 *     CLEANING
 *         ↓
 *     AVAILABLE
 *
 * Expected body:
 * {
 *   booking_id: string,
 *   guest_id: string,
 *   allotment_id: string,
 *   checked_out_by: string,
 *   remarks?: string
 * }
 */
router.post(
    "/",
    async (req: Request, res: Response): Promise<void> => {
        const {
            booking_id,
            guest_id,
            allotment_id,
            checked_out_by,
            remarks,
        } = req.body;

        if (
            !booking_id ||
            !guest_id ||
            !allotment_id ||
            !checked_out_by
        ) {
            res.status(400).json({
                message:
                    "booking_id, guest_id, allotment_id and checked_out_by are required.",
            });

            return;
        }

        const client = await pool.connect();

        try {
            await client.query("BEGIN");

            /*
             * Lock the allotment row.
             *
             * This prevents two users from checking out
             * the same guest at the same time.
             */
            const allotmentResult = await client.query(
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
                [allotment_id]
            );

            if (allotmentResult.rows.length === 0) {
                await client.query("ROLLBACK");

                res.status(404).json({
                    message: "Allotment not found.",
                });

                return;
            }

            const allotment = allotmentResult.rows[0];

            /*
             * Verify booking + guest + allotment relationship.
             */
            if (
                allotment.booking_id !== booking_id ||
                allotment.guest_id !== guest_id
            ) {
                await client.query("ROLLBACK");

                res.status(400).json({
                    message:
                        "The selected booking, guest and allotment do not match.",
                });

                return;
            }

            /*
             * Only an active allotment can be checked out.
             */
            if (allotment.allotment_status !== "ALLOTTED") {
                await client.query("ROLLBACK");

                res.status(400).json({
                    message:
                        "This allotment is no longer active and cannot be checked out.",
                });

                return;
            }

            /*
             * Check whether a checkout already exists.
             */
            const existingCheckout = await client.query(
                `
                SELECT id
                FROM check_outs
                WHERE allotment_id = $1
                LIMIT 1
                `,
                [allotment_id]
            );

            if (existingCheckout.rows.length > 0) {
                await client.query("ROLLBACK");

                res.status(400).json({
                    message: "This guest has already been checked out.",
                });

                return;
            }

            /*
             * Verify the user performing the checkout.
             */
            const userResult = await client.query(
                `
                SELECT
                    id,
                    full_name,
                    is_active
                FROM users
                WHERE id = $1
                `,
                [checked_out_by]
            );

            if (userResult.rows.length === 0) {
                await client.query("ROLLBACK");

                res.status(400).json({
                    message: "Checkout user was not found.",
                });

                return;
            }

            if (!userResult.rows[0].is_active) {
                await client.query("ROLLBACK");

                res.status(403).json({
                    message: "The checkout user is inactive.",
                });

                return;
            }

            /*
             * Create checkout record.
             */
            const checkoutResult = await client.query(
                `
                INSERT INTO check_outs (
                    booking_id,
                    guest_id,
                    allotment_id,
                    check_out_time,
                    checked_out_by,
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
                    check_out_time,
                    checked_out_by,
                    remarks
                `,
                [
                    booking_id,
                    guest_id,
                    allotment_id,
                    checked_out_by,
                    remarks || null,
                ]
            );

            /*
             * Release the allotment.
             *
             * The guest is no longer occupying the bed.
             */
            await client.query(
                `
                UPDATE allotments
                SET
                    allotment_status = 'RELEASED',
                    released_at = CURRENT_TIMESTAMP
                WHERE id = $1
                `,
                [allotment_id]
            );

            /*
             * IMPORTANT:
             *
             * DO NOT make the bed AVAILABLE here.
             *
             * The bed has just been used by a guest and
             * housekeeping must clean it first.
             *
             * Therefore:
             *
             *     OCCUPIED
             *          ↓
             *     NEEDS_CLEANING
             *
             * This status prevents the bed from being
             * allotted to another guest.
             */
            await client.query(
                `
                UPDATE beds
                SET
                    bed_status = 'NEEDS_CLEANING'
                WHERE id = $1
                `,
                [allotment.bed_id]
            );

            /*
             * Check whether another active allotment exists
             * in the same room.
             *
             * This is important for rooms containing multiple
             * beds.
             */
            const activeAllotmentsResult = await client.query(
                `
                SELECT COUNT(*)::INTEGER AS active_count
                FROM allotments
                WHERE room_id = $1
                  AND allotment_status = 'ALLOTTED'
                `,
                [allotment.room_id]
            );

            const activeCount =
                activeAllotmentsResult.rows[0].active_count;

            /*
             * Room status logic:
             *
             * If another guest is still occupying the room:
             *
             *     OCCUPIED
             *
             * Otherwise the room has just been checked out
             * and requires housekeeping:
             *
             *     NEEDS_CLEANING
             */
            const newRoomStatus =
                activeCount > 0
                    ? "OCCUPIED"
                    : "NEEDS_CLEANING";

            await client.query(
                `
                UPDATE rooms
                SET
                    room_status = $2,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                `,
                [
                    allotment.room_id,
                    newRoomStatus,
                ]
            );

            /*
             * Create housekeeping task.
             *
             * Initial state:
             *
             *     NEEDS CLEANING
             *
             * The Receptionist will later click:
             *
             *     "Assign to Housekeeping"
             *
             * which will change the task to the cleaning state.
             */
            await client.query(
                `
                INSERT INTO housekeeping_tasks (
                    room_id,
                    allotment_id,
                    assigned_to,
                    task_status,
                    assigned_at,
                    remarks
                )
                VALUES (
                    $1,
                    $2,
                    $3,
                    'NEEDS CLEANING',
                    CURRENT_TIMESTAMP,
                    $4
                )
                `,
                [
                    allotment.room_id,
                    allotment_id,
                    checked_out_by,
                    remarks ||
                        "Room requires cleaning after guest checkout.",
                ]
            );

            /*
             * Commit the complete checkout transaction.
             */
            await client.query("COMMIT");

            res.status(201).json({
                message:
                    "Guest checked out successfully. Room is now waiting for housekeeping.",
                checkout: checkoutResult.rows[0],
                room_status: newRoomStatus,
                bed_status: "NEEDS_CLEANING",
                housekeeping_status: "NEEDS CLEANING",
            });
        } catch (error) {
            await client.query("ROLLBACK");

            console.error(
                "Error processing checkout:",
                error
            );

            res.status(500).json({
                message: "Failed to process checkout.",
            });
        } finally {
            client.release();
        }
    }
);

export default router;