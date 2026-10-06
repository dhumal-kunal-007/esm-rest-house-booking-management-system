import {
    Router,
    Request,
    Response,
} from "express";

import { pool } from "../config/db.js";

const router = Router();

/* =========================================================
   FIND A VALID SUCCESS PAYMENT STATUS

   The database has its own payments_status_check constraint.
   We read the allowed values and select the appropriate
   successful/received status automatically.
========================================================= */

async function getSuccessfulPaymentStatus(
    client: any
): Promise<string> {
    const result =
        await client.query(
            `
            SELECT
                pg_get_constraintdef(oid) AS definition
            FROM pg_constraint
            WHERE
                conname = 'payments_status_check'
                AND conrelid = 'payments'::regclass
            LIMIT 1
            `
        );

    if (
        result.rowCount === 0
    ) {
        throw new Error(
            "payments_status_check constraint was not found."
        );
    }

    const definition =
        String(
            result.rows[0].definition
        );

    /*
     * Extract quoted values from a CHECK constraint.
     *
     * Example:
     * CHECK ((payment_status)::text = ANY
     * (ARRAY['PENDING'::text, 'COMPLETED'::text]))
     */

    const matches =
        definition.match(
            /'([^']+)'/g
        ) || [];

    const allowedStatuses =
        matches.map(
            (value: string) =>
                value.substring(
                    1,
                    value.length - 1
                )
        );

    const preferredStatuses = [
        "SUCCESS",
        "COMPLETED",
        "PAID",
        "RECEIVED",
    ];

    const successfulStatus =
        preferredStatuses.find(
            (status) =>
                allowedStatuses.includes(
                    status
                )
        );

    if (
        successfulStatus
    ) {
        return successfulStatus;
    }

    throw new Error(
        `No successful payment status was found in payments_status_check. Allowed statuses: ${allowedStatuses.join(", ")}`
    );
}

/* =========================================================
   CREATE PAYMENT

   POST /api/payments

   Flow:
   APPROVAL
      ↓
   PAYMENT
      ↓
   INVOICE
      ↓
   ROOM LOCK

   Payment does NOT create allotment.
========================================================= */

router.post(
    "/",
    async (
        req: Request,
        res: Response
    ) => {
        const {
            booking_id,
            guest_id,
            amount,
            payment_method,
            transaction_number,
            payment_date,
            remarks,
            received_by,
        } = req.body;

        /* =========================================
           BASIC VALIDATION
        ========================================= */

        if (!booking_id) {
            return res.status(400).json({
                success: false,
                message:
                    "Booking ID is required.",
            });
        }

        if (!guest_id) {
            return res.status(400).json({
                success: false,
                message:
                    "Guest ID is required.",
            });
        }

        const paymentAmount =
            Number(amount);

        if (
            !Number.isFinite(
                paymentAmount
            ) ||
            paymentAmount <= 0
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Payment amount must be greater than zero.",
            });
        }

        const allowedMethods = [
            "CASH",
            "ONLINE",
            "UPI",
            "CHEQUE",
        ];

        if (
            !allowedMethods.includes(
                payment_method
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Payment method must be CASH, ONLINE, UPI or CHEQUE.",
            });
        }

        if (
            payment_method !== "CASH" &&
            (
                !transaction_number ||
                String(
                    transaction_number
                ).trim() === ""
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Transaction/reference number is required for non-cash payments.",
            });
        }

        if (!payment_date) {
            return res.status(400).json({
                success: false,
                message:
                    "Payment date is required.",
            });
        }

        if (!received_by) {
            return res.status(400).json({
                success: false,
                message:
                    "Received by user ID is required.",
            });
        }

        const client =
            await pool.connect();

        try {
            await client.query(
                "BEGIN"
            );

            /* =========================================
               GET VALID SUCCESS STATUS
            ========================================= */

            const successfulPaymentStatus =
                await getSuccessfulPaymentStatus(
                    client
                );

            /* =========================================
               VERIFY RECEIVING USER
            ========================================= */

            const userResult =
                await client.query(
                    `
                    SELECT
                        id,
                        full_name,
                        username,
                        is_active
                    FROM users
                    WHERE id = $1
                    LIMIT 1
                    `,
                    [received_by]
                );

            if (
                userResult.rowCount === 0
            ) {
                throw new Error(
                    "Payment receiving user was not found."
                );
            }

            if (
                !userResult.rows[0].is_active
            ) {
                throw new Error(
                    "Payment receiving user is inactive."
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
                        booking_type,
                        check_in_date,
                        expected_check_out_date,
                        number_of_guests,
                        booking_status,
                        approval_status,
                        guest_type,
                        acceptance_status
                    FROM bookings
                    WHERE id = $1
                    FOR UPDATE
                    `,
                    [booking_id]
                );

            if (
                bookingResult.rowCount === 0
            ) {
                throw new Error(
                    "Booking not found."
                );
            }

            const booking =
                bookingResult.rows[0];

            /* =========================================
               APPROVAL CHECK
            ========================================= */

            if (
                booking.approval_status !==
                "APPROVED"
            ) {
                throw new Error(
                    "Payment can be received only after booking approval."
                );
            }

            /* =========================================
               ACCEPTANCE CHECK
            ========================================= */

            if (
                booking.acceptance_status !==
                "ACCEPTED"
            ) {
                throw new Error(
                    "Guest accommodation acceptance is not completed."
                );
            }

            /* =========================================
               VERIFY GUEST
            ========================================= */

            const guestResult =
                await client.query(
                    `
                    SELECT
                        g.id,
                        g.guest_name,
                        g.mobile_number,
                        g.email
                    FROM booking_guests bg
                    INNER JOIN guests g
                        ON g.id = bg.guest_id
                    WHERE
                        bg.booking_id = $1
                        AND bg.guest_id = $2
                    LIMIT 1
                    `,
                    [
                        booking_id,
                        guest_id,
                    ]
                );

            if (
                guestResult.rowCount === 0
            ) {
                throw new Error(
                    "Selected guest does not belong to this booking."
                );
            }

            const guest =
                guestResult.rows[0];

            /* =========================================
               PREVIOUS PAYMENTS

               Use the actual valid successful status
               from the database constraint.
            ========================================= */

            const previousPaymentResult =
                await client.query(
                    `
                    SELECT
                        COALESCE(
                            SUM(amount),
                            0
                        ) AS total_paid
                    FROM payments
                    WHERE
                        booking_id = $1
                        AND payment_status = $2
                    `,
                    [
                        booking_id,
                        successfulPaymentStatus,
                    ]
                );

            const previousPaidAmount =
                Number(
                    previousPaymentResult
                        .rows[0]
                        .total_paid || 0
                );

            /* =========================================
               AUTHORITATIVE BOOKING PRICE
            ========================================= */

            const pricingResult =
                await client.query(
                    `
                    SELECT
                        total_amount
                    FROM booking_pricing
                    WHERE booking_id = $1
                    FOR UPDATE
                    `,
                    [booking_id]
                );

            const approvedAmount =
                (pricingResult.rowCount ?? 0) === 0
                    ? 0
                    : Number(
                        pricingResult.rows[0].total_amount
                    );

            if (
                !Number.isFinite(
                    approvedAmount
                ) ||
                approvedAmount <= 0
            ) {
                throw new Error(
                    "A server-calculated pricing snapshot is required before payment."
                );
            }

            /* =========================================
               REMAINING BALANCE
            ========================================= */

            const remainingAmount =
                approvedAmount -
                previousPaidAmount;

            const roundedRemaining =
                Math.round(
                    (
                        remainingAmount +
                        Number.EPSILON
                    ) * 100
                ) / 100;

            const roundedPayment =
                Math.round(
                    (
                        paymentAmount +
                        Number.EPSILON
                    ) * 100
                ) / 100;

            if (
                roundedPayment >
                roundedRemaining
            ) {
                throw new Error(
                    `Payment amount cannot exceed the remaining balance of ₹${roundedRemaining.toFixed(2)}.`
                );
            }

            /* =========================================
               DUPLICATE TRANSACTION CHECK
            ========================================= */

            if (
                payment_method !== "CASH"
            ) {
                const duplicateResult =
                    await client.query(
                        `
                        SELECT id
                        FROM payments
                        WHERE
                            payment_method = $1
                            AND transaction_number = $2
                            AND payment_status = $3
                        LIMIT 1
                        `,
                        [
                            payment_method,
                            String(
                                transaction_number
                            ).trim(),
                            successfulPaymentStatus,
                        ]
                    );

                if (
                    (duplicateResult.rowCount ?? 0) >
                    0
                ) {
                    throw new Error(
                        "This transaction/reference number has already been used."
                    );
                }
            }

            /* =========================================
               TOTAL AFTER PAYMENT
            ========================================= */

            const totalAfterPayment =
                previousPaidAmount +
                roundedPayment;

            /* =========================================
               INSERT PAYMENT

               IMPORTANT:
               payments table does NOT have guest_id.
            ========================================= */

            const paymentResult =
                await client.query(
                    `
                    INSERT INTO payments (
                        booking_id,
                        amount,
                        payment_method,
                        transaction_number,
                        payment_date,
                        payment_status,
                        remarks,
                        received_by
                    )
                    VALUES (
                        $1,
                        $2,
                        $3,
                        $4,
                        $5,
                        $6,
                        $7,
                        $8
                    )
                    RETURNING
                        id,
                        booking_id,
                        amount,
                        payment_method,
                        transaction_number,
                        payment_date,
                        payment_status,
                        remarks,
                        received_by,
                        created_at
                    `,
                    [
                        booking_id,
                        roundedPayment,
                        payment_method,
                        payment_method ===
                        "CASH"
                            ? null
                            : String(
                                transaction_number
                            ).trim(),
                        payment_date,
                        successfulPaymentStatus,
                        remarks
                            ? String(
                                remarks
                            ).trim()
                            : null,
                        received_by,
                    ]
                );

            const payment =
                paymentResult.rows[0];

            /* =========================================
               NEW BALANCE
            ========================================= */

            const newBalance =
                Math.max(
                    0,
                    approvedAmount -
                    totalAfterPayment
                );

            /* =========================================
               COMMIT
            ========================================= */

            await client.query(
                "COMMIT"
            );

            return res.status(201).json({
                success: true,

                message:
                    "Payment recorded successfully.",

                payment,

                summary: {
                    booking_id:
                        booking.id,

                    booking_reference:
                        booking.booking_reference,

                    guest_id:
                        guest.id,

                    guest_name:
                        guest.guest_name,

                    approved_amount:
                        approvedAmount,

                    previous_paid_amount:
                        previousPaidAmount,

                    current_payment_amount:
                        roundedPayment,

                    total_paid_amount:
                        totalAfterPayment,

                    balance_amount:
                        newBalance,

                    payment_status:
                        successfulPaymentStatus,

                    payment_method:
                        payment_method,

                    transaction_number:
                        payment.transaction_number,

                    payment_date:
                        payment.payment_date,
                },

                next_stage:
                    "INVOICE",
            });
        } catch (error) {
            await client.query(
                "ROLLBACK"
            );

            console.error(
                "Create payment error:",
                error
            );

            const message =
                error instanceof Error
                    ? error.message
                    : "Unable to record payment.";

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
   GET UPI PAYMENT CONFIGURATION
========================================================= */

router.get("/configuration", async (req, res) => {
    try {
        const result = await pool.query(
            `
            SELECT upi_id, payee_name
            FROM payment_configuration
            WHERE id = 1
            `
        );
        return res.json({
            success: true,
            configuration: result.rows[0] ?? null,
        });
    } catch (error) {
        console.error("Payment configuration fetch error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to load UPI payment configuration.",
        });
    }
});

router.put("/configuration", async (req, res) => {
    if (req.authUser?.role !== "ADMIN") {
        return res.status(403).json({
            success: false,
            message: "Only an ADMIN can update UPI payment configuration.",
        });
    }

    const upiId =
        typeof req.body.upi_id === "string"
            ? req.body.upi_id.trim()
            : "";
    const payeeName =
        typeof req.body.payee_name === "string"
            ? req.body.payee_name.trim()
            : "";

    if (
        !/^[A-Za-z0-9._-]{2,128}@[A-Za-z0-9.-]{2,64}$/.test(upiId) ||
        payeeName.length < 1 ||
        payeeName.length > 80
    ) {
        return res.status(400).json({
            success: false,
            message: "Provide a valid UPI ID and payee name.",
        });
    }

    try {
        const result = await pool.query(
            `
            INSERT INTO payment_configuration (
                id, upi_id, payee_name, updated_by, updated_at
            )
            VALUES (1, $1, $2, $3, CURRENT_TIMESTAMP)
            ON CONFLICT (id)
            DO UPDATE SET
                upi_id = EXCLUDED.upi_id,
                payee_name = EXCLUDED.payee_name,
                updated_by = EXCLUDED.updated_by,
                updated_at = CURRENT_TIMESTAMP
            RETURNING upi_id, payee_name
            `,
            [upiId, payeeName, req.authUser.id]
        );
        return res.json({
            success: true,
            configuration: result.rows[0],
        });
    } catch (error) {
        console.error("Payment configuration update error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to save UPI payment configuration.",
        });
    }
});

/* =========================================================
   GET PAYMENTS FOR BOOKING

   GET /api/payments/booking/:bookingId
========================================================= */

router.get(
    "/booking/:bookingId",
    async (
        req: Request,
        res: Response
    ) => {
        const bookingId =
            String(
                req.params.bookingId
            );

        try {
            const bookingResult =
                await pool.query(
                    `
                    SELECT
                        id,
                        booking_reference,
                        approval_status,
                        guest_type
                    FROM bookings
                    WHERE id = $1
                    LIMIT 1
                    `,
                    [bookingId]
                );

            if (
                bookingResult.rowCount === 0
            ) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Booking not found.",
                });
            }

            /*
             * payments table does not store guest_id.
             *
             * We therefore fetch the primary guest
             * of the booking separately.
             */

            const paymentResult =
                await pool.query(
                    `
                    SELECT
                        p.id,
                        p.booking_id,
                        p.amount,
                        p.payment_method,
                        p.transaction_number,
                        p.payment_date,
                        p.payment_status,
                        p.remarks,
                        p.received_by,
                        p.created_at,

                        guest_info.guest_id,
                        guest_info.guest_name,

                        u.full_name AS received_by_name

                    FROM payments p

                    LEFT JOIN LATERAL (
                        SELECT
                            g.id AS guest_id,
                            g.guest_name
                        FROM booking_guests bg
                        INNER JOIN guests g
                            ON g.id = bg.guest_id
                        WHERE
                            bg.booking_id = p.booking_id
                        ORDER BY
                            bg.is_primary_guest DESC,
                            bg.created_at ASC
                        LIMIT 1
                    ) guest_info
                        ON TRUE

                    INNER JOIN users u
                        ON u.id = p.received_by

                    WHERE
                        p.booking_id = $1

                    ORDER BY
                        p.created_at DESC
                    `,
                    [bookingId]
                );

            const totalResult =
                await pool.query(
                    `
                    SELECT
                        COALESCE(
                            SUM(amount),
                            0
                        ) AS total_paid
                    FROM payments
                    WHERE
                        booking_id = $1
                    `,
                    [bookingId]
                );

            const totalPaid =
                Number(
                    totalResult
                        .rows[0]
                        .total_paid || 0
                );

            return res.json({
                success: true,

                booking:
                    bookingResult.rows[0],

                payments:
                    paymentResult.rows,

                total_paid:
                    totalPaid,
            });
        } catch (error) {
            console.error(
                "Get booking payments error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to retrieve booking payments.",
            });
        }
    }
);

/* =========================================================
   GET PAYMENT BY ID

   GET /api/payments/:id
========================================================= */

router.get(
    "/:id",
    async (
        req: Request,
        res: Response
    ) => {
        const paymentId =
            String(
                req.params.id
            );

        try {
            const result =
                await pool.query(
                    `
                    SELECT
                        p.id,
                        p.booking_id,
                        p.amount,
                        p.payment_method,
                        p.transaction_number,
                        p.payment_date,
                        p.payment_status,
                        p.remarks,
                        p.received_by,
                        p.created_at,

                        b.booking_reference,

                        guest_info.guest_id,
                        guest_info.guest_name,
                        guest_info.mobile_number,

                        u.full_name AS received_by_name

                    FROM payments p

                    INNER JOIN bookings b
                        ON b.id = p.booking_id

                    LEFT JOIN LATERAL (
                        SELECT
                            g.id AS guest_id,
                            g.guest_name,
                            g.mobile_number
                        FROM booking_guests bg
                        INNER JOIN guests g
                            ON g.id = bg.guest_id
                        WHERE
                            bg.booking_id = p.booking_id
                        ORDER BY
                            bg.is_primary_guest DESC,
                            bg.created_at ASC
                        LIMIT 1
                    ) guest_info
                        ON TRUE

                    INNER JOIN users u
                        ON u.id = p.received_by

                    WHERE p.id = $1

                    LIMIT 1
                    `,
                    [paymentId]
                );

            if (
                result.rowCount === 0
            ) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Payment not found.",
                });
            }

            return res.json({
                success: true,
                payment:
                    result.rows[0],
            });
        } catch (error) {
            console.error(
                "Get payment error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to retrieve payment.",
            });
        }
    }
);

export default router;