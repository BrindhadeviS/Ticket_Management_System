-- 20261122_fix_ticket_approvers.sql
-- Update all tickets created by employees who have a manager to have approver_id set to their manager_id
UPDATE tickets t
SET approver_id = e.manager_id,
    approver_name = m.name
FROM employees e
JOIN employees m ON m.employee_id = e.manager_id
WHERE t.created_by = e.employee_id
  AND e.manager_id IS NOT NULL;
