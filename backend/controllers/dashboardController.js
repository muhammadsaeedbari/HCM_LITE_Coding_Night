import Company from '../models/Company.js';
import Employee from '../models/Employee.js';
import Department from '../models/Department.js';
import Attendance from '../models/Attendance.js';
import Leave from '../models/Leave.js';
import Announcement from '../models/Announcement.js';
import { countWorkingDays } from './leaveController.js';

const getTodayStr = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const getDashboardSummary = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const todayStr = getTodayStr();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [company, announcements] = await Promise.all([
      Company.findById(companyId),
      Announcement.find({ companyId })
        .populate('createdBy', 'name role')
        .sort({ createdAt: -1 })
        .limit(5),
    ]);

    const quota = company?.leaveQuota ?? 20;
    const weekendDays = company?.weekendDays?.length ? company.weekendDays : [6, 0];

    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({
        companyId,
        userId: req.user._id,
      })
        .populate('departmentId', 'name')
        .populate('designationId', 'title');

      if (!employee) {
        return res.json({
          success: true,
          role: 'employee',
          company,
          employee: null,
          todayAttendance: null,
          weeklyHours: 0,
          monthlyStats: { present: 0, late: 0, halfDay: 0 },
          leaveBalance: { quota, usedDays: 0, pendingDays: 0, remainingDays: quota },
          recentAttendance: [],
          recentLeaves: [],
          announcements,
        });
      }

      const [recentAttendance, employeeLeaves] = await Promise.all([
        Attendance.find({ companyId, employeeId: employee._id })
          .sort({ date: -1 })
          .limit(30),
        Leave.find({ companyId, employeeId: employee._id })
          .sort({ createdAt: -1 })
          .limit(20),
      ]);

      const todayAttendance =
        recentAttendance.find((a) => a.date === todayStr) || null;

      // Calculate hours worked this week (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 6);
      const weekAgoStr = `${weekAgo.getFullYear()}-${String(weekAgo.getMonth() + 1).padStart(2, '0')}-${String(weekAgo.getDate()).padStart(2, '0')}`;

      const weeklyRecords = recentAttendance.filter((a) => a.date >= weekAgoStr);
      const weeklyHours = Number(
        weeklyRecords
          .reduce((sum, a) => {
            if (a.workHours) return sum + Number(a.workHours);
            if (a.checkIn && a.checkOut) {
              const hrs =
                (new Date(a.checkOut).getTime() - new Date(a.checkIn).getTime()) /
                (1000 * 60 * 60);
              return sum + Math.max(0, hrs);
            }
            return sum;
          }, 0)
          .toFixed(2)
      );

      const currentMonthPrefix = todayStr.slice(0, 7);
      const monthRecords = recentAttendance.filter((a) =>
        a.date.startsWith(currentMonthPrefix)
      );
      const monthlyStats = {
        present: monthRecords.filter((a) => a.status === 'present').length,
        late: monthRecords.filter((a) => a.status === 'late').length,
        halfDay: monthRecords.filter((a) => a.status === 'half-day').length,
      };

      const yearStart = new Date(new Date().getFullYear(), 0, 1);
      const yearEnd = new Date(new Date().getFullYear(), 11, 31, 23, 59, 59);
      let usedDays = 0;
      let pendingDays = 0;

      for (const lv of employeeLeaves) {
        const st = new Date(lv.startDate);
        if (st >= yearStart && st <= yearEnd && lv.leaveType !== 'unpaid') {
          const d =
            lv.days || countWorkingDays(lv.startDate, lv.endDate, weekendDays);
          if (lv.status === 'approved') usedDays += d;
          if (lv.status === 'pending') pendingDays += d;
        }
      }

      return res.json({
        success: true,
        role: 'employee',
        company,
        employee,
        todayAttendance,
        weeklyHours,
        monthlyStats,
        leaveBalance: {
          quota,
          usedDays,
          pendingDays,
          remainingDays: Math.max(0, quota - usedDays),
        },
        recentAttendance: recentAttendance.slice(0, 10),
        recentLeaves: employeeLeaves.slice(0, 5),
        announcements,
      });
    }

    // Admin / HR Dashboard Summary
    const [
      employees,
      departments,
      todayAttendanceList,
      pendingLeavesList,
      onLeaveTodayList,
    ] = await Promise.all([
      Employee.find({ companyId, status: 'active' }).populate('departmentId', 'name'),
      Department.find({ companyId, isActive: true }),
      Attendance.find({ companyId, date: todayStr }).populate({
        path: 'employeeId',
        select: 'employeeCode firstName lastName departmentId',
        populate: { path: 'departmentId', select: 'name' },
      }),
      Leave.find({ companyId, status: 'pending' })
        .populate('employeeId', 'employeeCode firstName lastName')
        .sort({ createdAt: -1 }),
      Leave.find({
        companyId,
        status: 'approved',
        startDate: { $lte: todayEnd },
        endDate: { $gte: todayStart },
      }).populate('employeeId', 'employeeCode firstName lastName'),
    ]);

    const presentToday = todayAttendanceList.filter(
      (a) => a.status === 'present' || a.status === 'late' || a.status === 'half-day'
    ).length;
    const lateToday = todayAttendanceList.filter((a) => a.status === 'late');
    const halfDayToday = todayAttendanceList.filter(
      (a) => a.status === 'half-day'
    );

    // Attendance by department
    const deptAttendance = departments.map((dept) => {
      const deptEmployees = employees.filter(
        (e) => String(e.departmentId?._id || e.departmentId) === String(dept._id)
      );
      const deptPresent = todayAttendanceList.filter(
        (a) =>
          String(
            a.employeeId?.departmentId?._id || a.employeeId?.departmentId
          ) === String(dept._id)
      ).length;
      return {
        department: dept.name,
        totalEmployees: deptEmployees.length,
        presentToday: deptPresent,
      };
    });

    return res.json({
      success: true,
      role: req.user.role,
      company,
      totals: {
        totalEmployees: employees.length,
        totalDepartments: departments.length,
        presentToday,
        lateTodayCount: lateToday.length,
        halfDayTodayCount: halfDayToday.length,
        onLeaveTodayCount: onLeaveTodayList.length,
        pendingLeavesCount: pendingLeavesList.length,
      },
      todayAttendance: todayAttendanceList,
      lateToday: lateToday.map((a) => ({
        name: a.employeeId
          ? `${a.employeeId.firstName} ${a.employeeId.lastName}`
          : 'Employee',
        checkIn: a.checkIn,
      })),
      onLeaveToday: onLeaveTodayList.map((l) => ({
        name: l.employeeId
          ? `${l.employeeId.firstName} ${l.employeeId.lastName}`
          : 'Employee',
        leaveType: l.leaveType,
        startDate: l.startDate,
        endDate: l.endDate,
      })),
      pendingLeaves: pendingLeavesList.slice(0, 10),
      departmentAttendance: deptAttendance,
      announcements,
    });
  } catch (error) {
    next(error);
  }
};

export const askSmartHelper = async (req, res, next) => {
  try {
    const question = String(req.body.question || '').trim();
    if (!question) {
      return res.status(400).json({
        success: false,
        message: 'Please type a question.',
      });
    }

    const q = question.toLowerCase();
    const companyId = req.user.companyId;
    const todayStr = getTodayStr();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const company = await Company.findById(companyId);
    const quota = company?.leaveQuota ?? 20;
    const weekendDays = company?.weekendDays?.length ? company.weekendDays : [6, 0];

    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({
        companyId,
        userId: req.user._id,
      });

      if (!employee) {
        return res.json({
          success: true,
          answer:
            'Your employee profile is not linked yet. Please contact your Admin.',
        });
      }

      const [attendances, leaves] = await Promise.all([
        Attendance.find({ companyId, employeeId: employee._id }).sort({
          date: -1,
        }),
        Leave.find({ companyId, employeeId: employee._id }),
      ]);

      const yearStart = new Date(new Date().getFullYear(), 0, 1);
      const yearEnd = new Date(new Date().getFullYear(), 11, 31, 23, 59, 59);
      const usedDays = leaves
        .filter(
          (l) =>
            l.status === 'approved' &&
            l.leaveType !== 'unpaid' &&
            new Date(l.startDate) >= yearStart &&
            new Date(l.startDate) <= yearEnd
        )
        .reduce(
          (sum, l) =>
            sum + (l.days || countWorkingDays(l.startDate, l.endDate, weekendDays)),
          0
        );
      const remaining = Math.max(0, quota - usedDays);

      const todayRecord = attendances.find((a) => a.date === todayStr);

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 6);
      const weekAgoStr = `${weekAgo.getFullYear()}-${String(weekAgo.getMonth() + 1).padStart(2, '0')}-${String(weekAgo.getDate()).padStart(2, '0')}`;
      const weeklyHours = Number(
        attendances
          .filter((a) => a.date >= weekAgoStr)
          .reduce((sum, a) => {
            if (a.workHours) return sum + Number(a.workHours);
            if (a.checkIn && a.checkOut) {
              return (
                sum +
                Math.max(
                  0,
                  (new Date(a.checkOut).getTime() - new Date(a.checkIn).getTime()) /
                    (1000 * 60 * 60)
                )
              );
            }
            return sum;
          }, 0)
          .toFixed(2)
      );

      let answer = '';
      if (q.includes('leave') || q.includes('quota') || q.includes('balance')) {
        answer = `You have ${remaining} leave day(s) left out of your yearly quota of ${quota} days (${usedDays} approved day(s) used).`;
      } else if (q.includes('late') || q.includes('today') || q.includes('check')) {
        if (!todayRecord?.checkIn) {
          answer = `You have not checked in today (${todayStr}) yet. Office starts at ${company?.officeStartTime || '09:00'} with ${company?.graceMinutes ?? 15} grace minutes.`;
        } else {
          const timeStr = new Date(todayRecord.checkIn).toLocaleTimeString();
          answer =
            todayRecord.status === 'late'
              ? `Yes, you were marked LATE today (checked in at ${timeStr}).`
              : `No, you were on time today! Checked in at ${timeStr} (status: ${todayRecord.status}).`;
        }
      } else if (q.includes('hour') || q.includes('week') || q.includes('work')) {
        answer = `You have worked ${weeklyHours} hour(s) over the last 7 days.`;
      } else if (q.includes('salary') || q.includes('pay')) {
        answer = `Your basic monthly salary is ${Number(employee.basicSalary).toLocaleString()}.`;
      } else {
        answer = `Here is your personal summary: Leave balance: ${remaining}/${quota} days left | Today's status: ${todayRecord?.status || 'Not checked in'} | Hours worked this week: ${weeklyHours} hrs.`;
      }

      return res.json({
        success: true,
        answer,
        summary: {
          role: 'employee',
          name: `${employee.firstName} ${employee.lastName}`,
          remainingLeaves: remaining,
          quota,
          usedLeaves: usedDays,
          todayStatus: todayRecord?.status || 'not checked in',
          weeklyHours,
        },
      });
    }

    // Admin / HR Smart Helper
    const [employees, todayAttendances, onLeaveToday, pendingLeaves] =
      await Promise.all([
        Employee.find({ companyId, status: 'active' }),
        Attendance.find({ companyId, date: todayStr }).populate(
          'employeeId',
          'firstName lastName employeeCode'
        ),
        Leave.find({
          companyId,
          status: 'approved',
          startDate: { $lte: todayEnd },
          endDate: { $gte: todayStart },
        }).populate('employeeId', 'firstName lastName employeeCode'),
        Leave.find({ companyId, status: 'pending' }).populate(
          'employeeId',
          'firstName lastName'
        ),
      ]);

    const lateRecords = todayAttendances.filter((a) => a.status === 'late');
    const presentCount = todayAttendances.length;

    let answer = '';
    if (
      q.includes('how many employee') ||
      q.includes('total employee') ||
      (q.includes('employee') && !q.includes('leave') && !q.includes('late'))
    ) {
      answer = `We currently have ${employees.length} active employee(s) in ${company?.name || 'the company'}.`;
    } else if (q.includes('leave')) {
      if (onLeaveToday.length === 0) {
        answer = `0 employees are on approved leave today (${pendingLeaves.length} pending leave request(s)).`;
      } else {
        const typeCounts = {};
        const names = [];
        for (const lv of onLeaveToday) {
          typeCounts[lv.leaveType] = (typeCounts[lv.leaveType] || 0) + 1;
          if (lv.employeeId) {
            names.push(`${lv.employeeId.firstName} ${lv.employeeId.lastName} (${lv.leaveType})`);
          }
        }
        const breakdown = Object.entries(typeCounts)
          .map(([t, c]) => `${c} ${t}`)
          .join(', ');
        answer = `${onLeaveToday.length} employee(s) on leave today (${breakdown}): ${names.join(', ')}.`;
      }
    } else if (q.includes('late')) {
      if (lateRecords.length === 0) {
        answer = `No employees were late today (${presentCount} checked in on time).`;
      } else {
        const names = lateRecords
          .map((r) =>
            r.employeeId
              ? `${r.employeeId.firstName} ${r.employeeId.lastName} (${new Date(r.checkIn).toLocaleTimeString()})`
              : 'Employee'
          )
          .join(', ');
        answer = `${lateRecords.length} employee(s) were late today: ${names}.`;
      }
    } else if (q.includes('present') || q.includes('attendance')) {
      answer = `Today (${todayStr}): ${presentCount} checked in (${lateRecords.length} late), ${onLeaveToday.length} on leave out of ${employees.length} active employee(s).`;
    } else {
      answer = `Company Summary (${company?.name || 'HCM Lite'}): ${employees.length} employees | ${presentCount} checked in today (${lateRecords.length} late) | ${onLeaveToday.length} on leave today | ${pendingLeaves.length} pending leave request(s).`;
    }

    return res.json({
      success: true,
      answer,
      summary: {
        role: req.user.role,
        totalEmployees: employees.length,
        presentToday: presentCount,
        lateToday: lateRecords.length,
        onLeaveToday: onLeaveToday.length,
        pendingLeaves: pendingLeaves.length,
      },
    });
  } catch (error) {
    next(error);
  }
};
