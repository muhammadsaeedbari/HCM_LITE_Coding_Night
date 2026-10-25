import express from "express";

import {
  firstSetup,
  getSetupStatus
} from "../controllers/setup.controller.js";

const router = express.Router();

router.get("/status", getSetupStatus);

router.post("/", firstSetup);

export default router;