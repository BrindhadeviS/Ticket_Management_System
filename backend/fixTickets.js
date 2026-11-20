import pool from "./src/config/db.js";

async function fixExistingTickets() {
  try {
    // Check anita rao or first employee
    const empRes = await pool.query(`SELECT employee_id, name, email, role FROM employees`);
    console.log("Employees in DB:", empRes.rows);

    const anita = empRes.rows.find(e => e.email === 'anita@ladera.com') || empRes.rows[0];
    const priya = empRes.rows.find(e => e.email === 'priya@ladera.com') || empRes.rows[0];
    const sam = empRes.rows.find(e => e.email === 'sam@ladera.com') || empRes.rows[0];

    if (anita) {
      await pool.query(`
        UPDATE tickets
        SET created_by = $1
        WHERE id = 'TKT-1001'
      `, [anita.employee_id]);

      await pool.query(`
        UPDATE tickets
        SET created_by = $1,
            approver_id = $2,
            approver_reason = 'Approved for IT hardware maintenance',
            assignee_id = $3
        WHERE id = 'TKT-1002'
      `, [anita.employee_id, priya?.employee_id || anita.employee_id, sam?.employee_id || anita.employee_id]);

      console.log("Updated TKT-1001 and TKT-1002 with proper employee IDs.");
    }
  } catch (err) {
    console.error("Error fixing existing tickets:", err);
  } finally {
    await pool.end();
  }
}

fixExistingTickets();
