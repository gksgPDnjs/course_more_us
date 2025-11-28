// src/api/unsplash.js

const ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;

console.log("🔑 Unsplash ACCESS_KEY in unsplash.js:", ACCESS_KEY);

/**
 * Unsplash에서 대표 이미지를 한 장 가져오는 함수
 * - Unsplash photos/random 사용
 * - 결과가 마음에 안 들면 null 리턴 → 카드에서는 그라디언트만 보이도록
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

    // 🚫 "간판/외관/길거리/포스터/광고" 느낌 강한 사진들 최대한 제외
    const NEGATIVE =
      /(crosswalk|intersection|highway|station|subway|train|railway|platform|signboard|sign|banner|poster|billboard|advertisement|ad|sale|discount|storefront|shop exterior|road|alley|stall|overpass|skyline|cityscape|traffic)/i;

    function getText(photo) {
      const desc = photo.description || "";
      const alt = photo.alt_description || "";
      const tags =
        Array.isArray(photo.tags) && photo.tags.length
          ? photo.tags.map((t) => t.title || "").join(" ")
          : "";
      return `${desc} ${alt} ${tags}`;
    }

    // 1차: “거리/간판/외관” 느낌이 강한 것들 제거 (이건 강하게 유지)
    let candidates = results.filter((photo) => {
      const text = getText(photo);
      return !NEGATIVE.test(text);
    });

    // 2차: 실내/카페/데이트 느낌이 나면 *가산점*을 주되,
    //     없다고 해서 버리지는 않음 (완화된 필터)
    const POSITIVE =
      /(indoor|interior|table|dining|dinner|cafe|coffee|restaurant|brunch|dessert|couple|date|cozy)/i;

    const positiveList = candidates.filter((photo) => {
      const text = getText(photo);
      return POSITIVE.test(text);
    });

    // 긍정 키워드가 하나라도 있으면 그것만 사용
    if (positiveList.length > 0) {
      candidates = positiveList;
    }

    // 그래도 비었으면 → 처음 결과 전체라도 사용 (최종 fallback)
    if (!candidates.length) {
      candidates = results;
    }

    // 최종 후보 중에서 랜덤 1개 선택
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

/**
 * 코스 정보로부터 Unsplash 검색 키워드 만들기
 * RecommendPage에서 카드 썸네일용으로 사용
 */
export function buildUnsplashKeyword(course) {
  const base = "Seoul cozy indoor date";

  if (!course) return base;

  const parts = [];

  if (course.mood) parts.push(course.mood);
  if (course.title) parts.push(course.title);
  // city(지역 id)가 들어있으면 살짝 힌트 정도만
  if (course.city) parts.push(course.city);

  const keyword = parts.join(" ").trim();
  return keyword.length > 0 ? `${keyword} date course` : base;
}

/**
 * RecommendPage에서 쓰는 이름과 맞추기 위한 래퍼 함수
 * 내부에서는 위에서 만든 fetchUnsplashHero를 그대로 사용
 */
export async function fetchUnsplashImage(keyword) {
  return fetchUnsplashHero(keyword);
}