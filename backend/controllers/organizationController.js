import bcrypt from 'bcryptjs';
import Company from '../models/Company.js';
import Department from '../models/Department.js';
import Designation from '../models/Designation.js';
import Employee from '../models/Employee.js';
import User from '../models/User.js';

const fail = (res, status, message) =>
  res.status(status).json({ success: false, message });

const validId = (id) => /^[a-f\d]{24}$/i.test(String(id));

export const getCompanySettings = async (req, res, next) => {
  try {
    const company = await Company.findById(req.user.companyId);
    if (!company) return fail(res, 404, 'Company settings not found.');

    res.json({
      success: true,
      data: company,
      settings: company,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCompanySettings = async (req, res, next) => {
  try {
    const {
      name,
      officeStartTime,
      graceMinutes,
      halfDayHours,
      leaveQuota,
      weekendDays,
      officeLocation,
    } = req.body;

    const updates = {};

    if (typeof name === 'string' && name.trim()) {
      updates.name = name.trim();
    }

    if (typeof officeStartTime === 'string') {
      if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(officeStartTime.trim())) {
        return fail(res, 400, 'Office start time must use HH:MM (24-hour) format.');
      }
      updates.officeStartTime = officeStartTime.trim();
    }

    if (graceMinutes !== undefined) {
      const gm = Number(graceMinutes);
      if (!Number.isFinite(gm) || gm < 0 || gm > 240) {
        return fail(res, 400, 'Grace minutes must be between 0 and 240.');
      }
      updates.graceMinutes = gm;
    }

    if (halfDayHours !== undefined) {
      const hdh = Number(halfDayHours);
      if (!Number.isFinite(hdh) || hdh <= 0 || hdh > 12) {
        return fail(res, 400, 'Half-day hours must be between 1 and 12.');
      }
      updates.halfDayHours = hdh;
    }

    if (leaveQuota !== undefined) {
      const lq = Number(leaveQuota);
      if (!Number.isFinite(lq) || lq < 0 || lq > 365) {
        return fail(res, 400, 'Yearly leave quota must be between 0 and 365.');
      }
      updates.leaveQuota = lq;
    }

    if (Array.isArray(weekendDays)) {
      const normalized = weekendDays
        .map((d) => Number(d))
        .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
      updates.weekendDays = [...new Set(normalized)];
    }

    if (officeLocation && typeof officeLocation === 'object') {
      updates.officeLocation = {
        latitude:
          officeLocation.latitude !== undefined && officeLocation.latitude !== ''
            ? Number(officeLocation.latitude)
            : null,
        longitude:
          officeLocation.longitude !== undefined && officeLocation.longitude !== ''
            ? Number(officeLocation.longitude)
            : null,
        radiusMeters:
          officeLocation.radiusMeters !== undefined
            ? Math.max(10, Number(officeLocation.radiusMeters) || 150)
            : 150,
      };
    }

    const company = await Company.findByIdAndUpdate(
      req.user.companyId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!company) return fail(res, 404, 'Company not found.');

    res.json({
      success: true,
      message: 'Company settings updated successfully.',
      data: company,
      settings: company,
    });
  } catch (error) {
    next(error);
  }
};

export const listDepartments = async (req, res, next) => {
  try {
    const items = await Department.find({
      companyId: req.user.companyId,
    }).sort({ name: 1 });

    res.json({ success: true, data: items, departments: items });
  } catch (error) {
    next(error);
  }
};

export const createDepartment = async (req, res, next) => {
  try {
    const name = req.body.name?.trim();

    if (!name) return fail(res, 400, 'Department name is required.');

    const item = await Department.create({
      name,
      description: req.body.description || '',
      companyId: req.user.companyId,
    });

    res.status(201).json({ success: true, data: item, department: item });
  } catch (error) {
    if (error.code === 11000) {
      return fail(res, 409, 'Department already exists.');
    }
    next(error);
  }
};

export const updateDepartment = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return fail(res, 400, 'Invalid department ID.');

    const item = await Department.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId },
      {
        ...(typeof req.body.name === 'string' && { name: req.body.name.trim() }),
        ...(typeof req.body.description === 'string' && {
          description: req.body.description,
        }),
        ...(typeof req.body.isActive === 'boolean' && {
          isActive: req.body.isActive,
        }),
      },
      { new: true, runValidators: true }
    );

    if (!item) return fail(res, 404, 'Department not found.');
    res.json({ success: true, data: item, department: item });
  } catch (error) {
    next(error);
  }
};

export const listDesignations = async (req, res, next) => {
  try {
    const items = await Designation.find({
      companyId: req.user.companyId,
    })
      .populate('departmentId', 'name')
      .sort({ title: 1 });

    res.json({ success: true, data: items, designations: items });
  } catch (error) {
    next(error);
  }
};

export const createDesignation = async (req, res, next) => {
  try {
    const { title, departmentId, description = '' } = req.body;

    if (!title?.trim() || !validId(departmentId)) {
      return fail(res, 400, 'Valid title and departmentId are required.');
    }

    const department = await Department.findOne({
      _id: departmentId,
      companyId: req.user.companyId,
      isActive: true,
    });

    if (!department) return fail(res, 400, 'Invalid department.');

    const item = await Designation.create({
      title: title.trim(),
      departmentId,
      description,
      companyId: req.user.companyId,
    });

    res.status(201).json({ success: true, data: item, designation: item });
  } catch (error) {
    if (error.code === 11000) {
      return fail(res, 409, 'Designation already exists in this department.');
    }
    next(error);
  }
};

export const updateDesignation = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return fail(res, 400, 'Invalid designation ID.');

    const changes = {};
    for (const field of ['title', 'description', 'isActive']) {
      if (field in req.body) changes[field] = req.body[field];
    }

    if (req.body.departmentId !== undefined) {
      if (!validId(req.body.departmentId)) {
        return fail(res, 400, 'Invalid department ID.');
      }

      const department = await Department.findOne({
        _id: req.body.departmentId,
        companyId: req.user.companyId,
        isActive: true,
      });

      if (!department) return fail(res, 400, 'Invalid department.');
      changes.departmentId = department._id;
    }

    const item = await Designation.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId },
      changes,
      { new: true, runValidators: true }
    );

    if (!item) return fail(res, 404, 'Designation not found.');
    res.json({ success: true, data: item, designation: item });
  } catch (error) {
    next(error);
  }
};

export const listEmployees = async (req, res, next) => {
  try {
    const filter = { companyId: req.user.companyId };
    if (req.user.role === 'employee') {
      filter.userId = req.user._id;
    }

    const items = await Employee.find(filter)
      .populate('departmentId', 'name')
      .populate('designationId', 'title')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: items, employees: items });
  } catch (error) {
    next(error);
  }
};

export const createEmployee = async (req, res, next) => {
  try {
    const {
      employeeCode,
      departmentId,
      designationId,
      firstName,
      lastName,
      email,
      password,
      phone = '',
      dateOfJoining,
      employmentType = 'full-time',
      basicSalary,
      address = '',
      emergencyContact = {},
    } = req.body;

    if (
      !employeeCode?.trim() ||
      !firstName?.trim() ||
      !lastName?.trim() ||
      !email?.trim() ||
      !validId(departmentId) ||
      !validId(designationId) ||
      !dateOfJoining ||
      basicSalary === undefined ||
      !Number.isFinite(Number(basicSalary)) ||
      Number(basicSalary) <= 0
    ) {
      return fail(
        res,
        400,
        'Please provide all required fields and ensure basic salary is greater than 0.'
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(normalizedEmail)) {
      return fail(res, 400, 'Please enter a valid email address.');
    }

    const rawPassword =
      typeof password === 'string' && password.trim().length >= 6
        ? password.trim()
        : 'Employee@123';

    const companyId = req.user.companyId;

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return fail(res, 409, 'Email address is already used by another user.');
    }

    const department = await Department.findOne({
      _id: departmentId,
      companyId,
      isActive: true,
    });

    const designation = await Designation.findOne({
      _id: designationId,
      companyId,
      departmentId,
      isActive: true,
    });

    if (!department || !designation) {
      return fail(res, 400, 'Department or designation is invalid.');
    }

    const hashedPassword = await bcrypt.hash(rawPassword, 12);

    const newUser = await User.create({
      name: `${firstName.trim()} ${lastName.trim()}`.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: 'employee',
      companyId,
      mustChangePassword: false,
      isActive: true,
    });

    try {
      const employee = await Employee.create({
        employeeCode: employeeCode.trim().toUpperCase(),
        userId: newUser._id,
        companyId,
        departmentId,
        designationId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: normalizedEmail,
        phone,
        dateOfJoining,
        employmentType,
        basicSalary: Number(basicSalary),
        address,
        emergencyContact,
      });

      const populated = await Employee.findById(employee._id)
        .populate('departmentId', 'name')
        .populate('designationId', 'title');

      res.status(201).json({
        success: true,
        message: `Employee and login account created (${normalizedEmail}).`,
        data: populated,
        employee: populated,
      });
    } catch (empError) {
      await User.findByIdAndDelete(newUser._id);
      throw empError;
    }
  } catch (error) {
    if (error.code === 11000) {
      return fail(res, 409, 'Employee code or email already exists.');
    }
    next(error);
  }
};

export const updateEmployee = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return fail(res, 400, 'Invalid employee ID.');

    const existing = await Employee.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    });

    if (!existing) return fail(res, 404, 'Employee not found.');

    const allowedFields = [
      'employeeCode',
      'firstName',
      'lastName',
      'phone',
      'dateOfJoining',
      'employmentType',
      'status',
      'address',
      'basicSalary',
      'emergencyContact',
    ];

    const changes = {};
    for (const field of allowedFields) {
      if (field in req.body) {
        if (field === 'basicSalary') {
          const sal = Number(req.body.basicSalary);
          if (!Number.isFinite(sal) || sal <= 0) {
            return fail(res, 400, 'Salary must be greater than 0.');
          }
          changes.basicSalary = sal;
        } else {
          changes[field] = req.body[field];
        }
      }
    }

    if (req.body.email !== undefined) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (
        typeof req.body.email !== 'string' ||
        !emailPattern.test(req.body.email.trim().toLowerCase())
      ) {
        return fail(res, 400, 'Valid email is required.');
      }
      changes.email = req.body.email.trim().toLowerCase();
    }

    for (const field of ['departmentId', 'designationId']) {
      if (req.body[field] !== undefined) {
        if (!validId(req.body[field])) {
          return fail(res, 400, `Invalid ${field}.`);
        }
        changes[field] = req.body[field];
      }
    }

    const departmentId = changes.departmentId || existing.departmentId;
    const designationId = changes.designationId || existing.designationId;

    if (changes.departmentId || changes.designationId) {
      const designation = await Designation.findOne({
        _id: designationId,
        departmentId,
        companyId: req.user.companyId,
        isActive: true,
      });

      if (!designation) {
        return fail(res, 400, 'Designation must belong to the selected department.');
      }
    }

    const item = await Employee.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId },
      changes,
      { new: true, runValidators: true }
    )
      .populate('departmentId', 'name')
      .populate('designationId', 'title');

    // Sync linked User login (or create one if missing)
    const userUpdates = {
      name: `${item.firstName} ${item.lastName}`.trim(),
      email: item.email,
      isActive: item.status === 'active',
    };

    if (typeof req.body.password === 'string' && req.body.password.trim().length >= 6) {
      userUpdates.password = await bcrypt.hash(req.body.password.trim(), 12);
    }

    if (item.userId) {
      await User.findByIdAndUpdate(item.userId, userUpdates);
    } else if (userUpdates.password) {
      const createdUser = await User.create({
        ...userUpdates,
        role: 'employee',
        companyId: req.user.companyId,
        mustChangePassword: false,
      });
      item.userId = createdUser._id;
      await item.save();
    }

    res.json({
      success: true,
      message: 'Employee updated successfully.',
      data: item,
      employee: item,
    });
  } catch (error) {
    if (error.code === 11000) {
      return fail(res, 409, 'Employee code or email already exists.');
    }
    next(error);
  }
};

export const deleteEmployee = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return fail(res, 400, 'Invalid employee ID.');

    const existing = await Employee.findOneAndDelete({
      _id: req.params.id,
      companyId: req.user.companyId,
    });

    if (!existing) return fail(res, 404, 'Employee not found.');

    if (existing.userId) {
      await User.findOneAndDelete({
        _id: existing.userId,
        companyId: req.user.companyId,
        role: 'employee',
      });
    }

    res.json({
      success: true,
      message: 'Employee and associated login account deleted.',
    });
  } catch (error) {
    next(error);
  }
};
