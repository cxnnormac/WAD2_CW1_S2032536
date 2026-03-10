import { CourseModel } from "../models/courseModel.js";
import { SessionModel } from "../models/sessionModel.js";
import { BookingModel } from "../models/bookingModel.js";
import { UserModel } from "../models/userModel.js";

export const instructorDashboard = async (req, res, next) => {
  try {
    const courses = await CourseModel.list({ instructorId: req.user._id });
    const withCounts = await Promise.all(
      courses.map(async (c) => {
        const sessions = await SessionModel.listByCourse(c._id);
        return { ...c, sessionsCount: sessions.length };
      })
    );
    res.render("instructor/dashboard", {
      title: "Instructor",
      courses: withCounts,
    });
  } catch (e) {
    next(e);
  }
};

export const instructorSessionParticipants = async (req, res, next) => {
  try {
    const session = await SessionModel.findById(req.params.id);
    if (!session)
      return res
        .status(404)
        .render("error", { title: "Not found", message: "Session not found" });
    const course = await CourseModel.findById(session.courseId);
    if (!course || course.instructorId !== req.user._id) {
      return res.status(403).render("error", {
        title: "Forbidden",
        message: "You are not the instructor for this session.",
      });
    }
    const bookings = await BookingModel.listBySession(session._id, {
      status: "CONFIRMED",
    });
    const users = await Promise.all(bookings.map((b) => UserModel.findById(b.userId)));
    const participants = users
      .filter(Boolean)
      .map((u) => ({ name: u.name, email: u.email, role: u.role }));

    res.render("admin/session_participants", {
      title: "Instructor · Class list",
      course,
      session,
      participants,
      participantsCount: participants.length,
    });
  } catch (e) {
    next(e);
  }
};

