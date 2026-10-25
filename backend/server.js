
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import connectDB from './config/db.js';
import setupRoute from './routes/setupRoutes.js';
import authRoute from './routes/authRoute.js';
import errorMiddleware from './middleware/errorMiddleware.js';
import organizationRoute from './routes/organizationRoute.js';
import attendanceRoute from './routes/attendanceRoute.js';
import leaveRoute from './routes/leaveRoute.js';
import payrollRoute from './routes/payrollRoute.js';

const app = express();

app.disable('x-powered-by');

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'HCM Lite API is running.',
    database: process.env.MONGODB_DB_NAME || 'HCM_Lite1',
  });
});

app.use('/api/setup', setupRoute);
app.use('/api/auth', authRoute);
app.use('/api/organization', organizationRoute);
app.use('/api/attendance', attendanceRoute);
app.use('/api/leaves', leaveRoute);
app.use('/api/payroll', payrollRoute);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

app.use(errorMiddleware);

const PORT = process.env.PORT || 8080;

const startServer = async () => {
  try {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      throw new Error('JWT_SECRET must contain at least 32 characters.');
    }

    await connectDB();

    app.listen(PORT, () => {
      console.log(`HCM Lite API running on port ${PORT}`);
      console.log(
        `Database: ${process.env.MONGODB_DB_NAME || 'HCM_Lite1'}`
      );
    });
  } catch (error) {
    console.error('Server startup failed:', error.message);
    process.exit(1);
  }
};

startServer();
