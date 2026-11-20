import fs from "fs";
import * as manageService from "./ticket.manage.service.js";

// Runs a service call, replies with JSON, and removes an uploaded file if it failed.
const run = (action) => async (req, res, next) => {
  try {
    const data = await action(req);
    res.status(200).json({ success: true, data });
  } catch (error) {
    if (req.file) fs.unlink(req.file.path, () => {});
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
};

export const updateDetails = run((req) =>
  manageService.updateDetails(
    req.params.id,
    req.user,
    req.body,
    req.file,
    req.body.removeAttachment === "true" || req.body.removeAttachment === true,
  ),
);

export const deleteOwn = run((req) =>
  manageService.deleteOwnTicket(req.params.id, req.user),
);