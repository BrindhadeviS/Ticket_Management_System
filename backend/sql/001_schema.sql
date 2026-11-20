-- 001_schema.sql
-- Upgrades an existing database safely: every statement is IF NOT EXISTS,
-- so no data is dropped or overwritten.

-- Employees
CREATE TABLE IF NOT EXISTS employees (
  employee_id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  department VARCHAR(255),
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'Employee',
  active BOOLEAN DEFAULT true,
  must_change_password BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'Employee';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;

-- Tickets
CREATE SEQUENCE IF NOT EXISTS ticket_seq START 1001;

CREATE TABLE IF NOT EXISTS tickets (
  id VARCHAR(50) PRIMARY KEY DEFAULT concat('TKT-', nextval('ticket_seq')),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  sub_category VARCHAR(100),
  item VARCHAR(100),
  clarification TEXT,
  priority VARCHAR(50) DEFAULT 'Medium',
  status VARCHAR(50) DEFAULT 'Pending Approval',
  created_by INTEGER,
  created_by_name VARCHAR(255),
  created_by_email VARCHAR(255),
  ticket_date DATE,
  approver_id INTEGER,
  approver_name VARCHAR(255),
  approver_reason TEXT,
  assignee_id INTEGER,
  assignee_name VARCHAR(255),
  resolution TEXT,
  history JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Single attachment per ticket (the app replaces or removes it)
CREATE TABLE IF NOT EXISTS ticket_attachments (
  attachment_id SERIAL PRIMARY KEY,
  ticket_id VARCHAR(50) NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  mime_type VARCHAR(100),
  file_size BIGINT,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ticket_attachments_ticket_stored
  ON ticket_attachments(ticket_id, stored_name);

-- Category lists (read by the New Ticket form)
CREATE TABLE IF NOT EXISTS categories (
  category_id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS sub_categories (
  sub_category_id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES categories(category_id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (category_id, name)
);

CREATE TABLE IF NOT EXISTS items (
  item_id SERIAL PRIMARY KEY,
  sub_category_id INTEGER NOT NULL REFERENCES sub_categories(sub_category_id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (sub_category_id, name)
);

-- In-app notifications (saved in the database, not in the browser)
CREATE TABLE IF NOT EXISTS notifications (
  notification_id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL,
  ticket_id VARCHAR(50),
  title VARCHAR(255) NOT NULL,
  message TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notifications_employee
  ON notifications(employee_id, is_read, created_at DESC);