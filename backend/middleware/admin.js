// backend/middleware/admin.js
import User from "../models/User.js";

/**
 * authMiddleware 이후에 사용해야 함
 * (req.user.userId 가 세팅되어 있어야 함)
 */
export async function adminMiddleware(req, res, next) {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ message: "로그인이 필요합니다." });
    }

    const user = await User.findById(req.user.userId);

    if (!user || user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "관리자만 접근할 수 있는 기능입니다." });
    }

    next();
  } catch (error) {
    console.error("adminMiddleware error:", error);
    res
      .status(500)
      .json({ message: "관리자 권한을 확인하는 중 오류가 발생했습니다." });
  }
}