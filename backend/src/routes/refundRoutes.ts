import { Router, Request, Response } from "express";
import { pool } from "../config/db.js";

const router = Router();

/**
 * POST /api/refunds/calculate
 *
 * Creates or updates a refund calculation for a booking/payment.
 *
 * Body:
 * {
 *   booking_id: string,
 *   payment_id: string,
 *   original_amount: number,
 *   used_amount?: number,
 *   deduction_amount?: number,
 *   refund_reason?: string,
 *   calculated_by: string,
 *   remarks?: string
 * }
 */
router.post(
  "/calculate",
  async (req: Request, res: Response) => {
    const client = await pool.connect();

    try {
      const {
        booking_id,
        payment_id,
        original_amount,
        used_amount = 0,
        deduction_amount = 0,
        refund_reason = null,
        calculated_by,
        remarks = null,
      } = req.body;

      // ----------------------------------------------------
      // VALIDATION
      // ----------------------------------------------------

      if (
        !booking_id ||
        !payment_id ||
        original_amount === undefined ||
        original_amount === null ||
        !calculated_by
      ) {
        return res.status(400).json({
          success: false,
          message:
            "booking_id, payment_id, original_amount and calculated_by are required.",
        });
      }

      const originalAmount = Number(original_amount);
      const usedAmount = Number(used_amount);
      const deductionAmount = Number(deduction_amount);

      if (
        !Number.isFinite(originalAmount) ||
        originalAmount < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "original_amount must be a valid non-negative number.",
        });
      }

      if (
        !Number.isFinite(usedAmount) ||
        usedAmount < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "used_amount must be a valid non-negative number.",
        });
      }

      if (
        !Number.isFinite(deductionAmount) ||
        deductionAmount < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "deduction_amount must be a valid non-negative number.",
        });
      }

      if (
        usedAmount + deductionAmount >
        originalAmount
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Used amount plus deduction amount cannot exceed original amount.",
        });
      }

      const refundAmount =
        originalAmount -
        usedAmount -
        deductionAmount;

      await client.query("BEGIN");

      // ----------------------------------------------------
      // VERIFY BOOKING
      // ----------------------------------------------------

      const bookingResult = await client.query(
        `
        SELECT
          id,
          booking_reference,
          booking_status,
          approval_status
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

      // ----------------------------------------------------
      // VERIFY PAYMENT
      // ----------------------------------------------------

      const paymentResult = await client.query(
        `
        SELECT
          id,
          booking_id,
          amount,
          payment_status,
          payment_method,
          transaction_number
        FROM payments
        WHERE id = $1
          AND booking_id = $2
        LIMIT 1
        `,
        [payment_id, booking_id]
      );

      if (paymentResult.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          success: false,
          message:
            "Payment not found for the specified booking.",
        });
      }

      const payment = paymentResult.rows[0];

      // ----------------------------------------------------
      // PREVENT REFUND AGAINST AN UNPAID PAYMENT
      // ----------------------------------------------------

      const paymentStatus =
        String(
          payment.payment_status || ""
        ).toUpperCase();

      const successfulStatuses = [
        "SUCCESS",
        "COMPLETED",
        "PAID",
        "RECEIVED",
      ];

      if (
        !successfulStatuses.includes(
          paymentStatus
        )
      ) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message:
            "Refund can only be calculated against a successful payment.",
          payment_status:
            payment.payment_status,
        });
      }

      // ----------------------------------------------------
      // VERIFY ORIGINAL AMOUNT
      // ----------------------------------------------------

      const paymentAmount = Number(
        payment.amount
      );

      if (
        Number.isFinite(paymentAmount) &&
        originalAmount > paymentAmount
      ) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message:
            "Original refund amount cannot exceed the payment amount.",
          payment_amount: paymentAmount,
          original_amount: originalAmount,
        });
      }

      // ----------------------------------------------------
      // CHECK EXISTING REFUND
      // ----------------------------------------------------

      const existingRefundResult =
        await client.query(
          `
          SELECT
            id,
            booking_id,
            payment_id,
            original_amount,
            used_amount,
            deduction_amount,
            refund_amount,
            refund_reason,
            refund_status,
            calculated_by,
            calculated_at,
            processed_at,
            remarks
          FROM refunds
          WHERE booking_id = $1
            AND payment_id = $2
          ORDER BY calculated_at DESC
          LIMIT 1
          `,
          [booking_id, payment_id]
        );

      let refund;

      if (
        existingRefundResult.rows.length > 0
      ) {
        // --------------------------------------------------
        // UPDATE EXISTING CALCULATION
        // --------------------------------------------------

        const refundId =
          existingRefundResult.rows[0].id;

        const updateResult =
          await client.query(
            `
            UPDATE refunds
            SET
              original_amount = $1,
              used_amount = $2,
              deduction_amount = $3,
              refund_amount = $4,
              refund_reason = $5,
              refund_status = 'CALCULATED',
              calculated_by = $6,
              calculated_at = CURRENT_TIMESTAMP,
              processed_at = NULL,
              remarks = $7
            WHERE id = $8
            RETURNING
              id,
              booking_id,
              payment_id,
              original_amount,
              used_amount,
              deduction_amount,
              refund_amount,
              refund_reason,
              refund_status,
              calculated_by,
              calculated_at,
              processed_at,
              remarks
            `,
            [
              originalAmount,
              usedAmount,
              deductionAmount,
              refundAmount,
              refund_reason,
              calculated_by,
              remarks,
              refundId,
            ]
          );

        refund =
          updateResult.rows[0];
      } else {
        // --------------------------------------------------
        // CREATE NEW CALCULATION
        // --------------------------------------------------

        const insertResult =
          await client.query(
            `
            INSERT INTO refunds (
              booking_id,
              payment_id,
              original_amount,
              used_amount,
              deduction_amount,
              refund_amount,
              refund_reason,
              refund_status,
              calculated_by,
              remarks
            )
            VALUES (
              $1,
              $2,
              $3,
              $4,
              $5,
              $6,
              $7,
              'CALCULATED',
              $8,
              $9
            )
            RETURNING
              id,
              booking_id,
              payment_id,
              original_amount,
              used_amount,
              deduction_amount,
              refund_amount,
              refund_reason,
              refund_status,
              calculated_by,
              calculated_at,
              processed_at,
              remarks
            `,
            [
              booking_id,
              payment_id,
              originalAmount,
              usedAmount,
              deductionAmount,
              refundAmount,
              refund_reason,
              calculated_by,
              remarks,
            ]
          );

        refund =
          insertResult.rows[0];
      }

      await client.query("COMMIT");

      return res.status(200).json({
        success: true,
        message:
          "Refund calculation saved successfully.",
        refund,
        calculation: {
          original_amount:
            originalAmount,
          used_amount:
            usedAmount,
          deduction_amount:
            deductionAmount,
          refund_amount:
            refundAmount,
        },
        next_stage:
          "REFUND_MEMO",
      });
    } catch (error: any) {
      await client.query("ROLLBACK");

      console.error(
        "Refund calculation error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to calculate refund.",
        error:
          error?.message ||
          "Unknown server error.",
      });
    } finally {
      client.release();
    }
  }
);

/**
 * GET /api/refunds/booking/:bookingId
 *
 * Gets the latest refund calculation
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

      const result = await pool.query(
        `
        SELECT
          r.id,
          r.booking_id,
          r.payment_id,
          r.original_amount,
          r.used_amount,
          r.deduction_amount,
          r.refund_amount,
          r.refund_reason,
          r.refund_status,
          r.calculated_by,
          r.calculated_at,
          r.processed_at,
          r.remarks,
          p.amount AS payment_amount,
          p.payment_method,
          p.payment_status
        FROM refunds r
        LEFT JOIN payments p
          ON p.id = r.payment_id
        WHERE r.booking_id = $1
        ORDER BY r.calculated_at DESC
        `,
        [bookingId]
      );

      return res.status(200).json({
        success: true,
        refunds: result.rows,
      });
    } catch (error: any) {
      console.error(
        "Get refunds error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch refunds.",
        error:
          error?.message ||
          "Unknown server error.",
      });
    }
  }
);

/**
 * POST /api/refunds/:refundId/memo
 *
 * Creates a refund memo for an existing
 * calculated refund.
 *
 * Body:
 * {
 *   memo_number: string,
 *   amount: number,
 *   generated_by: string,
 *   memo_date?: string,
 *   remarks?: string
 * }
 */
router.post(
  "/:refundId/memo",
  async (
    req: Request,
    res: Response
  ) => {
    const client = await pool.connect();

    try {
      const refundId = String(
        req.params.refundId
      );

      const {
        memo_number,
        amount,
        generated_by,
        memo_date,
        remarks = null,
      } = req.body;

      if (
        !memo_number ||
        amount === undefined ||
        amount === null ||
        !generated_by
      ) {
        return res.status(400).json({
          success: false,
          message:
            "memo_number, amount and generated_by are required.",
        });
      }

      const memoAmount =
        Number(amount);

      if (
        !Number.isFinite(
          memoAmount
        ) ||
        memoAmount < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Memo amount must be a valid non-negative number.",
        });
      }

      await client.query("BEGIN");

      // ----------------------------------------------------
      // GET REFUND
      // ----------------------------------------------------

      const refundResult =
        await client.query(
          `
          SELECT
            id,
            booking_id,
            payment_id,
            original_amount,
            used_amount,
            deduction_amount,
            refund_amount,
            refund_reason,
            refund_status
          FROM refunds
          WHERE id = $1
          FOR UPDATE
          `,
          [refundId]
        );

      if (
        refundResult.rows.length === 0
      ) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          success: false,
          message:
            "Refund calculation not found.",
        });
      }

      const refund =
        refundResult.rows[0];

      // ----------------------------------------------------
      // REFUND MUST BE CALCULATED
      // ----------------------------------------------------

      if (
        String(
          refund.refund_status
        ).toUpperCase() !==
        "CALCULATED"
      ) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message:
            "Only a CALCULATED refund can generate a refund memo.",
          refund_status:
            refund.refund_status,
        });
      }

      const calculatedRefund =
        Number(
          refund.refund_amount
        );

      // ----------------------------------------------------
      // MEMO AMOUNT VALIDATION
      // ----------------------------------------------------

      if (
        memoAmount >
        calculatedRefund
      ) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message:
            "Refund memo amount cannot exceed calculated refund amount.",
          calculated_refund:
            calculatedRefund,
          memo_amount:
            memoAmount,
        });
      }

      // ----------------------------------------------------
      // PREVENT DUPLICATE MEMO NUMBER
      // ----------------------------------------------------

      const duplicateMemoResult =
        await client.query(
          `
          SELECT id
          FROM refund_memos
          WHERE memo_number = $1
          LIMIT 1
          `,
          [memo_number]
        );

      if (
        duplicateMemoResult.rows.length > 0
      ) {
        await client.query("ROLLBACK");

        return res.status(409).json({
          success: false,
          message:
            "Refund memo number already exists.",
        });
      }

      // ----------------------------------------------------
      // CREATE REFUND MEMO
      // ----------------------------------------------------

      const memoResult =
        await client.query(
          `
          INSERT INTO refund_memos (
            refund_id,
            memo_number,
            memo_date,
            amount,
            generated_by,
            remarks
          )
          VALUES (
            $1,
            $2,
            COALESCE($3::date, CURRENT_DATE),
            $4,
            $5,
            $6
          )
          RETURNING
            id,
            refund_id,
            memo_number,
            memo_date,
            amount,
            generated_by,
            remarks,
            created_at
          `,
          [
            refundId,
            memo_number,
            memo_date || null,
            memoAmount,
            generated_by,
            remarks,
          ]
        );

      // ----------------------------------------------------
      // UPDATE REFUND STATUS
      // ----------------------------------------------------

      const statusUpdate =
        await client.query(
          `
          UPDATE refunds
          SET
            refund_status = 'APPROVED',
            processed_at = CURRENT_TIMESTAMP
          WHERE id = $1
          RETURNING
            id,
            booking_id,
            payment_id,
            original_amount,
            used_amount,
            deduction_amount,
            refund_amount,
            refund_reason,
            refund_status,
            calculated_by,
            calculated_at,
            processed_at,
            remarks
          `,
          [refundId]
        );

      await client.query("COMMIT");

      return res.status(201).json({
        success: true,
        message:
          "Refund memo created successfully.",
        refund:
          statusUpdate.rows[0],
        refund_memo:
          memoResult.rows[0],
        next_stage:
          "WHATSAPP_FEEDBACK",
      });
    } catch (error: any) {
      await client.query("ROLLBACK");

      console.error(
        "Refund memo error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to create refund memo.",
        error:
          error?.message ||
          "Unknown server error.",
      });
    } finally {
      client.release();
    }
  }
);

/**
 * GET /api/refunds/:refundId/memo
 *
 * Gets refund memo(s) for a refund.
 */
router.get(
  "/:refundId/memo",
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const refundId = String(
        req.params.refundId
      );

      const result = await pool.query(
        `
        SELECT
          id,
          refund_id,
          memo_number,
          memo_date,
          amount,
          generated_by,
          remarks,
          created_at
        FROM refund_memos
        WHERE refund_id = $1
        ORDER BY created_at DESC
        `,
        [refundId]
      );

      return res.status(200).json({
        success: true,
        refund_memos:
          result.rows,
      });
    } catch (error: any) {
      console.error(
        "Get refund memo error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch refund memo.",
        error:
          error?.message ||
          "Unknown server error.",
      });
    }
  }
);

export default router;