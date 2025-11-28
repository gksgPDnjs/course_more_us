// BACKEND/routes/kakaoRoutes.js
import express from "express";

const router = express.Router();

// GET /api/kakao/search?query=...&x=...&y=...&radius=5000&size=15
router.get("/search", async (req, res) => {
  try {
    const { query, x, y, radius = 5000, size = 15 } = req.query;

    if (!query) {
      return res.status(400).json({ message: "query 파라미터는 필수입니다." });
    }

    const params = new URLSearchParams({
      query,
      size: String(size),
    });

    // x, y 있으면 중심좌표 검색
    if (x && y) {
      params.append("x", String(x));
      params.append("y", String(y));
      params.append("radius", String(radius));
    }

    const url =
      "https://dapi.kakao.com/v2/local/search/keyword.json?" +
      params.toString();

    // ✅ Node 18+ 에서 제공하는 전역 fetch 사용 (node-fetch 필요 X)
    const kakaoRes = await fetch(url, {
      headers: {
        Authorization: `KakaoAK ${process.env.KAKAO_REST_KEY}`,
      },
    });

    const data = await kakaoRes.json().catch(() => ({}));

    if (!kakaoRes.ok) {
      console.error("🔥 Kakao API error:", kakaoRes.status, data);
      return res
        .status(kakaoRes.status)
        .json({ message: "Kakao API error", data });
    }

    res.json(data);
  } catch (err) {
    console.error("🔥 Kakao proxy server error:", err);
    res
      .status(500)
      .json({ message: "Kakao 프록시 서버 오류", error: err.message });
  }
});

export default router;