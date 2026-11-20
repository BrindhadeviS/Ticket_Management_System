import jwt from "jsonwebtoken";
import pool from "../config/db.js";

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access token is required",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Confirm the account still exists and is active on every authenticated request.
    const employeeResult = await pool.query(
      `SELECT employee_id, role, active
       FROM employees
       WHERE employee_id = $1`,
      [decoded.employeeId]
    );

    const employee = employeeResult.rows[0];

    if (!employee || !employee.active) {
      return res.status(401).json({
        success: false,
        message: "This employee account is no longer active. Please sign in again.",
      });
    }

    req.user = {
      ...decoded,
      id: employee.employee_id,
      employeeId: employee.employee_id,
      role: employee.role,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

export default authMiddleware;
