import Leave from '../models/Leave.js';
import Employee from '../models/Employee.js';
import Company from '../models/Company.js';

const validId = (id) => /^[a-f\d]{24}$/i.test(String(id));

async function getEmployeeForUser(user) {
  return Employee.findOne({
    userId: user._id,
    companyId: user.companyId,
  });
}

export const countWorkingDays = (startDate, endDate, weekendDays = [6, 0]) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  let count = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    if (!weekendDays.includes(cursor.getDay())) {
      count += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
};

export const listLeaves = async (req, res, next) => {
  try {
    const filter = { companyId: req.user.companyId };
    const company = await Company.findById(req.user.companyId);
    const quota = company?.leaveQuota ?? 20;
    const weekendDays = company?.weekendDays?.length ? company.weekendDays : [6, 0];

    let targetEmployeeId = null;

    if (req.user.role === 'employee') {
      const employee = await getEmployeeForUser(req.user);
      if (!employee) {
        return res.status(200).json({
          success: true,
          data: [],
          leaves: [],
          quota,
          usedDays: 0,
          pendingDays: 0,
          remainingDays: quota,
        });
      }
      filter.employeeId = employee._id;
      targetEmployeeId = employee._id;
    } else if (req.query.employeeId) {
      if (!validId(req.query.employeeId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid employee ID.',
        });
      }
      filter.employeeId = req.query.employeeId;
      targetEmployeeId = req.query.employeeId;
    }

    const rawLeaves = await Leave.find(filter)
      .populate('employeeId', 'employeeCode firstName lastName email')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(200);

    const data = rawLeaves.map((doc) => {
      const obj = doc.toObject();
      if (!obj.days || obj.days < 1) {
        obj.days = Math.max(
          1,
          countWorkingDays(obj.startDate, obj.endDate, weekendDays)
        );
      }
      return obj;
    });

    // Compute leave balance for the current year
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    const yearEnd = new Date(new Date().getFullYear(), 11, 31, 23, 59, 59);

    let usedDays = 0;
    let pendingDays = 0;

    if (targetEmployeeId) {
      for (const lv of data) {
        const st = new Date(lv.startDate);
        if (st >= yearStart && st <= yearEnd && lv.leaveType !== 'unpaid') {
          if (lv.status === 'approved') usedDays += lv.days || 1;
          if (lv.status === 'pending') pendingDays += lv.days || 1;
        }
      }
    }

    const remainingDays = Math.max(0, quota - usedDays);

    res.json({
      success: true,
      data,
      leaves: data,
      quota,
      usedDays,
      pendingDays,
      remainingDays,
    });
  } catch (error) {
    next(error);
  }
};

export const applyLeave = async (req, res, next) => {
  try {
    const { leaveType, startDate, endDate, reason } = req.body;
    let employeeId = req.body.employeeId;

    if (req.user.role === 'employee') {
      const employee = await getEmployeeForUser(req.user);
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee profile not found.',
        });
      }
      employeeId = employee._id;
    }

    if (
      !validId(employeeId) ||
      !['annual', 'sick', 'casual', 'unpaid'].includes(leaveType) ||
      !startDate ||
      !endDate ||
      !reason?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid leave details.',
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      start > end
    ) {
      return res.status(400).json({
        success: false,
        message: 'From date must be on or before To date.',
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
        message: 'Active employee not found.',
      });
    }

    const company = await Company.findById(req.user.companyId);
    const weekendDays = company?.weekendDays?.length ? company.weekendDays : [6, 0];
    const quota = company?.leaveQuota ?? 20;

    const days = countWorkingDays(start, end, weekendDays);
    if (days <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Selected dates fall entirely on weekend/non-working days.',
      });
    }

    const overlap = await Leave.findOne({
      companyId: req.user.companyId,
      employeeId,
      status: { $in: ['pending', 'approved'] },
      startDate: { $lte: end },
      endDate: { $gte: start },
    });

    if (overlap) {
      return res.status(409).json({
        success: false,
        message: 'Leave dates overlap with an existing pending or approved leave.',
      });
    }

    if (leaveType !== 'unpaid') {
      const yearStart = new Date(start.getFullYear(), 0, 1);
      const yearEnd = new Date(start.getFullYear(), 11, 31, 23, 59, 59);
      const existingLeaves = await Leave.find({
        companyId: req.user.companyId,
        employeeId,
        leaveType: { $ne: 'unpaid' },
        status: { $in: ['approved', 'pending'] },
        startDate: { $gte: yearStart, $lte: yearEnd },
      });

      const usedOrPending = existingLeaves.reduce(
        (sum, item) =>
          sum +
          (item.days || countWorkingDays(item.startDate, item.endDate, weekendDays)),
        0
      );

      if (usedOrPending + days > quota) {
        return res.status(400).json({
          success: false,
          message: `Cannot exceed yearly leave quota (${quota} days). Used/pending: ${usedOrPending} days, requested: ${days} working days.`,
        });
      }
    }

    const data = await Leave.create({
      companyId: req.user.companyId,
      employeeId,
      leaveType,
      startDate: start,
      endDate: end,
      days,
      reason: reason.trim(),
    });

    await data.populate('employeeId', 'employeeCode firstName lastName email');

    res.status(201).json({
      success: true,
      message: `Leave request submitted (${days} working day${days > 1 ? 's' : ''}).`,
      data,
      leave: data,
    });
  } catch (error) {
    next(error);
  }
};

export const reviewLeave = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid leave ID.',
      });
    }

    const { status, reviewNote = '' } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be approved or rejected.',
      });
    }

    const leave = await Leave.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    });

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found.',
      });
    }

    if (leave.status !== 'pending') {
      return res.status(409).json({
        success: false,
        message: 'This request has already been reviewed.',
      });
    }

    if (status === 'approved') {
      const overlap = await Leave.findOne({
        _id: { $ne: leave._id },
        companyId: leave.companyId,
        employeeId: leave.employeeId,
        status: 'approved',
        startDate: { $lte: leave.endDate },
        endDate: { $gte: leave.startDate },
      });

      if (overlap) {
        return res.status(409).json({
          success: false,
          message: 'An approved leave already overlaps these dates.',
        });
      }
    }

    leave.status = status;
    leave.reviewedBy = req.user._id;
    leave.reviewedAt = new Date();
    leave.reviewNote = String(reviewNote).slice(0, 500);

    await leave.save();
    await leave.populate('employeeId', 'employeeCode firstName lastName email');
    await leave.populate('reviewedBy', 'name');

    res.json({
      success: true,
      message: `Leave request ${status}.`,
      data: leave,
      leave,
    });
  } catch (error) {
    next(error);
  }
};
