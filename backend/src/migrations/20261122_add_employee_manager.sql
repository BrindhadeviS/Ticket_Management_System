-- 20261122_add_employee_manager.sql
-- 1. Add manager_id column to employees table if not exists
ALTER TABLE employees ADD COLUMN IF NOT EXISTS manager_id INTEGER REFERENCES employees(employee_id) ON DELETE SET NULL;

-- 2. Normalize all department names to the 5 official departments:
--    'Engineering', 'Finance', 'IT Infrastructure', 'IT Operations', 'HR'
UPDATE employees SET department = 'IT Infrastructure' WHERE department IN ('IT Support', 'IT', 'IT infrastructure');
UPDATE employees SET department = 'HR' WHERE department = 'Operations' AND employee_id = 5;
UPDATE employees SET department = 'IT Operations' WHERE department = 'Operations';

-- 3. Set the 5 Designated Approvers (one per department)
-- Engineering: Yasika (id 10)
UPDATE employees SET role = 'Approver', department = 'Engineering' WHERE employee_id = 10;
-- Finance: Sarah Chen (id 13)
UPDATE employees SET role = 'Approver', department = 'Finance' WHERE employee_id = 13;
-- IT Infrastructure: Brindhadevi S (id 8)
UPDATE employees SET role = 'Approver', department = 'IT Infrastructure' WHERE employee_id = 8;
-- IT Operations: Priya (id 2)
UPDATE employees SET role = 'Approver', department = 'IT Operations' WHERE employee_id = 2;
-- HR: Arun Menon (id 5)
UPDATE employees SET role = 'Approver', department = 'HR' WHERE employee_id = 5;

-- Ensure Divya Menon (id 19) is Employee so each dept has 1 distinct Approver
UPDATE employees SET role = 'Employee' WHERE employee_id = 19;

-- 4. Assign manager_id to each department's designated Approver
-- Engineering -> 10 (Yasika)
UPDATE employees SET manager_id = 10 WHERE department = 'Engineering' AND employee_id != 10;
-- Finance -> 13 (Sarah Chen)
UPDATE employees SET manager_id = 13 WHERE department = 'Finance' AND employee_id != 13;
-- IT Infrastructure -> 8 (Brindhadevi S)
UPDATE employees SET manager_id = 8 WHERE department = 'IT Infrastructure' AND employee_id != 8;
-- IT Operations -> 2 (Priya)
UPDATE employees SET manager_id = 2 WHERE department = 'IT Operations' AND employee_id NOT IN (1, 2);
-- HR -> 5 (Arun Menon)
UPDATE employees SET manager_id = 5 WHERE department = 'HR' AND employee_id != 5;

-- Admin and Approvers have manager_id = NULL by default
UPDATE employees SET manager_id = NULL WHERE role IN ('Admin', 'Approver');

-- 5. Backfill existing tickets in 'Pending Approval' with creator's manager
UPDATE tickets t
SET approver_id = e.manager_id,
    approver_name = m.name
FROM employees e
LEFT JOIN employees m ON m.employee_id = e.manager_id
WHERE t.created_by = e.employee_id
  AND t.status = 'Pending Approval'
  AND (t.approver_id IS NULL OR t.approver_id = 0)
  AND e.manager_id IS NOT NULL;
