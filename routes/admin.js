import { Router } from "express";
import { requireRole } from "../middlewares/auth.js";
import { csrfProtect } from "../middlewares/csrf.js";
import {
  adminDashboard,
  adminCoursesPage,
  adminCourseNewPage,
  adminCourseEditPage,
  adminCourseCreate,
  adminCourseUpdate,
  adminCourseDelete,
  adminSessionNewPage,
  adminSessionEditPage,
  adminSessionCreate,
  adminSessionUpdate,
  adminSessionDelete,
  adminSessionParticipantsPage,
  adminUsersPage,
  adminUserPromote,
  adminUserDemote,
  adminUserDelete,
  adminUserMakeInstructor,
} from "../controllers/adminController.js";

const router = Router();

router.use(requireRole("organiser"));

router.get("/", adminDashboard);

// Courses
router.get("/courses", adminCoursesPage);
router.get("/courses/new", adminCourseNewPage);
router.post("/courses/new", csrfProtect, adminCourseCreate);
router.get("/courses/:id/edit", adminCourseEditPage);
router.post("/courses/:id/edit", csrfProtect, adminCourseUpdate);
router.post("/courses/:id/delete", csrfProtect, adminCourseDelete);

// Sessions
router.get("/courses/:courseId/sessions/new", adminSessionNewPage);
router.post("/courses/:courseId/sessions/new", csrfProtect, adminSessionCreate);
router.get("/sessions/:id/edit", adminSessionEditPage);
router.post("/sessions/:id/edit", csrfProtect, adminSessionUpdate);
router.post("/sessions/:id/delete", csrfProtect, adminSessionDelete);

// Class list / participants
// Class list / participants
// (organisers only; instructors access their own via /instructor)
router.get("/sessions/:id/participants", adminSessionParticipantsPage);

// Users
router.get("/users", adminUsersPage);
router.post("/users/:id/promote", csrfProtect, adminUserPromote);
router.post("/users/:id/instructor", csrfProtect, adminUserMakeInstructor);
router.post("/users/:id/demote", csrfProtect, adminUserDemote);
router.post("/users/:id/delete", csrfProtect, adminUserDelete);

export default router;

