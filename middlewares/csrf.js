import crypto from "crypto";

const CSRF_COOKIE = "csrf";
const CSRF_FIELD = "csrfToken";

function newToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function attachCsrfToken(req, res, next) {
  // Double-submit cookie pattern:
  // - cookie holds token
  // - form includes same token in hidden field
  let token = req.cookies?.[CSRF_COOKIE];
  if (!token) {
    token = newToken();
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
  res.locals.csrfToken = token;
  next();
}

export function csrfProtect(req, res, next) {
  const method = (req.method || "GET").toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return next();

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const bodyToken = req.body?.[CSRF_FIELD];

  if (
    typeof cookieToken === "string" &&
    typeof bodyToken === "string" &&
    cookieToken.length > 0 &&
    crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(bodyToken))
  ) {
    return next();
  }

  return res.status(403).render("error", {
    title: "Forbidden",
    message: "Security check failed (CSRF). Please retry.",
  });
}

