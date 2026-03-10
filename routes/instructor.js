import { Router } from "express";
import { requireRole } from "../middlewares/auth.js";
import {
  instructorDashboard,
  instructorSessionParticipants,
} from "../controllers/instructorController.js";

const router = Router();

router.use(requireRole("instructor", "organiser"));

router.get("/", instructorDashboard);
router.get("/sessions/:id/participants", instructorSessionParticipants);

export default router;

