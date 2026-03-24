import { initDb } from "../models/_db.js";
import { UserModel } from "../models/userModel.js";

// Usage:
//   node seed/setUserPassword.js user@example.com "Password1A"
//
// Sets password for an existing user (e.g. accounts created without credentials).

await initDb();

const [, , email, password] = process.argv;
if (!email || !password) {
  console.log('Usage: node seed/setUserPassword.js user@example.com "Password1A"');
  process.exit(1);
}

try {
  const user = await UserModel.findByEmail(email);
  if (!user) {
    console.error("No user with that email.");
    process.exit(1);
  }
  await UserModel.setPassword(user._id, password);
  console.log("Password updated for:", email);
} catch (e) {
  console.error("Failed:", e.message);
  process.exit(1);
}
