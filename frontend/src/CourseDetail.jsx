// src/CourseDetail.jsx
import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { SEOUL_REGIONS } from "./data/regions";
import { fetchUnsplashHero } from "./api/unsplash";
import { REGION_UNSPLASH_KEYWORD } from "./api/unsplashRegions";
import { buildUnsplashKeyword } from "./api/unsplashKeyword";

const API_BASE_URL = "http://localhost:4000";

// city(지역 id) -> 라벨 변환
function getRegionLabel(cityId) {
  if (!cityId) return "";
  const region = SEOUL_REGIONS.find((r) => r.id === cityId);
  return region ? region.label : cityId;
}

function CourseDetail() {
  const { id } = useParams(); // /courses/:id
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ❤️ 찜 상태
  const [liked, setLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [likeError, setLikeError] = useState("");

  // 🔐 로그인한 사용자 + 토큰
  const savedUser = localStorage.getItem("currentUser");
  const currentUser = savedUser ? JSON.parse(savedUser) : null;
  const token = localStorage.getItem("token");

  const currentUserId =
    currentUser && (currentUser.id || currentUser._id || currentUser.userId);

  // 내가 작성한 코스인지 여부
  const isOwner =
    !!currentUserId && course && String(currentUserId) === String(course.owner);

  // 🔥 대표 이미지 (Unsplash)
  const [heroUrl, setHeroUrl] = useState(null);
  const [heroLoading, setHeroLoading] = useState(false);

  // ❤️ 이 코스가 내가 찜한 코스인지 확인
  const fetchLikedState = async (courseId) => {
    if (!token) return; // 로그인 안 했으면 체크 안 함

    try {
      const res = await fetch(`${API_BASE_URL}/api/courses/liked/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const list = await res.json().catch(() => []);

      if (!res.ok) {
        console.error("liked/me error:", list);
        return;
      }

      const exists =
        Array.isArray(list) &&
        list.some((c) => String(c._id) === String(courseId));

      setLiked(exists);
    } catch (err) {
      console.error("fetchLikedState error:", err);
    }
  };

  // ❤️ 찜 토글
  const handleToggleLike = async () => {
    if (!token) {
      alert("로그인 후 찜할 수 있어요.");
      return;
    }
    if (!course || !course._id) return;

    try {
      setLikeLoading(true);
      setLikeError("");

      const res = await fetch(
        `${API_BASE_URL}/api/courses/${course._id}/like`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "찜 처리 실패");
      }

      setLiked(Boolean(data.liked));
    } catch (err) {
      console.error("toggle like error:", err);
      setLikeError(err.message || "찜 처리 중 오류가 발생했어요.");
      alert(err.message || "찜 처리 중 오류가 발생했어요.");
    } finally {
      setLikeLoading(false);
    }
  };

  // 👀 최근 본 코스 기록
  const recordRecentView = async (courseId) => {
    if (!token) return;

    try {
      await fetch(`${API_BASE_URL}/api/courses/${courseId}/view`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
    } catch (err) {
      console.error("recordRecentView error:", err);
    }
  };

  // 특정 코스 불러오기
  const fetchCourse = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`${API_BASE_URL}/api/courses/${id}`);
      const data = await res.json().catch(() => null);

      if (!res.ok || !data) {
        throw new Error(data?.message || "코스를 불러오지 못했어요.");
      }

      setCourse(data);

      // 코스가 로딩되면 좋아요 상태 + 최근 본 코스 기록
      const courseId = data._id || id;
      await Promise.all([
        fetchLikedState(courseId),
        recordRecentView(courseId),
      ]);
    } catch (err) {
      console.error("Error fetching course:", err);
      setError(err.message || "코스를 불러오는 중 오류가 발생했어요.");
    } finally {
      setLoading(false);
    }
  };

  // 삭제 기능
  const handleDelete = async () => {
    if (!token) {
      alert("로그인이 필요합니다.");
      return;
    }

    if (!window.confirm("정말 삭제할까요?")) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/courses/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.message || "삭제 실패 😢");
        return;
      }

      alert("삭제되었습니다.");
      window.location.href = "/"; // 목록으로 이동
    } catch (error) {
      console.error("Delete error:", error);
      alert("삭제 실패 😢");
    }
  };

  // 코스 데이터 최초 로딩
  useEffect(() => {
    fetchCourse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /* --------------------------------------
     🔥 Unsplash용 검색어 조합 로직 
     (지역 키워드 + mood + category)
  -------------------------------------- */
  useEffect(() => {
    if (!course) return;

    const keyword = buildUnsplashKeyword(course);
    console.log("🧩 CourseDetail에서 만든 Unsplash keyword:", keyword);

    async function loadHero() {
      setHeroLoading(true);
      const url = await fetchUnsplashHero(keyword);
      console.log("🎨 CourseDetail에서 받은 heroUrl:", url);
      setHeroUrl(url);
      setHeroLoading(false);

    
    }

    loadHero();
  }, [course]);

  // 로딩 중
  if (loading) {
    return (
      <div className="app">
        <p className="text-muted">불러오는 중...</p>
      </div>
    );
  }

  // 에러 or 해당 코스 없음
  if (error || !course) {
    return (
      <div className="app">
        <p>{error || "코스를 찾을 수 없습니다."}</p>
        <Link to="/" className="btn btn-secondary">
          ← 목록으로
        </Link>
      </div>
    );
  }

  const regionLabel = getRegionLabel(course.city || course.location);
  const hasSteps = Array.isArray(course.steps) && course.steps.length > 0;

  return (
    <div className="app">
      <Link to="/" className="btn btn-secondary" style={{ marginBottom: 12 }}>
        ← 목록으로
      </Link>

      {/* ⭐ 대표 이미지 (Unsplash) */}
      <div
        style={{
          marginBottom: 16,
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: "0 18px 40px rgba(15,23,42,0.12)",
          position: "relative",
          background:
            "linear-gradient(135deg,#eef2ff,#fce7f3,#e0f2fe)", 
          minHeight: 180,
        }}
      >
        {heroLoading && (
          <div
            style={{
              width: "100%",
              height: 260,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              color: "#6b7280",
            }}
          >
            이미지 불러오는 중...
          </div>
        )}

        {!heroLoading && heroUrl && (
          <img
            src={heroUrl}
            alt="코스 대표 이미지"
            style={{
              width: "100%",
              height: 260,
              objectFit: "cover",
              display: "block",
            }}
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        )}
      </div>

      <div
        style={{
          marginTop: 4,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <p style={{ color: "#666", margin: 0 }}>
          {regionLabel && <>📍 {regionLabel}</>}{" "}
          {hasSteps && <>· 총 {course.steps.length}단계 코스</>}
        </p>

        {token && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleToggleLike}
            disabled={likeLoading}
            style={{
              minWidth: 96,
              backgroundColor: liked ? "#f97373" : "white",
              color: liked ? "white" : "#111827",
              borderColor: liked ? "#f97373" : "#e5e7eb",
            }}
          >
            {liked ? "💜 찜해둔 코스" : "🤍 찜하기"}
          </button>
        )}
      </div>

      {likeError && (
        <p style={{ marginTop: 4, fontSize: 12, color: "red" }}>{likeError}</p>
      )}

      {/* steps */}
      {hasSteps ? (
        <>
          <hr style={{ margin: "20px 0" }} />

          <h2 className="section-title" style={{ marginBottom: 16 }}>
            데이트 코스 타임라인
          </h2>

          <div className="timeline">
            <div className="timeline-line" />

            {course.steps.map((step, index) => (
              <div key={index} className="timeline-item">
                <div className="timeline-dot-wrapper">
                  <div className="timeline-dot" />
                  <span className="timeline-step-index">{index + 1}단계</span>
                </div>

                <div className="timeline-card">
                  <h3 className="timeline-title">
                    {step.place || "장소 미입력"}
                  </h3>

                  {step.address && (
                    <p
                      style={{
                        marginTop: 4,
                        marginBottom: 8,
                        fontSize: 13,
                        color: "#6b7280",
                      }}
                    >
                      📍 {step.address}
                    </p>
                  )}

                  <div className="timeline-meta">
                    {step.time && (
                      <span className="timeline-tag">⏰ {step.time}</span>
                    )}
                    {step.budget !== undefined &&
                      Number(step.budget) > 0 && (
                        <span className="timeline-tag">
                          💸 {step.budget}원
                        </span>
                      )}
                  </div>

                  {step.memo && (
                    <p className="timeline-memo">{step.memo}</p>
                  )}

                  {step.kakaoUrl && (
                    <a
                      href={step.kakaoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary btn-sm"
                      style={{ marginTop: 8 }}
                    >
                      카카오맵에서 보기
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          {course.location && (
            <p className="course-meta">📍 {course.location}</p>
          )}
          {course.description && (
            <p style={{ marginTop: 16 }}>{course.description}</p>
          )}
        </>
      )}

      {/* 🔥 오직 owner에게만 보이는 버튼들 */}
      {isOwner && (
        <div className="course-actions" style={{ marginTop: 24 }}>
          <button className="btn btn-danger" onClick={handleDelete}>
            삭제
          </button>
        </div>
      )}
    </div>
  );
}

export default CourseDetail;