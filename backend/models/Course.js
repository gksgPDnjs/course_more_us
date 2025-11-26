import mongoose from "mongoose";

const StepSchema = new mongoose.Schema({
  title: { type: String, required: true },      // 단계 이름 (예: "카페", "식사")
  place: { type: String, required: true },      // 장소명
  memo: { type: String, default: "" },          // 한줄 메모
  time: { type: String, default: "" },          // 예: "14:00"
  budget: { type: Number, default: 0 },         // 예산
});

const CourseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },     // 전체 코스 이름
    city: { type: String, required: true },      // 지역
    mood: { type: String, required: true },      // 분위기: 감성, 힙한, 조용한 등

    // ⭐ 핵심: 단계별 코스
    steps: {
      type: [StepSchema],
      validate: v => Array.isArray(v) && v.length > 0,  // 최소 1단계 이상
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    approved: {
      type: Boolean,
      default: false,  // 기본: 관리자 승인 전에는 false
    },
  },
  { timestamps: true }
);

const Course = mongoose.model("Course", CourseSchema);

export default Course;

