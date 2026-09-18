import { Router } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../config/db.js";

const router = Router();

router.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: "Username and password are required",
            });
        }

        const result = await pool.query(
            `
            SELECT
                u.id,
                u.full_name,
                u.username,
                u.password_hash,
                u.is_active,
                r.id AS role_id,
                r.role_name,
                r.description
            FROM users u
            JOIN roles r
                ON r.id = u.role_id
            WHERE u.username = $1
            `,
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid username or password",
            });
        }

        const user = result.rows[0];

        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                message: "User account is inactive",
            });
        }

        const passwordMatches = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatches) {
            return res.status(401).json({
                success: false,
                message: "Invalid username or password",
            });
        }

        return res.json({
            success: true,
            message: "Login successful",
            user: {
                id: user.id,
                full_name: user.full_name,
                username: user.username,
                role_id: user.role_id,
                role_name: user.role_name,
                description: user.description,
            },
        });
    } catch (error) {
        console.error("Login error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
});

export default router;