import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE_URL } from "./config";

// ✅ 제목별 하드코딩 이미지 매핑
const HARDCODED_IMAGES = {
  // 1열
  "퇴근후 교대 데이트": "/demo-images/song.png",
  "북촌 한옥마을 데이트": "/demo-images/book.png",
  "여의도 퇴근후 데이트": "/demo-images/hedon.png",
  "강남역 방탈출 데이트": "/demo-images/bang.png",

  // 2열
  "강남역 연말 데이트 코스": "/demo-images/cafe.png",
  "연남동 데이트": "/demo-images/yeonnam.png",
  "용산/이태원 코스": "/demo-images/yong.png",
  "연남 이미지테스트": "/demo-images/yongsan.png",
};

// ✅ 업로드 이미지(/uploads/...)만 백엔드 오리진 필요
function resolveImageUrl(url) {
  if (!url) return null;
  if (/^https?:\/\//.test(url)) return url;
  if (url.startsWith("/uploads/")) return `${API_BASE_URL}${url}`;
  return url; // /demo-images/... 같은 정적 경로
}

function CourseCard({
  to,
  imageUrl,
  mood,
  title,
  regionLabel,
  duration,
  budget,
  stepsCount,
  likesCount,
  firstStep,
  isLiked = false,
  onToggleLike,
}) {
  const hardcoded = useMemo(() => HARDCODED_IMAGES[title] || null, [title]);

  // ✅ 1순위: DB imageUrl(업로드/외부URL) → 2순위: 하드코딩
  const initialSrc = useMemo(() => {
    const resolved = resolveImageUrl(imageUrl);
    return resolved || hardcoded;
  }, [imageUrl, hardcoded]);

  const [imgSrc, setImgSrc] = useState(initialSrc);

  // course list re-render 시 src 갱신
  useEffect(() => {
    setImgSrc(initialSrc);
  }, [initialSrc]);

  const handleHeartClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleLike?.();
  };

  return (
    <li className="course-card-wrapper">
      <Link to={to} className="course-card-link" style={{ textDecoration: "none", color: "inherit" }}>
        <article className="course-card-outer">
          {/* 이미지 영역 */}
          <div className="course-card-image-wrap">
            <div className="course-card-image-inner">
              {/* 그라디언트 배경 */}
              <div className="course-card-image-bg" />

              {/* ✅ 대표 이미지 */}
              {imgSrc && (
                <img
                  src={imgSrc}
                  alt={title}
                  className="course-card-image"
                  onError={() => {
                    // ✅ 업로드 이미지가 깨지면 → 하드코딩 이미지로 대체
                    if (hardcoded && imgSrc !== hardcoded) {
                      setImgSrc(hardcoded);
                      return;
                    }
                    // 하드코딩도 실패하면 그냥 이미지 없음 처리
                    setImgSrc(null);
                  }}
                />
              )}

              {/* 분위기 태그 */}
              {mood && <span className="course-card-mood-badge">{mood}</span>}

              {/* ❤️ 찜 */}
              <button
                type="button"
                className={`course-card-like-badge ${isLiked ? "liked" : ""}`}
                onClick={handleHeartClick}
              >
                {isLiked ? "♥" : "♡"}
              </button>
            </div>
          </div>

          {/* 내용 영역 */}
          <div className="course-card-body">
            <h4 className="course-card-title">{title}</h4>

            <div className="course-card-meta-row">
              {regionLabel && <span className="course-card-meta">📍 {regionLabel}</span>}
              {duration && <span className="course-card-meta">⏱ {duration}</span>}
              {budget && <span className="course-card-meta">💰 {budget}</span>}
            </div>

            {firstStep && <p className="course-card-firststep">1단계: {firstStep}</p>}

            <div className="course-card-footer">
              {typeof stepsCount === "number" && stepsCount > 0 && (
                <span className="course-card-footer-meta">{stepsCount}단계 코스</span>
              )}
              {typeof likesCount === "number" && (
                <span className="course-card-footer-meta">♥ {likesCount}</span>
              )}
            </div>
          </div>
        </article>
      </Link>
    </li>
  );
}

export default CourseCard;