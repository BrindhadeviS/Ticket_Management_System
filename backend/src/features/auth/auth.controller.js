
import { getPasswordError } from "../../utils/passwordRules.js";
import {
  resetEmployeePassword,
  changePassword as updatePassword,
} from "./auth.service.js";
import { loginUser } from "./auth.service.js";

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const result = await loginUser(email, password);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
    });
  } catch (error) {
    if (
      error.message === "Invalid email or password" ||
      error.message === "Your account is deactivated"
    ) {
      return res.status(401).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
};

export const updatePasswordController = async (req, res, next) => {
  try {
    const { newPassword } = req.body;

    const passwordError = getPasswordError(newPassword);
    if (passwordError) {
      return res.status(400).json({ success: false, message: passwordError });
    }

    const employee = await updatePassword(req.user.employeeId, newPassword);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const resetEmployeePasswordController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { temporaryPassword } = req.body;

    const passwordError = getPasswordError(temporaryPassword);
    if (passwordError) {
      return res.status(400).json({ success: false, message: passwordError });
    }

    const employee = await resetEmployeePassword(id, temporaryPassword);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Employee password reset successfully",
    });
  } catch (error) {
    next(error);
  }
};

