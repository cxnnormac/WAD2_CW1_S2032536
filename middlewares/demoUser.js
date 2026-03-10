// middlewares/demoUser.js
import { UserModel } from "../models/userModel.js";

export const attachDemoUser = async (req, res, next) => {
  try {
    if (req.user) {
      res.locals.user = req.user;
      return next();
    }
    if (process.env.DEMO_USER !== "true") return next();

    // Demo mode: ensure one demo student exists.
    const email = "fiona@student.local";
    let user = await UserModel.findByEmail(email);
    if (!user) {
      user = await UserModel.create({ name: "Fiona", email, role: "student" });
    }
    req.user = user;
    res.locals.user = user; // exposed to Mustache
    res.locals.isOrganiser = user.role === "organiser";
    next();
  } catch (err) {
    next(err);
  }
};
