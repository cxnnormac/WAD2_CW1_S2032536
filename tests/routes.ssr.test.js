import request from "supertest";
import { app } from "../index.js";
import { resetDb, seedMinimal } from "./helpers.js";

describe("SSR view routes", () => {
  let data;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    await resetDb();
    data = await seedMinimal();
  });

  test("GET / (home) renders HTML", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
    // Page title from home.mustache (adjust if you changed it)
    expect(res.text).toMatch(/Courses|Upcoming Courses/i);
  });

  test("GET /courses (list page) renders HTML and shows Test Course", async () => {
    const res = await request(app).get("/courses");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
    expect(res.text).toMatch(/Test Course/);
  });

  test("GET /courses/:id (detail page) renders HTML", async () => {
    const res = await request(app).get(`/courses/${data.course._id}`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
    expect(res.text).toMatch(/Test Course/);
  });

  test("GET /courses/:id/book renders course booking form", async () => {
    const res = await request(app)
      .get(`/courses/${data.course._id}/book`)
      .set("Accept", "text/html");
    // Booking pages require auth; expect redirect to login
    expect([302, 303]).toContain(res.status);
    expect(res.headers.location).toMatch(/\/login/i);
  });

  test("GET /sessions/:id/book renders session booking form", async () => {
    const sessionId = data.sessions[0]._id;
    const res = await request(app)
      .get(`/sessions/${sessionId}/book`)
      .set("Accept", "text/html");
    // Booking pages require auth; expect redirect to login
    expect([302, 303]).toContain(res.status);
    expect(res.headers.location).toMatch(/\/login/i);
  });
});
