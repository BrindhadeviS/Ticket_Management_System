import { Router } from "express";
import { getCategories } from "./categories.controller.js";
import pool from "../../config/db.js";
import authMiddleware from "../../middleware/auth.middleware.js";
import roleMiddleware from "../../middleware/role.middleware.js";

const router = Router();

router.get("/", async (req, res, next) => {
  if (req.query.tree === "true") {
    return getCategories(req, res, next);
  }
  try {
    const result = await pool.query(
      `SELECT c.*,
              COALESCE(
                json_agg(m.department ORDER BY m.department) FILTER (WHERE m.department IS NOT NULL),
                '[]'
              ) AS departments
       FROM categories c
       LEFT JOIN category_department_mapping m ON c.category_id = m.category_id
       GROUP BY c.category_id
       ORDER BY c.sort_order ASC, c.name ASC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch categories" });
  }
});

/**
 * Admin creates a new category.
 * Body: { name: string, active?: boolean, departments?: string[] }
 */
router.post(
  "/",
  authMiddleware,
  roleMiddleware("Admin"),
  async (req, res) => {
    const { name, active = true, departments = [] } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ success: false, message: "Category name is required." });
    }

    const trimmedName = name.trim();

    if (trimmedName.length < 2) {
      return res.status(400).json({ success: false, message: "Category name must be at least 2 characters long." });
    }

    if (trimmedName.length > 100) {
      return res.status(400).json({ success: false, message: "Category name cannot exceed 100 characters." });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Check for case-insensitive duplicate
      const existing = await client.query(
        `SELECT category_id FROM categories WHERE LOWER(TRIM(name)) = LOWER($1)`,
        [trimmedName]
      );

      if (existing.rows.length > 0) {
        await client.query("ROLLBACK");
        return res.status(409).json({ success: false, message: `Category "${trimmedName}" already exists.` });
      }

      const result = await client.query(
        `INSERT INTO categories (name, active) VALUES ($1, $2) RETURNING *`,
        [trimmedName, active]
      );
      const newCategory = result.rows[0];

      // Insert mappings if departments provided
      const assignedDepts = Array.isArray(departments)
        ? departments.filter((d) => typeof d === "string" && d.trim()).map((d) => d.trim())
        : [];

      for (const dept of assignedDepts) {
        await client.query(
          `INSERT INTO category_department_mapping (category_id, department)
           VALUES ($1, $2)
           ON CONFLICT (category_id, department) DO NOTHING`,
          [newCategory.category_id, dept]
        );
      }

      await client.query("COMMIT");
      newCategory.departments = assignedDepts;
      res.status(201).json({ success: true, data: newCategory });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(err);
      if (err.code === "23505") {
        return res.status(409).json({ success: false, message: `Category "${trimmedName}" already exists.` });
      }
      res.status(500).json({ success: false, message: "Failed to create category" });
    } finally {
      client.release();
    }
  }
);

export default router;
