import express from "express";
import {
  register,
  login,
  refreshToken,
  logout,
  getUserProfile,
  updateUserProfile,
  submitKyc,
  verifyEmail,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
  changePassword,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import validate from "../middleware/validatorMiddleware.js";
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  updateProfileSchema,
  changePasswordSchema,
} from "../validations/authValidation.js";

const router = express.Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);

router.post("/refresh-token", validate(refreshTokenSchema), refreshToken);
router.post("/logout", protect, logout);
router.route("/profile").get(protect, getUserProfile);
router
  .route("/profile")
  .put(protect, validate(updateProfileSchema), updateUserProfile);
router.post("/change-password", protect, validate(changePasswordSchema), changePassword);
router.post("/kyc/submit", protect, submitKyc);

router.get("/verify-email/:token", verifyEmail);
router.post("/resend-verification", protect, resendVerificationEmail);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
