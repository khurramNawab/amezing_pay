import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";
import connectDB from "../config/db.js";

dotenv.config();

const createAdmin = async () => {
  try {
    await connectDB();

    const adminEmail = "admin@amezingpay.com";
    const adminPassword = "Admin@123";

    const existing = await User.findOne({ email: adminEmail });
    if (existing) {
      existing.role = "admin";
      existing.password = adminPassword;
      await existing.save();
      console.log("✅ Admin user updated successfully.");
    } else {
      await User.create({
        name: "System Admin",
        email: adminEmail,
        password: adminPassword,
        phone: "0000000000",
        role: "admin",
        referralCode: "ADMIN777",
        kycStatus: "verified",
      });
      console.log("✅ Admin user created successfully.");
    }

    console.log("-----------------------------------");
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log("-----------------------------------");

    process.exit();
  } catch (error) {
    console.error("❌ Error creating admin:", error.message);
    process.exit(1);
  }
};

createAdmin();
