import pool from "./src/config/db.js";

const testConnection = async () => {
  try {
    const result = await pool.query("SELECT NOW()");
    console.log("PostgreSQL connected successfully!");
    console.log("Database time:", result.rows[0]);
  } catch (error) {
    console.error("Database connection failed:", error.message);
  } finally {
    await pool.end();
  }
};

testConnection();
