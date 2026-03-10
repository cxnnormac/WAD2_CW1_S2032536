
// models/userModel.js
import { usersDb } from './_db.js';

export const UserModel = {
  async create(user) {
    // Low-level create used by seeds/tests; may not include auth fields.
    if (user.email) user.email = normaliseEmail(user.email);
    return usersDb.insert(user);
  },
  async findByEmail(email) {
    return usersDb.findOne({ email: normaliseEmail(email) });
  },
  async findById(id) {
    return usersDb.findOne({ _id: id });
  },

  async register({ name, email, password, role = "student" }) {
    const cleanEmail = normaliseEmail(email);
    if (!name || !cleanEmail || !password) {
      const err = new Error("Name, email and password are required");
      err.code = "VALIDATION";
      throw err;
    }
    if (String(password).length < 8) {
      const err = new Error("Password must be at least 8 characters");
      err.code = "VALIDATION";
      throw err;
    }
    const pw = String(password);
    const hasUpper = /[A-Z]/.test(pw);
    const hasNumber = /[0-9]/.test(pw);
    if (!hasUpper || !hasNumber) {
      const err = new Error(
        "Password must include at least one uppercase letter and one number"
      );
      err.code = "VALIDATION";
      throw err;
    }
    const passwordSalt = crypto.randomBytes(16).toString("hex");
    const passwordHash = hashPassword(password, passwordSalt);
    const user = await usersDb.insert({
      name: String(name).trim(),
      email: cleanEmail,
      role,
      passwordSalt,
      passwordHash,
      createdAt: new Date().toISOString(),
    });
    return safeUser(user);
  },

  async verifyLogin(email, password) {
    const user = await this.findByEmail(email);
    if (!user || !user.passwordSalt || !user.passwordHash) return null;
    const attempt = hashPassword(password, user.passwordSalt);
    const ok = crypto.timingSafeEqual(
      Buffer.from(attempt, "hex"),
      Buffer.from(user.passwordHash, "hex")
    );
    return ok ? safeUser(user) : null;
  },
};

export { safeUser };
