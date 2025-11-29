// src/CourseCard.jsx
import { Link } from "react-router-dom";

/**
 * 공통 코스 카드 컴포넌트
 *
 * props:
 * - to: 클릭 시 이동할 링크 (예: `/courses/123`)
 * - imageUrl: 대표 이미지 URL (없으면 그라디언트 배경만)
 * - mood: 분위기 태그 (예: "로맨틱" / "auto")
 * - title: 코스 제목
 * - regionLabel: 지역 라벨
 * - duration: 예상 시간 텍스트
 * - budget: 예산 텍스트
 * - stepsCount: 단계 수
 * - likesCount: 좋아요 수 (옵션)
 * - firstStep: 첫 단계 이름
 * - isLiked: 내가 찜했는지 여부 (boolean)
 * - onToggleLike: 하트 눌렀을 때 호출할 함수
 */
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
  const handleHeartClick = (e) => {
    // 카드 전체 링크로 이동되는 것 막기
    e.preventDefault();
    e.stopPropagation();
    if (onToggleLike) {
      onToggleLike();
    }
  };

  return (
    <li className="course-card-wrapper">
      <Link
        to={to}
        className="course-card-link"
        style={{ textDecoration: "none", color: "inherit" }}
      >
        <article className="course-card-outer">
          {/* 이미지 영역 */}
          <div className="course-card-image-wrap">
            <div className="course-card-image-inner">
              {/* 그라디언트 배경 */}
              <div className="course-card-image-bg" />

              {/* 대표 이미지 */}
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt={title}
                  className="course-card-image"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              )}

              {/* 분위기 태그 */}
              {mood && (
                <span className="course-card-mood-badge">
                  {mood}
                </span>
              )}

              {/* ❤️ 찜 아이콘 */}
              <button
                type="button"
                className={`course-card-like-badge ${
                  isLiked ? "liked" : ""
                }`}
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
              {regionLabel && (
                <span className="course-card-meta">
                  📍 {regionLabel}
                </span>
              )}
              {duration && (
                <span className="course-card-meta">⏱ {duration}</span>
              )}
              {budget && (
                <span className="course-card-meta">💰 {budget}</span>
              )}
            </div>

            {firstStep && (
              <p className="course-card-firststep">1단계: {firstStep}</p>
            )}

            <div className="course-card-footer">
              {typeof stepsCount === "number" && stepsCount > 0 && (
                <span className="course-card-footer-meta">
                  {stepsCount}단계 코스
                </span>
              )}
              {typeof likesCount === "number" && (
                <span className="course-card-footer-meta">
                  ♥ {likesCount}
                </span>
              )}
            </div>
          </div>
        </article>
      </Link>
    </li>
  );
}

export default CourseCard;