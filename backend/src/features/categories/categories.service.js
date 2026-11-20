import pool from "../../config/db.js";

// Returns { "Category": { "Sub Category": ["Item", ...] } } in display order.
export const getCategoryTree = async () => {
  const { rows } = await pool.query(`
    SELECT c.name AS category, s.name AS sub_category, i.name AS item
    FROM categories c
    LEFT JOIN sub_categories s
      ON s.category_id = c.category_id AND s.active = true
    LEFT JOIN items i
      ON i.sub_category_id = s.sub_category_id AND i.active = true
    WHERE c.active = true
    ORDER BY c.sort_order, c.name, s.sort_order, s.name, i.sort_order, i.name
  `);

  const tree = {};
  for (const r of rows) {
    if (!tree[r.category]) tree[r.category] = {};
    if (r.sub_category) {
      if (!tree[r.category][r.sub_category]) tree[r.category][r.sub_category] = [];
      if (r.item) tree[r.category][r.sub_category].push(r.item);
    }
  }
  return tree;
};