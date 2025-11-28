// index.js
import mongoose from "mongoose";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import Course from "./models/Course.js";
import courseRoutes from "./routes/courseRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import recommendRoutes from "./routes/recommendRoutes.js";
import randomRoutes from "./routes/randomRoutes.js";
import kakaoRoutes from "./routes/kakaoRoutes.js";

dotenv.config();
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI missing in .env");
  process.exit(1);
}

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/courses", courseRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/recommend", recommendRoutes);
app.use("/api/random", randomRoutes);
app.use("/api/kakao", kakaoRoutes);

// 테스트용 기본 라우트
app.get("/", (req, res) => {
  res.send("Course-more-us API is running!");
});

// 서버 실행

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});