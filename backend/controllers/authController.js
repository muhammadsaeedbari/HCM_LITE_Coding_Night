import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Company from '../models/Company.js';
import Employee from '../models/Employee.js';

const createToken = (user) => {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      companyId: user.companyId.toString(),
    },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
};

const publicUser = (user, extra = {}) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  companyId: user.companyId,
  mustChangePassword: user.mustChangePassword,
  ...extra,
});

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select('+password');

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const token = createToken(user);
    const company = await Company.findById(user.companyId).select('name');
    const employee =
      user.role === 'employee'
        ? await Employee.findOne({ userId: user._id, companyId: user.companyId })
            .populate('departmentId', 'name')
            .populate('designationId', 'title')
        : null;

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: publicUser(user, {
        companyName: company?.name || 'HCM Lite',
        employeeId: employee?._id || null,
        department: employee?.departmentId?.name || null,
      }),
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const company = await Company.findById(req.user.companyId).select('name');
    const employee =
      req.user.role === 'employee'
        ? await Employee.findOne({
            userId: req.user._id,
            companyId: req.user.companyId,
          })
            .populate('departmentId', 'name')
            .populate('designationId', 'title')
        : null;

    return res.status(200).json({
      success: true,
      user: publicUser(req.user, {
        companyName: company?.name || 'HCM Lite',
        employeeId: employee?._id || null,
        employee,
      }),
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (
      typeof currentPassword !== 'string' ||
      typeof newPassword !== 'string' ||
      !currentPassword ||
      !newPassword
    ) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required.',
      });
    }

    if (newPassword.length < 6 || newPassword.length > 72) {
      return res.status(400).json({
        success: false,
        message: 'New password must be between 6 and 72 characters.',
      });
    }

    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    const matches = await bcrypt.compare(currentPassword, user.password);
    if (!matches) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect.',
      });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    user.mustChangePassword = false;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password updated successfully.',
    });
  } catch (error) {
    next(error);
  }
};
