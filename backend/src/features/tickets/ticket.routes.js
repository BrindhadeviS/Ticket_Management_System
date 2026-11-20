import express from "express";
import * as ticketController from "./ticket.controller.js";
import * as manageController from "./ticket.manage.controller.js";
import roleMiddleware from "../../middleware/role.middleware.js";
import upload, { rejectEmptyFile } from "../../middleware/upload.middleware.js";

const router = express.Router();

router.get("/", ticketController.getAllTickets);
router.get(
  "/pool",
  roleMiddleware("Support Team"),
  ticketController.getTicketPool,
);
router.get(
  "/assigned",
  roleMiddleware("Support Team"),
  ticketController.getAssignedTickets,
);
router.get("/:id", ticketController.getTicketById);
router.post(
  "/",
  roleMiddleware("Employee", "Admin", "Approver", "Support Team"),
  upload.single("attachment"),
  rejectEmptyFile,
  ticketController.createTicket,
);

// Owner edits details (category locked) while the ticket is pending approval
router.patch(
  "/:id/details",
  upload.single("attachment"),
  rejectEmptyFile,
  manageController.updateDetails,
);

// Old combined update. It will be removed once the screens use the new endpoints.
router.put(
  "/:id",
  upload.single("attachment"),
  rejectEmptyFile,
  ticketController.updateTicket,
);

// Owner deletes their own ticket while it is pending approval
router.delete("/:id", manageController.deleteOwn);

export default router;