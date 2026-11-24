# End‑to‑End Testing Plan for Ticket Management System

## 1. Scope & Objectives
- Validate the four newly added features:
  1. **Category‑Based Support Assignment** – tickets visible only to support team members responsible for the ticket’s department **and** category.
  2. **Manager‑Based Approval** – an employee’s direct manager can view, approve, or reject tickets raised by their reporting employees; managers must not see tickets from other departments.
  3. **Dynamic Category Management** – Admin can create, update, and delete categories, sub‑categories, and items at runtime.
  4. **Ticket Details Enhancement** – ticket detail view displays clarification history, approver details, and rejection reasons.
- Ensure existing functionality (ticket creation, notification, search, etc.) remains unchanged.
- Deliver a reproducible test suite that QA can execute without further code changes.

## 2. Test Environment Setup
| Step | Action |
|------|--------|
| 1 | Pull the latest `main` branch of the repository. |
| 2 | Run database migrations: `npm run db:migrate` (or execute the latest migration script `20261122_fix_ticket_approvers.sql`). |
| 3 | Seed the employee‑manager hierarchy using the provided seed file (`seed/employees.sql`). |
| 4 | Start backend: `npm start` (or `npm run dev`). |
| 5 | Start frontend: `npm run dev` (default `http://localhost:3000`). |
| 6 | Create test users (use UI or API):<br/>- **Admin** (role: `admin`)<br/>- **Approvers** – one per department (Finance, HR, Engineering, IT Operations, IT Infrastructure).<br/>- **Support Team** – members with `department` attribute matching each department.
| 7 | Create regular employee accounts for each department (e.g., Priya, Arun, etc.) and assign their `manager_id` accordingly. |

## 3. Functional Test Cases
### A. Category‑Based Support Assignment
| TC | Description | Pre‑condition | Expected Result |
|----|-------------|---------------|-----------------|
| **TC‑C1** | Employee creates a ticket in **HR** department, category **Software & Applications**. | Employee logged in, HR Support Team members exist. | Only Support Team members whose `department = 'HR'` see the ticket in the Ticket Pool view. |
| **TC‑C2** | Ticket created in **Engineering**, category **Hardware & Devices**. | Engineering Support Team members exist. | Only Engineering Support Team members can view the ticket; others see an empty list. |
| **TC‑C3** | Support member from a different department attempts to view the ticket. | Logged in as Finance Support. | UI shows “No tickets” (ticket filtered out). |

### B. Manager‑Based Approval
| TC | Description | Pre‑condition | Expected Result |
|----|-------------|---------------|-----------------|
| **TC‑M1** | Employee **Priya** creates a ticket. | Priya’s `manager_id` = Arun Menon. | Arun receives a “Pending Approval” notification; ticket appears in his Approver dashboard (`awaitingApprovalCount` increments). |
| **TC‑M2** | Manager approves ticket. | Ticket in pending state, manager logged in. | Ticket status changes to **Open**, approver fields (`approver_id`, `approver_name`) updated, Support Team receives pool notification. |
| **TC‑M3** | Manager rejects ticket with reason “Insufficient details”. | Ticket pending, manager logged in. | Ticket status becomes **Rejected**, rejection reason stored and displayed on Ticket Detail view for employee and approver. |
| **TC‑M4** | Another manager (e.g., Sarah Chen) attempts to approve Priya’s ticket. | Sarah not the manager of ticket creator. | API returns `403 Forbidden`; UI shows an error toast. |

### C. Dynamic Category Management
| TC | Description | Pre‑condition | Expected Result |
|----|-------------|---------------|-----------------|
| **TC‑D1** | Admin adds new category **Security**, sub‑category **VPN**, item **Access Request** via Admin UI. | Admin logged in. | New category appears in the ticket‑creation dropdown for all users. |
| **TC‑D2** | Admin renames existing category **Hardware** → **Hardware & Devices**. | Category exists, no tickets assigned to it yet. | Updated name appears in dropdown; existing tickets retain original category ID (no data loss). |
| **TC‑D3** | Admin deletes a category with no tickets. | Category empty. | Deletion succeeds, UI shows success toast. |
| **TC‑D4** | Admin attempts to delete a category that has tickets. | Category contains tickets. | UI shows warning/error; API returns `400 Bad Request` with message *"Category in use"*. |

### D. Ticket Details Enhancement
| TC | Description | Pre‑condition | Expected Result |
|----|-------------|---------------|-----------------|
| **TC‑T1** | Open a ticket that has multiple clarification entries (Q&A). | Ticket with clarification history exists. | Clarification panel lists all entries with timestamps, sorted chronologically. |
| **TC‑T2** | Approver approves ticket. | Ticket pending, approver logged in. | Ticket detail view shows **Approver:** *Arun Menon* and **Approval Time:** `<timestamp>`. |
| **TC‑T3** | Approver rejects ticket with a reason. | Ticket pending, approver logged in. | Ticket detail view shows **Rejection Reason:** *<text>* prominently. |
| **TC‑T4** | Employee views a ticket they did **not** create but is in their department pool. | Employee belongs to same department, ticket assigned to support. | Employee sees ticket status and clarification history but **no** Approver Decision UI (cannot approve/reject). |

## 4. Integration (API) Tests
- **Tool**: Postman collection or `curl` scripts.
- **Endpoints** to cover (with JWT role):
  - `GET /api/tickets` – filter by department & category.
  - `GET /api/dashboard/summary` – verify `awaitingApprovalCount` per approver.
  - `POST /api/categories` (Admin only) – create category.
  - `PUT /api/categories/:id` – update.
  - `DELETE /api/categories/:id` – delete.
  - `POST /api/tickets/:id/approve` – manager action.
  - `POST /api/tickets/:id/reject` – manager action.
- **Checks**:
  - Response JSON contains correct `approver_id`, `department`, `category` fields.
  - Unauthorized role receives `401/403`.
  - After approve/reject, subsequent `GET /api/tickets/:id` reflects status and metadata.

## 5. UI/UX Regression Tests
| Flow | Steps | Expected UI Outcome |
|------|-------|---------------------|
| Employee ticket creation | Fill form, select department & category, submit. | Success toast, ticket appears in **My Tickets** list. |
| Approver dashboard | Log in as Approver, open Dashboard. | KPI cards show correct pending count; recent tickets list limited to own scope. |
| Support pool view | Log in as Support member of HR. | Only HR tickets displayed; category filter works. |
| Admin category management | Open Admin → Categories page, perform add/edit/delete. | Dropdowns update instantly; toast messages shown. |
| Ticket detail view | Open any ticket. | Clarification timeline, approver info, rejection reason (if applicable) displayed correctly. |

## 6. Security Tests
1. **Privilege Escalation** – Modify JWT payload to claim `role: "admin"` while using a regular employee token. Verify backend rejects with `403`.  
2. **SQL Injection** – Submit ticket title containing `'; DROP TABLE tickets; --`. Ensure request is sanitized and no DB error occurs.  
3. **Access Control Bypass** – Attempt to fetch `/api/tickets/:id` for a ticket outside the user’s department using a Support member token. Expect `403`. 

## 7. Performance Tests
- **Dataset**: Seed 5,000 tickets across all departments/categories.
- **Metric 1** – Dashboard load time (including KPI calculations) < 2 seconds (measured with Chrome DevTools > Network > Timing). 
- **Metric 2** – Ticket list pagination (page size 20) response < 500 ms. 
- **Metric 3** – Category creation API latency < 300 ms.
- Document results in `performance_report.md`.

## 8. Cleanup & Data Reset
1. After test run, truncate `tickets`, `categories`, `clarifications` tables. 
2. Re‑run seed scripts to restore original demo data. 
3. Verify no test‑only categories (e.g., **Security**) remain unless kept intentionally.

## 9. Reporting
- Create `TEST_RESULTS.md` with a table of all test cases, columns: **Test ID**, **Pass/Fail**, **Comments**, **Screenshots/Logs**. 
- Attach screenshots for UI checks and API response logs (cURL output). 
- Summarize any defects found and assign defect IDs for tracking.

---
*Prepared for the Ticket Management System project, covering the newly added features as requested. No code changes are required to execute this plan.*