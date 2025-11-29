// src/api/unsplashKeyword.js
import { SEOUL_REGIONS } from "../data/regions";
import { REGION_UNSPLASH_KEYWORD } from "./unsplashRegions";

// city(지역 id) -> 라벨 변환
export function getRegionLabelFromCourse(course) {
  const cityId = course?.city || course?.regionId || course?.location;
  if (!cityId) return "";
  const region = SEOUL_REGIONS.find((r) => r.id === cityId);
  return region ? region.label : cityId;
}

/**
 * 코스 정보로 Unsplash 검색어 만들기
 * → “밝은 실내 카페/음식 데이트” 쪽으로만 살짝 유도 (너무 복잡 X)
 */
export function buildUnsplashKeyword(course) {
  if (!course) {
    return "Seoul cozy indoor cafe coffee dessert on table date";
  }

  const regionLabel = getRegionLabelFromCourse(course);
  const regionKeyword =
    (regionLabel && REGION_UNSPLASH_KEYWORD[regionLabel]) ||
    "Seoul cozy";

  const mood = course.mood || "";
  const category = course.category || "";

  const firstStep =
    Array.isArray(course.steps) && course.steps.length > 0
      ? course.steps[0]
      : null;

  const stepType = firstStep?.type || "";
  const stepName =
    firstStep?.place?.place_name ||
    firstStep?.place?.name ||
    firstStep?.place ||
    firstStep?.label ||
    "";

  const merged = [mood, category, stepType, stepName]
    .filter(Boolean)
    .join(" ");

  // 기본 테마들 (간단히)
  let suffix = "indoor cafe coffee dessert on table cozy date";

  if (/(카페|coffee|cafe|브런치|디저트|dessert|latte|tea)/i.test(merged)) {
    suffix =
      "bright pastel indoor cafe interior coffee latte and dessert on table cozy date";
  } else if (
    /(맛집|food|restaurant|식사|저녁|점심|lunch|dinner)/i.test(merged)
  ) {
    suffix =
      "indoor cozy restaurant dinner date food and drinks on table warm lights";
  } else if (/(한강|river|공원|park|산책|야외|피크닉|picnic)/i.test(merged)) {
    suffix =
      "cozy picnic date food and drinks on table or outdoor cafe terrace warm light";
  }

  const keyword = `${regionKeyword} ${suffix}`;
  return keyword;
}