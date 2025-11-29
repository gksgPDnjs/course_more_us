// routes/courseRoutes.js
import express from "express";
import Course from "../models/Course.js";
import User from "../models/User.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

/**
 * 코스 생성: POST /api/courses
 * (사용자가 직접 만든 코스)
 */
router.post("/", authMiddleware, async (req, res) => {
  try {
    // 프론트에서 보낸 heroImageUrl 포함해서 구조분해
    const { title, city, mood, heroImageUrl, steps } = req.body;

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
      mood: mood || "",
      heroImageUrl: heroImageUrl || "",
      steps,
      owner: req.user.userId,
      approved: false,
      sourceType: "user",
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
 * 🔥 자동 생성 코스 저장: POST /api/courses/auto
 */
router.post("/auto", authMiddleware, async (req, res) => {
  try {
    const { title, city, mood, steps } = req.body;

    if (!title || !city || !Array.isArray(steps) || steps.length === 0) {
      return res
        .status(400)
        .json({ message: "title, city, steps 는 필수입니다." });
    }

    // 카카오 자동 생성 코스 steps 매핑
    const mappedSteps = steps.map((step) => {
      const placeObj = step.place || step;

      const placeName =
        placeObj.place_name ||
        placeObj.name ||
        placeObj.place ||
        step.place ||
        "장소 이름 없음";

      const address =
        placeObj.road_address_name ||
        placeObj.address_name ||
        placeObj.address ||
        "";

      return {
        title: step.title || step.label || step.type || "코스",
        place: placeName,
        memo: step.memo || "",
        time: step.time || "",
        budget: step.budget ?? 0,
        address,
        kakaoPlaceId: placeObj.id || "",
        kakaoUrl: placeObj.place_url || "",
      };
    });

    const course = new Course({
      title,
      city,
      mood: mood || "자동 생성",
      steps: mappedSteps,
      owner: req.user.userId,
      sourceType: "auto",
      generatedFrom: `kakao:${city}`,
      approved: true,
    });

    const saved = await course.save();
    return res.status(201).json(saved);
  } catch (error) {
    console.error("auto course create error:", error);
    res
      .status(500)
      .json({ message: "자동 코스를 저장하는 중 오류가 발생했습니다." });
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
      user.likedCourses.push(courseId);
      liked = true;
    } else {
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
 */
router.post("/:id/view", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const courseId = req.params.id;

    // 중복 제거
    await User.updateOne(
      { _id: userId },
      { $pull: { recentCourses: courseId } }
    );

    // 맨 앞에 추가
    await User.updateOne(
      { _id: userId },
      {
        $push: {
          recentCourses: {
            $each: [courseId],
            $position: 0,
          },
        },
      }
    );

    // 최대 10개 유지
    await User.updateOne(
      { _id: userId },
      [
        {
          $set: {
            recentCourses: {
              $slice: ["$recentCourses", 10],
            },
          },
        },
      ]
    );

    return res.json({ ok: true });
  } catch (error) {
    console.error("record recent view error:", error);
    return res.status(500).json({ message: "최근 본 코스 기록 실패" });
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
 */
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { title, category, description, location } = req.body;
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: "코스를 찾을 수 없습니다." });
    }

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