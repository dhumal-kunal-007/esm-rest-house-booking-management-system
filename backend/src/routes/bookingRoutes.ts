import { Router } from "express";
import { pool } from "../config/db.js";

const router = Router();

router.post("/", async (req, res) => {
    const client = await pool.connect();

    try {
        const {
            booking_type,
            check_in_date,
            expected_check_out_date,
            number_of_guests,
            purpose_of_visit,
            special_requirements,
            is_emergency,
            created_by,
            guests,
        } = req.body;

        /* =========================================
           BASIC BOOKING VALIDATION
        ========================================= */

        if (
            !booking_type ||
            !check_in_date ||
            !expected_check_out_date ||
            !created_by
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Booking type, check-in date, check-out date and created_by are required",
            });
        }

        if (
            !["CURRENT", "ADVANCE"].includes(
                booking_type
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Booking type must be CURRENT or ADVANCE",
            });
        }

        const guestCount =
            Number(number_of_guests || 1);

        if (
            !Number.isInteger(guestCount) ||
            guestCount <= 0
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Number of guests must be a positive integer",
            });
        }

        /* =========================================
           GUEST VALIDATION
        ========================================= */

        if (
            !Array.isArray(guests) ||
            guests.length !== guestCount
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Guest details must be provided for every guest",
            });
        }

        for (
            let index = 0;
            index < guests.length;
            index++
        ) {

            const guest =
                guests[index];

            if (
                !guest ||
                !guest.name ||
                !String(
                    guest.name
                ).trim()
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        `Guest ${index + 1}: name is required`,
                });
            }

        }

        /* =========================================
           DATE VALIDATION

           CURRENT:
           - Check-in must be TODAY.
           - Check-out must be today or later.

           ADVANCE:
           - Check-in must be AFTER TODAY.
           - Check-out must be on/after check-in.

           Dates are handled as YYYY-MM-DD strings
           to avoid browser/server timezone problems.
        ========================================= */

        const normalizeDate =
            (value: unknown): string | null => {

                if (
                    typeof value !== "string"
                ) {
                    return null;
                }

                const trimmed =
                    value.trim();

                if (
                    !/^\d{4}-\d{2}-\d{2}$/.test(
                        trimmed
                    )
                ) {
                    return null;
                }

                return trimmed;
            };


        const checkInDate =
            normalizeDate(
                check_in_date
            );

        const checkOutDate =
            normalizeDate(
                expected_check_out_date
            );


        /* =========================================
           VALIDATE DATE FORMAT
        ========================================= */

        if (
            !checkInDate ||
            !checkOutDate
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Check-in and check-out dates must be in YYYY-MM-DD format",
            });

        }


        /* =========================================
           GET DATABASE CURRENT DATE

           PostgreSQL CURRENT_DATE is used so the
           booking rule follows the database date.
        ========================================= */

        const todayResult =
            await client.query(
                `
                SELECT
                    CURRENT_DATE::TEXT AS today
                `
            );


        const today =
            todayResult.rows[0].today;


        /* =========================================
           CHECK-OUT CANNOT BE BEFORE CHECK-IN
        ========================================= */

        if (
            checkOutDate <
            checkInDate
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Expected check-out date cannot be before check-in date",
            });

        }


        /* =========================================
           CURRENT BOOKING RULE

           CURRENT means the stay starts TODAY.
        ========================================= */

        if (
            booking_type === "CURRENT" &&
            checkInDate !== today
        ) {

            return res.status(400).json({
                success: false,
                message:
                    `CURRENT booking must have today's check-in date (${today}).`,
            });

        }


        /* =========================================
           ADVANCE BOOKING RULE

           ADVANCE means the stay starts AFTER
           TODAY.
        ========================================= */

        if (
            booking_type === "ADVANCE" &&
            checkInDate <= today
        ) {

            return res.status(400).json({
                success: false,
                message:
                    `ADVANCE booking must have a future check-in date after today (${today}).`,
            });

        }


        /* =========================================
           VERIFY CREATING USER
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
                [created_by]
            );

        if (
            userResult.rows.length === 0
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Creating user does not exist",
            });
        }

        if (
            !userResult.rows[0].is_active
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "Creating user is inactive",
            });
        }

        /* =========================================
           START TRANSACTION
        ========================================= */

        await client.query(
            "BEGIN"
        );

        /* =========================================
           GENERATE BOOKING REFERENCE
        ========================================= */

        const referenceResult =
            await client.query(`
                SELECT
                    COALESCE(
                        MAX(
                            CAST(
                                SUBSTRING(
                                    booking_reference
                                    FROM '[0-9]+$'
                                ) AS INTEGER
                            )
                        ),
                        0
                    ) + 1 AS next_number
                FROM bookings
                WHERE booking_reference LIKE
                    'ESM-' ||
                    EXTRACT(
                        YEAR FROM CURRENT_DATE
                    )::TEXT ||
                    '-%';
            `);

        const nextNumber =
            Number(
                referenceResult.rows[0]
                    .next_number
            );

        const year =
            new Date().getFullYear();

        const bookingReference =
            `ESM-${year}-${String(
                nextNumber
            ).padStart(5, "0")}`;

        /* =========================================
           CREATE BOOKING
        ========================================= */

        const bookingResult =
            await client.query(
                `
                INSERT INTO bookings (
                    booking_reference,
                    booking_type,
                    booking_date,
                    check_in_date,
                    expected_check_out_date,
                    number_of_guests,
                    booking_status,
                    approval_status,
                    purpose_of_visit,
                    special_requirements,
                    is_emergency,
                    created_by
                )
                VALUES (
                    $1,
                    $2,
                    CURRENT_DATE,
                    $3,
                    $4,
                    $5,
                    'PENDING_APPROVAL',
                    'PENDING',
                    $6,
                    $7,
                    $8,
                    $9
                )
                RETURNING
                    id,
                    booking_reference,
                    booking_type,
                    booking_date,
                    check_in_date,
                    expected_check_out_date,
                    number_of_guests,
                    booking_status,
                    approval_status,
                    purpose_of_visit,
                    special_requirements,
                    is_emergency,
                    created_by,
                    created_at;
                `,
                [
                    bookingReference,
                    booking_type,
                    checkInDate,
                    checkOutDate,
                    guestCount,
                    purpose_of_visit ||
                        null,
                    special_requirements ||
                        null,
                    Boolean(
                        is_emergency
                    ),
                    created_by,
                ]
            );

        const booking =
            bookingResult.rows[0];

        /* =========================================
           CREATE GUESTS + BOOKING_GUESTS
        ========================================= */

        const savedGuests = [];

        for (
            let index = 0;
            index < guests.length;
            index++
        ) {

            const guest =
                guests[index];

            /* =============================
               INSERT GUEST
            ============================== */

            const guestResult =
                await client.query(
                    `
                    INSERT INTO guests (
                        guest_name,
                        gender,
                        date_of_birth,
                        mobile_number,
                        email,
                        address,
                        identity_type,
                        identity_number,
                        designation,
                        department,
                        organization,
                        emergency_contact_name,
                        emergency_contact_number,
                        rank,
                        relationship,
                        identity_proof_type,
                        identity_proof_number,
                        relationship_proof_type,
                        relationship_proof_number
                    )
                    VALUES (
                        $1,
                        $2,
                        $3,
                        $4,
                        $5,
                        $6,
                        $7,
                        $8,
                        $9,
                        $10,
                        $11,
                        $12,
                        $13,
                        $14,
                        $15,
                        $16,
                        $17,
                        $18,
                        $19
                    )
                    RETURNING
                        id,
                        guest_name,
                        gender,
                        date_of_birth,
                        mobile_number,
                        email,
                        address,
                        designation,
                        department,
                        organization,
                        rank,
                        relationship,
                        identity_proof_type,
                        identity_proof_number,
                        relationship_proof_type,
                        relationship_proof_number,
                        created_at;
                    `,
                    [
                        guest.name ||
                            null,

                        guest.gender ||
                            null,

                        guest.dateOfBirth ||
                            null,

                        guest.mobile ||
                            null,

                        guest.email ||
                            null,

                        guest.address ||
                            null,

                        guest.identityProof ||
                            null,

                        guest.identityNo ||
                            null,

                        guest.designation ||
                            null,

                        guest.department ||
                            null,

                        guest.organization ||
                            null,

                        guest.emergencyContactName ||
                            null,

                        guest.emergencyContactNumber ||
                            null,

                        guest.rank ||
                            null,

                        guest.relationship ||
                            null,

                        guest.identityProofType ||
                            guest.identityProof ||
                            null,

                        guest.identityProofNumber ||
                            guest.aadhaar ||
                            guest.identityNo ||
                            null,

                        guest.relationshipProofType ||
                            null,

                        guest.relationshipProofNumber ||
                            null,
                    ]
                );

            const savedGuest =
                guestResult.rows[0];

            /* =============================
               LINK GUEST TO BOOKING
            ============================== */

            await client.query(
                `
                INSERT INTO booking_guests (
                    booking_id,
                    guest_id,
                    is_primary_guest
                )
                VALUES (
                    $1,
                    $2,
                    $3
                );
                `,
                [
                    booking.id,
                    savedGuest.id,
                    index === 0,
                ]
            );

            savedGuests.push(
                savedGuest
            );

        }

        /* =========================================
           COMMIT
        ========================================= */

        await client.query(
            "COMMIT"
        );

        return res.status(201).json({
            success: true,

            message:
                "Booking and guest details saved successfully",

            booking,

            guests:
                savedGuests,
        });

    } catch (error) {

        await client.query(
            "ROLLBACK"
        );

        console.error(
            "Booking creation error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to create booking",
        });

    } finally {

        client.release();

    }
});

export default router;