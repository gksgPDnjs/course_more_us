// routes/authRoutes.js
import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

// 회원가입: POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { email, password, nickname, bio } = req.body;

    // 필수값 체크
    if (!email || !password || !nickname) {
      return res
        .status(400)
        .json({ message: "email, password, nickname이 필요합니다." });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const trimmedNickname = nickname.trim();

    // 이미 존재하는 이메일인지 확인
    const existingEmail = await User.findOne({ email: normalizedEmail });
    if (existingEmail) {
      return res.status(409).json({ message: "이미 가입된 이메일입니다." });
    }

    // 이미 존재하는 닉네임인지 확인
    const existingNickname = await User.findOne({ nickname: trimmedNickname });
    if (existingNickname) {
      return res.status(409).json({ message: "이미 사용 중인 닉네임입니다." });
    }

    // 비밀번호 해시 생성
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      email: normalizedEmail,
      passwordHash,
      nickname: trimmedNickname,
      bio: bio ? String(bio).trim() : "",
    });

    // (기존 동작 유지: 회원가입에서는 토큰 안 주고, 기본 정보만 반환)
    res.status(201).json({
      id: user._id,
      email: user.email,
      nickname: user.nickname,
      bio: user.bio,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error("register error:", error);
    res.status(500).json({ message: "회원가입 실패" });
  }
});

// 로그인: POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "email과 password가 필요합니다." });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res
        .status(401)
        .json({ message: "이메일 또는 비밀번호가 올바르지 않습니다." });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res
        .status(401)
        .json({ message: "이메일 또는 비밀번호가 올바르지 않습니다." });
    }

    // JWT 토큰 발급
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" } // 7일짜리 토큰
    );

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        nickname: user.nickname, // ✅ 추가
        bio: user.bio,           // ✅ 추가
      },
    });
  } catch (error) {
    console.error("login error:", error);
    res.status(500).json({ message: "로그인 실패" });
  }
});

export default router;