import express from "express";
import Course from "../models/Course.js";

const router = express.Router();

// 모든 코스 조회 (GET /api/courses)
router.get("/", async (req, res) => {
  try {
    const courses = await Course.find().sort({ createdAt: -1 });
    res.json(courses);
  } catch (error) {
    console.error("GET /courses error:", error);
    res.status(500).json({ message: "Failed to fetch courses" });
  }
});

// 코스 생성 (POST /api/courses)
router.post("/", async (req, res) => {
  try {
    const { title, category, description, location } = req.body;

    if (!title || !category || !description || !location) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const newCourse = await Course.create({
      title,
      category,
      description,
      location,
    });

    res.status(201).json(newCourse);
  } catch (error) {
    console.error("POST /courses error:", error);
    res.status(500).json({ message: "Failed to create course" });
  }
});

// 특정 코스 상세 조회 (GET /api/courses/:id)
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params; // URL에서 :id 부분 꺼내기

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.json(course);
  } catch (error) {
    console.error("GET /courses/:id error:", error);
    res.status(500).json({ message: "Failed to fetch course" });
  }
});

// 코스 수정 (PUT /api/courses/:id)
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, description, location } = req.body;

    const updatedCourse = await Course.findByIdAndUpdate(
      id,
      { title, category, description, location },
      { new: true } // 업데이트된 최신 문서 반환
    );

    if (!updatedCourse) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.json(updatedCourse);
  } catch (error) {
    console.error("PUT /courses/:id error:", error);
    res.status(500).json({ message: "Failed to update course" });
  }
});

// 코스 삭제 (DELETE /api/courses/:id)
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Course.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.json({ message: "Course deleted successfully" });
  } catch (error) {
    console.error("DELETE /courses/:id error:", error);
    res.status(500).json({ message: "Failed to delete course" });
  }
});


export default router;
