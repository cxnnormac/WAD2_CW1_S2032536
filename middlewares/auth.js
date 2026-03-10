import jwt from "jsonwebtoken";
import { UserModel } from "../models/userModel.js";

const COOKIE_NAME = "token";

function getJwtSecret() {
  return process.env.JWT_SECRET || "dev-secret-change-me";
}

export function issueAuthCookie(res, user) {
  const payload = { sub: user._id, role: user.role };
  const token = jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

export async function attachUserFromJwt(req, res, next) {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) return next();

    const decoded = jwt.verify(token, getJwtSecret());
    const user = await UserModel.findById(decoded.sub);
    if (!user) {
      clearAuthCookie(res);
      return next();
    }
    req.user = user;
    res.locals.user = user;
    res.locals.isOrganiser = user.role === "organiser";
    return next();
  } catch {
    // Expired/invalid token: clear and continue as anonymous
    clearAuthCookie(res);
    return next();
  }
}

function isHtmlRequest(req) {
  const accept = req.headers.accept || "";
  return accept.includes("text/html");
}

export function requireAuth(req, res, next) {
  if (req.user) return next();
  if (isHtmlRequest(req)) {
    const nextUrl = encodeURIComponent(req.originalUrl || "/");
    return res.redirect(`/login?next=${nextUrl}`);
  }
  return res.status(401).json({ error: "Unauthenticated" });
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return requireAuth(req, res, next);
    if (roles.includes(req.user.role)) return next();
    if (isHtmlRequest(req)) {
      return res.status(403).render("error", {
        title: "Forbidden",
        message: "You do not have access to this page.",
      });
    }
    return res.status(403).json({ error: "Forbidden" });
  };
}

