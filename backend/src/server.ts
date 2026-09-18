import allotmentRoutes from "./routes/allotmentRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import checkInRoutes from "./routes/checkInRoutes.js";
import checkOutRoutes from "./routes/checkOutRoutes.js";
import housekeepingRoutes from "./routes/housekeepingRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import approvalRoutes from "./routes/approvalRoutes.js";
import userRoutes from "./routes/userRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/allotments", allotmentRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/check-ins", checkInRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/check-outs", checkOutRoutes);
app.use("/api/housekeeping", housekeepingRoutes);
app.use("/api/approvals", approvalRoutes);
app.use("/api/users", userRoutes);

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

app.listen(PORT, () => {
    console.log(
        `ESM Rest House Backend running on port ${PORT}`
    );
});