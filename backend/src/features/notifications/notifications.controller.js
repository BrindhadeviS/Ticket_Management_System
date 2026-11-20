import * as notificationsService from "./notifications.service.js";

export const getMine = async (req, res, next) => {
  try {
    const data = await notificationsService.listForUser(req.user.employeeId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const readOne = async (req, res, next) => {
  try {
    const found = await notificationsService.markRead(req.params.id, req.user.employeeId);
    if (!found) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const readAll = async (req, res, next) => {
  try {
    await notificationsService.markAllRead(req.user.employeeId);
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};