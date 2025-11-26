// backend/routes/recommendRoutes.js
import express from "express";
import Course from "../models/Course.js";

const router = express.Router();

/**
 * GET /api/recommend?city=gangnam
 * - city: region id (예: gangnam, hongdae, yeonnam)
 * - 해당 지역 코스들 중에서 랜덤으로 최대 5개 추천
 */
router.get("/", async (req, res) => {
  try {
    const { city } = req.query;

    if (!city || city === "all") {
      return res
        .status(400)
        .json({ message: "city 쿼리값이 필요합니다." });
    }

    const courses = await Course.find({ city }).sort({ createdAt: -1 });

    if (courses.length === 0) {
      return res.json([]);
    }

    // 랜덤으로 섞어서 최대 5개만 추천
    const shuffled = courses.sort(() => 0.5 - Math.random());
    const top5 = shuffled.slice(0, 5);

    return res.json(top5);
  } catch (error) {
    console.error("recommend error:", error);
    return res.status(500).json({ message: "추천 실패" });
  }
});

export default router;