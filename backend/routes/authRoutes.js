// routes/authRoutes.js
import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import axios from "axios";
import dotenv from "dotenv";

import User from "../models/User.js";
import { authMiddleware } from "../middleware/auth.js";

dotenv.config();

const router = express.Router();

const KAKAO_REST_KEY = process.env.KAKAO_REST_KEY;
const REDIRECT_URI = "http://localhost:4000/api/auth/kakao/callback";
const FRONT_URL = process.env.FRONT_URL || "http://localhost:5173";

/* ---------------- 카카오 로그인 ---------------- */

// 1) 카카오 로그인 시작
router.get("/kakao", (req, res) => {
  const kakaoAuthURL =
    `https://kauth.kakao.com/oauth/authorize` +
    `?client_id=${KAKAO_REST_KEY}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&response_type=code`;

  return res.redirect(kakaoAuthURL);
});

// 2) 카카오 콜백
router.get("/kakao/callback", async (req, res) => {
  const code = req.query.code;

  try {
    // 2-1) 인가코드 → access_token
    const tokenResponse = await axios.post(
      "https://kauth.kakao.com/oauth/token",
      null,
      {
        params: {
          grant_type: "authorization_code",
          client_id: KAKAO_REST_KEY,
          redirect_uri: REDIRECT_URI,
          code,
        },
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
        },
      }
    );

    const { access_token } = tokenResponse.data;

    // 2-2) access_token 으로 유저 정보 조회
    const userResponse = await axios.get("https://kapi.kakao.com/v2/user/me", {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const kakaoUser = userResponse.data;

    const userEmail =
      kakaoUser.kakao_account?.email ||
      `kakao_${kakaoUser.id}@noemail.com`;

    // 2-3) DB 에서 사용자 찾기
    let user = await User.findOne({ email: userEmail });

    // 없으면 새로 생성
    if (!user) {
      user = await User.create({
        email: userEmail,
        passwordHash: "", // 카카오는 비밀번호 로그인 안 씀
        nickname: kakaoUser.properties?.nickname || "카카오유저",
        provider: "kakao",
      });
    }

    // 2-4) JWT 발급 (일반 로그인과 포맷 맞추기)
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 2-5) 프론트로 리다이렉트
    return res.redirect(`${FRONT_URL}/login/success?token=${token}`);
  } catch (err) {
    console.error("카카오 로그인 오류:", err.response?.data || err);
    return res.redirect(`${FRONT_URL}/login?error=kakao_login_failed`);
  }
});

/* ---------------- 회원가입 ---------------- */

router.post("/register", async (req, res) => {
  try {
    const { email, password, nickname, bio } = req.body;

    if (!email || !password || !nickname) {
      return res
        .status(400)
        .json({ message: "email, password, nickname이 필요합니다." });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const trimmedNickname = nickname.trim();

    const existingEmail = await User.findOne({ email: normalizedEmail });
    if (existingEmail) {
      return res.status(409).json({ message: "이미 가입된 이메일입니다." });
    }

    const existingNickname = await User.findOne({ nickname: trimmedNickname });
    if (existingNickname) {
      return res.status(409).json({ message: "이미 사용 중인 닉네임입니다." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      email: normalizedEmail,
      passwordHash,
      nickname: trimmedNickname,
      bio: bio ? String(bio).trim() : "",
    });

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

/* ---------------- 이메일 로그인 ---------------- */

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

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        nickname: user.nickname,
        bio: user.bio,
      },
    });
  } catch (error) {
    console.error("login error:", error);
    res.status(500).json({ message: "로그인 실패" });
  }
});

/* ---------------- 현재 로그인한 사용자 ---------------- */

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
    }

    return res.json({
      id: user._id,
      email: user.email,
      nickname: user.nickname,
      bio: user.bio,
      role: user.role || "user",
      createdAt: user.createdAt,
    });
  } catch (err) {
    console.error("/api/auth/me error:", err);
    return res.status(500).json({ message: "사용자 정보 조회 실패" });
  }
});

export default router;