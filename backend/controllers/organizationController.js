

import Department from '../models/Department.js';
import Designation from '../models/Designation.js';
import Employee from '../models/Employee.js';

const fail = (res, status, message) =>
  res.status(status).json({ success: false, message });

const validId = (id) => /^[a-f\d]{24}$/i.test(String(id));

export const listDepartments = async (req, res, next) => {
  try {
    const items = await Department.find({
      companyId: req.user.companyId,
    }).sort({ name: 1 });

    res.json({ success: true, data: items });
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

    res.status(201).json({ success: true, data: item });
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
    res.json({ success: true, data: item });
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

    res.json({ success: true, data: items });
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

    res.status(201).json({ success: true, data: item });
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
    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

export const listEmployees = async (req, res, next) => {
  try {
    const items = await Employee.find({
      companyId: req.user.companyId,
    })
      .select('-basicSalary -emergencyContact')
      .populate('departmentId', 'name')
      .populate('designationId', 'title')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: items });
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
      Number(basicSalary) < 0
    ) {
      return fail(res, 400, 'Please provide all required employee fields.');
    }

    const companyId = req.user.companyId;

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

    const employee = await Employee.create({
      employeeCode,
      companyId,
      departmentId,
      designationId,
      firstName,
      lastName,
      email,
      phone,
      dateOfJoining,
      employmentType,
      basicSalary: Number(basicSalary),
      address,
      emergencyContact,
    });

    res.status(201).json({
      success: true,
      message: 'Employee created. Login account can be created separately.',
      data: employee,
    });
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
      if (field in req.body) changes[field] = req.body[field];
    }

    if (req.body.email !== undefined) {
      if (typeof req.body.email !== 'string' || !req.body.email.trim()) {
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

    const existing = await Employee.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    });

    if (!existing) return fail(res, 404, 'Employee not found.');

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
    );

    res.json({ success: true, data: item });
  } catch (error) {
    if (error.code === 11000) {
      return fail(res, 409, 'Employee code or email already exists.');
    }
    next(error);
  }
};

