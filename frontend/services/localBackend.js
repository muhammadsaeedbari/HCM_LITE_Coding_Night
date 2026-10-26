// Browser localStorage fallback engine (matches both Express API format & Hackathon PDF localStorage keys)

const KEYS = {
  COMPANY: 'hcm_company',
  USERS: 'hcm_users',
  DEPARTMENTS: 'hcm_departments',
  DESIGNATIONS: 'hcm_designations',
  EMPLOYEES: 'hcm_employees',
  ATTENDANCE: 'hcm_attendance',
  LEAVES: 'hcm_leaves',
  PAYROLLS: 'hcm_payrolls',
  ANNOUNCEMENTS: 'hcm_announcements',
  SESSION: 'hcm_session',
};

const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const write = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const makeId = () =>
  Date.now().toString(16) + Math.random().toString(16).slice(2, 10);

const getTodayStr = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getCurrentUser = () => {
  const savedUser = read('hcm_user', null);
  if (!savedUser) return null;
  const users = read(KEYS.USERS, []);
  return (
    users.find(
      (u) =>
        u._id === (savedUser.id || savedUser._id) ||
        u.email?.toLowerCase() === savedUser.email?.toLowerCase()
    ) || {
      _id: savedUser.id || savedUser._id || 'admin-1',
      name: savedUser.name || 'Admin',
      email: savedUser.email || 'admin@company.com',
      role: savedUser.role || 'admin',
      companyId: savedUser.companyId || 'company-1',
      isActive: true,
    }
  );
};

const getCompany = () => {
  const c = read(KEYS.COMPANY, null);
  if (c) return c;
  return {
    _id: 'company-1',
    name: 'HCM Lite Company',
    officeStartTime: '09:00',
    graceMinutes: 15,
    halfDayHours: 5,
    leaveQuota: 20,
    weekendDays: [6, 0],
    setupCompleted: false,
  };
};

const countWorkingDays = (startDate, endDate, weekendDays = [6, 0]) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    if (!weekendDays.includes(cur.getDay())) count += 1;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
};

const populateEmployee = (emp) => {
  if (!emp) return null;
  const depts = read(KEYS.DEPARTMENTS, []);
  const desigs = read(KEYS.DESIGNATIONS, []);
  const deptId = emp.departmentId?._id || emp.departmentId;
  const desigId = emp.designationId?._id || emp.designationId;
  const dept = depts.find((d) => d._id === deptId) || {
    _id: deptId,
    name: emp.department || 'General',
  };
  const desig = desigs.find((d) => d._id === desigId) || {
    _id: desigId,
    title: emp.designation || 'Staff',
  };
  return {
    ...emp,
    departmentId: dept,
    designationId: desig,
  };
};

const calculatePayrollStats = (employeeId, period, basicSalary, weekendDays) => {
  const [year, month] = period.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const workingDateStrings = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, month - 1, d);
    if (!weekendDays.includes(dt.getDay())) {
      workingDateStrings.push(
        `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      );
    }
  }

  const totalWorkingDays = Math.max(1, workingDateStrings.length);
  const attendances = read(KEYS.ATTENDANCE, []).filter(
    (a) =>
      String(a.employeeId?._id || a.employeeId) === String(employeeId) &&
      String(a.date).startsWith(`${period}-`)
  );

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);
  const approvedLeaves = read(KEYS.LEAVES, []).filter(
    (l) =>
      String(l.employeeId?._id || l.employeeId) === String(employeeId) &&
      l.status === 'approved' &&
      new Date(l.startDate) <= monthEnd &&
      new Date(l.endDate) >= monthStart
  );

  const attMap = new Map(attendances.map((a) => [a.date, a]));
  const leaveDates = new Set();
  const unpaidDates = new Set();

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
        const ds = `${year}-${String(month).padStart(2, '0')}-${String(
          cur.getDate()
        ).padStart(2, '0')}`;
        leaveDates.add(ds);
        if (lv.leaveType === 'unpaid') unpaidDates.add(ds);
      }
      cur.setDate(cur.getDate() + 1);
    }
  }

  const todayStr = getTodayStr();
  let presentDays = 0;
  let halfDays = 0;
  let absentDays = 0;

  for (const ds of workingDateStrings) {
    const att = attMap.get(ds);
    if (att) {
      if (att.status === 'half-day') halfDays += 1;
      else if (att.status === 'absent') absentDays += 1;
      else presentDays += 1;
    } else if (leaveDates.has(ds)) {
      if (unpaidDates.has(ds)) absentDays += 1;
    } else if (ds <= todayStr) {
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
    leaveDays: leaveDates.size,
    perDaySalary,
    attendanceDeduction,
  };
};

const respond = (data, status = 200) => ({
  data,
  status,
  statusText: 'OK',
  headers: {},
  config: {},
});

const rejectErr = (message, status = 400) => {
  const err = new Error(message);
  err.response = { status, data: { success: false, message } };
  return Promise.reject(err);
};

export async function handleLocalRequest(config) {
  const method = (config.method || 'get').toLowerCase();
  const rawUrl = (config.url || '').replace(/^https?:\/\/[^/]+/, '');
  const path = rawUrl.replace(/^\/api/, '').split('?')[0];

  let body = {};
  if (config.data) {
    body =
      typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
  }

  const query = { ...(config.params || {}) };
  if (rawUrl.includes('?')) {
    const searchParams = new URLSearchParams(rawUrl.split('?')[1]);
    for (const [k, v] of searchParams.entries()) {
      query[k] = v;
    }
  }

  // 1. Setup routes
  if (path === '/setup/status' && method === 'get') {
    const users = read(KEYS.USERS, []);
    const adminExists = users.some((u) => u.role === 'admin');
    return respond({ success: true, setupRequired: !adminExists });
  }

  if (path === '/setup/initial-admin' && method === 'post') {
    const { companyName, name, email, password } = body;
    if (!companyName?.trim() || !name?.trim() || !email?.trim() || !password) {
      return rejectErr('Company name, name, email and password are required.');
    }

    const users = read(KEYS.USERS, []);
    if (users.some((u) => u.role === 'admin')) {
      return rejectErr('Initial setup has already been completed.', 409);
    }

    const companyId = makeId();
    const company = {
      _id: companyId,
      name: companyName.trim(),
      officeStartTime: '09:00',
      graceMinutes: 15,
      halfDayHours: 5,
      leaveQuota: 20,
      weekendDays: [6, 0],
      setupCompleted: true,
    };
    write(KEYS.COMPANY, company);

    const adminUser = {
      _id: makeId(),
      id: makeId(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role: 'admin',
      companyId,
      isActive: true,
      mustChangePassword: false,
    };
    adminUser.id = adminUser._id;
    users.push(adminUser);
    write(KEYS.USERS, users);

    return respond(
      {
        success: true,
        message: 'Company and initial Admin account created successfully.',
      },
      201
    );
  }

  // 2. Auth routes
  if (path === '/auth/login' && method === 'post') {
    const { email, password } = body;
    if (!email?.trim() || !password) {
      return rejectErr('Email and password are required.');
    }

    const users = read(KEYS.USERS, []);
    const normalizedEmail = email.trim().toLowerCase();

    if (users.length === 0) {
      return rejectErr(
        'No company set up yet. Click "First time? Set up your company" below to create your Admin account.',
        401
      );
    }

    const user = users.find(
      (u) => u.email?.toLowerCase() === normalizedEmail && u.isActive !== false
    );

    if (!user || user.password !== password) {
      return rejectErr('Invalid email or password.', 401);
    }

    const company = getCompany();
    const sessionUser = {
      id: user._id,
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.companyId || company._id,
      companyName: company.name,
    };

    write(KEYS.SESSION, sessionUser);

    return respond({
      success: true,
      message: 'Login successful.',
      token: `local-jwt-${user._id}`,
      user: sessionUser,
    });
  }

  const currentUser = getCurrentUser();
  if (!currentUser) {
    return rejectErr('Authentication required. Please sign in.', 401);
  }

  if (path === '/auth/me' && method === 'get') {
    return respond({ success: true, user: currentUser });
  }

  if (path === '/auth/change-password' && method === 'patch') {
    const { currentPassword, newPassword } = body;
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return rejectErr('Valid current and new password (min 6 chars) required.');
    }
    const users = read(KEYS.USERS, []);
    const idx = users.findIndex(
      (u) =>
        u._id === currentUser._id ||
        u.email?.toLowerCase() === currentUser.email?.toLowerCase()
    );
    if (idx === -1) return rejectErr('User not found.', 404);
    if (users[idx].password !== currentPassword) {
      return rejectErr('Current password is incorrect.', 400);
    }
    users[idx].password = newPassword;
    write(KEYS.USERS, users);
    return respond({
      success: true,
      message: 'Password updated successfully.',
    });
  }

  // 3. Company Settings
  if (path === '/organization/settings' && method === 'get') {
    const company = getCompany();
    return respond({ success: true, data: company, settings: company });
  }

  if (
    path === '/organization/settings' &&
    (method === 'put' || method === 'patch')
  ) {
    const company = {
      ...getCompany(),
      ...(body.name ? { name: body.name.trim() } : {}),
      ...(body.officeStartTime ? { officeStartTime: body.officeStartTime } : {}),
      ...(body.graceMinutes !== undefined
        ? { graceMinutes: Number(body.graceMinutes) }
        : {}),
      ...(body.halfDayHours !== undefined
        ? { halfDayHours: Number(body.halfDayHours) }
        : {}),
      ...(body.leaveQuota !== undefined
        ? { leaveQuota: Number(body.leaveQuota) }
        : {}),
      ...(Array.isArray(body.weekendDays)
        ? { weekendDays: body.weekendDays.map(Number) }
        : {}),
    };
    write(KEYS.COMPANY, company);
    return respond({
      success: true,
      message: 'Company settings saved.',
      data: company,
      settings: company,
    });
  }

  // 4. Departments
  if (path === '/organization/departments' && method === 'get') {
    const items = read(KEYS.DEPARTMENTS, []);
    return respond({ success: true, data: items, departments: items });
  }

  if (path === '/organization/departments' && method === 'post') {
    const name = body.name?.trim();
    if (!name) return rejectErr('Department name is required.');
    const items = read(KEYS.DEPARTMENTS, []);
    if (items.some((d) => d.name.toLowerCase() === name.toLowerCase())) {
      return rejectErr('Department already exists.', 409);
    }
    const item = {
      _id: makeId(),
      name,
      description: body.description || '',
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    items.push(item);
    write(KEYS.DEPARTMENTS, items);
    return respond({ success: true, data: item, department: item }, 201);
  }

  // 5. Designations
  if (path === '/organization/designations' && method === 'get') {
    const depts = read(KEYS.DEPARTMENTS, []);
    const items = read(KEYS.DESIGNATIONS, []).map((d) => ({
      ...d,
      departmentId: depts.find(
        (dep) => dep._id === (d.departmentId?._id || d.departmentId)
      ) || { _id: d.departmentId, name: 'General' },
    }));
    return respond({ success: true, data: items, designations: items });
  }

  if (path === '/organization/designations' && method === 'post') {
    const { title, departmentId, description = '' } = body;
    if (!title?.trim() || !departmentId) {
      return rejectErr('Valid title and department are required.');
    }
    const items = read(KEYS.DESIGNATIONS, []);
    const item = {
      _id: makeId(),
      title: title.trim(),
      departmentId,
      description,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    items.push(item);
    write(KEYS.DESIGNATIONS, items);
    return respond({ success: true, data: item, designation: item }, 201);
  }

  // 6. Employees
  if (path === '/organization/employees' && method === 'get') {
    const raw = read(KEYS.EMPLOYEES, []);
    const list =
      currentUser.role === 'employee'
        ? raw.filter(
            (e) =>
              e.userId === currentUser._id ||
              e.email?.toLowerCase() === currentUser.email?.toLowerCase()
          )
        : raw;
    const populated = list.map(populateEmployee);
    return respond({ success: true, data: populated, employees: populated });
  }

  if (path === '/organization/employees' && method === 'post') {
    const {
      employeeCode,
      firstName,
      lastName,
      email,
      password,
      phone = '',
      departmentId,
      designationId,
      dateOfJoining,
      employmentType = 'full-time',
      basicSalary,
      address = '',
    } = body;

    if (
      !employeeCode?.trim() ||
      !firstName?.trim() ||
      !lastName?.trim() ||
      !email?.trim() ||
      !departmentId ||
      !designationId ||
      !dateOfJoining ||
      !Number.isFinite(Number(basicSalary)) ||
      Number(basicSalary) <= 0
    ) {
      return rejectErr(
        'Please provide all required fields and ensure salary > 0.'
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const employees = read(KEYS.EMPLOYEES, []);
    const users = read(KEYS.USERS, []);

    if (
      employees.some((e) => e.email?.toLowerCase() === normalizedEmail) ||
      users.some((u) => u.email?.toLowerCase() === normalizedEmail)
    ) {
      return rejectErr('Email is already registered.', 409);
    }

    const userId = makeId();
    const rawPassword =
      typeof password === 'string' && password.trim().length >= 6
        ? password.trim()
        : 'Employee@123';

    const newUser = {
      _id: userId,
      id: userId,
      name: `${firstName.trim()} ${lastName.trim()}`.trim(),
      email: normalizedEmail,
      password: rawPassword,
      role: 'employee',
      department: departmentId,
      salary: Number(basicSalary),
      companyId: currentUser.companyId || 'company-1',
      isActive: true,
    };
    users.push(newUser);
    write(KEYS.USERS, users);

    const newEmp = {
      _id: makeId(),
      userId,
      employeeCode: employeeCode.trim().toUpperCase(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      phone,
      departmentId,
      designationId,
      dateOfJoining,
      employmentType,
      basicSalary: Number(basicSalary),
      status: 'active',
      address,
      createdAt: new Date().toISOString(),
    };
    employees.unshift(newEmp);
    write(KEYS.EMPLOYEES, employees);

    const populated = populateEmployee(newEmp);
    return respond(
      {
        success: true,
        message: `Employee and login created (${normalizedEmail} / password: ${rawPassword}).`,
        data: populated,
        employee: populated,
      },
      201
    );
  }

  if (path.startsWith('/organization/employees/') && method === 'patch') {
    const id = path.split('/').pop();
    const employees = read(KEYS.EMPLOYEES, []);
    const idx = employees.findIndex((e) => e._id === id);
    if (idx === -1) return rejectErr('Employee not found.', 404);

    const updated = {
      ...employees[idx],
      ...body,
      basicSalary:
        body.basicSalary !== undefined
          ? Number(body.basicSalary)
          : employees[idx].basicSalary,
    };
    employees[idx] = updated;
    write(KEYS.EMPLOYEES, employees);

    const users = read(KEYS.USERS, []);
    const uIdx = users.findIndex((u) => u._id === updated.userId);
    if (uIdx !== -1) {
      users[uIdx].name = `${updated.firstName} ${updated.lastName}`.trim();
      users[uIdx].email = updated.email?.toLowerCase();
      users[uIdx].isActive = updated.status === 'active';
      if (body.password && body.password.trim().length >= 6) {
        users[uIdx].password = body.password.trim();
      }
      write(KEYS.USERS, users);
    }

    const populated = populateEmployee(updated);
    return respond({
      success: true,
      message: 'Employee updated.',
      data: populated,
      employee: populated,
    });
  }

  if (path.startsWith('/organization/employees/') && method === 'delete') {
    const id = path.split('/').pop();
    const employees = read(KEYS.EMPLOYEES, []);
    const target = employees.find((e) => e._id === id);
    if (!target) return rejectErr('Employee not found.', 404);

    write(
      KEYS.EMPLOYEES,
      employees.filter((e) => e._id !== id)
    );
    if (target.userId) {
      const users = read(KEYS.USERS, []);
      write(
        KEYS.USERS,
        users.filter((u) => u._id !== target.userId)
      );
    }
    return respond({
      success: true,
      message: 'Employee and login account deleted.',
    });
  }

  // 7. Attendance
  if (path === '/attendance' && method === 'get') {
    const employees = read(KEYS.EMPLOYEES, []);
    let records = read(KEYS.ATTENDANCE, []);

    if (currentUser.role === 'employee') {
      const myEmp = employees.find(
        (e) =>
          e.userId === currentUser._id ||
          e.email?.toLowerCase() === currentUser.email?.toLowerCase()
      );
      records = myEmp ? records.filter((r) => r.employeeId === myEmp._id) : [];
    } else if (query.employeeId) {
      records = records.filter((r) => r.employeeId === query.employeeId);
    }

    if (query.date) {
      records = records.filter((r) => r.date === query.date);
    }

    const populated = records.map((r) => ({
      ...r,
      employeeId: populateEmployee(
        employees.find((e) => e._id === (r.employeeId?._id || r.employeeId))
      ),
    }));

    return respond({
      success: true,
      data: populated,
      attendance: populated,
      records: populated,
    });
  }

  if (path === '/attendance/check-in' && method === 'post') {
    const employees = read(KEYS.EMPLOYEES, []);
    let empId = body.employeeId;
    if (currentUser.role === 'employee') {
      const myEmp = employees.find(
        (e) =>
          e.userId === currentUser._id ||
          e.email?.toLowerCase() === currentUser.email?.toLowerCase()
      );
      if (!myEmp) return rejectErr('Employee profile not found.', 404);
      empId = myEmp._id;
    }
    if (!empId) return rejectErr('Select an employee first.');

    const today = getTodayStr();
    const records = read(KEYS.ATTENDANCE, []);
    if (records.some((r) => r.employeeId === empId && r.date === today)) {
      return rejectErr('Already checked in today.', 409);
    }

    const company = getCompany();
    const now = new Date();
    const [sh, sm] = String(company.officeStartTime || '09:00')
      .split(':')
      .map(Number);
    const cutoff = sh * 60 + sm + Number(company.graceMinutes ?? 15);
    const actual = now.getHours() * 60 + now.getMinutes();
    const status = actual > cutoff ? 'late' : 'present';

    const rec = {
      _id: makeId(),
      employeeId: empId,
      date: today,
      checkIn: now.toISOString(),
      checkOut: null,
      workHours: 0,
      status,
    };
    records.unshift(rec);
    write(KEYS.ATTENDANCE, records);

    return respond(
      {
        success: true,
        message:
          status === 'late'
            ? `Check-in marked LATE (after ${company.officeStartTime} + ${company.graceMinutes}m grace).`
            : 'Check-in marked PRESENT.',
        data: rec,
        record: rec,
      },
      201
    );
  }

  if (path === '/attendance/check-out' && method === 'post') {
    const employees = read(KEYS.EMPLOYEES, []);
    let empId = body.employeeId;
    if (currentUser.role === 'employee') {
      const myEmp = employees.find(
        (e) =>
          e.userId === currentUser._id ||
          e.email?.toLowerCase() === currentUser.email?.toLowerCase()
      );
      if (!myEmp) return rejectErr('Employee profile not found.', 404);
      empId = myEmp._id;
    }

    const today = getTodayStr();
    const records = read(KEYS.ATTENDANCE, []);
    const idx = records.findIndex(
      (r) => r.employeeId === empId && r.date === today
    );
    if (idx === -1 || !records[idx].checkIn) {
      return rejectErr('Check-in is required before check-out.');
    }
    if (records[idx].checkOut) {
      return rejectErr('Already checked out today.', 409);
    }

    const company = getCompany();
    const now = new Date();
    const hrs = Number(
      (
        (now.getTime() - new Date(records[idx].checkIn).getTime()) /
        (1000 * 60 * 60)
      ).toFixed(2)
    );
    records[idx].checkOut = now.toISOString();
    records[idx].workHours = Math.max(0, hrs);
    if (records[idx].workHours < (company.halfDayHours ?? 5)) {
      records[idx].status = 'half-day';
    }
    write(KEYS.ATTENDANCE, records);

    return respond({
      success: true,
      message:
        records[idx].status === 'half-day'
          ? `Checked out (${records[idx].workHours} hrs — marked Half-Day).`
          : `Checked out (${records[idx].workHours} hrs).`,
      data: records[idx],
      record: records[idx],
    });
  }

  // 8. Leaves
  if (path === '/leaves' && method === 'get') {
    const company = getCompany();
    const quota = company.leaveQuota ?? 20;
    const employees = read(KEYS.EMPLOYEES, []);
    let leaves = read(KEYS.LEAVES, []);
    let myEmp = null;

    if (currentUser.role === 'employee') {
      myEmp = employees.find(
        (e) =>
          e.userId === currentUser._id ||
          e.email?.toLowerCase() === currentUser.email?.toLowerCase()
      );
      leaves = myEmp ? leaves.filter((l) => l.employeeId === myEmp._id) : [];
    }

    let usedDays = 0;
    let pendingDays = 0;
    for (const lv of leaves) {
      if (lv.leaveType !== 'unpaid') {
        if (lv.status === 'approved') usedDays += lv.days || 1;
        if (lv.status === 'pending') pendingDays += lv.days || 1;
      }
    }

    const populated = leaves.map((l) => ({
      ...l,
      employeeId: populateEmployee(
        employees.find((e) => e._id === (l.employeeId?._id || l.employeeId))
      ),
    }));

    return respond({
      success: true,
      data: populated,
      leaves: populated,
      quota,
      usedDays,
      pendingDays,
      remainingDays: Math.max(0, quota - usedDays),
    });
  }

  if (path === '/leaves' && method === 'post') {
    const { leaveType, startDate, endDate, reason } = body;
    const employees = read(KEYS.EMPLOYEES, []);
    let empId = body.employeeId;
    if (currentUser.role === 'employee') {
      const myEmp = employees.find(
        (e) =>
          e.userId === currentUser._id ||
          e.email?.toLowerCase() === currentUser.email?.toLowerCase()
      );
      if (!myEmp) return rejectErr('Employee profile not found.', 404);
      empId = myEmp._id;
    }
    if (!empId || !startDate || !endDate || !reason?.trim()) {
      return rejectErr('Please fill all leave fields.');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) {
      return rejectErr('From date must be on or before To date.');
    }

    const company = getCompany();
    const weekendDays = company.weekendDays || [6, 0];
    const quota = company.leaveQuota ?? 20;
    const days = countWorkingDays(start, end, weekendDays);
    if (days <= 0) {
      return rejectErr('Selected dates fall only on weekend days.');
    }

    const leaves = read(KEYS.LEAVES, []);
    const overlap = leaves.some(
      (l) =>
        l.employeeId === empId &&
        ['pending', 'approved'].includes(l.status) &&
        new Date(l.startDate) <= end &&
        new Date(l.endDate) >= start
    );
    if (overlap) {
      return rejectErr('Leave overlaps with an existing leave request.', 409);
    }

    if (leaveType !== 'unpaid') {
      const used = leaves
        .filter(
          (l) =>
            l.employeeId === empId &&
            l.leaveType !== 'unpaid' &&
            ['approved', 'pending'].includes(l.status)
        )
        .reduce((s, l) => s + (l.days || 1), 0);

      if (used + days > quota) {
        return rejectErr(
          `Exceeds yearly leave quota (${quota} days). Used/pending: ${used}, requested: ${days}.`
        );
      }
    }

    const item = {
      _id: makeId(),
      employeeId: empId,
      leaveType,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      days,
      reason: reason.trim(),
      status: 'pending',
      reviewNote: '',
      createdAt: new Date().toISOString(),
    };
    leaves.unshift(item);
    write(KEYS.LEAVES, leaves);

    return respond(
      {
        success: true,
        message: `Leave submitted (${days} working day(s)).`,
        data: item,
        leave: item,
      },
      201
    );
  }

  if (path.endsWith('/review') && method === 'patch') {
    const parts = path.split('/');
    const id = parts[parts.length - 2];
    const leaves = read(KEYS.LEAVES, []);
    const idx = leaves.findIndex((l) => l._id === id);
    if (idx === -1) return rejectErr('Leave request not found.', 404);
    leaves[idx].status = body.status;
    leaves[idx].reviewNote = body.reviewNote || '';
    leaves[idx].reviewedAt = new Date().toISOString();
    write(KEYS.LEAVES, leaves);
    return respond({
      success: true,
      message: `Leave ${body.status}.`,
      data: leaves[idx],
    });
  }

  // 9. Payroll / Payslip
  if (path === '/payroll/preview' && method === 'get') {
    const employees = read(KEYS.EMPLOYEES, []);
    const emp = employees.find((e) => e._id === query.employeeId);
    if (!emp) return rejectErr('Employee not found.', 404);
    const company = getCompany();
    const stats = calculatePayrollStats(
      emp._id,
      query.period,
      emp.basicSalary,
      company.weekendDays || [6, 0]
    );
    return respond({
      success: true,
      data: {
        basicSalary: emp.basicSalary,
        ...stats,
        netSalary: Math.max(0, emp.basicSalary - stats.attendanceDeduction),
      },
    });
  }

  if (path === '/payroll' && method === 'get') {
    const company = getCompany();
    const employees = read(KEYS.EMPLOYEES, []);
    let payrolls = read(KEYS.PAYROLLS, []);

    if (currentUser.role === 'employee') {
      const myEmp = employees.find(
        (e) =>
          e.userId === currentUser._id ||
          e.email?.toLowerCase() === currentUser.email?.toLowerCase()
      );
      payrolls = myEmp
        ? payrolls.filter((p) => p.employeeId === myEmp._id)
        : [];
    }

    const populated = payrolls.map((p) => ({
      ...p,
      employeeId: populateEmployee(
        employees.find((e) => e._id === (p.employeeId?._id || p.employeeId))
      ),
    }));

    return respond({
      success: true,
      count: populated.length,
      payrolls: populated,
      data: populated,
      company,
    });
  }

  if (path === '/payroll' && method === 'post') {
    const employees = read(KEYS.EMPLOYEES, []);
    const emp = employees.find((e) => e._id === body.employeeId);
    if (!emp) return rejectErr('Employee not found.', 404);
    const company = getCompany();
    const stats = calculatePayrollStats(
      emp._id,
      body.period,
      emp.basicSalary,
      company.weekendDays || [6, 0]
    );

    const absentDays =
      body.absentDays !== undefined ? Number(body.absentDays) : stats.absentDays;
    const halfDays =
      body.halfDays !== undefined ? Number(body.halfDays) : stats.halfDays;
    const deduction = Math.round(
      stats.perDaySalary * (absentDays + 0.5 * halfDays)
    );
    const allowances = Number(body.allowances || 0);
    const grossSalary = emp.basicSalary + allowances;
    const netSalary = Math.max(0, Math.round(grossSalary - deduction));

    const payrolls = read(KEYS.PAYROLLS, []);
    const existingIdx = payrolls.findIndex(
      (p) => p.employeeId === emp._id && p.period === body.period
    );

    const record = {
      _id: existingIdx !== -1 ? payrolls[existingIdx]._id : makeId(),
      employeeId: emp._id,
      period: body.period,
      workingDays: stats.workingDays,
      presentDays: stats.presentDays,
      absentDays,
      halfDays,
      leaveDays: stats.leaveDays,
      perDaySalary: stats.perDaySalary,
      attendanceDeduction: deduction,
      basicSalary: emp.basicSalary,
      allowances,
      deductions: deduction,
      grossSalary,
      netSalary,
      status: existingIdx !== -1 ? payrolls[existingIdx].status : 'draft',
      createdAt: new Date().toISOString(),
    };

    if (existingIdx !== -1) payrolls[existingIdx] = record;
    else payrolls.unshift(record);
    write(KEYS.PAYROLLS, payrolls);

    return respond(
      {
        success: true,
        message: 'Payslip generated.',
        payroll: { ...record, employeeId: populateEmployee(emp) },
        data: { ...record, employeeId: populateEmployee(emp) },
      },
      201
    );
  }

  if (path.endsWith('/status') && method === 'patch') {
    const parts = path.split('/');
    const id = parts[parts.length - 2];
    const payrolls = read(KEYS.PAYROLLS, []);
    const idx = payrolls.findIndex((p) => p._id === id);
    if (idx === -1) return rejectErr('Payroll not found.', 404);
    payrolls[idx].status = body.status;
    write(KEYS.PAYROLLS, payrolls);
    return respond({
      success: true,
      message: `Payroll marked ${body.status}.`,
      payroll: payrolls[idx],
    });
  }

  // 10. Announcements
  if (path === '/announcements' && method === 'get') {
    const items = read(KEYS.ANNOUNCEMENTS, []);
    return respond({ success: true, data: items, announcements: items });
  }

  if (path === '/announcements' && method === 'post') {
    const item = {
      _id: makeId(),
      title: body.title?.trim(),
      content: body.content?.trim(),
      priority: body.priority || 'normal',
      createdBy: { name: currentUser.name, role: currentUser.role },
      createdAt: new Date().toISOString(),
    };
    const items = read(KEYS.ANNOUNCEMENTS, []);
    items.unshift(item);
    write(KEYS.ANNOUNCEMENTS, items);
    return respond(
      {
        success: true,
        message: 'Announcement posted.',
        data: item,
        announcement: item,
      },
      201
    );
  }

  if (path.startsWith('/announcements/') && method === 'delete') {
    const id = path.split('/').pop();
    const items = read(KEYS.ANNOUNCEMENTS, []).filter((a) => a._id !== id);
    write(KEYS.ANNOUNCEMENTS, items);
    return respond({ success: true, message: 'Announcement deleted.' });
  }

  // 11. Dashboard Summary & Smart Helper
  if (path === '/dashboard/summary' && method === 'get') {
    const company = getCompany();
    const employees = read(KEYS.EMPLOYEES, []).map(populateEmployee);
    const departments = read(KEYS.DEPARTMENTS, []);
    const attendances = read(KEYS.ATTENDANCE, []);
    const leaves = read(KEYS.LEAVES, []);
    const announcements = read(KEYS.ANNOUNCEMENTS, []).slice(0, 5);
    const todayStr = getTodayStr();
    const quota = company.leaveQuota ?? 20;

    if (currentUser.role === 'employee') {
      const myEmp = employees.find(
        (e) =>
          e.userId === currentUser._id ||
          e.email?.toLowerCase() === currentUser.email?.toLowerCase()
      );
      const myAtt = myEmp
        ? attendances.filter((a) => a.employeeId === myEmp._id)
        : [];
      const myLeaves = myEmp
        ? leaves.filter((l) => l.employeeId === myEmp._id)
        : [];
      const todayAttendance = myAtt.find((a) => a.date === todayStr) || null;
      const weeklyHours = Number(
        myAtt
          .slice(0, 7)
          .reduce((s, a) => s + Number(a.workHours || 0), 0)
          .toFixed(2)
      );
      const usedDays = myLeaves
        .filter((l) => l.status === 'approved' && l.leaveType !== 'unpaid')
        .reduce((s, l) => s + (l.days || 1), 0);
      const pendingDays = myLeaves
        .filter((l) => l.status === 'pending' && l.leaveType !== 'unpaid')
        .reduce((s, l) => s + (l.days || 1), 0);

      return respond({
        success: true,
        role: 'employee',
        company,
        employee: myEmp,
        todayAttendance,
        weeklyHours,
        monthlyStats: {
          present: myAtt.filter((a) => a.status === 'present').length,
          late: myAtt.filter((a) => a.status === 'late').length,
          halfDay: myAtt.filter((a) => a.status === 'half-day').length,
        },
        leaveBalance: {
          quota,
          usedDays,
          pendingDays,
          remainingDays: Math.max(0, quota - usedDays),
        },
        recentAttendance: myAtt.slice(0, 10),
        recentLeaves: myLeaves.slice(0, 5),
        announcements,
      });
    }

    const todayAtt = attendances
      .filter((a) => a.date === todayStr)
      .map((a) => ({
        ...a,
        employeeId: employees.find((e) => e._id === a.employeeId),
      }));

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const onLeaveToday = leaves
      .filter(
        (l) =>
          l.status === 'approved' &&
          new Date(l.startDate) <= todayEnd &&
          new Date(l.endDate) >= todayStart
      )
      .map((l) => ({
        ...l,
        employeeId: employees.find((e) => e._id === l.employeeId),
      }));

    const pendingLeaves = leaves
      .filter((l) => l.status === 'pending')
      .map((l) => ({
        ...l,
        employeeId: employees.find((e) => e._id === l.employeeId),
      }));

    const deptAttendance = departments.map((dept) => {
      const deptEmps = employees.filter(
        (e) => (e.departmentId?._id || e.departmentId) === dept._id
      );
      const deptPres = todayAtt.filter(
        (a) =>
          (a.employeeId?.departmentId?._id || a.employeeId?.departmentId) ===
          dept._id
      ).length;
      return {
        department: dept.name,
        totalEmployees: deptEmps.length,
        presentToday: deptPres,
      };
    });

    return respond({
      success: true,
      role: currentUser.role,
      company,
      totals: {
        totalEmployees: employees.length,
        totalDepartments: departments.length,
        presentToday: todayAtt.length,
        lateTodayCount: todayAtt.filter((a) => a.status === 'late').length,
        halfDayTodayCount: todayAtt.filter((a) => a.status === 'half-day')
          .length,
        onLeaveTodayCount: onLeaveToday.length,
        pendingLeavesCount: pendingLeaves.length,
      },
      todayAttendance: todayAtt,
      pendingLeaves,
      departmentAttendance: deptAttendance,
      announcements,
    });
  }

  if (path === '/dashboard/helper' && method === 'post') {
    const q = String(body.question || '').toLowerCase();
    const company = getCompany();
    const employees = read(KEYS.EMPLOYEES, []);
    const attendances = read(KEYS.ATTENDANCE, []);
    const leaves = read(KEYS.LEAVES, []);
    const todayStr = getTodayStr();
    const quota = company.leaveQuota ?? 20;

    if (currentUser.role === 'employee') {
      const myEmp = employees.find(
        (e) =>
          e.userId === currentUser._id ||
          e.email?.toLowerCase() === currentUser.email?.toLowerCase()
      );
      const myAtt = myEmp
        ? attendances.filter((a) => a.employeeId === myEmp._id)
        : [];
      const myLeaves = myEmp
        ? leaves.filter((l) => l.employeeId === myEmp._id)
        : [];
      const usedDays = myLeaves
        .filter((l) => l.status === 'approved' && l.leaveType !== 'unpaid')
        .reduce((s, l) => s + (l.days || 1), 0);
      const remaining = Math.max(0, quota - usedDays);
      const todayRec = myAtt.find((a) => a.date === todayStr);
      const weeklyHours = Number(
        myAtt
          .slice(0, 7)
          .reduce((s, a) => s + Number(a.workHours || 0), 0)
          .toFixed(2)
      );

      let answer = '';
      if (q.includes('leave') || q.includes('quota')) {
        answer = `You have ${remaining} leave day(s) left out of your yearly quota of ${quota} days (${usedDays} used).`;
      } else if (q.includes('late') || q.includes('today')) {
        answer = todayRec
          ? `Today's status is ${todayRec.status.toUpperCase()} (checked in at ${new Date(
              todayRec.checkIn
            ).toLocaleTimeString()}).`
          : `You have not checked in today (${todayStr}) yet.`;
      } else {
        answer = `You worked ${weeklyHours} hour(s) this week and have ${remaining}/${quota} leave days remaining.`;
      }

      return respond({
        success: true,
        answer,
        summary: { remainingLeaves: remaining, quota, weeklyHours },
      });
    }

    const todayAtt = attendances.filter((a) => a.date === todayStr);
    const lateToday = todayAtt.filter((a) => a.status === 'late');
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const onLeaveToday = leaves.filter(
      (l) =>
        l.status === 'approved' &&
        new Date(l.startDate) <= todayEnd &&
        new Date(l.endDate) >= todayStart
    );

    let answer = '';
    if (q.includes('employee') && !q.includes('leave') && !q.includes('late')) {
      answer = `We have ${employees.length} active employee(s) in ${company.name}.`;
    } else if (q.includes('leave')) {
      answer = `${onLeaveToday.length} employee(s) are on approved leave today.`;
    } else if (q.includes('late')) {
      answer = `${lateToday.length} employee(s) were late today out of ${todayAtt.length} checked in.`;
    } else {
      answer = `${company.name} Summary: ${employees.length} employees, ${todayAtt.length} present today (${lateToday.length} late), ${onLeaveToday.length} on leave.`;
    }

    return respond({
      success: true,
      answer,
      summary: {
        totalEmployees: employees.length,
        presentToday: todayAtt.length,
        lateToday: lateToday.length,
        onLeaveToday: onLeaveToday.length,
      },
    });
  }

  return respond({ success: true, data: [] });
}
