// routes/views.js
import { Router } from "express";
import {
  homePage,
  courseDetailPage,
  courseBookingPage,
  sessionBookingPage,
  postBookCourse,
  postBookSession,
  bookingConfirmationPage,
} from "../controllers/viewsController.js";

import { coursesListPage } from "../controllers/coursesListController.js";
import {
  loginPage,
  registerPage,
  postLogin,
  postRegister,
  postLogout,
} from "../controllers/authController.js";
import { requireAuth } from "../middlewares/auth.js";
import { csrfProtect } from "../middlewares/csrf.js";
import rateLimit from "express-rate-limit";

const router = Router();

router.get("/", homePage);
router.get("/login", loginPage);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/login", authLimiter, csrfProtect, postLogin);
router.get("/register", registerPage);
router.post("/register", authLimiter, csrfProtect, postRegister);
router.post("/logout", csrfProtect, postLogout);

router.get("/courses", coursesListPage);
router.get("/courses/:id", courseDetailPage);
router.get("/courses/:id/book", requireAuth, courseBookingPage);
router.get("/sessions/:id/book", requireAuth, sessionBookingPage);
router.post("/courses/:id/book", requireAuth, csrfProtect, postBookCourse);
router.post("/sessions/:id/book", requireAuth, csrfProtect, postBookSession);
router.get("/bookings/:bookingId", bookingConfirmationPage);

export default router;
