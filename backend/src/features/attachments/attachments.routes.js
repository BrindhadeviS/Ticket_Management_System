import { Router } from "express";
import * as attachmentsController from "./attachments.controller.js";

const router = Router();

router.get("/:ticketId/view", attachmentsController.view);
router.get("/:ticketId/download", attachmentsController.download);

export default router;