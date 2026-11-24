import pool from "../../config/db.js";

export const getDashboardSummary = async (role, employeeId) => {
  let supportDept = null;
  if (role === "Support Team") {
    try {
      const empRes = await pool.query(`SELECT department FROM employees WHERE employee_id = $1`, [employeeId]);
      supportDept = empRes.rows[0]?.department || null;
    } catch (_) {}
  }

  const isApprover = role === "Approver";
  const approverWhere = `WHERE (t.approver_id = $1 OR t.created_by = $1 OR e.manager_id = $1)`;

  // 1. Total tickets count
  const totalRes = isApprover
    ? await pool.query(
        `SELECT count(t.id)::int AS count
         FROM tickets t
         LEFT JOIN employees e ON t.created_by = e.employee_id
         ${approverWhere}`,
        [employeeId]
      )
    : await pool.query(`SELECT count(*)::int AS count FROM tickets`);
  const totalTickets = totalRes.rows[0]?.count || 0;

  // 2. Counts by status
  const statusRes = isApprover
    ? await pool.query(
        `SELECT t.status, count(t.id)::int AS count
         FROM tickets t
         LEFT JOIN employees e ON t.created_by = e.employee_id
         ${approverWhere}
         GROUP BY t.status`,
        [employeeId]
      )
    : await pool.query(`
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
  const poolRes = role === "Support Team" && supportDept
    ? await pool.query(
        `SELECT count(*)::int AS count FROM tickets
         WHERE status = 'Open' AND assignee_id IS NULL
           AND (
             category = 'Others'
             OR category IN (
               SELECT c.name
               FROM category_department_mapping cdm
               JOIN categories c ON c.category_id = cdm.category_id
               WHERE LOWER(TRIM(cdm.department)) = LOWER(TRIM($1))
             )
           )`,
        [supportDept]
      )
    : await pool.query(
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
  const awaitingApprovalRes = role === "Approver"
    ? await pool.query(
        `SELECT count(*)::int AS count FROM tickets WHERE status = 'Pending Approval' AND approver_id = $1`,
        [employeeId]
      )
    : await pool.query(
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

  // 8. Category breakdown (joins categories table so newly added categories from DB appear even with 0 tickets)
  let categoryRes;
  try {
    categoryRes = isApprover
      ? await pool.query(
          `SELECT c.name AS category, count(t.id)::int AS count
           FROM categories c
           LEFT JOIN (
             SELECT t.* FROM tickets t
             LEFT JOIN employees e ON t.created_by = e.employee_id
             ${approverWhere}
           ) t ON (t.category = c.name OR t.category LIKE c.name || ' › %')
           WHERE c.active = true OR c.active IS NULL
           GROUP BY c.name
           ORDER BY count DESC, c.name ASC`,
          [employeeId]
        )
      : await pool.query(`
          SELECT c.name AS category, count(t.id)::int AS count
          FROM categories c
          LEFT JOIN tickets t ON (t.category = c.name OR t.category LIKE c.name || ' › %')
          WHERE c.active = true OR c.active IS NULL
          GROUP BY c.name
          ORDER BY count DESC, c.name ASC
        `);
  } catch (_) {
    categoryRes = isApprover
      ? await pool.query(
          `SELECT COALESCE(t.category, 'General') AS category, count(t.id)::int AS count
           FROM tickets t
           LEFT JOIN employees e ON t.created_by = e.employee_id
           ${approverWhere}
           GROUP BY t.category
           ORDER BY count DESC`,
          [employeeId]
        )
      : await pool.query(`
          SELECT COALESCE(category, 'General') AS category, count(*)::int AS count
          FROM tickets
          GROUP BY category
          ORDER BY count DESC
        `);
  }

  // 9. Department breakdown (directly queries departments table so add/remove reflects immediately)
  let deptRes;
  try {
    deptRes = isApprover
      ? await pool.query(
          `SELECT d.name AS department, count(t.id)::int AS count
           FROM departments d
           LEFT JOIN employees e ON LOWER(TRIM(e.department)) = LOWER(TRIM(d.name))
           LEFT JOIN tickets t ON t.created_by = e.employee_id
           ${approverWhere}
           WHERE d.active = true OR d.active IS NULL
           GROUP BY d.name
           ORDER BY count DESC, d.name ASC`,
          [employeeId]
        )
      : await pool.query(`
          SELECT d.name AS department, count(t.id)::int AS count
          FROM departments d
          LEFT JOIN employees e ON LOWER(TRIM(e.department)) = LOWER(TRIM(d.name))
          LEFT JOIN tickets t ON t.created_by = e.employee_id
          WHERE d.active = true OR d.active IS NULL
          GROUP BY d.name
          ORDER BY count DESC, d.name ASC
        `);
  } catch (_) {
    deptRes = isApprover
      ? await pool.query(
          `SELECT COALESCE(e.department, 'Other') AS department, count(t.id)::int AS count
           FROM tickets t
           LEFT JOIN employees e ON t.created_by = e.employee_id
           ${approverWhere}
           GROUP BY e.department
           ORDER BY count DESC`,
          [employeeId]
        )
      : await pool.query(`
          SELECT COALESCE(e.department, 'Other') AS department, count(t.id)::int AS count
          FROM tickets t
          LEFT JOIN employees e ON t.created_by = e.employee_id
          GROUP BY e.department
          ORDER BY count DESC
        `);
  }

  // Detailed per‑status breakdown per department for front‑end stacked bars
  let deptStatusRes;
  try {
    deptStatusRes = isApprover
      ? await pool.query(
          `SELECT d.name AS department,
                  t.status,
                  count(t.id)::int AS count
           FROM departments d
           LEFT JOIN employees e ON LOWER(TRIM(e.department)) = LOWER(TRIM(d.name))
           JOIN tickets t ON t.created_by = e.employee_id
           ${approverWhere}
           WHERE (d.active = true OR d.active IS NULL) AND t.status IS NOT NULL
           GROUP BY d.name, t.status
           ORDER BY department, t.status`,
          [employeeId]
        )
      : await pool.query(`
          SELECT d.name AS department,
                 t.status,
                 count(t.id)::int AS count
          FROM departments d
          LEFT JOIN employees e ON LOWER(TRIM(e.department)) = LOWER(TRIM(d.name))
          JOIN tickets t ON t.created_by = e.employee_id
          WHERE (d.active = true OR d.active IS NULL) AND t.status IS NOT NULL
          GROUP BY d.name, t.status
          ORDER BY department, t.status
        `);
  } catch (_) {
    deptStatusRes = isApprover
      ? await pool.query(
          `SELECT COALESCE(e.department, 'Other') AS department,
                  t.status,
                  count(t.id)::int AS count
           FROM tickets t
           LEFT JOIN employees e ON t.created_by = e.employee_id
           ${approverWhere}
           GROUP BY e.department, t.status
           ORDER BY e.department, t.status`,
          [employeeId]
        )
      : await pool.query(`
          SELECT COALESCE(e.department, 'Other') AS department,
                 t.status,
                 count(*)::int AS count
          FROM tickets t
          LEFT JOIN employees e ON t.created_by = e.employee_id
          GROUP BY e.department, t.status
          ORDER BY e.department, t.status
        `);
  }

  // 10. Weekly trend (last 7 days)
  const weeklyRes = isApprover
    ? await pool.query(
        `SELECT to_char(d, 'YYYY-MM-DD') AS day,
                to_char(d, 'Dy') AS weekday,
                count(t.id)::int AS count
         FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day'::interval) d
         LEFT JOIN (
           SELECT t.*
           FROM tickets t
           LEFT JOIN employees e ON t.created_by = e.employee_id
           ${approverWhere}
         ) t ON (t.ticket_date = d::date OR t.created_at::date = d::date)
         GROUP BY d
         ORDER BY d ASC`,
        [employeeId]
      )
    : await pool.query(`
        SELECT to_char(d, 'YYYY-MM-DD') AS day,
               to_char(d, 'Dy') AS weekday,
               count(t.id)::int AS count
        FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day'::interval) d
        LEFT JOIN tickets t ON (t.ticket_date = d::date OR t.created_at::date = d::date)
        GROUP BY d
        ORDER BY d ASC
      `);

  // 11. Recent tickets (last 10)
  let recentRes;
  if (role === "Approver") {
    recentRes = await pool.query(`
      SELECT t.*, e.department AS creator_dept
      FROM tickets t
      LEFT JOIN employees e ON t.created_by = e.employee_id
      WHERE (t.approver_id = $1 OR t.created_by = $1 OR e.manager_id = $1)
      ORDER BY t.created_at DESC
      LIMIT 10
    `, [employeeId]);
  } else if (role === "Employee") {
    recentRes = await pool.query(`
      SELECT t.*, e.department AS creator_dept
      FROM tickets t
      LEFT JOIN employees e ON t.created_by = e.employee_id
      WHERE t.created_by = $1
      ORDER BY t.created_at DESC
      LIMIT 10
    `, [employeeId]);
  } else if (role === "Support Team" && supportDept) {
    recentRes = await pool.query(`
      SELECT t.*, e.department AS creator_dept
      FROM tickets t
      LEFT JOIN employees e ON t.created_by = e.employee_id
      WHERE (
        t.assignee_id = $1
        OR t.created_by = $1
        OR (
          t.status != 'Pending Approval'
          AND (
            t.category = 'Others'
            OR t.category IN (
              SELECT c.name
              FROM category_department_mapping cdm
              JOIN categories c ON c.category_id = cdm.category_id
              WHERE LOWER(TRIM(cdm.department)) = LOWER(TRIM($2))
            )
          )
        )
      )
      ORDER BY t.created_at DESC
      LIMIT 10
    `, [employeeId, supportDept]);
  } else {
    recentRes = await pool.query(`
      SELECT t.*, e.department AS creator_dept
      FROM tickets t
      LEFT JOIN employees e ON t.created_by = e.employee_id
      ORDER BY t.created_at DESC
      LIMIT 10
    `);
  }

  return {
    totalTickets,
    statusCounts: {
      open: statusMap["Open"] || 0,
      inProgress: (statusMap["In Progress"] || 0) + (statusMap["Pending"] || 0),
      pendingApproval: role === "Approver" ? awaitingApprovalCount : (statusMap["Pending Approval"] || 0),
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
