// index.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// 테스트용 기본 라우트
app.get("/", (req, res) => {
  res.send("Course-more-us API is running!");
});

// 서버 실행
app.listen(4000, () => {
  console.log("Server running on http://localhost:4000");
});
