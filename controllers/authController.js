import { UserModel } from "../models/userModel.js";
import { issueAuthCookie, clearAuthCookie } from "../middlewares/auth.js";

function pickNext(req) {
  const next = req.query?.next;
  if (!next) return "/";
  // Basic safety: only allow relative paths
  if (typeof next === "string" && next.startsWith("/")) return next;
  return "/";
}

export const loginPage = async (req, res) => {
  if (req.user) return res.redirect("/");
  res.render("login", { title: "Login", next: pickNext(req) });
};

export const registerPage = async (req, res) => {
  if (req.user) return res.redirect("/");
  res.render("register", { title: "Register", next: pickNext(req) });
};

export const postLogin = async (req, res) => {
  const { email, password } = req.body || {};
  const nextUrl = pickNext(req);

  try {
    const user = await UserModel.verifyLogin(email, password);
    if (!user) {
      return res.status(400).render("login", {
        title: "Login",
        next: nextUrl,
        errors: { list: ["Invalid email or password"] },
        values: { email },
      });
    }
    issueAuthCookie(res, user);
    return res.redirect(nextUrl);
  } catch (err) {
    return res.status(400).render("login", {
      title: "Login",
      next: nextUrl,
      errors: { list: [err.message || "Login failed"] },
      values: { email },
    });
  }
};

export const postRegister = async (req, res) => {
  const { name, email, password } = req.body || {};
  const nextUrl = pickNext(req);

  try {
    const user = await UserModel.register({ name, email, password, role: "student" });
    issueAuthCookie(res, user);
    return res.redirect(nextUrl);
  } catch (err) {
    const msg =
      err.code === "VALIDATION"
        ? err.message
        : err.message?.includes("unique constraint")
          ? "That email is already registered."
          : "Registration failed.";
    return res.status(400).render("register", {
      title: "Register",
      next: nextUrl,
      errors: { list: [msg] },
      values: { name, email },
    });
  }
};

export const postLogout = async (req, res) => {
  clearAuthCookie(res);
  res.redirect("/");
};

