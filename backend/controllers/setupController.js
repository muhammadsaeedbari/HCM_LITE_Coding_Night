
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Company from '../models/Company.js';
import User from '../models/User.js';

export const getSetupStatus = async (req, res, next) => {
  try {
    const adminExists = await User.exists({ role: 'admin' });

    return res.status(200).json({
      success: true,
      setupRequired: !adminExists,
    });
  } catch (error) {
    next(error);
  }
};

export const createInitialAdmin = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    const { companyName, name, email, password } = req.body;

    if (
      typeof companyName !== 'string' ||
      typeof name !== 'string' ||
      typeof email !== 'string' ||
      typeof password !== 'string'
    ) {
      return res.status(400).json({
        success: false,
        message: 'Company name, name, email and password are required.',
      });
    }

    const normalizedCompanyName = companyName.trim();
    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (
      !normalizedCompanyName ||
      normalizedCompanyName.length > 150 ||
      !normalizedName ||
      normalizedName.length > 100
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid company and admin names.',
      });
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
    }

    if (password.length < 8 || password.length > 72) {
      return res.status(400).json({
        success: false,
        message: 'Password must be between 8 and 72 characters.',
      });
    }

    await session.withTransaction(async () => {
      const adminExists = await User.exists({ role: 'admin' }).session(session);
      const companyExists = await Company.exists({}).session(session);

      if (adminExists || companyExists) {
        const error = new Error(
          'Initial setup has already been completed.'
        );
        error.statusCode = 409;
        throw error;
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const [company] = await Company.create(
        [
          {
            name: normalizedCompanyName,
            setupCompleted: true,
          },
        ],
        { session }
      );

      const [admin] = await User.create(
        [
          {
            name: normalizedName,
            email: normalizedEmail,
            password: hashedPassword,
            role: 'admin',
            companyId: company._id,
            mustChangePassword: false,
          },
        ],
        { session }
      );

      return {
        companyId: company._id,
        companyName: company.name,
        adminId: admin._id,
        adminName: admin.name,
        adminEmail: admin.email,
        adminRole: admin.role,
      };
    });

    return res.status(201).json({
      success: true,
      message: 'Company and initial Admin account created successfully.',
    });
  } catch (error) {
    if (error.statusCode === 409 || error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          'Initial setup is already completed or this email is already registered.',
      });
    }

    next(error);
  } finally {
    await session.endSession();
  }
};
