import * as dashboardService from "./dashboard.service.js";

export const getDashboardSummary = async (req, res, next) => {
  try {
    const role = req.user?.role || "Employee";
    const employeeId = req.user?.employeeId || null;

    const data = await dashboardService.getDashboardSummary(role, employeeId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
