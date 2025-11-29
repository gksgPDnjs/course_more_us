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
      required: true,       // 회원가입에서 항상 받아올 거라 required: true
      unique: true,         // 닉네임 중복 방지
      trim: true,
      minlength: 2,
      maxlength: 20,
    },
    bio: {
      type: String,
      default: "",
      maxlength: 120,       // 한 줄 소개 느낌
      trim: true,
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