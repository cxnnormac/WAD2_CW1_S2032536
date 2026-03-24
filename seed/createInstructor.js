import { initDb } from "../models/_db.js";
import { UserModel } from "../models/userModel.js";

// Usage:
//   node seed/createInstructor.js instructor@example.com "Full Name" "Password1A"
//
// Password policy: 8+ chars, 1 uppercase, 1 number

await initDb();

const [, , email, name, password] = process.argv;
if (!email || !name || !password) {
  console.log(
    'Usage: node seed/createInstructor.js instructor@example.com "Full Name" "Password1A"'
  );
  process.exit(1);
}

try {
  const user = await UserModel.register({
    email,
    name,
    password,
    role: "student",
  });
  await UserModel.update(user._id, { role: "instructor" });
  console.log("Created instructor:", email);
} catch (e) {
  console.error("Failed:", e.message);
  process.exit(1);
}
