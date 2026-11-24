// Tiny migration runner for hierarchy triggers
// Executes the SQL migration located at src/migrations/20231120_add_hierarchy_triggers.sql
// Uses the same pg Pool configuration as the application (src/config/db.js)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../src/config/db.js';

// Resolve __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
  try {
    const sqlPath = path.resolve(__dirname, '../src/migrations/20231120_add_hierarchy_triggers.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await pool.query(sql);
    console.log('✅ Migration applied successfully');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
