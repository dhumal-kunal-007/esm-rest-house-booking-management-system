import "dotenv/config";

import allotmentRoutes from "./routes/allotmentRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";
import express from "express";
import cors from "cors";
import { pool } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import checkInRoutes from "./routes/checkInRoutes.js";
import checkOutRoutes from "./routes/checkOutRoutes.js";
import housekeepingRoutes from "./routes/housekeepingRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import approvalRoutes from "./routes/approvalRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import lostAndFoundRoutes from "./routes/lostAndFoundRoutes.js";
import billRoutes from "./routes/billRoutes.js";
import acceptanceRoutes from "./routes/acceptanceRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import invoiceRoutes from "./routes/invoiceRoutes.js";
import refundRoutes from "./routes/refundRoutes.js";
import feedbackRoutes from "./routes/feedbackRoutes.js";
import checkoutFeedbackRoutes from "./routes/checkoutFeedbackRoutes.js";
import { requireAuth } from "./auth/authMiddleware.js";
import { startDailyReportScheduler } from "./services/dailyReport.js";

const app = express();
const PORT = process.env.PORT || 5000;
const corsOrigins = process.env.CORS_ORIGIN
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(cors({
    origin: corsOrigins?.length ? corsOrigins : "*",
}));
app.use(express.json());
app.use("/api/auth", authRoutes);

app.get("/api/health", async (_req, res) => {
    try {
        const result = await pool.query(
            "SELECT NOW() AS current_time"
        );

        res.json({
            success: true,
            message: "ESM Rest House Backend is running",
            database: "PostgreSQL connected",
            databaseTime: result.rows[0].current_time,
        });
    } catch (error) {
        console.error(
            "Database connection error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Backend is running, but PostgreSQL connection failed",
        });
    }
});

app.use("/api", requireAuth);
app.use("/api/acceptances", acceptanceRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/allotments", allotmentRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/check-ins", checkInRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/check-outs", checkOutRoutes);
app.use("/api/housekeeping", housekeepingRoutes);
app.use("/api/bills", billRoutes);
app.use("/api/approvals", approvalRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/refunds", refundRoutes);
app.use("/api/users", userRoutes);
app.use(
  "/api/feedback-notifications",
  feedbackRoutes
);
app.use(
  "/api/checkout-feedback",
  checkoutFeedbackRoutes
);
app.use(
  "/api/lost-and-found",
  lostAndFoundRoutes
);

app.listen(PORT, () => {
    console.log(
        `ESM Rest House Backend running on port ${PORT}`
    );
    startDailyReportScheduler();
});