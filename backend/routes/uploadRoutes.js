// routes/uploadRoutes.js
import express from "express";
import multer from "multer";
import path from "path";

const router = express.Router();

// 업로드 폴더와 파일명 규칙
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, "uploads/"); // 프로젝트 루트에 /uploads 폴더
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({ storage });

// POST /api/upload/image  (필드 이름: image)
router.post("/image", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "업로드된 파일이 없습니다." });
  }

  const url = `/uploads/${req.file.filename}`; // 프론트에서 사용할 경로
  res.json({ url });
});

export default router;