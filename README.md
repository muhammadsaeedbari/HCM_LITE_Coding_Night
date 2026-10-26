# HCM Lite — Human Capital Management Web App

A responsive Human Capital Management (HR) web application for **Admin** and **Employees**, built for the **Saylani Hackathon (HCM Lite)**.

---

## Key Features

### 1. Roles & Permissions
- **First-Run Company Setup (`/setup`)**: Creates the company and the initial Admin account.
- **Admin Role**:
  - Configure company rules in **Settings (`/settings`)**: Office start time, grace minutes, half-day hours threshold, yearly paid leave quota, and working/weekend days.
  - Manage **Departments (`/departments`)** and **Designations (`/designations`)**.
  - Manage **Employees (`/employees`)**: Adding an employee automatically creates their login account (`role: employee`), plus full Edit, Delete, Search, and Department Filter.
  - Review **Leave Requests (`/leaves`)**: Approve or reject employee leave requests with an Admin comment.
  - Generate **Monthly Payslips (`/payroll`)**: Auto-calculates per-day rate and attendance deductions based on absent and half-day records.
  - Post & manage **Company Announcements (`/announcements`)**.
- **Employee Role (Self-Service)**:
  - Personal **Employee Dashboard (`/dashboard`)** with live check-in/check-out, weekly hours, and leave balance.
  - **Attendance (`/attendance`)**: Daily check-in and check-out.
  - **Leave Management (`/leaves`)**: View yearly quota, used days, and remaining balance; apply for leave.
  - **Monthly Payslip (`/payroll`)**: View and Print / Save as PDF monthly salary slips.
  - **Password & Profile (`/profile`)**: Change login password at any time.
  - Automatic redirect back to `/dashboard` if an Employee attempts to open an Admin route.

### 2. Business Rules Enforced
- **Attendance**:
  - Marked **Late** if check-in is after `officeStartTime + graceMinutes` (e.g., `09:00 + 15 mins`).
  - One check-in per day; check-out allowed only after check-in.
  - Work hours = `checkOut − checkIn`; if under `halfDayHours` (default `5` hours), marked as **Half-Day**.
- **Leaves**:
  - `From` date must be on or before `To` date.
  - Counts **working days only** (automatically skips configured weekend days).
  - Prevents overlapping leave requests and prevents exceeding the Admin's yearly paid leave quota.
- **Payslip Calculation**:
  - $\text{Per Day Salary} = \text{Monthly Basic Salary} \div \text{Working Days in Month}$
  - $\text{Deduction} = \text{Per Day Salary} \times (\text{Absent Days} + 0.5 \times \text{Half Days})$
  - $\text{Net Salary} = \text{Basic Salary} + \text{Allowances} - \text{Deduction}$

### 3. Smart Helper (AI Touch)
- Available on both **Admin** and **Employee** dashboards:
  - **Admin questions**: *"How many employees do we have?"*, *"Who is on leave today?"*, *"Who was late today?"*
  - **Employee questions**: *"How many leaves do I have left?"*, *"Was I late today?"*, *"How many hours did I work this week?"*
- Optional in-memory demo LLM key support (never stored or committed to GitHub).

---

## Running Locally

### 1. Backend (`/backend`)
```bash
cd backend
npm install
npm run dev
```
Ensure `backend/.env` contains your `MONGODB_URI`, `MONGODB_DB_NAME`, and `JWT_SECRET` (at least 32 characters). Never commit `.env` to GitHub.

### 2. Frontend (`/frontend`)
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.
