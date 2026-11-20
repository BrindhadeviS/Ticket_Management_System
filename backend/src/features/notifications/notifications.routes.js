import { Router } from "express";
import * as notificationsController from "./notifications.controller.js";

const router = Router();

router.get("/", notificationsController.getMine);
router.patch("/read-all", notificationsController.readAll);
router.patch("/:id/read", notificationsController.readOne);

export default router;