// routes/aiRoutes.js
import express from "express";
import { testAi, recommendCourse } from "../controllers/aiController.js";

const router = express.Router();

router.get("/test", testAi);

// ✅ 새로 추가
router.post("/recommend-course", recommendCourse);

export default router;