-- 004_create_ticket_clarifications.sql
CREATE TABLE IF NOT EXISTS ticket_clarifications (
  id SERIAL PRIMARY KEY,
  ticket_id VARCHAR(50) NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  asked_by INTEGER REFERENCES employees(employee_id),
  asked_by_name VARCHAR(255),
  asked_by_role VARCHAR(50),
  asked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  answer TEXT,
  answered_by INTEGER REFERENCES employees(employee_id),
  answered_by_name VARCHAR(255),
  answered_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ticket_clarifications_ticket_id ON ticket_clarifications(ticket_id);
