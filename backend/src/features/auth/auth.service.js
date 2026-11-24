
import pool from '../../config/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export const loginUser = async (email, password) => {
  // 1. Find employee by email
  const query = `
    SELECT e.employee_id, e.name, e.email, e.department, e.password_hash, e.role, e.active,
           e.must_change_password, e.manager_id, m.name AS manager_name
    FROM employees e
    LEFT JOIN employees m ON m.employee_id = e.manager_id
    WHERE e.email = $1
  `;

  const result = await pool.query(query, [email]);

  const user = result.rows[0];

  // 2. Check whether employee exists
  if (!user) {
    throw new Error('Invalid email or password');
  }

  // 3. Check whether account is active
  if (!user.active) {
    throw new Error('Your account is deactivated');
  }

  // 4. Compare entered password with stored hash
  const isPasswordValid = await bcrypt.compare(
    password,
    user.password_hash
  );

  if (!isPasswordValid) {
    throw new Error('Invalid email or password');
  }

  // 5. Generate JWT token
  const token = jwt.sign(
    {
      employeeId: user.employee_id,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );

  // 6. Return user details and token
  return {
    token,
    user: {
      employee_id: user.employee_id,
      name: user.name,
      email: user.email,
      department: user.department,
      role: user.role,
      manager_id: user.manager_id,
      manager_name: user.manager_name,
      must_change_password: user.must_change_password
    }
  };
};

export const getMe = async (employeeId) => {
  const query = `
    SELECT e.employee_id, e.name, e.email, e.department, e.role, e.active,
           e.must_change_password, e.manager_id, m.name AS manager_name
    FROM employees e
    LEFT JOIN employees m ON m.employee_id = e.manager_id
    WHERE e.employee_id = $1
  `;
  const result = await pool.query(query, [employeeId]);
  const user = result.rows[0];
  if (!user || !user.active) {
    throw new Error('User not found or deactivated');
  }
  return {
    employee_id: user.employee_id,
    id: user.employee_id,
    name: user.name,
    email: user.email,
    department: user.department,
    dept: user.department,
    role: user.role,
    manager_id: user.manager_id,
    manager_name: user.manager_name,
    must_change_password: user.must_change_password
  };
};

export const changePassword = async (employeeId, newPassword) => {
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  const result = await pool.query(
    `UPDATE employees
     SET password_hash = $1,
         must_change_password = FALSE
     WHERE employee_id = $2
     RETURNING employee_id`,
    [hashedPassword, employeeId]
  );

  return result.rows[0];
};

export const resetEmployeePassword = async (employeeId, temporaryPassword) => {
  const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

  const result = await pool.query(
    `UPDATE employees
     SET password_hash = $1,
         must_change_password = TRUE
     WHERE employee_id = $2
     AND active = TRUE
     RETURNING employee_id, name, email`,
    [hashedPassword, employeeId]
  );

  return result.rows[0];
};

// ------------------------------------------------------------
//  getUserByEmail – returns the employee row (or undefined)
// ------------------------------------------------------------
export const getUserByEmail = async (email) => {
  const { rows } = await pool.query(
    `SELECT employee_id, name, email, role, active
     FROM employees
     WHERE email = $1`,
    [email.trim().toLowerCase()]
  );
  // rows[0] will be undefined if the e‑mail does not exist
  return rows[0];
};
