import pool from "./src/config/db.js";

async function inspect() {
  try {
    const cols = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'tickets'
    `);
    console.log("Tickets columns:\n", cols.rows);

    const constraints = await pool.query(`
      SELECT conname, contype
      FROM pg_constraint
      WHERE conrelid = 'tickets'::regclass
    `);
    console.log("Tickets constraints:\n", constraints.rows);

    const emp = await pool.query(`SELECT * FROM employees`);
    console.log("Employees:\n", emp.rows);

    const tkts = await pool.query(`SELECT * FROM tickets`);
    console.log("Tickets count:", tkts.rows.length);
    console.log("Tickets rows:\n", tkts.rows);
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

inspect();
