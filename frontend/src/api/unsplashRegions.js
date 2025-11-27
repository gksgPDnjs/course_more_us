// src/api/unsplashRegions.js

// 서울 지역 라벨(한글) → Unsplash 검색용 영어 키워드
// 최대한 "도시 야경" 느낌 단어(city, skyline, river 등) 빼고
// 그냥 동네 이름 + cozy 정도만 둠
export const REGION_UNSPLASH_KEYWORD = {
  "종로/경복궁/혜화": "Jongno Seoul cozy",
  "홍대/신촌/마포/연남": "Hongdae Seoul cozy",
  "강남/역삼/선릉/삼성": "Gangnam Seoul cozy",
  "강남/삼성/신사/압구정": "Gangnam Apgujeong Seoul cozy",
  "여의도/용산/이촌": "Yeouido Seoul cozy",
  "성수/건대/왕십리": "Seongsu Seoul cozy",
  "잠실/송파/강동": "Jamsil Seoul cozy",
  "노원/중랑/강북/도봉": "Seoul cozy neighborhood",
  "신림/관악/동작": "Seoul cozy neighborhood",
  "인천/부천/김포": "Incheon cozy",
  // 필요하면 여기 계속 추가!
};