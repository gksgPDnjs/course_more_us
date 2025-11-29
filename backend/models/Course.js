// backend/models/Course.js
import mongoose from "mongoose";

const stepSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    place: { type: String, required: true },
    memo: { type: String, default: "" },
    time: { type: String, default: "" },
    budget: { type: Number, default: 0 },
  },
  { _id: false }
);

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    city: { type: String, required: true },

    // ❗️이제 필수 아님 (required 빼기!)
    mood: {
      type: String,
      default: "",
    },

    // ✅ 내가 업로드한 대표 이미지 URL (없어도 됨)
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
  },
  { timestamps: true }
);

const Course = mongoose.model("Course", courseSchema);
export default Course;