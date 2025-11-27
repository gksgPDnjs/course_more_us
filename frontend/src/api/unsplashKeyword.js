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
 * → "실내 카페 / 음식 데이트"를 세게 유도
 */
export function buildUnsplashKeyword(course) {
  if (!course) {
    return "Seoul indoor cozy cafe restaurant couple warm light";
  }

  const regionLabel = getRegionLabelFromCourse(course);
  const regionKeyword =
    (regionLabel && REGION_UNSPLASH_KEYWORD[regionLabel]) ||
    "Seoul cozy";

  const mood = course.mood || "";
  const category = course.category || "";

  const firstStep = Array.isArray(course.steps) && course.steps[0];
  const stepType = firstStep?.type || "";

  const text = [mood, category, stepType].join(" ");

  // 1️⃣ 기본적으로는 “실내 데이트 + 음식/카페” 베이스
  let themeCandidates = [
    "indoor cozy cafe restaurant couple date",
    "indoor cozy cafe table for two warm light dessert",
    "indoor cozy restaurant couple talking food on table",
  ];

  // 카페 / 디저트 / 브런치 중심
  if (/(카페|coffee|cozy|브런치|디저트)/i.test(text)) {
    themeCandidates = [
      "indoor cozy cafe interior couple warm lights latte dessert on table",
      "indoor coffee shop couple sitting at table warm light window cozy atmosphere",
      "indoor cozy cafe couple date warm lights coffee cups dessert",
      "indoor cozy cafe interior couple bright warm lights latte dessert on table",
      "indoor coffee shop couple sitting at table soft daylight warm cozy atmosphere",
      "indoor cozy cafe couple date bright warm lights coffee cups dessert",
    ];
  }
  // 맛집 / 식사 / 레스토랑 중심
  else if (/(맛집|food|restaurant|식사|저녁)/i.test(text)) {
    themeCandidates = [
      "indoor romantic restaurant dinner couple warm lights food on table",
      "indoor cozy restaurant couple date warm light wine glasses pasta",
      "indoor dinner date couple sitting at table warm yellow lights",
    ];
  }
  // 한강 / 공원 / 산책 / 야외 → 그래도 “피크닉/테이블” 위주로
  else if (/(한강|river|공원|산책|spot|야외|park)/i.test(text)) {
    themeCandidates = [
      "cozy picnic date couple sitting at table food and drinks warm",
      "outdoor cafe terrace couple date food on table",
      "cozy picnic blanket food and drinks couple date warm sunset",
    ];
  }
  // 전시 / 미술관 / 박물관 → 카페+전시 느낌
  else if (/(전시|뮤지엄|museum|gallery|미술관)/i.test(text)) {
    themeCandidates = [
      "indoor museum cafe cozy couple warm lights coffee on table",
      "gallery cafe couple sitting at table warm light aesthetic interior",
      "indoor artistic cafe couple date warm soft lights",
    ];
  }
  // 기타 → 그냥 실내 데이트
  else {
    themeCandidates = [
      "indoor cozy cafe restaurant couple date warm lights",
      "indoor cozy bar or cafe couple sitting at table warm light",
      "indoor cozy date spot couple talking warm yellow lights",
    ];
  }

  const theme =
    themeCandidates[Math.floor(Math.random() * themeCandidates.length)];

  const keyword = `${regionKeyword} ${theme}`;
  return keyword;
}