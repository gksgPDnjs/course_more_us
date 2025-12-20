// backend/routes/recommendRoutes.js
import express from "express";
import Course from "../models/Course.js";

const router = express.Router();

/**
 * Kakao Image Search (server-side)
 * - 카카오 검색(이미지) API는 블로그/포스트 이미지가 섞이면 403이 뜰 수도 있어서
 *   "도메인 필터" + "실패 시 null" 처리로 방어합니다.
 */
const KAKAO_KEY = process.env.KAKAO_REST_KEY;
const KAKAO_IMAGE_URL = "https://dapi.kakao.com/v2/search/image";

function assertEnv() {
  if (!KAKAO_KEY) throw new Error("KAKAO_REST_KEY가 설정되어 있지 않습니다.");
}

async function kakaoImageSearchOne(query) {
  try {
    assertEnv();
    const q = String(query || "").trim();
    if (!q) return null;

    const params = new URLSearchParams({
      query: q,
      sort: "accuracy",
      page: "1",
      size: "5", // 후보 여러개 받아서 필터링
    });

    const url = `${KAKAO_IMAGE_URL}?${params.toString()}`;
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${KAKAO_KEY}` },
    });

    if (!res.ok) return null;

    const data = await res.json().catch(() => ({}));
    const docs = Array.isArray(data?.documents) ? data.documents : [];
    if (!docs.length) return null;

    // ✅ 403 잘 나는 도메인/형태를 어느 정도 걸러주기(완벽하진 않음)
    const blocked = [
      "postfiles.pstatic.net",
      "blogfiles.pstatic.net",
      "postfiles4.naver.net",
      "blogfiles.naver.net",
    ];

    const pick = docs.find((d) => {
      const img = d?.image_url || "";
      if (!img) return false;
      return !blocked.some((b) => img.includes(b));
    });

    return (pick?.image_url || docs[0]?.image_url) ?? null;
  } catch (e) {
    console.error("kakaoImageSearchOne error:", e);
    return null;
  }
}

/**
 * GET /api/recommend?city=gangnam
 * - city: region id (예: gangnam, hongdae, yeonnam)
 * - 해당 지역 코스들 중에서 랜덤으로 최대 5개 추천
 *
 * ✅ 변경점:
 * - course.heroImage가 없으면, 카카오 이미지 검색으로 heroImage를 만들어서 응답에 포함
 * - (선택) 새로 얻은 heroImage를 DB에 저장해 캐시처럼 재사용
 */
router.get("/", async (req, res) => {
  try {
    const { city } = req.query;

    if (!city || city === "all") {
      return res.status(400).json({ message: "city 쿼리값이 필요합니다." });
    }

    const courses = await Course.find({ city }).sort({ createdAt: -1 });

    if (courses.length === 0) {
      return res.json([]);
    }

    // 랜덤으로 섞어서 최대 5개만 추천
    const shuffled = courses.sort(() => 0.5 - Math.random());
    const top5 = shuffled.slice(0, 5);

    // ✅ heroImage 붙이기
    const enriched = await Promise.all(
      top5.map(async (courseDoc) => {
        // mongoose doc -> plain object
        const course = courseDoc.toObject ? courseDoc.toObject() : courseDoc;

        // 이미 heroImage 있으면 그대로
        if (course.heroImage) return course;

        // 🔎 검색어 전략
        // 1) 코스 제목 기반
        // 2) + 서울 키워드 강제(다른 지역 튀는거 방지)
        const query = `${course.title} 서울`;

        const heroImage = await kakaoImageSearchOne(query);

        // (선택) DB에 저장해서 다음부터는 검색 안 하게 캐시
        if (heroImage && courseDoc?._id) {
          try {
            await Course.updateOne(
              { _id: courseDoc._id },
              { $set: { heroImage } }
            );
          } catch (e) {
            // 캐시 저장 실패는 치명적 아님
            console.warn("heroImage cache update failed:", e.message);
          }
        }

        return { ...course, heroImage: heroImage || null };
      })
    );

    return res.json(enriched);
  } catch (error) {
    console.error("recommend error:", error);
    return res.status(500).json({ message: "추천 실패" });
  }
});

export default router;