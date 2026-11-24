import { Router } from "express";
import pool from "../../config/db.js";
import authMiddleware from "../../middleware/auth.middleware.js";
import roleMiddleware from "../../middleware/role.middleware.js";

const router = Router();

/**
 * Admin creates a new sub‑category.
 * Body: { name: string, category_id: number, active?: boolean }
 */
router.post(
  "/",
  authMiddleware,
  roleMiddleware("Admin"),
  async (req, res) => {
    const { name, category_id, active = true } = req.body;

    if (!category_id || isNaN(Number(category_id))) {
      return res.status(400).json({ success: false, message: "A valid category_id is required." });
    }

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ success: false, message: "Sub-category name is required." });
    }

    const trimmedName = name.trim();

    if (trimmedName.length < 2) {
      return res.status(400).json({ success: false, message: "Sub-category name must be at least 2 characters long." });
    }

    if (trimmedName.length > 150) {
      return res.status(400).json({ success: false, message: "Sub-category name cannot exceed 150 characters." });
    }

    try {
      // Check parent category exists
      const parentCheck = await pool.query(
        `SELECT category_id, name FROM categories WHERE category_id = $1`,
        [category_id]
      );
      if (parentCheck.rows.length === 0) {
        return res.status(404).json({ success: false, message: "Parent category not found." });
      }

      // Check for case-insensitive duplicate under same category
      const existing = await pool.query(
        `SELECT sub_category_id FROM sub_categories WHERE category_id = $1 AND LOWER(TRIM(name)) = LOWER($2)`,
        [category_id, trimmedName]
      );

      if (existing.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: `Sub-category "${trimmedName}" already exists under "${parentCheck.rows[0].name}".`,
        });
      }

      const result = await pool.query(
        `INSERT INTO sub_categories (name, category_id, active) VALUES ($1, $2, $3) RETURNING *`,
        [trimmedName, category_id, active]
      );
      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
      console.error(err);
      if (err.code === "23505") {
        return res.status(409).json({ success: false, message: `Sub-category "${trimmedName}" already exists in this category.` });
      }
      if (err.code === "23503") {
        return res.status(404).json({ success: false, message: "Parent category not found." });
      }
      res.status(500).json({ success: false, message: "Failed to create sub‑category" });
    }
  }
);

router.get("/", async (req, res) => {
  const { category_id } = req.query;   // undefined if not supplied
  try {
    const result = await pool.query(
      `SELECT * FROM sub_categories ${
        category_id ? "WHERE category_id = $1" : ""
      } ORDER BY sort_order ASC, name ASC`,
      category_id ? [category_id] : []
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch sub‑categories" });
  }
});

export default router;
