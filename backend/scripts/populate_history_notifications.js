import pool from "../src/config/db.js";

function formatCustomDate(d, timeStr) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(d.getDate()).padStart(2, '0');
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}, ${timeStr}`;
}

async function run() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const employees = (await client.query("SELECT employee_id, name, email, role FROM employees")).rows;
    const empMap = new Map(employees.map(e => [e.employee_id, e]));
    const approvers = employees.filter(e => e.role === "Approver");
    const support = employees.filter(e => e.role === "Support Team");

    const tickets = (await client.query("SELECT * FROM tickets ORDER BY id ASC")).rows;
    console.log(`Processing ${tickets.length} tickets...`);

    // Reset notifications table to create clean, matching notifications
    await client.query("DELETE FROM notifications");

    let totalHistoryEvents = 0;
    let totalNotifs = 0;

    for (const t of tickets) {
      const creator = empMap.get(t.created_by) || {
        employee_id: t.created_by || 1,
        name: t.created_by_name || "Employee",
        role: "Employee"
      };
      const isDirect = ["Admin", "Approver", "Support Team"].includes(creator.role);

      const baseDate = t.ticket_date ? new Date(t.ticket_date) : (t.created_at ? new Date(t.created_at) : new Date("2026-11-14T10:00:00Z"));
      const d1 = new Date(baseDate);
      const d2 = new Date(baseDate); d2.setHours(d2.getHours() + 24);
      const d3 = new Date(baseDate); d3.setHours(d3.getHours() + 48);
      const d4 = new Date(baseDate); d4.setHours(d4.getHours() + 72);

      const tCreate = formatCustomDate(d1, "09:30");
      const tApprove = formatCustomDate(d2, "11:15");
      const tAssign = formatCustomDate(d3, "10:00");
      const tResolve = formatCustomDate(d4, "15:30");

      const history = [];
      const notifs = [];

      // 1. Ticket Creation
      if (isDirect) {
        history.push({
          by: creator.employee_id,
          byName: creator.name,
          from: "—",
          to: "Open",
          note: "Ticket created directly into support pool",
          t: tCreate
        });
        for (const s of support) {
          notifs.push({
            employee_id: s.employee_id,
            ticket_id: t.id,
            title: `New ticket in pool · ${t.id}`,
            message: `${t.title} (${creator.name})`,
            created_at: d1
          });
        }
      } else {
        history.push({
          by: creator.employee_id,
          byName: creator.name,
          from: "—",
          to: "Pending Approval",
          note: "Ticket created",
          t: tCreate
        });
        for (const a of approvers) {
          notifs.push({
            employee_id: a.employee_id,
            ticket_id: t.id,
            title: `Approval pending · ${t.id}`,
            message: `${t.title} (${creator.name})`,
            created_at: d1
          });
        }
      }

      // 2. Approval
      let approverName = t.approver_name;
      let approverId = t.approver_id;

      if (!isDirect && ["Open", "In Progress", "Resolved"].includes(t.status)) {
        if (!approverName) {
          approverName = "Sarah Chen";
          approverId = 13;
        }
        history.push({
          by: approverId,
          byName: approverName,
          from: "Pending Approval",
          to: "Open",
          note: `Approved by ${approverName}`,
          t: tApprove
        });
        notifs.push({
          employee_id: creator.employee_id,
          ticket_id: t.id,
          title: `Ticket approved · ${t.id}`,
          message: `Approved by ${approverName}. It is now in the ticket pool.`,
          created_at: d2
        });
        for (const s of support) {
          notifs.push({
            employee_id: s.employee_id,
            ticket_id: t.id,
            title: `${t.id} is available in the ticket pool`,
            message: t.title,
            created_at: d2
          });
        }
      }

      // 2b. Clarification Needed
      if (t.status === "Clarification Needed") {
        if (!approverName) { approverName = "Sarah Chen"; approverId = 13; }
        const clarText = t.clarification || "Please share a screenshot or the exact error message.";
        history.push({
          by: approverId,
          byName: approverName,
          from: "Pending Approval",
          to: "Clarification Needed",
          note: `Clarification requested: ${clarText}`,
          t: tApprove
        });
        notifs.push({
          employee_id: creator.employee_id,
          ticket_id: t.id,
          title: `Clarification requested on ${t.id}`,
          message: `${approverName}: ${clarText}`,
          created_at: d2
        });
      }

      // 2c. Rejected
      if (t.status === "Rejected") {
        if (!approverName) { approverName = "Sarah Chen"; approverId = 13; }
        const reason = t.approver_reason || "Request does not align with company IT equipment policy.";
        history.push({
          by: approverId,
          byName: approverName,
          from: "Pending Approval",
          to: "Rejected",
          note: `Rejected by ${approverName}: ${reason}`,
          t: tApprove
        });
        notifs.push({
          employee_id: creator.employee_id,
          ticket_id: t.id,
          title: `Ticket rejected · ${t.id}`,
          message: `Your ticket was rejected by ${approverName}: ${reason}`,
          created_at: d2
        });
      }

      // 3. Assignment (if In Progress or Resolved)
      let assigneeName = t.assignee_name;
      let assigneeId = t.assignee_id;

      if (["In Progress", "Resolved"].includes(t.status)) {
        if (!assigneeName) {
          assigneeName = "David Kim";
          assigneeId = 14;
        }
        history.push({
          by: assigneeId,
          byName: assigneeName,
          from: "Open",
          to: "In Progress",
          note: `Assigned to ${assigneeName}`,
          t: tAssign
        });
        notifs.push({
          employee_id: assigneeId,
          ticket_id: t.id,
          title: `Ticket assigned · ${t.id}`,
          message: `You were assigned to ${t.title}`,
          created_at: d3
        });
        notifs.push({
          employee_id: creator.employee_id,
          ticket_id: t.id,
          title: `${t.id} taken by ${assigneeName}`,
          message: `Your ticket is now being worked on by ${assigneeName}.`,
          created_at: d3
        });
      }

      // 4. Resolution (if Resolved)
      if (t.status === "Resolved") {
        const resText = t.resolution || "Issue investigated and resolved successfully by the support team.";
        history.push({
          by: assigneeId,
          byName: assigneeName,
          from: "In Progress",
          to: "Resolved",
          note: `Resolved by ${assigneeName}: ${resText}`,
          t: tResolve
        });
        notifs.push({
          employee_id: creator.employee_id,
          ticket_id: t.id,
          title: `Ticket resolved · ${t.id}`,
          message: `${t.title} was marked resolved by ${assigneeName}.`,
          created_at: d4
        });
      }

      // Save history and backfill approver/assignee columns if empty
      await client.query(
        `UPDATE tickets
         SET history = $1::jsonb,
             approver_name = COALESCE(approver_name, $2),
             approver_id = COALESCE(approver_id, $3),
             assignee_name = COALESCE(assignee_name, $4),
             assignee_id = COALESCE(assignee_id, $5)
         WHERE id = $6`,
        [JSON.stringify(history), approverName || null, approverId || null, assigneeName || null, assigneeId || null, t.id]
      );

      // Insert notifications
      for (const n of notifs) {
        await client.query(
          `INSERT INTO notifications (employee_id, ticket_id, title, message, is_read, created_at)
           VALUES ($1, $2, $3, $4, false, $5)`,
          [n.employee_id, n.ticket_id, n.title, n.message, n.created_at]
        );
      }

      totalHistoryEvents += history.length;
      totalNotifs += notifs.length;
    }

    await client.query("COMMIT");
    console.log("Migration finished successfully!");
    console.log(`Inserted ${totalHistoryEvents} history events across 38 tickets.`);
    console.log(`Inserted ${totalNotifs} in-app notifications.`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Migration error:", err);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

run();
