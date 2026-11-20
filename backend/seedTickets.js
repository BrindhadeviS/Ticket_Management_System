import bcrypt from "bcrypt";
import pool from "./src/config/db.js";

async function seedData() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Ensure required demo employees exist across departments:
    // Engineering, Finance, IT infrastructure, IT Operations, HR
    const employeesData = [
      { name: "James Wilson", email: "james.wilson@ladera.com", department: "Engineering", role: "Employee", pw: "employee123" },
      { name: "Sarah Chen", email: "sarah.chen@ladera.com", department: "Finance", role: "Approver", pw: "approver123" },
      { name: "David Kim", email: "david.kim@ladera.com", department: "IT infrastructure", role: "Support Team", pw: "support123" },
      { name: "Priya Kumar", email: "priya.kumar@ladera.com", department: "HR", role: "Employee", pw: "employee123" },
      { name: "Meera Nair", email: "meera.nair@ladera.com", department: "Finance", role: "Employee", pw: "employee123" },
      { name: "Arjun Mehta", email: "arjun.mehta@ladera.com", department: "Engineering", role: "Employee", pw: "employee123" },
      { name: "Suresh Babu", email: "suresh.babu@ladera.com", department: "IT Operations", role: "Support Team", pw: "support123" },
      { name: "Divya Menon", email: "divya.menon@ladera.com", department: "Finance", role: "Approver", pw: "approver123" },
    ];

    for (const emp of employeesData) {
      const hash = await bcrypt.hash(emp.pw, 10);
      await client.query(
        `INSERT INTO employees (name, email, department, role, password_hash, active, must_change_password)
         VALUES ($1, $2, $3, $4, $5, true, false)
         ON CONFLICT (email) DO UPDATE SET department = EXCLUDED.department, role = EXCLUDED.role`,
        [emp.name, emp.email, emp.department, emp.role, hash]
      );
    }

    // Update existing Admin to IT Operations if currently 'IT'
    await client.query("UPDATE employees SET department = 'IT Operations' WHERE email = 'admin@ladera.com' AND (department = 'IT' OR department IS NULL)");

    // Get current employees map
    const empRes = await client.query("SELECT employee_id, name, email, department, role FROM employees");
    const empMap = {};
    empRes.rows.forEach(r => {
      empMap[r.name] = r;
    });

    // 2. Mockup 36 tickets dataset (matching TT, BY, ST, PC from mockup)
    const TT = [
      ["VPN access gateway dropouts", "Network & Connectivity", "VPN", "Frequent disconnects"],
      ["Database latency after release", "Others", "General Request", "Other"],
      ["Developer laptop slow", "Hardware & Devices", "Laptop & Desktop", "Slow performance"],
      ["Annual software licence renewal", "Software & Applications", "Software Installation & Updates", "Need New Software Installed"],
      ["Email access issue", "Accounts & Access", "Password & Login", "Forgot password"],
      ["Printer not scanning to email", "Printing & Scanning", "Scanners", "Scan to email failing"],
      ["Need Visual Studio installed", "Software & Applications", "Software Installation & Updates", "Need New Software Installed"],
      ["Wi-Fi keeps disconnecting", "Network & Connectivity", "Wi-Fi", "Slow speed"],
      ["Request new monitor", "Hardware & Devices", "Peripherals", "Monitor"],
      ["Outlook not syncing", "Software & Applications", "Microsoft Office 365", "Outlook issue"],
      ["Teams audio problem", "Software & Applications", "Communication & Meetings (Zoom, Webex, etc.)", "Audio / video issue"],
      ["Laptop battery draining", "Hardware & Devices", "Laptop & Desktop", "Battery issue"]
    ];

    const BY = [
      ["James Wilson", "Engineering"],
      ["Admin", "IT Operations"],
      ["Priya Kumar", "HR"],
      ["Meera Nair", "Finance"],
      ["Sarah Chen", "Finance"],
      ["David Kim", "IT infrastructure"],
      ["Arjun Mehta", "Engineering"]
    ];

    const ST = [
      "Pending Approval", "Open", "In Progress", "Clarification Needed", "Resolved", "Pending Approval",
      "Rejected", "Open", "Resolved", "In Progress", "Pending Approval", "Resolved"
    ];

    const PRIO = ["High", "Medium", "Low", "Critical", "Medium", "High", "Low", "Medium", "Critical"];

    // Insert or update 36 mockup tickets
    for (let i = 0; i < 36; i++) {
      const ticketId = `TKT-${1001 + i}`;
      const [title, cat, sub, item] = TT[i % 12];
      const [byName, byDept] = BY[(i * 5 + Math.floor(i / 3)) % 7];
      let s = ST[(i * 7 + Math.floor(i / 4)) % 12];
      const p = PRIO[i % 9];
      const desc = `Details for: ${title.toLowerCase()}. Please investigate and resolve this issue as soon as possible.`;

      const creator = empMap[byName] || empMap["Admin"];
      const isDirect = creator.role !== "Employee";
      if (isDirect && (s === "Pending Approval" || s === "Clarification Needed")) {
        s = "Open";
      }

      let assigneeId = null;
      let assigneeName = null;
      if (["In Progress", "Resolved"].includes(s)) {
        assigneeName = byName === "David Kim" ? "Sam Thomas" : "David Kim";
        const asg = empMap[assigneeName] || empMap["Sam Thomas"];
        assigneeId = asg?.employee_id || null;
      }

      let approverId = null;
      let approverName = null;
      if (!isDirect && ["Open", "In Progress", "Resolved"].includes(s)) {
        approverName = i % 3 === 0 ? "Divya Menon" : "Sarah Chen";
        const appr = empMap[approverName] || empMap["Arun Menon"];
        approverId = appr?.employee_id || null;
      }

      const clarification = s === "Clarification Needed" ? "Please share a screenshot or the exact error message." : null;
      const resolution = s === "Resolved" ? "Issue investigated and resolved successfully by the support team." : null;
      const history = JSON.stringify([
        { note: isDirect ? "Sent directly to Support Team" : "Ticket created", by: creator.employee_id, byName: creator.name, from: "—", to: isDirect ? "Open" : "Pending Approval", t: "14 Nov 2026" },
        ...(approverName ? [{ note: `Approved by ${approverName}`, by: approverId, byName: approverName, from: "Pending Approval", to: "Open", t: "15 Nov 2026" }] : []),
        ...(assigneeName ? [{ note: `Taken by ${assigneeName}`, by: assigneeId, byName: assigneeName, from: "Open", to: "In Progress", t: "16 Nov 2026" }] : []),
        ...(s === "Clarification Needed" ? [{ note: "Clarification requested: Please share a screenshot or the exact error message.", by: (assigneeId || approverId || creator.employee_id), byName: (assigneeName || approverName || "Reviewer"), from: (assigneeId ? "In Progress" : "Pending Approval"), to: "Clarification Needed", t: "16 Nov 2026" }] : []),
        ...(s === "Resolved" ? [{ note: "Resolved: Issue investigated and resolved successfully by the support team.", by: assigneeId, byName: assigneeName, from: "In Progress", to: "Resolved", t: "16 Nov 2026" }] : [])
      ]);

      await client.query(
        `INSERT INTO tickets (
          id, title, description, category, sub_category, item, priority, status,
          created_by, created_by_name, created_by_email, ticket_date,
          approver_id, approver_name, assignee_id, assignee_name,
          clarification, resolution, history, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11, CURRENT_DATE,
          $12, $13, $14, $15,
          $16, $17, $18, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          category = EXCLUDED.category,
          sub_category = EXCLUDED.sub_category,
          item = EXCLUDED.item,
          priority = EXCLUDED.priority,
          status = EXCLUDED.status,
          created_by = EXCLUDED.created_by,
          created_by_name = EXCLUDED.created_by_name,
          created_by_email = EXCLUDED.created_by_email,
          approver_id = EXCLUDED.approver_id,
          approver_name = EXCLUDED.approver_name,
          assignee_id = EXCLUDED.assignee_id,
          assignee_name = EXCLUDED.assignee_name,
          clarification = EXCLUDED.clarification,
          resolution = EXCLUDED.resolution,
          history = EXCLUDED.history`,
        [
          ticketId, title, desc, cat, sub, item, p, s,
          creator.employee_id, creator.name, creator.email,
          approverId, approverName, assigneeId, assigneeName,
          clarification, resolution, history
        ]
      );

      // Seed appropriate notification into PostgreSQL notifications table
      if (s === "Pending Approval" && approverId) {
        await client.query(
          `INSERT INTO notifications (employee_id, ticket_id, title, message)
           VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
          [approverId, ticketId, `Approval pending · ${ticketId}`, `${title} (${creator.name})`]
        );
      } else if (s === "Clarification Needed" && creator.employee_id) {
        await client.query(
          `INSERT INTO notifications (employee_id, ticket_id, title, message)
           VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
          [creator.employee_id, ticketId, `Clarification requested · ${ticketId}`, "Please share a screenshot or the exact error message."]
        );
      } else if (s === "Open" && assigneeId) {
        await client.query(
          `INSERT INTO notifications (employee_id, ticket_id, title, message)
           VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
          [assigneeId, ticketId, `New ticket in pool · ${ticketId}`, title]
        );
      } else if (s === "In Progress" && creator.employee_id) {
        await client.query(
          `INSERT INTO notifications (employee_id, ticket_id, title, message)
           VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
          [creator.employee_id, ticketId, `Ticket assigned · ${ticketId}`, `${assigneeName} claimed your ticket.`]
        );
      } else if (s === "Resolved" && creator.employee_id) {
        await client.query(
          `INSERT INTO notifications (employee_id, ticket_id, title, message)
           VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
          [creator.employee_id, ticketId, `Ticket resolved · ${ticketId}`, "Issue investigated and resolved successfully."]
        );
      }
    }

    // Ensure the ticket sequence is beyond 1036
    await client.query("SELECT setval('ticket_seq', (SELECT GREATEST(1050, coalesce(max(substring(id from 5)::int), 1050)) FROM tickets))");

    await client.query("COMMIT");
    console.log("Seeding complete: 36 tickets and all 5 departments populated.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Seeding error:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

seedData();
