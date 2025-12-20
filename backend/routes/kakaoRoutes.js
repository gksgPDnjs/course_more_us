// backend/routes/kakaoRoutes.js
import express from "express";

const router = express.Router();

const KAKAO_IMAGE_URL = "https://dapi.kakao.com/v2/search/image";

// ✅ 403/핫링크로 깨지기 쉬운 도메인들(네이버 계열 등)
const BLOCKED = [
  "postfiles.pstatic.net",
  "blogfiles.pstatic.net",
  "postfiles4.naver.net",
  "blogfiles.naver.net",
  "pstatic.net",
  "naver.net",
];

// ✅ 이미지 품질/비율 점수화해서 "그럴듯한" 걸 고르기
function pickBestImage(docs = []) {
  if (!Array.isArray(docs) || docs.length === 0) return null;

  // 1) blocked 도메인 제외
  const safe = docs.filter((d) => {
    const u = d?.image_url || "";
    if (!u) return false;
    return !BLOCKED.some((b) => u.includes(b));
  });

  const list = safe.length ? safe : docs;

  // 2) 점수 계산
  // - 너무 작은 이미지 배제
  // - 16:9 근처(1.6~2.0) 선호
  // - 해상도 클수록 선호
  const scored = list
    .map((d) => {
      const url = d?.image_url || "";
      const w = Number(d?.width || 0);
      const h = Number(d?.height || 0);
      if (!url) return null;

      // Kakao Image API는 width/height가 들어오는 편인데
      // 혹시 0이면 약하게만 가산점 주기
      const area = w > 0 && h > 0 ? w * h : 0;

      const ratio = w > 0 && h > 0 ? w / h : 0;
      const ratioTarget = 16 / 9; // 1.777...
      const ratioDiff = ratio > 0 ? Math.abs(ratio - ratioTarget) : 999;

      // 기본 점수
      let score = 0;

      // 해상도(큰 것 선호)
      if (area > 0) score += Math.min(area / 500000, 6); // 너무 크면 캡

      // 가로형/히어로에 적합한 비율 선호
      if (ratio > 1.4 && ratio < 2.2) score += 3;
      if (ratioDiff < 0.25) score += 3;
      else if (ratioDiff < 0.5) score += 1;

      // 너무 작은 건 패널티
      if (w > 0 && h > 0) {
        if (w < 700 || h < 450) score -= 4;
        if (w < 500 || h < 320) score -= 8;
      }

      // https 선호
      if (url.startsWith("https://")) score += 0.5;

      return { d, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.d || list[0] || null;
}

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

    if (x && y) {
      params.append("x", String(x));
      params.append("y", String(y));
      params.append("radius", String(radius));
    }

    const url =
      "https://dapi.kakao.com/v2/local/search/keyword.json?" + params.toString();

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
 * - "그럴듯한" 대표 이미지 1장 리턴 (비율/해상도/차단도메인 선별)
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
      size: "10", // ✅ 후보를 넉넉히 받고 선별
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
    const picked = pickBestImage(docs);

    return res.json({
      imageUrl: picked?.image_url || null,
      meta: picked
        ? {
            width: picked.width,
            height: picked.height,
            thumbnail_url: picked.thumbnail_url,
            doc_url: picked.doc_url,
          }
        : null,
    });
  } catch (err) {
    console.error("🔥 Kakao image proxy server error:", err);
    return res
      .status(500)
      .json({ message: "Kakao 이미지 프록시 서버 오류", error: err.message });
  }
});

export default router;