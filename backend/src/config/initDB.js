import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcrypt";
import pool from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlDir = path.resolve(__dirname, "../../sql");

// Runs each numbered file in backend/sql once, in order, and records it.
const runMigrations = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const done = new Set(
    (await pool.query("SELECT filename FROM schema_migrations")).rows.map(
      (r) => r.filename,
    ),
  );

  const files = fs
    .readdirSync(sqlDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (done.has(file)) continue;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(fs.readFileSync(path.join(sqlDir, file), "utf8"));
      await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log(`Migration applied: ${file}`);
    } catch (err) {
      await client.query("ROLLBACK");
      throw new Error(`Migration ${file} failed: ${err.message}`);
    } finally {
      client.release();
    }
  }
};

// Only for a brand-new database: creates the demo logins so you can sign in.
const seedEmployeesIfEmpty = async () => {
  const { rows } = await pool.query("SELECT count(*)::int AS count FROM employees");
  if (rows[0].count > 0) return;

  const demo = [
    ["Admin", "admin@ladera.com", "IT", "Admin", "admin123"],
    ["Priya Nair", "priya@ladera.com", "Operations", "Approver", "approver123"],
    ["Sam Thomas", "sam@ladera.com", "IT Support", "Support Team", "support123"],
    ["Anita Rao", "anita@ladera.com", "Finance", "Employee", "employee123"],
    ["Arun Menon", "arun@ladera.com", "Operations", "Approver", "approver123"],
  ];

  for (const [name, email, dept, role, pw] of demo) {
    await pool.query(
      `INSERT INTO employees (name, email, department, password_hash, role, active)
       VALUES ($1, $2, $3, $4, $5, true)`,
      [name, email, dept, await bcrypt.hash(pw, 10), role],
    );
  }
};

export const initDB = async () => {
  try {
    await runMigrations();
    await seedEmployeesIfEmpty();
    console.log("Database is up to date.");
  } catch (err) {
    console.error("Database setup failed:", err.message);
    process.exit(1);
  }
};

// Allow: node src/config/initDB.js
if (process.argv[1]?.endsWith("initDB.js")) {
  initDB().then(() => pool.end());
}