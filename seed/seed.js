// seed/seed.js
import {
  initDb,
  usersDb,
  coursesDb,
  sessionsDb,
  bookingsDb,
} from "../models/_db.js";
import { CourseModel } from "../models/courseModel.js";
import { SessionModel } from "../models/sessionModel.js";
import { UserModel } from "../models/userModel.js";

const iso = (d) => new Date(d).toISOString();

// Same password as demo student so seeded instructors can sign in at /login.
const DEMO_PASSWORD = "Password1A";

async function wipeAll() {
  // Remove all documents to guarantee a clean seed
  await Promise.all([
    usersDb.remove({}, { multi: true }),
    coursesDb.remove({}, { multi: true }),
    sessionsDb.remove({}, { multi: true }),
    bookingsDb.remove({}, { multi: true }),
  ]);
  // Compact files so you’re not looking at stale data on disk
  await Promise.all([
    usersDb.persistence.compactDatafile(),
    coursesDb.persistence.compactDatafile(),
    sessionsDb.persistence.compactDatafile(),
    bookingsDb.persistence.compactDatafile(),
  ]);
}

async function ensureDemoStudent() {
  const email = "student@gcu.local";
  const password = "Password1A";

  let student = await UserModel.findByEmail(email);
  if (!student) {
    // Use register() so the account can log in via /login.
    student = await UserModel.register({
      name: "Demo Student",
      email,
      password,
      role: "student",
    });
  }
  return { ...student, __demoLogin: { email, password } };
}

async function ensureDemoOrganiser() {
  const email = "organiser@gcu.local";
  const name = "Demo Organiser";
  let organiser = await UserModel.findByEmail(email);
  if (!organiser) {
    const user = await UserModel.register({
      name,
      email,
      password: DEMO_PASSWORD,
      role: "student",
    });
    await UserModel.update(user._id, { role: "organiser" });
    organiser = await UserModel.findByEmail(email);
  }
  return { email, password: DEMO_PASSWORD, organiser };
}

async function createWeekendWorkshop() {
  const instructor = await UserModel.create({
    name: "Ava",
    email: "ava@yoga.local",
    role: "instructor",
  });
  await UserModel.setPassword(instructor._id, DEMO_PASSWORD);
  const course = await CourseModel.create({
    title: "Winter Mindfulness Workshop",
    level: "beginner",
    type: "WEEKEND_WORKSHOP",
    allowDropIn: false,
    startDate: "2026-01-10",
    endDate: "2026-01-11",
    instructorId: instructor._id,
    sessionIds: [],
    description: "Two days of breath, posture alignment, and meditation.",
    location: "Glasgow Caledonian University, Cowcaddens Road, Glasgow G4 0BA",
    price: 60,
  });

  const base = new Date("2026-01-10T09:00:00"); // Sat 9am
  const sessions = [];
  for (let i = 0; i < 5; i++) {
    const start = new Date(base.getTime() + i * 2 * 60 * 60 * 1000); // every 2 hours
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const s = await SessionModel.create({
      courseId: course._id,
      startDateTime: iso(start),
      endDateTime: iso(end),
      capacity: 20,
      bookedCount: 0,
      location: "Glasgow Caledonian University, Cowcaddens Road, Glasgow G4 0BA",
      price: 15,
      description: `Workshop session ${i + 1}: mindfulness + gentle movement.`,
    });
    sessions.push(s);
  }
  await CourseModel.update(course._id, {
    sessionIds: sessions.map((s) => s._id),
  });
  return { course, sessions, instructor };
}

async function createWeeklyBlock() {
  const instructor = await UserModel.create({
    name: "Ben",
    email: "ben@yoga.local",
    role: "instructor",
  });
  await UserModel.setPassword(instructor._id, DEMO_PASSWORD);
  const course = await CourseModel.create({
    title: "12‑Week Vinyasa Flow",
    level: "intermediate",
    type: "WEEKLY_BLOCK",
    allowDropIn: true,
    startDate: "2026-02-02",
    endDate: "2026-04-20",
    instructorId: instructor._id,
    sessionIds: [],
    description: "Progressive sequences building strength and flexibility.",
    location: "Glasgow Caledonian University, Cowcaddens Road, Glasgow G4 0BA",
    price: 84,
  });

  const first = new Date("2026-02-02T18:30:00"); // Monday 6:30pm
  const sessions = [];
  for (let i = 0; i < 12; i++) {
    const start = new Date(first.getTime() + i * 7 * 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 75 * 60 * 1000);
    const s = await SessionModel.create({
      courseId: course._id,
      startDateTime: iso(start),
      endDateTime: iso(end),
      capacity: 18,
      bookedCount: 0,
      location: "Glasgow Caledonian University, Cowcaddens Road, Glasgow G4 0BA",
      price: 8,
      description: `Week ${i + 1}: vinyasa flow sequence + relaxation.`,
    });
    sessions.push(s);
  }
  await CourseModel.update(course._id, {
    sessionIds: sessions.map((s) => s._id),
  });
  return { course, sessions, instructor };
}

async function verifyAndReport() {
  const [users, courses, sessions, bookings] = await Promise.all([
    usersDb.count({}),
    coursesDb.count({}),
    sessionsDb.count({}),
    bookingsDb.count({}),
  ]);
  console.log("— Verification —");
  console.log("Users   :", users);
  console.log("Courses :", courses);
  console.log("Sessions:", sessions);
  console.log("Bookings:", bookings);
  if (courses === 0 || sessions === 0) {
    throw new Error("Seed finished but no courses/sessions were created.");
  }
}

async function run() {
  console.log("Initializing DB…");
  await initDb();

  console.log("Wiping existing data…");
  await wipeAll();

  console.log("Creating demo student…");
  const student = await ensureDemoStudent();

  console.log("Creating demo organiser…");
  const organiserDemo = await ensureDemoOrganiser();

  console.log("Creating weekend workshop…");
  const w = await createWeekendWorkshop();

  console.log("Creating weekly block…");
  const b = await createWeeklyBlock();

  await verifyAndReport();

  console.log("\n✅ Seed complete.");
  console.log("Demo student login   :", student.__demoLogin.email);
  console.log("Demo student password:", student.__demoLogin.password);
  console.log(
    "Instructor logins    : ava@yoga.local & ben@yoga.local — password:",
    DEMO_PASSWORD
  );
  console.log("Demo organiser login :", organiserDemo.email);
  console.log("Demo organiser pass  :", organiserDemo.password);
  console.log("Student ID           :", student._id);
  console.log(
    "Workshop course ID   :",
    w.course._id,
    "(sessions:",
    w.sessions.length + ")"
  );
  console.log(
    "Weekly block course ID:",
    b.course._id,
    "(sessions:",
    b.sessions.length + ")"
  );
}

run().catch((err) => {
  console.error("❌ Seed failed:", err?.stack || err);
  process.exit(1);
});
