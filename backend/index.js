// backend/index.js
import mongoose from "mongoose";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import courseRoutes from "./routes/courseRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import recommendRoutes from "./routes/recommendRoutes.js";
import randomRoutes from "./routes/randomRoutes.js";
import kakaoRoutes from "./routes/kakaoRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";

dotenv.config();
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI missing in .env");
  process.exit(1);
}

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

const app = express();

// 기본 미들웨어
app.use(cors());
app.use(express.json());

// 업로드된 파일 정적 제공 (http://localhost:4000/uploads/파일명)
app.use("/uploads", express.static("uploads"));

// API 라우트들
app.use("/api/courses", courseRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/recommend", recommendRoutes);
app.use("/api/random", randomRoutes);
app.use("/api/kakao", kakaoRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/ai", aiRoutes);

// 테스트용 루트
app.get("/", (req, res) => {
  res.send("Course-more-us API is running!");
});

// 서버 시작
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});