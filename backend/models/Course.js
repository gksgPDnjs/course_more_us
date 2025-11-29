// models/Course.js
import mongoose from "mongoose";

const StepSchema = new mongoose.Schema({
  title: { type: String, required: true },      // 단계 이름 (예: "카페", "식사")
  place: { type: String, required: true },      // 장소명(사람이 입력한 경우 or 카카오 place_name)

  memo: { type: String, default: "" },          // 한줄 메모
  time: { type: String, default: "" },          // 예: "14:00"
  budget: { type: Number, default: 0 },         // 예산

  mood: { type: String },
  heroImageUrl: { type: String }, // 사용자가 직접 넣은 대표 이미지

  // 🔍 카카오에서 온 자동 코스일 때 추가로 저장해두면 좋은 정보들 (선택 사항)
  address: { type: String, default: "" },       // 도로명/지번 주소
  kakaoPlaceId: { type: String, default: "" },  // 카카오 place id
  kakaoUrl: { type: String, default: "" },  // 카카오맵 상세 페이지 URL

  imageUrl: { type: String, default: "" },
});

const CourseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },     // 전체 코스 이름
    city: { type: String, required: true },      // 지역 (예: gangnam, hongdae 등 region id)
    mood: { type: String, required: true },      // 분위기: 감성, 힙한, 조용한 등
    imageUrl: {
      type: String, // '/uploads/xxx.jpg' 같은 경로
    },

    // ⭐ 핵심: 단계별 코스
    steps: {
      type: [StepSchema],
      validate: (v) => Array.isArray(v) && v.length > 0, // 최소 1단계 이상
    },

    // 코스를 만든 사람 (나중에 "내 코스" 필터용)
    // 👉 자동 생성 코스는 owner 없이 저장될 수도 있으니 required 제거
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },


    // 사람이 직접 만든 코스인지 / 자동 생성 코스인지 구분
    sourceType: {
      type: String,
      enum: ["user", "auto"],
      default: "user",
    },

    // 자동 생성 코스면, 어떤 기준으로 만들었는지 간단히 기록 (예: "kakao:gangnam")
    generatedFrom: {
      type: String,
      default: "",
    },

    // 나중에 진짜 운영할 때 쓰려고 만들어둔 필드 (지금은 그냥 true/false 정도로)
    approved: {
      type: Boolean,
      default: false, // 기본: 관리자 승인 전에는 false
    },
  },
  { timestamps: true }
);

const Course = mongoose.model("Course", CourseSchema);

export default Course;