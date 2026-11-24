import pool from "../../config/db.js";
import bcrypt from "bcrypt";
import { HttpError } from "../../utils/httpError.js";
import { makeTempPassword } from "../../utils/tempPassword.js";
import { getPasswordError } from "../../utils/passwordRules.js";

const ROLES = ["Employee", "Approver", "Support Team", "Admin"];
const COLUMNS =
  "employee_id, name, email, department, role, active, must_change_password, manager_id";

const checkName = (name) => {
  if (!/^[A-Za-z .'-]+$/.test(name))
    throw new HttpError(400, "Employee name can contain letters only.");
};
const checkEmail = (email) => {
  if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email))
    throw new HttpError(
      400,
      "Enter a valid email address (e.g. .com, .org, .net).",
    );
};
const checkRole = (role) => {
  if (!ROLES.includes(role))
    throw new HttpError(
      400,
      "Role must be Employee, Approver, Support Team or Admin.",
    );
};

// Turns a duplicate-email database error into a clear message.
const handleDbError = (err) => {
  if (err.code === "23505")
    throw new HttpError(409, "An employee with this email already exists.");
  throw err;
};

export const createEmployee = async (data) => {
  const name = String(data.name || "").trim();
  const email = String(data.email || "")
    .trim()
    .toLowerCase();
  const department = String(data.department || "").trim();
  const role = data.role || "Employee";
  // Only Employee role requires/has a reporting manager; Admin, Approver, Support Team never have a manager
  const managerId = role === "Employee"
    ? (data.manager_id ? Number(data.manager_id) : (data.managerId ? Number(data.managerId) : null))
    : null;

  checkName(name);
  checkEmail(email);
  checkRole(role);
  if (!department) throw new HttpError(400, "Department is required.");

  if (data.password) {
    const passwordError = getPasswordError(data.password);
    if (passwordError) throw new HttpError(400, passwordError);
  }

  // The server makes a temporary password unless one is sent.
  const generated = !data.password;
  const password = data.password || makeTempPassword();
  const hash = await bcrypt.hash(password, 10);

  try {
    const { rows } = await pool.query(
      `INSERT INTO employees (name, email, department, password_hash, role, active, must_change_password, manager_id)
       VALUES ($1, $2, $3, $4, $5, true, $6, $7)
       RETURNING ${COLUMNS}`,
      [name, email, department, hash, role, generated, managerId],
    );
    return generated ? { ...rows[0], temporary_password: password } : rows[0];
  } catch (err) {
    handleDbError(err);
  }
};

export const getAllEmployees = async (page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  const { rows } = await pool.query(
    `SELECT e.employee_id, e.name, e.email, e.department, e.role, e.active, e.manager_id,
            m.name AS manager_name,
            (SELECT COUNT(*)::int FROM tickets t WHERE t.created_by = e.employee_id) AS ticket_count
     FROM employees e
     LEFT JOIN employees m ON m.employee_id = e.manager_id
     ORDER BY e.employee_id
     LIMIT $1 OFFSET $2`,
    [limit, offset],
  );
  return rows;
};

// Legacy version for backward compatibility
export const getAllEmployeesLegacy = async () => {
  const { rows } = await pool.query(
    `SELECT e.employee_id, e.name, e.email, e.department, e.role, e.active, e.manager_id,
            m.name AS manager_name,
            (SELECT COUNT(*)::int FROM tickets t WHERE t.created_by = e.employee_id) AS ticket_count
     FROM employees e
     LEFT JOIN employees m ON m.employee_id = e.manager_id
     ORDER BY e.employee_id`,
  );
  return rows;
};

export const getEmployeeById = async (id) => {
  const { rows } = await pool.query(
    `SELECT e.employee_id, e.name, e.email, e.department, e.role, e.active, e.must_change_password, e.manager_id,
            m.name AS manager_name
     FROM employees e
     LEFT JOIN employees m ON m.employee_id = e.manager_id
     WHERE e.employee_id = $1`,
    [id],
  );
  return rows[0];
};

export const updateEmployee = async (id, data, currentUserId) => {
  const isSelf = Number(id) === Number(currentUserId);

  const name = data.name !== undefined ? String(data.name).trim() : null;
  const email =
    data.email !== undefined ? String(data.email).trim().toLowerCase() : null;
  const department =
    data.department !== undefined
      ? String(data.department).trim()
      : data.dept !== undefined
        ? String(data.dept).trim()
        : null;
  const role = data.role ?? null;
  const active = data.active !== undefined ? Boolean(data.active) : null;

  const currentEmp = await getEmployeeById(id);
  const effectiveRole = role || currentEmp?.role || "Employee";

  let managerId = null;
  let hasManager = true;

  if (effectiveRole === "Employee") {
    hasManager = data.manager_id !== undefined || data.managerId !== undefined;
    managerId = data.manager_id !== undefined
      ? (data.manager_id ? Number(data.manager_id) : null)
      : data.managerId !== undefined
        ? (data.managerId ? Number(data.managerId) : null)
        : (currentEmp?.manager_id ?? null);
  } else {
    // Admin, Approver, Support Team: always nullify manager
    managerId = null;
    hasManager = true;
  }

  if (name !== null) checkName(name);
  if (email !== null) checkEmail(email);
  if (role !== null) checkRole(role);
  if (department === "") throw new HttpError(400, "Department is required.");
  if (isSelf && role !== null) {
    const me = await getEmployeeById(id);
    if (me && me.role !== role)
      throw new HttpError(400, "You cannot change your own role.");
  }
  if (isSelf && active === false) {
    throw new HttpError(400, "You cannot deactivate your own account.");
  }

  try {
    await pool.query(
      `UPDATE employees
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           department = COALESCE($3, department),
           role = COALESCE($4, role),
           active = COALESCE($5, active),
           manager_id = CASE WHEN $6::boolean THEN $7::int ELSE manager_id END
       WHERE employee_id = $8`,
      [name, email, department, role, active, hasManager, managerId, id],
    );
    return await getEmployeeById(id);
  } catch (err) {
    handleDbError(err);
  }
};

// Activate or deactivate an account.
export const setActive = async (id, active, currentUserId) => {
  if (typeof active !== "boolean")
    throw new HttpError(400, "Send active as true or false.");
  if (!active && Number(id) === Number(currentUserId))
    throw new HttpError(400, "You cannot deactivate your own account.");

  const { rows } = await pool.query(
    `UPDATE employees SET active = $1 WHERE employee_id = $2 RETURNING ${COLUMNS}`,
    [active, id],
  );
  if (!rows[0]) {
    throw new HttpError(404, "Employee not found.");
  }
  return rows[0];
};

// Makes a new temporary password. The employee must change it at next sign in.
export const resetPassword = async (id) => {
  const password = makeTempPassword();
  const hash = await bcrypt.hash(password, 10);

  const { rows } = await pool.query(
    `UPDATE employees
     SET password_hash = $1, must_change_password = TRUE
     WHERE employee_id = $2 AND active = TRUE
     RETURNING employee_id, name, email`,
    [hash, id],
  );
  if (!rows[0])
    throw new HttpError(
      404,
      "Employee not found, or the account is deactivated.",
    );
  return { ...rows[0], temporary_password: password };
};
