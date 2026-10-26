import Attendance from '../models/Attendance.js';
import Company from '../models/Company.js';
import Employee from '../models/Employee.js';

const validId = (id) => /^[a-f\d]{24}$/i.test(String(id));

const getToday = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isLateCheckIn = (checkInDate, officeStartTime = '09:00', graceMinutes = 15) => {
  const [startHour, startMinute] = String(officeStartTime)
    .split(':')
    .map((n) => Number(n) || 0);
  const cutoffMinutes = startHour * 60 + startMinute + (Number(graceMinutes) || 0);
  const actualMinutes = checkInDate.getHours() * 60 + checkInDate.getMinutes();
  return actualMinutes > cutoffMinutes;
};

export const listAttendance = async (req, res, next) => {
  try {
    const filter = { companyId: req.user.companyId };

    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({
        userId: req.user._id,
        companyId: req.user.companyId,
      });

      if (!employee) {
        return res.status(200).json({
          success: true,
          data: [],
          attendance: [],
          records: [],
          message: 'Employee profile not linked yet.',
        });
      }

      filter.employeeId = employee._id;
    } else if (req.query.employeeId) {
      if (!validId(req.query.employeeId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid employee ID.',
        });
      }

      filter.employeeId = req.query.employeeId;
    }

    if (req.query.date) filter.date = req.query.date;

    const records = await Attendance.find(filter)
      .populate({
        path: 'employeeId',
        select: 'employeeCode firstName lastName email departmentId',
        populate: { path: 'departmentId', select: 'name' },
      })
      .sort({ date: -1, createdAt: -1 })
      .limit(300);

    res.json({
      success: true,
      data: records,
      attendance: records,
      records,
    });
  } catch (error) {
    next(error);
  }
};

export const checkIn = async (req, res, next) => {
  try {
    let employeeId = req.body.employeeId;

    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({
        userId: req.user._id,
        companyId: req.user.companyId,
        status: 'active',
      });

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Active employee profile not found.',
        });
      }

      employeeId = employee._id;
    }

    if (!validId(employeeId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid employeeId is required.',
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
        message: 'Employee not found in your company.',
      });
    }

    const date = getToday();

    const existing = await Attendance.findOne({
      companyId: req.user.companyId,
      employeeId,
      date,
    });

    if (existing?.checkIn) {
      return res.status(409).json({
        success: false,
        message: 'Employee has already checked in today.',
      });
    }

    const company = await Company.findById(req.user.companyId);
    const now = new Date();
    const late = isLateCheckIn(
      now,
      company?.officeStartTime || '09:00',
      company?.graceMinutes ?? 15
    );
    const status = late ? 'late' : 'present';

    const record = await Attendance.findOneAndUpdate(
      { companyId: req.user.companyId, employeeId, date },
      {
        $set: {
          checkIn: now,
          status,
          notes: req.body.notes ? String(req.body.notes).slice(0, 500) : '',
        },
        $setOnInsert: {
          companyId: req.user.companyId,
          employeeId,
          date,
        },
      },
      { new: true, upsert: true, runValidators: true }
    ).populate('employeeId', 'employeeCode firstName lastName email');

    res.status(201).json({
      success: true,
      message: late
        ? `Check-in recorded as LATE (after ${company?.officeStartTime || '09:00'} + ${company?.graceMinutes ?? 15}m grace).`
        : 'Check-in recorded as PRESENT.',
      data: record,
      record,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Attendance already exists for today.',
      });
    }
    next(error);
  }
};

export const checkOut = async (req, res, next) => {
  try {
    let employeeId = req.body.employeeId;

    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({
        userId: req.user._id,
        companyId: req.user.companyId,
      });

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee profile not found.',
        });
      }

      employeeId = employee._id;
    }

    if (!validId(employeeId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid employeeId is required.',
      });
    }

    const record = await Attendance.findOne({
      companyId: req.user.companyId,
      employeeId,
      date: getToday(),
    });

    if (!record?.checkIn) {
      return res.status(400).json({
        success: false,
        message: 'Check-in is required before check-out.',
      });
    }

    if (record.checkOut) {
      return res.status(409).json({
        success: false,
        message: 'Employee has already checked out.',
      });
    }

    const company = await Company.findById(req.user.companyId);
    const halfDayThreshold = company?.halfDayHours ?? 5;

    const now = new Date();
    const diffMs = Math.max(0, now.getTime() - new Date(record.checkIn).getTime());
    const workHours = Number((diffMs / (1000 * 60 * 60)).toFixed(2));

    record.checkOut = now;
    record.workHours = workHours;

    if (workHours < halfDayThreshold) {
      record.status = 'half-day';
    }

    await record.save();
    await record.populate('employeeId', 'employeeCode firstName lastName email');

    res.json({
      success: true,
      message:
        record.status === 'half-day'
          ? `Check-out recorded (${workHours} hrs — marked as Half Day since under ${halfDayThreshold} hrs).`
          : `Check-out recorded (${workHours} hrs worked).`,
      data: record,
      record,
    });
  } catch (error) {
    next(error);
  }
};
