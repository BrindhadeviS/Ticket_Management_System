import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../src/config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
  try {
    const sqlPath = path.resolve(__dirname, '../src/migrations/20261122_add_employee_manager.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await pool.query(sql);
    console.log('✅ Manager migration applied successfully');

    const result = await pool.query(`
      SELECT e.employee_id, e.name, e.department, e.role, e.manager_id, m.name as manager_name
      FROM employees e
      LEFT JOIN employees m ON m.employee_id = e.manager_id
      ORDER BY e.employee_id
    `);
    console.table(result.rows);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
