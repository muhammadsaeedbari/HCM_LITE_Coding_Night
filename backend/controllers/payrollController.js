


import mongoose from 'mongoose';
import Employee from '../models/Employee.js';
import Payroll from '../models/Payroll.js';

export const listPayroll = async (req, res, next) => {
  try {
    const filter = { companyId: req.user.companyId };

    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({
        companyId: req.user.companyId,
        userId: req.user._id
      }).select('_id');

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee profile not found.'
        });
      }

      filter.employeeId = employee._id;
    } else if (req.query.employeeId) {
      if (!mongoose.isValidObjectId(req.query.employeeId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid employee ID.'
        });
      }
      filter.employeeId = req.query.employeeId;
    }

    if (req.query.period) filter.period = req.query.period;

    const payrolls = await Payroll.find(filter)
      .populate('employeeId', 'employeeCode firstName lastName email')
      .sort({ period: -1, createdAt: -1 });

    res.json({ success: true, count: payrolls.length, payrolls });
  } catch (error) {
    next(error);
  }
};

export const createPayroll = async (req, res, next) => {
  try {
    const { employeeId, period, allowances = 0, deductions = 0 } = req.body;

    if (!mongoose.isValidObjectId(employeeId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid employee ID is required.'
      });
    }

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period || '')) {
      return res.status(400).json({
        success: false,
        message: 'Period must use YYYY-MM format.'
      });
    }

    if (
      !Number.isFinite(Number(allowances)) ||
      !Number.isFinite(Number(deductions)) ||
      Number(allowances) < 0 ||
      Number(deductions) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Allowances and deductions must be non-negative numbers.'
      });
    }

    const employee = await Employee.findOne({
      _id: employeeId,
      companyId: req.user.companyId,
      status: 'active'
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Active employee not found in your company.'
      });
    }

    const basicSalary = employee.basicSalary;
    const grossSalary = basicSalary + Number(allowances);
    const netSalary = grossSalary - Number(deductions);

    if (netSalary < 0) {
      return res.status(400).json({
        success: false,
        message: 'Deductions cannot exceed gross salary.'
      });
    }

    const payroll = await Payroll.create({
      companyId: req.user.companyId,
      employeeId: employee._id,
      period,
      basicSalary,
      allowances: Number(allowances),
      deductions: Number(deductions),
      grossSalary,
      netSalary,
      status: 'draft',
      processedBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Payroll created.',
      payroll
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Payroll already exists for this employee and period.'
      });
    }
    next(error);
  }
};

export const updatePayrollStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!['approved', 'paid'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be approved or paid.'
      });
    }

    const payroll = await Payroll.findOne({
      _id: req.params.id,
      companyId: req.user.companyId
    });

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Payroll record not found.'
      });
    }

    if (
      (status === 'approved' && payroll.status !== 'draft') ||
      (status === 'paid' && payroll.status !== 'approved')
    ) {
      return res.status(400).json({
        success: false,
        message: 'Payroll must move from draft to approved to paid.'
      });
    }

    payroll.status = status;
    if (status === 'paid') payroll.paidAt = new Date();

    await payroll.save();

    res.json({
      success: true,
      message: `Payroll marked ${status}.`,
      payroll
    });
  } catch (error) {
    next(error);
  }
};


