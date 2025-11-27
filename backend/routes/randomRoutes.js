// backend/routes/randomRoutes.js
import express from "express";
import Course from "../models/Course.js";

const router = express.Router();

/**
 * GET /api/random?city=gangnam
 * - city 없으면 전체에서 랜덤
 * - city 있으면 해당 city(예: "gangnam")에 해당하는 코스들 중에서 랜덤
 * - 자동생성 코스(sourceType: "auto") + 사람이 만든 코스(sourceType: "user") 모두 포함
 */
router.get("/", async (req, res) => {
  try {
    const { city } = req.query;

    const query = {};
    if (city) {
      // city 필드는 region id 그대로 저장되어 있으니까 정확히 일치 검색
      query.city = city; // 예: "gangnam"
    }

    const courses = await Course.find(query);

    if (courses.length === 0) {
      return res.json(null);
    }

    const randomCourse =
      courses[Math.floor(Math.random() * courses.length)];

    return res.json(randomCourse);
  } catch (error) {
    console.error("random error:", error);
    return res.status(500).json({ message: "랜덤 추천 실패" });
  }
});

export default router;