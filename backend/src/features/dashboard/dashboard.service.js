import pool from "../../config/db.js";

export const getDashboardSummary = async (role, employeeId) => {
  // 1. Total tickets count
  const totalRes = await pool.query(`SELECT count(*)::int AS count FROM tickets`);
  const totalTickets = totalRes.rows[0]?.count || 0;

  // 2. Counts by status
  const statusRes = await pool.query(`
    SELECT status, count(*)::int AS count
    FROM tickets
    GROUP BY status
  `);
  const statusMap = {};
  statusRes.rows.forEach(r => {
    statusMap[r.status] = r.count;
  });

  // 3. User-specific tickets count
  const myTicketsRes = await pool.query(
    `SELECT count(*)::int AS count FROM tickets WHERE created_by = $1`,
    [employeeId]
  );
  const myTicketsCount = myTicketsRes.rows[0]?.count || 0;

  // 4. Ticket pool count (unassigned open tickets)
  const poolRes = await pool.query(
    `SELECT count(*)::int AS count FROM tickets WHERE status = 'Open' AND assignee_id IS NULL`
  );
  const poolCount = poolRes.rows[0]?.count || 0;

  // 5. Assigned to current user
  const assignedRes = await pool.query(
    `SELECT count(*)::int AS count FROM tickets WHERE assignee_id = $1`,
    [employeeId]
  );
  const assignedCount = assignedRes.rows[0]?.count || 0;

  // 6. Awaiting approval (for approver)
  const awaitingApprovalRes = await pool.query(
    `SELECT count(*)::int AS count FROM tickets WHERE status = 'Pending Approval'`
  );
  const awaitingApprovalCount = awaitingApprovalRes.rows[0]?.count || 0;

  // 7. Approved this week & rejected this week
  const decisionsRes = await pool.query(`
    SELECT
      count(*) FILTER (WHERE status != 'Pending Approval' AND status != 'Rejected')::int AS approved,
      count(*) FILTER (WHERE status = 'Rejected')::int AS rejected
    FROM tickets
    WHERE approver_id = $1
  `, [employeeId]);
  const approvedCount = decisionsRes.rows[0]?.approved || 0;
  const rejectedCount = decisionsRes.rows[0]?.rejected || 0;

  // 8. Category breakdown
  const categoryRes = await pool.query(`
    SELECT COALESCE(category, 'General') AS category, count(*)::int AS count
    FROM tickets
    GROUP BY category
    ORDER BY count DESC
  `);

  // 9. Department breakdown
  const deptRes = await pool.query(`
    SELECT COALESCE(e.department, 'Other') AS department, count(t.id)::int AS count
    FROM tickets t
    LEFT JOIN employees e ON t.created_by = e.employee_id
    GROUP BY e.department
    ORDER BY count DESC
  `);

  // Detailed per‑status breakdown per department for front‑end stacked bars
  const deptStatusRes = await pool.query(`
    SELECT COALESCE(e.department, 'Other') AS department,
           t.status,
           count(*)::int AS count
    FROM tickets t
    LEFT JOIN employees e ON t.created_by = e.employee_id
    GROUP BY e.department, t.status
    ORDER BY e.department, t.status
  `);

  // 10. Weekly trend (last 7 days)
  const weeklyRes = await pool.query(`
    SELECT to_char(d, 'YYYY-MM-DD') AS day,
           to_char(d, 'Dy') AS weekday,
           count(t.id)::int AS count
    FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day'::interval) d
    LEFT JOIN tickets t ON (t.ticket_date = d::date OR t.created_at::date = d::date)
    GROUP BY d
    ORDER BY d ASC
  `);

  // 11. Recent tickets (last 10)
  const recentRes = await pool.query(`
    SELECT t.*, e.department AS creator_dept
    FROM tickets t
    LEFT JOIN employees e ON t.created_by = e.employee_id
    ORDER BY t.created_at DESC
    LIMIT 10
  `);

  return {
    totalTickets,
    statusCounts: {
      open: statusMap["Open"] || 0,
      inProgress: (statusMap["In Progress"] || 0) + (statusMap["Pending"] || 0),
      pendingApproval: statusMap["Pending Approval"] || 0,
      clarificationNeeded: statusMap["Clarification Needed"] || 0,
      resolved: statusMap["Resolved"] || 0,
      rejected: statusMap["Rejected"] || 0,
    },
    rawStatusCounts: statusRes.rows,
    myTicketsCount,
    poolCount,
    assignedCount,
    awaitingApprovalCount,
    approvedCount,
    rejectedCount,
    byCategory: categoryRes.rows,
    byDepartment: deptRes.rows,
    deptStatus: deptStatusRes.rows,
    weeklyTrend: weeklyRes.rows,
    recentTickets: recentRes.rows,
  };
};
