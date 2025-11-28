// src/CourseCard.jsx
import { Link } from "react-router-dom";

/**
 * 공통 코스 카드 컴포넌트
 *
 * props:
 * - to: 클릭 시 이동할 링크 (예: `/courses/123`)
 * - imageUrl: 대표 이미지 URL (없으면 그라디언트 배경만)
 * - mood: 분위기 태그 (예: "로맨틱")
 * - title: 코스 제목
 * - regionLabel: 지역 라벨 (예: "종로/경복궁/혜화")
 * - duration: 예상 시간 텍스트 (예: "4-5시간")
 * - budget: 예산 텍스트 (예: "8만원")
 * - stepsCount: 단계 수 (예: 3)
 * - likesCount: 좋아요 수 (예: 245)
 * - firstStep: 첫 단계 이름 (예: "카페 도노라")
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
}) {
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
              {/* 항상 깔리는 그라디언트 배경 */}
              <div className="course-card-image-bg" />

              {/* 있으면 그 위에 덮어씌우는 실제 이미지 */}
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt={title}
                  className="course-card-image"
                  onError={(e) => {
                    // 에러 나면 이미지만 숨기고 그라디언트만 보이게
                    e.target.style.display = "none";
                  }}
                />
              )}

              {/* 분위기 태그 */}
              {mood && (
                <span className="course-card-mood-badge">{mood}</span>
              )}

              {/* 찜 아이콘 자리 (나중에 실제 기능 연결) */}
              <button
                type="button"
                className="course-card-like-badge"
                onClick={(e) => {
                  e.preventDefault(); // 카드 이동 막기
                  alert("나중에 찜 기능이 여기 연결될 예정이에요 😊");
                }}
              >
                ♥
              </button>
            </div>
          </div>

          {/* 내용 영역 */}
          <div className="course-card-body">
            <h4 className="course-card-title">{title}</h4>

            <div className="course-card-meta-row">
              {regionLabel && (
                <span className="course-card-meta">📍 {regionLabel}</span>
              )}
              {duration && (
                <span className="course-card-meta">⏱ {duration}</span>
              )}
              {budget && <span className="course-card-meta">💰 {budget}</span>}
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