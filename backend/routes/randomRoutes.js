// backend/routes/randomRoutes.js
import express from "express";
import Course from "../models/Course.js";

const router = express.Router();

// GET /api/random?city=gangnam  (city 없으면 전체에서 랜덤)
router.get("/", async (req, res) => {
  try {
    const { city } = req.query;

    const query = {};
    if (city) {
      // 🔥 city 필드는 region id 그대로 저장되어 있으니까, 정확히 일치로 검색
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