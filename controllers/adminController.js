import { CourseModel } from "../models/courseModel.js";
import { SessionModel } from "../models/sessionModel.js";
import { BookingModel } from "../models/bookingModel.js";
import { UserModel } from "../models/userModel.js";

const COURSE_TYPES = ["WEEKLY_BLOCK", "WEEKEND_WORKSHOP"];
const LEVELS = ["beginner", "intermediate", "advanced"];

function mustBeIn(list, value) {
  return list.includes(value) ? value : null;
}

function asBool(v) {
  return v === "on" || v === true || v === "true";
}

function asInt(v, fallback = 0) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

function errList(message) {
  return { errors: { list: Array.isArray(message) ? message : [message] } };
}

export const adminDashboard = async (req, res, next) => {
  try {
    const [courses, users] = await Promise.all([
      CourseModel.list(),
      UserModel.list(),
    ]);
    res.render("admin/dashboard", {
      title: "Admin",
      stats: { courses: courses.length, users: users.length },
    });
  } catch (e) {
    next(e);
  }
};

export const adminCoursesPage = async (req, res, next) => {
  try {
    const courses = await CourseModel.list();
    courses.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    res.render("admin/courses", { title: "Admin · Courses", courses });
  } catch (e) {
    next(e);
  }
};

export const adminCourseNewPage = async (req, res) => {
  const instructors = await UserModel.list({ role: "instructor" });
  res.render("admin/course_form", {
    title: "Admin · New course",
    form: {
      action: "/admin/courses/new",
      heading: "Create course",
      submitLabel: "Create",
      course: { allowDropIn: true },
    },
    instructors,
    types: COURSE_TYPES.map((t) => ({ value: t })),
    levels: LEVELS.map((l) => ({ value: l })),
  });
};

export const adminCourseEditPage = async (req, res, next) => {
  try {
    const course = await CourseModel.findById(req.params.id);
    if (!course)
      return res
        .status(404)
        .render("error", { title: "Not found", message: "Course not found" });

    const [sessions, instructors] = await Promise.all([
      SessionModel.listByCourse(course._id),
      UserModel.list({ role: "instructor" }),
    ]);

    res.render("admin/course_form", {
      title: "Admin · Edit course",
      form: {
        action: `/admin/courses/${course._id}/edit`,
        heading: `Edit: ${course.title}`,
        submitLabel: "Save changes",
        course,
        sessions,
        deleteAction: `/admin/courses/${course._id}/delete`,
        newSessionLink: `/admin/courses/${course._id}/sessions/new`,
      },
      instructors,
      types: COURSE_TYPES.map((t) => ({ value: t, selected: t === course.type })),
      levels: LEVELS.map((l) => ({ value: l, selected: l === course.level })),
    });
  } catch (e) {
    next(e);
  }
};

export const adminCourseCreate = async (req, res, next) => {
  try {
    const payload = coursePayload(req.body);
    const errors = validateCourse(payload);
    if (errors.length) {
      const instructors = await UserModel.list({ role: "instructor" });
      return res.status(400).render("admin/course_form", {
        title: "Admin · New course",
        ...errList(errors),
        form: {
          action: "/admin/courses/new",
          heading: "Create course",
          submitLabel: "Create",
          course: payload,
        },
        instructors,
        types: COURSE_TYPES.map((t) => ({ value: t, selected: t === payload.type })),
        levels: LEVELS.map((l) => ({ value: l, selected: l === payload.level })),
      });
    }
    const created = await CourseModel.create({ ...payload, sessionIds: [] });
    res.redirect(`/admin/courses/${created._id}/edit`);
  } catch (e) {
    next(e);
  }
};

export const adminCourseUpdate = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const course = await CourseModel.findById(courseId);
    if (!course)
      return res
        .status(404)
        .render("error", { title: "Not found", message: "Course not found" });

    const payload = coursePayload(req.body);
    const errors = validateCourse(payload);
    if (errors.length) {
      const [sessions, instructors] = await Promise.all([
        SessionModel.listByCourse(courseId),
        UserModel.list({ role: "instructor" }),
      ]);
      return res.status(400).render("admin/course_form", {
        title: "Admin · Edit course",
        ...errList(errors),
        form: {
          action: `/admin/courses/${courseId}/edit`,
          heading: `Edit: ${course.title}`,
          submitLabel: "Save changes",
          course: { ...course, ...payload },
          sessions,
          deleteAction: `/admin/courses/${courseId}/delete`,
          newSessionLink: `/admin/courses/${courseId}/sessions/new`,
        },
        instructors,
        types: COURSE_TYPES.map((t) => ({ value: t, selected: t === payload.type })),
        levels: LEVELS.map((l) => ({ value: l, selected: l === payload.level })),
      });
    }
    await CourseModel.update(courseId, payload);
    res.redirect(`/admin/courses/${courseId}/edit`);
  } catch (e) {
    next(e);
  }
};

export const adminCourseDelete = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const sessions = await SessionModel.listByCourse(courseId);
    // Delete bookings for the course
    await BookingModel.removeByCourse(courseId);
    // Delete sessions, then course
    await Promise.all(sessions.map((s) => SessionModel.remove(s._id)));
    await CourseModel.remove(courseId);
    res.redirect("/admin/courses");
  } catch (e) {
    next(e);
  }
};

export const adminSessionNewPage = async (req, res, next) => {
  try {
    const course = await CourseModel.findById(req.params.courseId);
    if (!course)
      return res
        .status(404)
        .render("error", { title: "Not found", message: "Course not found" });

    res.render("admin/session_form", {
      title: "Admin · New session",
      form: {
        heading: `New session for: ${course.title}`,
        action: `/admin/courses/${course._id}/sessions/new`,
        submitLabel: "Create session",
        course,
        session: { capacity: 18 },
      },
    });
  } catch (e) {
    next(e);
  }
};

export const adminSessionEditPage = async (req, res, next) => {
  try {
    const session = await SessionModel.findById(req.params.id);
    if (!session)
      return res
        .status(404)
        .render("error", { title: "Not found", message: "Session not found" });
    const course = await CourseModel.findById(session.courseId);
    if (!course)
      return res
        .status(404)
        .render("error", { title: "Not found", message: "Course not found" });

    res.render("admin/session_form", {
      title: "Admin · Edit session",
      form: {
        heading: `Edit session: ${course.title}`,
        action: `/admin/sessions/${session._id}/edit`,
        submitLabel: "Save changes",
        deleteAction: `/admin/sessions/${session._id}/delete`,
        participantsLink: `/admin/sessions/${session._id}/participants`,
        course,
        session,
      },
    });
  } catch (e) {
    next(e);
  }
};

export const adminSessionCreate = async (req, res, next) => {
  try {
    const courseId = req.params.courseId;
    const course = await CourseModel.findById(courseId);
    if (!course)
      return res
        .status(404)
        .render("error", { title: "Not found", message: "Course not found" });

    const payload = sessionPayload(req.body);
    const errors = validateSession(payload);
    if (errors.length) {
      return res.status(400).render("admin/session_form", {
        title: "Admin · New session",
        ...errList(errors),
        form: {
          heading: `New session for: ${course.title}`,
          action: `/admin/courses/${course._id}/sessions/new`,
          submitLabel: "Create session",
          course,
          session: payload,
        },
      });
    }
    const created = await SessionModel.create({
      ...payload,
      courseId,
      bookedCount: 0,
    });

    const existing = Array.isArray(course.sessionIds) ? course.sessionIds : [];
    await CourseModel.update(courseId, { sessionIds: [...existing, created._id] });

    res.redirect(`/admin/courses/${courseId}/edit`);
  } catch (e) {
    next(e);
  }
};

export const adminSessionUpdate = async (req, res, next) => {
  try {
    const sessionId = req.params.id;
    const session = await SessionModel.findById(sessionId);
    if (!session)
      return res
        .status(404)
        .render("error", { title: "Not found", message: "Session not found" });
    const course = await CourseModel.findById(session.courseId);
    if (!course)
      return res
        .status(404)
        .render("error", { title: "Not found", message: "Course not found" });

    const payload = sessionPayload(req.body);
    const errors = validateSession(payload, session);
    if (errors.length) {
      return res.status(400).render("admin/session_form", {
        title: "Admin · Edit session",
        ...errList(errors),
        form: {
          heading: `Edit session: ${course.title}`,
          action: `/admin/sessions/${sessionId}/edit`,
          submitLabel: "Save changes",
          deleteAction: `/admin/sessions/${sessionId}/delete`,
          participantsLink: `/admin/sessions/${sessionId}/participants`,
          course,
          session: { ...session, ...payload },
        },
      });
    }

    await SessionModel.update(sessionId, payload);
    res.redirect(`/admin/courses/${course._id}/edit`);
  } catch (e) {
    next(e);
  }
};

export const adminSessionDelete = async (req, res, next) => {
  try {
    const sessionId = req.params.id;
    const session = await SessionModel.findById(sessionId);
    if (!session)
      return res
        .status(404)
        .render("error", { title: "Not found", message: "Session not found" });

    const course = await CourseModel.findById(session.courseId);
    if (course) {
      const nextIds = (course.sessionIds || []).filter((id) => id !== sessionId);
      await CourseModel.update(course._id, { sessionIds: nextIds });
    }
    // Remove bookings that include this session
    const bookings = await BookingModel.listBySession(sessionId);
    await Promise.all(bookings.map((b) => BookingModel.cancel(b._id)));
    await SessionModel.remove(sessionId);
    res.redirect(course ? `/admin/courses/${course._id}/edit` : "/admin/courses");
  } catch (e) {
    next(e);
  }
};

export const adminSessionParticipantsPage = async (req, res, next) => {
  try {
    const session = await SessionModel.findById(req.params.id);
    if (!session)
      return res
        .status(404)
        .render("error", { title: "Not found", message: "Session not found" });
    const course = await CourseModel.findById(session.courseId);

    const bookings = await BookingModel.listBySession(session._id, {
      status: "CONFIRMED",
    });
    const users = await Promise.all(bookings.map((b) => UserModel.findById(b.userId)));

    const participants = users
      .filter(Boolean)
      .map((u) => ({ name: u.name, email: u.email, role: u.role }));

    res.render("admin/session_participants", {
      title: "Admin · Class list",
      course,
      session,
      participants,
      participantsCount: participants.length,
    });
  } catch (e) {
    next(e);
  }
};

export const adminUsersPage = async (req, res, next) => {
  try {
    const users = await UserModel.list();
    const vm = users.map((u) => ({ ...u, isSelf: u._id === req.user._id }));
    res.render("admin/users", { title: "Admin · Users", users: vm });
  } catch (e) {
    next(e);
  }
};

export const adminUserPromote = async (req, res, next) => {
  try {
    const userId = req.params.id;
    if (userId === req.user._id) {
      return res
        .status(400)
        .render("error", { title: "Error", message: "You cannot change your own role." });
    }
    await UserModel.update(userId, { role: "organiser" });
    res.redirect("/admin/users");
  } catch (e) {
    next(e);
  }
};

export const adminUserDemote = async (req, res, next) => {
  try {
    const userId = req.params.id;
    if (userId === req.user._id) {
      return res
        .status(400)
        .render("error", { title: "Error", message: "You cannot change your own role." });
    }
    await UserModel.update(userId, { role: "student" });
    res.redirect("/admin/users");
  } catch (e) {
    next(e);
  }
};

export const adminUserDelete = async (req, res, next) => {
  try {
    const userId = req.params.id;
    if (userId === req.user._id) {
      return res
        .status(400)
        .render("error", { title: "Error", message: "You cannot delete your own account." });
    }
    await BookingModel.removeByUser(userId);
    await UserModel.remove(userId);
    res.redirect("/admin/users");
  } catch (e) {
    next(e);
  }
};

function coursePayload(body) {
  const level = mustBeIn(LEVELS, String(body.level || ""));
  const type = mustBeIn(COURSE_TYPES, String(body.type || ""));
  return {
    title: String(body.title || "").trim(),
    level,
    type,
    allowDropIn: asBool(body.allowDropIn),
    startDate: String(body.startDate || "").trim(),
    endDate: String(body.endDate || "").trim(),
    description: String(body.description || "").trim(),
    instructorId: String(body.instructorId || "").trim() || null,
    location: String(body.location || "").trim(),
    price: asInt(body.price, 0),
  };
}

function validateCourse(c) {
  const errors = [];
  if (!c.title) errors.push("Title is required");
  if (!c.level) errors.push("Level is required");
  if (!c.type) errors.push("Type is required");
  if (!c.description) errors.push("Description is required");
  if (!c.location) errors.push("Location is required");
  if (!Number.isFinite(c.price) || c.price < 0) errors.push("Price must be 0 or more");
  return errors;
}

function sessionPayload(body) {
  return {
    startDateTime: String(body.startDateTime || "").trim(),
    endDateTime: String(body.endDateTime || "").trim(),
    capacity: asInt(body.capacity, 0),
    location: String(body.location || "").trim(),
    price: asInt(body.price, 0),
    description: String(body.description || "").trim(),
  };
}

function validateSession(s, existing = null) {
  const errors = [];
  if (!s.startDateTime) errors.push("Start date/time is required");
  if (!s.endDateTime) errors.push("End date/time is required");
  if (!Number.isFinite(s.capacity) || s.capacity <= 0) errors.push("Capacity must be 1 or more");
  if (!s.location) errors.push("Location is required");
  if (!Number.isFinite(s.price) || s.price < 0) errors.push("Price must be 0 or more");
  if (!s.description) errors.push("Description is required");
  if (existing && (existing.bookedCount ?? 0) > s.capacity) {
    errors.push("Capacity cannot be lower than current booked count");
  }
  return errors;
}

