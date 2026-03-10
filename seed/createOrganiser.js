import { initDb } from "../models/_db.js";
import { UserModel } from "../models/userModel.js";

// Usage:
//   node seed/createOrganiser.js organiser@example.com "Full Name" "Password1A"
//
// Password policy: 8+ chars, 1 uppercase, 1 number

await initDb();

const [, , email, name, password] = process.argv;
if (!email || !name || !password) {
  console.log(
    'Usage: node seed/createOrganiser.js organiser@example.com "Full Name" "Password1A"'
  );
  process.exit(1);
}

try {
  // Register as student then promote to organiser (keeps one place for validation).
  const user = await UserModel.register({ email, name, password, role: "student" });
  await UserModel.update(user._id, { role: "organiser" });
  console.log("Created organiser:", email);
} catch (e) {
  console.error("Failed:", e.message);
  process.exit(1);
}

