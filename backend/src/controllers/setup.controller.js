import Company from "../models/Company.js";
import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";

export const getSetupStatus = async (req, res) => {
  try {
    const companyCount = await Company.countDocuments();
    const adminCount = await User.countDocuments({
      role: "admin"
    });

    const setupRequired =
      companyCount === 0 || adminCount === 0;

    res.status(200).json({
      success: true,
      setupRequired
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const firstSetup = async (req, res) => {
  try {
    const {
      companyName,
      companyEmail,
      adminName,
      adminEmail,
      adminPassword
    } = req.body;

    const existingCompany =
      await Company.countDocuments();

    const existingAdmin =
      await User.countDocuments({
        role: "admin"
      });

    if (existingCompany > 0 || existingAdmin > 0) {
      return res.status(409).json({
        success: false,
        message: "Initial setup has already been completed"
      });
    }

    if (
      !companyName ||
      !adminName ||
      !adminEmail ||
      !adminPassword
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided"
      });
    }

    if (adminPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters"
      });
    }

    const company = await Company.create({
      name: companyName,
      email: companyEmail || ""
    });

    const admin = await User.create({
      name: adminName,
      email: adminEmail,
      password: adminPassword,
      role: "admin",
      mustChangePassword: false
    });

    const token = generateToken(admin);

    res.status(201).json({
      success: true,
      message: "Company and Admin created successfully",

      company,

      token,

      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email already exists"
      });
    }

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};