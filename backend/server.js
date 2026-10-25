import dotenv from "dotenv";

dotenv.config();

import app from "./app.js";
import connectDB from "./src/config/db.js";
import dns from 'dns'
dns.setServers(["8.8.8.8", "8.8.4.4"]);
const PORT =
  process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(
        `HCM Lite API running on http://localhost:${PORT}`
      );
    });
  } catch (error) {
    console.error(
      "Server startup failed:",
      error
    );
a
    process.exit(1);
  }
};

startServer();``