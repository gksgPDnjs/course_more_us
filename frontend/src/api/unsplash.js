// src/api/unsplash.js

const ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;

console.log("🔑 Unsplash ACCESS_KEY in unsplash.js:", ACCESS_KEY);

/**
 * Unsplash에서 대표 이미지를 한 장 가져오는 함수
 * - Unsplash photos/random 만 사용
 * - 결과가 마음에 안 들면 null 리턴 → 컴포넌트에서 배경 그라디언트만 보이도록
 * @param {string} keyword - 검색어 (예: "Hongdae cozy cafe date")
 * @returns {Promise<string|null>} 이미지 URL 또는 null
 */
export async function fetchUnsplashHero(keyword) {
  if (!ACCESS_KEY) {
    console.warn(
      "⚠️ VITE_UNSPLASH_ACCESS_KEY가 설정되어 있지 않습니다. .env 파일을 확인해주세요."
    );
    return null;
  }

  const baseQuery = "Seoul indoor cozy cafe restaurant date warm light";
  const query =
    keyword && keyword.trim().length > 0 ? keyword.trim() : baseQuery;

  console.log("📸 Unsplash 랜덤 검색어:", query);

  try {
    // Unsplash 랜덤 API 사용
    const url = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(
      query
    )}&orientation=landscape&content_filter=high&count=6&client_id=${ACCESS_KEY}`;

    console.log("🌐 Unsplash RANDOM 요청 URL:", url);

    const res = await fetch(url);
    console.log("📥 Unsplash RANDOM 응답 status:", res.status);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("Unsplash RANDOM 요청 실패:", res.status, text);
      return null;
    }

    const data = await res.json().catch(() => null);
    if (!data) {
      console.error("Unsplash RANDOM JSON 파싱 실패");
      return null;
    }

    // photos/random: 단일 객체 또는 배열
    const results = Array.isArray(data) ? data : [data];

    if (!results.length) {
      console.warn("⚠️ Unsplash RANDOM 결과가 비어있습니다.", data);
      return null;
    }

    // 🚫 너무 거리/간판/역 같은 느낌만 살짝 제외 (필터는 느슨하게)
    const NEGATIVE =
      /(street|crosswalk|intersection|highway|station|subway|train|railway|platform|signboard|billboard|bridge|overpass|skyline|cityscape|traffic)/i;

    function getText(photo) {
      const desc = photo.description || "";
      const alt = photo.alt_description || "";
      const tags =
        Array.isArray(photo.tags) && photo.tags.length
          ? photo.tags.map((t) => t.title || "").join(" ")
          : "";
      return `${desc} ${alt} ${tags}`;
    }

    // 1차: “너무 거리/간판 느낌” 아닌 사진만
    let candidates = results.filter((photo) => {
      const text = getText(photo);
      return !NEGATIVE.test(text);
    });

    // 2차: 그래도 없으면 그냥 전체 결과 중에서 고름
    if (!candidates.length) {
      candidates = results;
    }

    const idx = Math.floor(Math.random() * candidates.length);
    const chosen = candidates[idx];

    if (!chosen || !chosen.urls) {
      console.warn("Unsplash 결과에 urls가 없습니다. data:", chosen);
      return null;
    }

    const imgUrl = chosen.urls.regular || chosen.urls.small || null;
    console.log("✅ Unsplash 최종 선택 이미지 URL:", imgUrl);
    return imgUrl;
  } catch (err) {
    console.error("Unsplash RANDOM 통신 에러:", err);
    return null;
  }
}