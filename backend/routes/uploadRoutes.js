// routes/uploadRoutes.js
import express from "express";
import multer from "multer";
import path from "path";

const router = express.Router();

// 업로드 폴더 & 파일명 규칙
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, "uploads/"); // 프로젝트 root/uploads 폴더
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({ storage });

// ★ 여기 수정
router.post("/image", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "업로드된 파일이 없습니다." });
  }

  // 개발 환경용: 나중에 .env 로 빼도 됨
  const BASE_URL = "http://localhost:4000";

  const url = `${BASE_URL}/uploads/${req.file.filename}`;
  res.json({ url });
});

export default router;