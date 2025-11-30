// backend/models/Course.js
import mongoose from "mongoose";

const stepSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    place: { type: String, required: true },
    memo: { type: String, default: "" },
    time: { type: String, default: "" },
    budget: { type: Number, default: 0 },

    // ✅ 카카오 / 주소 관련 필드 (자동 코스용)
    address: { type: String, default: "" },
    kakaoPlaceId: { type: String, default: "" },
    kakaoUrl: { type: String, default: "" },
  },
  { _id: false }
);

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    city: { type: String, required: true },

    // 감성 / 분위기 같은 거 (선택)
    mood: {
      type: String,
      default: "",
    },

    // ✅ 내가 업로드한 대표 이미지 URL (선택)
    heroImageUrl: {
      type: String,
      default: "",
    },

    steps: {
      type: [stepSchema],
      validate: {
        validator(v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: "코스에는 최소 1개의 단계가 필요합니다.",
      },
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    likesCount: {
      type: Number,
      default: 0,
    },

    // ✅ 승인 여부 (관리자가 승인해야 true)
    approved: {
      type: Boolean,
      default: true, // 일단 예전 데이터 안 깨지게 기본 true 로 두고, 나중에 false로 바꿔도 됨
    },

    // ✅ 코스 출처: user / auto
    sourceType: {
      type: String,
      enum: ["user", "auto"],
      default: "user",
    },

    // ✅ 자동 생성 코스일 때 기록용 정보 (예: "kakao:yeouido")
    generatedFrom: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

const Course = mongoose.model("Course", courseSchema);
export default Course;