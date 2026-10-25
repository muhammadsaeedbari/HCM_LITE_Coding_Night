import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import setupRoutes from "./src/routes/setup.routes.js";
import authRoutes from "./src/routes/auth.routes.js";

import { notFound, errorHandler} from "./src/middleware/error.middleware.js";

const app = express();

app.use(helmet());

// app.use(
//   cors({
//     origin: process.env.CLIENT_URL,
//     credentials: true
//   })
// );
app.use(cors({
  origin: 'http://localhost:5173',
  headers: ['Content-Type', 'Authorization'], // Allow Content-Type explicitly
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true
  })
);

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 500,
  standardHeaders: true,
  legacyHeaders: false
});

app.use("/api", apiLimiter);

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "HCM Lite API is running"
  });
});

app.use(
  "/api/setup",
  setupRoutes
);

app.use(
  "/api/auth",
  authRoutes
);

app.use(notFound);

app.use(errorHandler);

export default app;