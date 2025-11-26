// src/data/regions.js

export const SEOUL_REGIONS = [
  {
    id: "all",
    label: "서울 전체",
    keywords: ["서울"],
  },
  {
    id: "gangnam",
    label: "강남/삼성/신사/압구정",
    keywords: ["강남", "삼성", "신사", "압구정"],
  },
  {
    id: "seochogangnam",
    label: "서초/교대/고터/사당",
    keywords: ["서초", "교대", "고터", "사당"],
  },
  {
    id: "songpa",
    label: "잠실/송파/강동",
    keywords: ["잠실", "송파", "강동"],
  },
  {
    id: "hongdae",
    label: "홍대/신촌/마포/연남",
    keywords: ["홍대", "신촌", "마포", "연남"],
  },
  {
    id: "yeouido",
    label: "여의도/영등포",
    keywords: ["여의도", "영등포"],
  },
  {
    id: "yongsan",
    label: "용산/이태원",
    keywords: ["용산", "이태원"],
  },
  {
    id: "jongno",
    label: "종로/경복궁/혜화",
    keywords: ["종로", "경복궁", "혜화"],
  },
];

// 🔥 새로운 UI용 카테고리 묶음
// 완벽한 하루처럼 “대분류 → 소분류 버튼들” 만들 수 있게 구조화
export const SEOUL_REGION_CATEGORIES = [
  {
    category: "서울 전체",
    items: [
      { id: "all", label: "서울 전체" },
    ],
  },
  {
    category: "강남/삼성/신사/압구정",
    items: [
      { id: "gangnam", label: "강남역/신사/압구정" },
    ],
  },
  {
    category: "서초/교대/고터/사당",
    items: [
      { id: "seochogangnam", label: "서초/교대/고터/사당" },
    ],
  },
  {
    category: "잠실/송파/강동",
    items: [
      { id: "songpa", label: "잠실/송파/강동" },
    ],
  },
  {
    category: "홍대/신촌/마포/연남",
    items: [
      { id: "hongdae", label: "홍대/신촌/마포/연남" },
    ],
  },
  {
    category: "여의도/영등포",
    items: [
      { id: "yeouido", label: "여의도/영등포" },
    ],
  },
  {
    category: "용산/이태원",
    items: [
      { id: "yongsan", label: "용산/이태원" },
    ],
  },
  {
    category: "종로/경복궁/혜화",
    items: [
      { id: "jongno", label: "종로/경복궁/혜화" },
    ],
  },
];