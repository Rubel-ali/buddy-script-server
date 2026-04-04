import express from "express";
import passport from "../../../config/passport";
import { jwtHelpers } from "../../../helpars/jwtHelpers";

const router = express.Router();

interface GoogleUser {
  id: string;
  email: string;
  username: string;
  role: string;
  photo?: string | null;
  userType: string;
}

// ==============================
// 🔥 STEP 1: Google Login
// ==============================
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account", // ✅ FIX: force account selection
  })
);

// ==============================
// 🔥 STEP 2: Google Callback
// ==============================
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  (req, res) => {
    const data = req.user as GoogleUser;

    // ✅ Create JWT
    const token = jwtHelpers.createToken(
      {
        id: data.id, // 🔥 IMPORTANT
        email: data.email,
        name: data.username,
        role: data.role,
        userType: data.userType,
      },
      process.env.JWT_SECRET as string,
      process.env.EXPIRES_IN as string
    );

    const frontendURL = process.env.FRONTEND_URL || "http://localhost:3000";

    // ✅ Redirect with params
    res.redirect(
      `${frontendURL}/login?` +
        `id=${data.id}&username=${data.username}&role=${data.role}&` +
        `email=${data.email}&userType=${data.userType}&accessToken=${token}`
    );
  }
);

export default router;