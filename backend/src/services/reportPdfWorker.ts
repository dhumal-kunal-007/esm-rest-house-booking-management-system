import { pool } from "../config/db.js";
import { exportDueReportPdfs } from "./reportPdfExports.js";

try {
  await exportDueReportPdfs();
} catch (error) {
  console.error("Automatic report PDF export failed:", error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
