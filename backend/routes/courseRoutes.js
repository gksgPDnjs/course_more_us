// routes/courseRoutes.js
import express from "express";
import Course from "../models/Course.js";
import User from "../models/User.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

/**
 * 코스 생성: POST /api/courses
 */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { title, city, mood, steps } = req.body;

    if (!title || !city) {
      return res
        .status(400)
        .json({ message: "제목과 도시를 모두 입력해 주세요." });
    }

    if (!Array.isArray(steps) || steps.length === 0) {
      return res
        .status(400)
        .json({ message: "최소 1단계 이상의 코스를 등록해 주세요." });
    }

    if (steps.length > 4) {
      return res
        .status(400)
        .json({ message: "코스는 최대 4단계까지만 등록할 수 있어요." });
    }

    const course = await Course.create({
      title,
      city,
      mood,
      steps,
      owner: req.user.userId,
      approved: false,
    });

    res.status(201).json(course);
  } catch (error) {
    console.error("create course error:", error);
    res.status(500).json({ message: "코스 생성 실패" });
  }
});

/**
 * 코스 목록 조회: GET /api/courses
 */
router.get("/", async (req, res) => {
  try {
    const courses = await Course.find().sort({ createdAt: -1 });
    res.json(courses);
  } catch (error) {
    console.error("get courses error:", error);
    res.status(500).json({ message: "코스 목록 조회 실패" });
  }
});

/**
 * 🔥 내 코스만 조회: GET /api/courses/mine
 */
router.get("/mine", authMiddleware, async (req, res) => {
  try {
    const myCourses = await Course.find({
      owner: req.user.userId,
    }).sort({ createdAt: -1 });

    res.json(myCourses);
  } catch (error) {
    console.error("get my courses error:", error);
    res.status(500).json({ message: "내 코스 목록 조회 실패" });
  }
});

/**
 * ❤️ 내가 찜한 코스 목록: GET /api/courses/liked/me
 */
router.get("/liked/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate("likedCourses");
    if (!user) {
      return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
    }

    res.json(user.likedCourses || []);
  } catch (error) {
    console.error("get liked courses error:", error);
    res.status(500).json({ message: "찜한 코스 목록 조회 실패" });
  }
});

/**
 * 👀 최근 본 코스 목록: GET /api/courses/recent/me
 */
router.get("/recent/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate("recentCourses");
    if (!user) {
      return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
    }

    res.json(user.recentCourses || []);
  } catch (error) {
    console.error("get recent courses error:", error);
    res.status(500).json({ message: "최근 본 코스 목록 조회 실패" });
  }
});

/**
 * 특정 코스 조회: GET /api/courses/:id
 */
router.get("/:id", async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: "코스를 찾을 수 없습니다." });
    }
    res.json(course);
  } catch (error) {
    console.error("get course error:", error);
    res.status(500).json({ message: "코스 조회 실패" });
  }
});

/**
 * ❤️ 찜 토글: POST /api/courses/:id/like
 *  - 이미 찜했으면 취소, 아니면 찜
 *  - 결과: { liked: true/false }
 */
router.post("/:id/like", authMiddleware, async (req, res) => {
  try {
    const courseId = req.params.id;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
    }

    const idx = user.likedCourses.findIndex(
      (cid) => String(cid) === String(courseId)
    );

    let liked;
    if (idx === -1) {
      // 찜 추가
      user.likedCourses.push(courseId);
      liked = true;
    } else {
      // 찜 취소
      user.likedCourses.splice(idx, 1);
      liked = false;
    }

    await user.save();
    res.json({ liked });
  } catch (error) {
    console.error("toggle like error:", error);
    res.status(500).json({ message: "찜 처리 실패" });
  }
});

/**
 * 👀 최근 본 코스 기록: POST /api/courses/:id/view
 *  - user.recentCourses 배열의 맨 앞에 추가
 *  - 중복은 제거하고, 최대 10개까지만 유지
 */
router.post("/:id/view", authMiddleware, async (req, res) => {
  try {
    const courseId = req.params.id;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
    }

    // 기존에 있으면 제거
    user.recentCourses = (user.recentCourses || []).filter(
      (cid) => String(cid) !== String(courseId)
    );

    // 맨 앞에 추가
    user.recentCourses.unshift(courseId);

    // 최대 10개만 유지
    if (user.recentCourses.length > 10) {
      user.recentCourses = user.recentCourses.slice(0, 10);
    }

    await user.save();
    res.json({ ok: true });
  } catch (error) {
    console.error("record recent view error:", error);
    res.status(500).json({ message: "최근 본 코스 기록 실패" });
  }
});

/**
 * 코스 삭제: DELETE /api/courses/:id
 */
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: "코스를 찾을 수 없습니다." });
    }

    // owner만 삭제 가능
    if (String(course.owner) !== req.user.userId) {
      return res.status(403).json({ message: "삭제 권한이 없습니다." });
    }

    await course.deleteOne();
    res.json({ message: "코스를 삭제했습니다." });
  } catch (error) {
    console.error("delete course error:", error);
    res.status(500).json({ message: "코스 삭제 실패" });
  }
});

/**
 * 코스 수정: PUT /api/courses/:id
 *  (지금은 예전 필드 위주이지만, 서버 도는 데 문제 없음)
 */
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { title, category, description, location } = req.body;
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: "코스를 찾을 수 없습니다." });
    }

    // owner만 수정 가능
    if (String(course.owner) !== req.user.userId) {
      return res.status(403).json({ message: "수정 권한이 없습니다." });
    }

    course.title = title ?? course.title;
    course.category = category ?? course.category;
    course.description = description ?? course.description;
    course.location = location ?? course.location;

    const updated = await course.save();
    res.json(updated);
  } catch (error) {
    console.error("update course error:", error);
    res.status(500).json({ message: "코스 수정 실패" });
  }
});

export default router;