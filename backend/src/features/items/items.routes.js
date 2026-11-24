import { Router } from "express";
import pool from "../../config/db.js";
import authMiddleware from "../../middleware/auth.middleware.js";
import roleMiddleware from "../../middleware/role.middleware.js";

const router = Router();

/**
 * Admin creates a new item.
 * Body: { name: string, sub_category_id: number, active?: boolean }
 */
router.post(
  "/",
  authMiddleware,
  roleMiddleware("Admin"),
  async (req, res) => {
    const { name, sub_category_id, active = true } = req.body;

    if (!sub_category_id || isNaN(Number(sub_category_id))) {
      return res.status(400).json({ success: false, message: "A valid sub_category_id is required." });
    }

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ success: false, message: "Item name is required." });
    }

    const trimmedName = name.trim();

    if (trimmedName.length < 2) {
      return res.status(400).json({ success: false, message: "Item name must be at least 2 characters long." });
    }

    if (trimmedName.length > 150) {
      return res.status(400).json({ success: false, message: "Item name cannot exceed 150 characters." });
    }

    try {
      // Check parent sub-category exists
      const parentCheck = await pool.query(
        `SELECT sub_category_id, name FROM sub_categories WHERE sub_category_id = $1`,
        [sub_category_id]
      );
      if (parentCheck.rows.length === 0) {
        return res.status(404).json({ success: false, message: "Parent sub-category not found." });
      }

      // Check for case-insensitive duplicate under same sub-category
      const existing = await pool.query(
        `SELECT item_id FROM items WHERE sub_category_id = $1 AND LOWER(TRIM(name)) = LOWER($2)`,
        [sub_category_id, trimmedName]
      );

      if (existing.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: `Item "${trimmedName}" already exists under "${parentCheck.rows[0].name}".`,
        });
      }

      const result = await pool.query(
        `INSERT INTO items (name, sub_category_id, active) VALUES ($1, $2, $3) RETURNING *`,
        [trimmedName, sub_category_id, active]
      );
      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
      console.error(err);
      if (err.code === "23505") {
        return res.status(409).json({ success: false, message: `Item "${trimmedName}" already exists in this sub-category.` });
      }
      if (err.code === "23503") {
        return res.status(404).json({ success: false, message: "Parent sub-category not found." });
      }
      res.status(500).json({ success: false, message: "Failed to create item" });
    }
  }
);

router.get("/", async (req, res) => {
  const { sub_category_id } = req.query;
  try {
    const result = await pool.query(
      `SELECT * FROM items ${
        sub_category_id ? "WHERE sub_category_id = $1" : ""
      } ORDER BY sort_order ASC, name ASC`,
      sub_category_id ? [sub_category_id] : []
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch items" });
  }
});

export default router;
