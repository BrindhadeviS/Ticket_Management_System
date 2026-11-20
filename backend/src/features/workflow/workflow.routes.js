import { Router } from "express";
import roleMiddleware from "../../middleware/role.middleware.js";
import * as workflowController from "./workflow.controller.js";

const router = Router();

// Approver / Admin actions
router.post("/:id/approve", roleMiddleware("Approver", "Admin"), workflowController.approve);
router.post("/:id/reject", roleMiddleware("Approver", "Support Team", "Admin"), workflowController.reject);

// Support Team / Admin actions
router.post("/:id/take", roleMiddleware("Support Team", "Admin"), workflowController.take);
router.post("/:id/release", roleMiddleware("Support Team", "Admin"), workflowController.release);
router.post("/:id/resolve", roleMiddleware("Support Team", "Admin"), workflowController.resolve);

// Clarification workflow actions
router.post("/:id/clarify-request", roleMiddleware("Approver", "Support Team", "Admin"), workflowController.requestClarification);
router.post("/:id/clarify-respond", roleMiddleware("Employee", "Admin", "Approver", "Support Team"), workflowController.respondClarification);

// Backward compatibility
router.post("/:id/clarification", workflowController.clarify);

export default router;