// backend/routes/kakaoRoutes.js
import express from "express";

const router = express.Router();

const KAKAO_IMAGE_URL = "https://dapi.kakao.com/v2/search/image";

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

    return res.json(data);
  } catch (err) {
    console.error("🔥 Kakao proxy server error:", err);
    return res
      .status(500)
      .json({ message: "Kakao 프록시 서버 오류", error: err.message });
  }
});

/**
 * ✅ GET /api/kakao/image?query=...
 * - 카카오 이미지 검색 1장 리턴
 * - 네이버 계열(403 잘 뜨는 도메인) 우선 제외
 */
router.get("/image", async (req, res) => {
  try {
    const query = String(req.query.query || "").trim();
    if (!query) {
      return res.status(400).json({ message: "query 파라미터는 필수입니다." });
    }

    const params = new URLSearchParams({
      query,
      sort: "accuracy",
      page: "1",
      size: "5",
    });

    const url = `${KAKAO_IMAGE_URL}?${params.toString()}`;

    const kakaoRes = await fetch(url, {
      headers: {
        Authorization: `KakaoAK ${process.env.KAKAO_REST_KEY}`,
      },
    });

    const data = await kakaoRes.json().catch(() => ({}));

    if (!kakaoRes.ok) {
      console.error("🔥 Kakao Image API error:", kakaoRes.status, data);
      return res
        .status(kakaoRes.status)
        .json({ message: "Kakao Image API error", data });
    }

    const docs = Array.isArray(data?.documents) ? data.documents : [];

    // ✅ 403 잘 나는 도메인들 우선 피하기
    const blocked = [
      "postfiles.pstatic.net",
      "blogfiles.pstatic.net",
      "postfiles4.naver.net",
      "blogfiles.naver.net",
    ];

    const picked =
      docs.find(
        (d) =>
          d?.image_url && !blocked.some((b) => d.image_url.includes(b))
      ) ||
      docs[0] ||
      null;

    return res.json({ imageUrl: picked?.image_url || null });
  } catch (err) {
    console.error("🔥 Kakao image proxy server error:", err);
    return res
      .status(500)
      .json({ message: "Kakao 이미지 프록시 서버 오류", error: err.message });
  }
});

export default router;