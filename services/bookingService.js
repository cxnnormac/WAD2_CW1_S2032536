// services/bookingService.js
import { CourseModel } from "../models/courseModel.js";
import { SessionModel } from "../models/sessionModel.js";
import { BookingModel } from "../models/bookingModel.js";

const canReserveAll = (sessions) =>
  sessions.every((s) => (s.bookedCount ?? 0) < (s.capacity ?? 0));

export async function bookCourseForUser(userId, courseId) {
  const existing = await BookingModel.findActiveCourseBooking(userId, courseId);
  if (existing) {
    const err = new Error("You have already booked this course.");
    err.code = "DUPLICATE_BOOKING";
    err.bookingId = existing._id;
    throw err;
  }

  const course = await CourseModel.findById(courseId);
  if (!course) {
    const err = new Error("Course not found");
    err.code = "NOT_FOUND";
    throw err;
  }
  const sessions = await SessionModel.listByCourse(courseId);
  if (sessions.length === 0) {
    const err = new Error("Course has no sessions");
    err.code = "NO_SESSIONS";
    throw err;
  }

  let status = "CONFIRMED";
  if (!canReserveAll(sessions)) {
    status = "WAITLISTED";
  } else {
    for (const s of sessions) await SessionModel.incrementBookedCount(s._id, 1);
  }

  return BookingModel.create({
    userId,
    courseId,
    type: "COURSE",
    sessionIds: sessions.map((s) => s._id),
    status,
  });
}

export async function bookSessionForUser(userId, sessionId) {
  const existing = await BookingModel.findActiveSessionBooking(userId, sessionId);
  if (existing) {
    const err = new Error("You have already booked this class.");
    err.code = "DUPLICATE_BOOKING";
    err.bookingId = existing._id;
    throw err;
  }

  const session = await SessionModel.findById(sessionId);
  if (!session) {
    const err = new Error("Session not found");
    err.code = "NOT_FOUND";
    throw err;
  }
  const course = await CourseModel.findById(session.courseId);
  if (!course) {
    const err = new Error("Course not found");
    err.code = "NOT_FOUND";
    throw err;
  }

  if (!course.allowDropIn && course.type === "WEEKLY_BLOCK") {
    const err = new Error("Drop-in not allowed for this course");
    err.code = "DROPIN_NOT_ALLOWED";
    throw err;
  }

  let status = "CONFIRMED";
  if ((session.bookedCount ?? 0) >= (session.capacity ?? 0)) {
    status = "WAITLISTED";
  } else {
    await SessionModel.incrementBookedCount(session._id, 1);
  }

  return BookingModel.create({
    userId,
    courseId: course._id,
    type: "SESSION",
    sessionIds: [session._id],
    status,
  });
}
