// src/api/unsplash.js

const ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;

// keyword별로 여러 장의 후보 이미지를 저장하는 캐시
// key: string(keyword), value: { urls: string[], index: number }
const unsplashCache = new Map();

/** 간단한 문자열 해시 → 0 이상 정수 */
function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * Unsplash에서 대표 이미지를 한 장 가져오는 함수
 * - 같은 keyword에 대해 처음 한 번만 API 호출
 * - 여러 장 받아서 캐시에 저장
 * - seed(코스 id 등)를 이용해서 각 코스마다 다른 인덱스를 고름
 *
 * @param {string} keyword - 검색어
 * @param {string} [seed] - 같은 keyword 안에서 서로 다른 이미지를 쓰고 싶을 때 사용 (course id 등)
 * @returns {Promise<string|null>} 이미지 URL 또는 null
 */
export async function fetchUnsplashHero(keyword, seed) {
  if (!ACCESS_KEY) {
    console.warn(
      "⚠️ VITE_UNSPLASH_ACCESS_KEY가 설정되어 있지 않습니다. .env 파일을 확인해주세요."
    );
    return null;
  }

  const baseQuery = "Seoul indoor cozy cafe restaurant date warm light";
  const cleanKeyword =
    keyword && keyword.trim().length > 0 ? keyword.trim() : baseQuery;
  const cacheKey = cleanKeyword;

  // 1️⃣ 캐시에 이미지가 이미 있으면, 거기서 하나 골라서 반환
  const cached = unsplashCache.get(cacheKey);
  if (cached && Array.isArray(cached.urls) && cached.urls.length > 0) {
    const { urls } = cached;

    let idx = 0;
    if (seed && urls.length > 1) {
      // 같은 seed면 항상 같은 인덱스 → 같은 코스면 같은 이미지, 다른 코스면 보통 다른 이미지
      idx = hashString(String(seed)) % urls.length;
    } else {
      // seed 없으면 순서대로 돌려쓰기
      idx = cached.index % urls.length;
      cached.index += 1;
    }

    return urls[idx];
  }

  // 2️⃣ 캐시에 없으면 Unsplash에 한 번만 요청해서 여러 장 받아오기
  try {
    const url =
      `https://api.unsplash.com/photos/random` +
      `?query=${encodeURIComponent(cleanKeyword)}` +
      `&orientation=landscape` +
      `&content_filter=high` +
      `&count=8` +
      `&client_id=${ACCESS_KEY}`;

    const res = await fetch(url);
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

    const results = Array.isArray(data) ? data : [data];
    if (!results.length) {
      console.warn("⚠️ Unsplash RANDOM 결과가 비어있습니다.", data);
      return null;
    }

    // ---------- 필터 로직 (살짝 완화된 버전) ----------

    const NEGATIVE =
      /(crosswalk|intersection|highway|station|subway|train|railway|platform|signboard|sign\b|banner|poster|billboard|advertisement|ad\b|sale|discount|storefront|shop exterior|road|alley|stall|overpass|skyline|cityscape|traffic)/i;

    function getText(photo) {
      const desc = photo.description || "";
      const alt = photo.alt_description || "";
      const tags =
        Array.isArray(photo.tags) && photo.tags.length
          ? photo.tags.map((t) => t.title || "").join(" ")
          : "";
      return `${desc} ${alt} ${tags}`;
    }

    let candidates = results.filter((photo) => {
      const text = getText(photo);
      return !NEGATIVE.test(text);
    });

    const POSITIVE =
      /(indoor|interior|table|dining|dinner|cafe|coffee|restaurant|brunch|dessert|couple|date)/i;

    const positiveList = candidates.filter((photo) => {
      const text = getText(photo);
      return POSITIVE.test(text);
    });

    if (positiveList.length > 0) {
      candidates = positiveList;
    }

    if (!candidates.length) {
      candidates = results;
    }

    const urls = candidates
      .map((photo) => photo?.urls?.regular || photo?.urls?.small || null)
      .filter(Boolean);

    if (!urls.length) {
      console.warn("Unsplash 결과에 usable URL이 없습니다.", candidates);
      return null;
    }

    // seed 기준으로 첫 인덱스 선택
    let firstIdx = 0;
    if (seed && urls.length > 1) {
      firstIdx = hashString(String(seed)) % urls.length;
    }

    unsplashCache.set(cacheKey, {
      urls,
      index: firstIdx + 1, // 다음 호출용
    });

    return urls[firstIdx];
  } catch (err) {
    console.error("Unsplash RANDOM 통신 에러:", err);
    return null;
  }
}

/** 이름만 다른 래퍼 (기존 코드 호환용) */
export async function fetchUnsplashImage(keyword, seed) {
  return fetchUnsplashHero(keyword, seed);
}