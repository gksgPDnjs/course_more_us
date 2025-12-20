
import jwt from "jsonwebtoken";

export function authMiddleware(req, res, next) {
  // Authorization: Bearer <token>
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader || typeof authHeader !== "string") {
    return res.status(401).json({ message: "로그인이 필요합니다." });
  }

  // tolerate case-insensitive "bearer" and extra spaces
  const [schemeRaw, tokenRaw] = authHeader.split(" ");
  const scheme = (schemeRaw || "").trim().toLowerCase();
  const token = (tokenRaw || "").trim();

  if (scheme !== "bearer" || !token) {
    return res.status(401).json({ message: "로그인이 필요합니다." });
  }

  // If JWT_SECRET is missing, every token will fail verification.
  if (!process.env.JWT_SECRET) {
    console.error("❌ JWT_SECRET is missing in environment variables.");
    return res
      .status(500)
      .json({ message: "서버 설정 오류(JWT_SECRET 누락)" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // decoded should contain: { userId, email, iat, exp }
    req.user = decoded;
    return next();
  } catch (err) {
    // Helpful, but still safe, error handling
    if (err?.name === "TokenExpiredError") {
      return res.status(401).json({ message: "토큰이 만료되었습니다." });
    }
    return res.status(401).json({ message: "유효하지 않은 토큰입니다." });
  }
}
