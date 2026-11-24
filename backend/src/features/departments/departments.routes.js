import { Router } from "express";
import pool from "../../config/db.js";
import authMiddleware from "../../middleware/auth.middleware.js";
import roleMiddleware from "../../middleware/role.middleware.js";

const router = Router();

// Ensure departments table exists and has initial values
let initialized = false;
async function initDepartmentsTable() {
  if (initialized) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS departments (
        department_id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed defaults and sync existing departments
    const defaultDepts = [
      "Engineering",
      "IT Infrastructure",
      "IT Operations",
      "HR",
      "Finance"
    ];

    for (const d of defaultDepts) {
      await pool.query(
        `INSERT INTO departments (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
        [d]
      );
    }

    // Sync any existing departments from employees or category_department_mapping
    await pool.query(`
      INSERT INTO departments (name)
      SELECT DISTINCT department FROM (
        SELECT department FROM category_department_mapping WHERE department IS NOT NULL AND TRIM(department) <> ''
        UNION
        SELECT department FROM employees WHERE department IS NOT NULL AND TRIM(department) <> ''
      ) existing
      ON CONFLICT (name) DO NOTHING;
    `);

    initialized = true;
  } catch (err) {
    console.error("Failed to initialize departments table:", err.message);
  }
}

/**
 * GET /api/departments
 * Fetch all available departments sorted by name
 */
router.get("/", async (req, res) => {
  await initDepartmentsTable();
  try {
    const result = await pool.query(
      `SELECT department_id, name, active, created_at
       FROM departments
       WHERE active = true
       ORDER BY name ASC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("Fetch departments error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch departments" });
  }
});

/**
 * POST /api/departments
 * Admin creates a new department.
 * Body: { name: string }
 */
router.post(
  "/",
  authMiddleware,
  roleMiddleware("Admin"),
  async (req, res) => {
    await initDepartmentsTable();
    const { name } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ success: false, message: "Department name is required." });
    }

    const trimmedName = name.trim();

    if (trimmedName.length < 2) {
      return res.status(400).json({ success: false, message: "Department name must be at least 2 characters long." });
    }

    if (trimmedName.length > 100) {
      return res.status(400).json({ success: false, message: "Department name cannot exceed 100 characters." });
    }

    try {
      // Check for case-insensitive duplicate
      const existing = await pool.query(
        `SELECT department_id, name FROM departments WHERE LOWER(TRIM(name)) = LOWER($1)`,
        [trimmedName]
      );

      if (existing.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: `Department "${trimmedName}" already exists.`,
        });
      }

      const result = await pool.query(
        `INSERT INTO departments (name) VALUES ($1) RETURNING department_id, name, active, created_at`,
        [trimmedName]
      );

      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
      console.error("Create department error:", err);
      res.status(500).json({ success: false, message: "Failed to create department." });
    }
  }
);

/**
 * DELETE /api/departments/:id
 * Admin deletes a department (by id or by name).
 */
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("Admin"),
  async (req, res) => {
    await initDepartmentsTable();
    const { id } = req.params;

    try {
      let result;
      if (!isNaN(Number(id))) {
        result = await pool.query(
          `DELETE FROM departments WHERE department_id = $1 RETURNING *`,
          [Number(id)]
        );
      } else {
        result = await pool.query(
          `DELETE FROM departments WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) RETURNING *`,
          [id]
        );
      }

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: "Department not found." });
      }

      res.json({ success: true, message: "Department removed successfully.", data: result.rows[0] });
    } catch (err) {
      console.error("Delete department error:", err);
      res.status(500).json({ success: false, message: "Failed to delete department." });
    }
  }
);

export default router;
