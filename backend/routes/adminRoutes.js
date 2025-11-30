// backend/routes/adminRoutes.js
import express from "express";
import Course from "../models/Course.js";
import { authMiddleware } from "../middleware/auth.js";
import { adminMiddleware } from "../middleware/admin.js";

const router = express.Router();

/**
 * ✅ 1) 모든 코스 목록 (관리자용)
 * GET /api/admin/courses
 */
router.get(
  "/courses",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const courses = await Course.find({})
        .populate("owner", "email nickname role")
        .sort({ createdAt: -1 });

      res.json(courses);
    } catch (error) {
      console.error("admin list courses error:", error);
      res
        .status(500)
        .json({ message: "코스 목록을 불러오는 중 오류가 발생했습니다." });
    }
  }
);

/**
 * ✅ 2) 미승인 코스만 보기
 * GET /api/admin/courses/pending
 */
router.get(
  "/courses/pending",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const courses = await Course.find({ approved: false })
        .populate("owner", "email nickname")
        .sort({ createdAt: -1 });

      res.json(courses);
    } catch (error) {
      console.error("admin pending courses error:", error);
      res
        .status(500)
        .json({ message: "미승인 코스를 불러오는 중 오류가 발생했습니다." });
    }
  }
);

/**
 * ✅ 3) 승인 / 승인 취소 토글
 * PATCH /api/admin/courses/:id/approve
 * body: { approved: true }  또는 { approved: false }
 */
router.patch(
  "/courses/:id/approve",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { approved } = req.body;

      const course = await Course.findByIdAndUpdate(
        req.params.id,
        { approved: !!approved },
        { new: true }
      );

      if (!course) {
        return res.status(404).json({ message: "코스를 찾을 수 없습니다." });
      }

      res.json(course);
    } catch (error) {
      console.error("admin approve course error:", error);
      res
        .status(500)
        .json({ message: "코스 승인 상태를 변경하는 중 오류가 발생했습니다." });
    }
  }
);

/**
 * ✅ 4) 관리자용 강제 삭제
 * DELETE /api/admin/courses/:id
 */
router.delete(
  "/courses/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const course = await Course.findById(req.params.id);

      if (!course) {
        return res.status(404).json({ message: "코스를 찾을 수 없습니다." });
      }

      await course.deleteOne();
      res.json({ message: "코스를 삭제했습니다." });
    } catch (error) {
      console.error("admin delete course error:", error);
      res
        .status(500)
        .json({ message: "코스를 삭제하는 중 오류가 발생했습니다." });
    }
  }
);

export default router;