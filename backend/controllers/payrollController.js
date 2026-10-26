import mongoose from 'mongoose';
import Employee from '../models/Employee.js';
import Payroll from '../models/Payroll.js';
import Company from '../models/Company.js';
import Attendance from '../models/Attendance.js';
import Leave from '../models/Leave.js';

const getMonthDates = (period, weekendDays = [6, 0]) => {
  const [year, month] = period.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const workingDateStrings = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, month - 1, d);
    if (!weekendDays.includes(dt.getDay())) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      workingDateStrings.push(dateStr);
    }
  }

  return {
    year,
    month,
    daysInMonth,
    workingDateStrings,
    totalWorkingDays: Math.max(1, workingDateStrings.length),
  };
};

export const calculateMonthlyAttendanceStats = async ({
  companyId,
  employeeId,
  period,
  basicSalary,
  weekendDays = [6, 0],
}) => {
  const { year, month, workingDateStrings, totalWorkingDays } = getMonthDates(
    period,
    weekendDays
  );

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);

  const [attendances, approvedLeaves] = await Promise.all([
    Attendance.find({
      companyId,
      employeeId,
      date: { $regex: `^${period}-` },
    }),
    Leave.find({
      companyId,
      employeeId,
      status: 'approved',
      startDate: { $lte: monthEnd },
      endDate: { $gte: monthStart },
    }),
  ]);

  const attendanceByDate = new Map();
  for (const att of attendances) {
    attendanceByDate.set(att.date, att);
  }

  const leaveDateSet = new Set();
  const unpaidLeaveDateSet = new Set();

  for (const lv of approvedLeaves) {
    const cur = new Date(lv.startDate);
    const end = new Date(lv.endDate);
    cur.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    while (cur <= end) {
      if (
        cur.getFullYear() === year &&
        cur.getMonth() === month - 1 &&
        !weekendDays.includes(cur.getDay())
      ) {
        const ds = `${year}-${String(month).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
        leaveDateSet.add(ds);
        if (lv.leaveType === 'unpaid') {
          unpaidLeaveDateSet.add(ds);
        }
      }
      cur.setDate(cur.getDate() + 1);
    }
  }

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  let presentDays = 0;
  let halfDays = 0;
  let absentDays = 0;
  let leaveDays = leaveDateSet.size;

  for (const dateStr of workingDateStrings) {
    const att = attendanceByDate.get(dateStr);
    if (att) {
      if (att.status === 'half-day') {
        halfDays += 1;
      } else if (att.status === 'absent') {
        absentDays += 1;
      } else {
        presentDays += 1;
      }
    } else if (leaveDateSet.has(dateStr)) {
      if (unpaidLeaveDateSet.has(dateStr)) {
        absentDays += 1;
      }
    } else if (dateStr <= todayStr) {
      // Only count past/today working days with no attendance or approved leave as absent
      // IF employee has already joined on or before that day
      absentDays += 1;
    }
  }

  const perDaySalary = Number((basicSalary / totalWorkingDays).toFixed(2));
  const attendanceDeduction = Math.round(
    perDaySalary * (absentDays + 0.5 * halfDays)
  );

  return {
    workingDays: totalWorkingDays,
    presentDays,
    halfDays,
    absentDays,
    leaveDays,
    perDaySalary,
    attendanceDeduction,
  };
};

export const listPayroll = async (req, res, next) => {
  try {
    const filter = { companyId: req.user.companyId };
    const company = await Company.findById(req.user.companyId).select(
      'name officeStartTime graceMinutes leaveQuota weekendDays'
    );

    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({
        companyId: req.user.companyId,
        userId: req.user._id,
      }).select('_id');

      if (!employee) {
        return res.status(200).json({
          success: true,
          count: 0,
          payrolls: [],
          data: [],
          company,
        });
      }

      filter.employeeId = employee._id;
    } else if (req.query.employeeId) {
      if (!mongoose.isValidObjectId(req.query.employeeId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid employee ID.',
        });
      }
      filter.employeeId = req.query.employeeId;
    }

    if (req.query.period) filter.period = req.query.period;

    const payrolls = await Payroll.find(filter)
      .populate({
        path: 'employeeId',
        select:
          'employeeCode firstName lastName email departmentId designationId dateOfJoining basicSalary',
        populate: [
          { path: 'departmentId', select: 'name' },
          { path: 'designationId', select: 'title' },
        ],
      })
      .sort({ period: -1, createdAt: -1 });

    res.json({
      success: true,
      count: payrolls.length,
      payrolls,
      data: payrolls,
      company,
    });
  } catch (error) {
    next(error);
  }
};

export const previewPayrollCalculation = async (req, res, next) => {
  try {
    const { employeeId, period } = req.query;
    if (
      !mongoose.isValidObjectId(employeeId) ||
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(period || '')
    ) {
      return res.status(400).json({
        success: false,
        message: 'Valid employeeId and period (YYYY-MM) are required.',
      });
    }

    const employee = await Employee.findOne({
      _id: employeeId,
      companyId: req.user.companyId,
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found.',
      });
    }

    const company = await Company.findById(req.user.companyId);
    const weekendDays = company?.weekendDays?.length ? company.weekendDays : [6, 0];

    const stats = await calculateMonthlyAttendanceStats({
      companyId: req.user.companyId,
      employeeId: employee._id,
      period,
      basicSalary: employee.basicSalary,
      weekendDays,
    });

    res.json({
      success: true,
      data: {
        basicSalary: employee.basicSalary,
        ...stats,
        netSalary: Math.max(0, employee.basicSalary - stats.attendanceDeduction),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createPayroll = async (req, res, next) => {
  try {
    const {
      employeeId,
      period,
      allowances = 0,
      deductions,
      autoCalculate = true,
      absentDays: manualAbsentDays,
      halfDays: manualHalfDays,
    } = req.body;

    if (!mongoose.isValidObjectId(employeeId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid employee ID is required.',
      });
    }

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period || '')) {
      return res.status(400).json({
        success: false,
        message: 'Period must use YYYY-MM format.',
      });
    }

    const employee = await Employee.findOne({
      _id: employeeId,
      companyId: req.user.companyId,
      status: 'active',
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Active employee not found in your company.',
      });
    }

    const company = await Company.findById(req.user.companyId);
    const weekendDays = company?.weekendDays?.length ? company.weekendDays : [6, 0];

    const stats = await calculateMonthlyAttendanceStats({
      companyId: req.user.companyId,
      employeeId: employee._id,
      period,
      basicSalary: employee.basicSalary,
      weekendDays,
    });

    const finalAbsentDays =
      manualAbsentDays !== undefined && manualAbsentDays !== ''
        ? Math.max(0, Number(manualAbsentDays))
        : stats.absentDays;

    const finalHalfDays =
      manualHalfDays !== undefined && manualHalfDays !== ''
        ? Math.max(0, Number(manualHalfDays))
        : stats.halfDays;

    const computedAttendanceDeduction = Math.round(
      stats.perDaySalary * (finalAbsentDays + 0.5 * finalHalfDays)
    );

    const extraDeductions =
      deductions !== undefined && deductions !== '' && !autoCalculate
        ? Number(deductions)
        : Number(deductions || 0);

    const totalDeductions = autoCalculate
      ? computedAttendanceDeduction + extraDeductions
      : Number(deductions || 0);

    if (
      !Number.isFinite(Number(allowances)) ||
      !Number.isFinite(totalDeductions) ||
      Number(allowances) < 0 ||
      totalDeductions < 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Allowances and deductions must be non-negative numbers.',
      });
    }

    const basicSalary = employee.basicSalary;
    const grossSalary = basicSalary + Number(allowances);
    const netSalary = Math.max(0, Math.round(grossSalary - totalDeductions));

    const payroll = await Payroll.findOneAndUpdate(
      {
        companyId: req.user.companyId,
        employeeId: employee._id,
        period,
      },
      {
        $set: {
          workingDays: stats.workingDays,
          presentDays: stats.presentDays,
          absentDays: finalAbsentDays,
          halfDays: finalHalfDays,
          leaveDays: stats.leaveDays,
          perDaySalary: stats.perDaySalary,
          attendanceDeduction: computedAttendanceDeduction,
          basicSalary,
          allowances: Number(allowances),
          deductions: Math.round(totalDeductions),
          grossSalary,
          netSalary,
          processedBy: req.user._id,
        },
        $setOnInsert: {
          status: 'draft',
        },
      },
      { new: true, upsert: true, runValidators: true }
    ).populate({
      path: 'employeeId',
      select: 'employeeCode firstName lastName email departmentId designationId',
      populate: [
        { path: 'departmentId', select: 'name' },
        { path: 'designationId', select: 'title' },
      ],
    });

    res.status(201).json({
      success: true,
      message: 'Payslip calculated and saved.',
      payroll,
      data: payroll,
    });
  } catch (error) {
    next(error);
  }
};

export const updatePayrollStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!['approved', 'paid'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be approved or paid.',
      });
    }

    const payroll = await Payroll.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    });

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Payroll record not found.',
      });
    }

    if (
      (status === 'approved' && payroll.status !== 'draft') ||
      (status === 'paid' && payroll.status !== 'approved')
    ) {
      return res.status(400).json({
        success: false,
        message: 'Payroll must move from draft to approved to paid.',
      });
    }

    payroll.status = status;
    if (status === 'paid') payroll.paidAt = new Date();

    await payroll.save();

    res.json({
      success: true,
      message: `Payroll marked ${status}.`,
      payroll,
      data: payroll,
    });
  } catch (error) {
    next(error);
  }
};
