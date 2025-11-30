// models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    // ✅ 비밀번호 해시
    passwordHash: {
      type: String,
      required: true,
    },

    // ✅ 새로 추가된 필드들
    nickname: {
      type: String,
      required: false,         // <-- 필수 지우기
      default: "",             // 기본값 빈 문자열
    },
    bio: {
      type: String,
      default: "",
      maxlength: 120,       // 한 줄 소개 느낌
      trim: true,
    },
    // 🔥 권한
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    // 찜/최근 본 코스 관련 필드들 (기존 그대로)
    favorites: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
    ],
    likedCourses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
      },
    ],
    recentCourses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
      },
    ],
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;