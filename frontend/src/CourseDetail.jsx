// src/CourseDetail.jsx
import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { SEOUL_REGIONS } from "./data/regions";
import { fetchUnsplashHero } from "./api/unsplash";
import { buildUnsplashKeyword } from "./api/unsplashKeyword";
import { API_BASE_URL } from "./config";
//const API_BASE_URL = "http://localhost:4000";

/** 업로드 이미지 / 일반 URL을 모두 처리하는 헬퍼 */
function resolveImageUrl(url) {
  if (!url) return null;
  if (url.startsWith("http")) return url; // 이미 완전한 주소면 그대로
  return `${API_BASE_URL}${url}`; // /uploads/xxx → http://localhost:4000/uploads/xxx
}

// city(지역 id) -> 라벨 변환
function getRegionLabel(cityId) {
  if (!cityId) return "";
  const region = SEOUL_REGIONS.find((r) => r.id === cityId);
  return region ? region.label : cityId;
}

// 🔎 스텝 정보 정리 + 카카오맵 URL 보정
function getStepInfo(step) {
  if (!step) {
    return {
      name: "장소 미입력",
      addr: "",
      url: "",
      time: "",
      budget: 0,
      memo: "",
    };
  }

  const name = step.place || step.title || "장소 미입력";
  const addr = step.address || "";

  let url = step.kakaoUrl || step.url || "";
  const placeId = step.kakaoPlaceId || step.placeId;
  if (!url && placeId) {
    url = `https://place.map.kakao.com/${placeId}`;
  }

  return {
    name,
    addr,
    url,
    time: step.time || "",
    budget: step.budget ?? 0,
    memo: step.memo || "",
  };
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

  // 🎨 대표 이미지 (업로드 or Unsplash)
  const [heroUrl, setHeroUrl] = useState(null);
  const [heroLoading, setHeroLoading] = useState(false);

  // ❤️ 이 코스가 내가 찜한 코스인지 확인
  const fetchLikedState = async (courseId) => {
    if (!token) return;

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
      window.location.href = "/";
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
     🔥 대표 이미지 로딩 (업로드 > Unsplash)
  -------------------------------------- */
  useEffect(() => {
    if (!course) return;

    const manualRaw =
      course.heroImageUrl || course.imageUrl || course.thumbnailUrl || "";

    const manualResolved = resolveImageUrl(manualRaw);

    if (manualResolved) {
      setHeroUrl(manualResolved);
      setHeroLoading(false);
      return;
    }

    const keyword = buildUnsplashKeyword(course);
    console.log("🧩 CourseDetail에서 만든 Unsplash keyword:", keyword);

    let cancelled = false;

    async function loadHero() {
      try {
        setHeroLoading(true);
        const url = await fetchUnsplashHero(keyword);
        if (!cancelled) {
          console.log("🎨 CourseDetail에서 받은 heroUrl:", url);
          setHeroUrl(url);
        }
      } catch (e) {
        if (!cancelled) {
          console.warn("CourseDetail Unsplash 실패:", e);
        }
      } finally {
        if (!cancelled) setHeroLoading(false);
      }
    }

    loadHero();

    return () => {
      cancelled = true;
    };
  }, [course]);

  // 로딩 / 에러 처리
  if (loading) {
    return (
      <div className="app">
        <p className="text-muted">불러오는 중...</p>
      </div>
    );
  }

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
  const totalSteps = hasSteps ? course.steps.length : 0;
  const moodLabel = course.mood || "내 코스";

  return (
    <div className="auto-detail-page">
      {/* ===== 상단 히어로 영역 (Auto와 동일 레이아웃) ===== */}
      <section className="auto-detail-hero">
        <div className="auto-detail-hero-image-wrap">
          <div className="auto-detail-hero-bg" />
          {!heroLoading && heroUrl && (
            <img
              src={heroUrl}
              alt="코스 대표 이미지"
              className="auto-detail-hero-image"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          )}
        </div>

        <div className="auto-detail-hero-content">
          <p className="auto-detail-badge">{moodLabel}</p>
          <h1 className="auto-detail-title">{course.title}</h1>
          <p className="auto-detail-submeta">
            {regionLabel && <>📍 {regionLabel}</>} ·{" "}
            {hasSteps ? `총 ${totalSteps}단계 코스` : "단계 정보 없음"}
          </p>

          <div className="auto-detail-hero-buttons">
            <Link
              to="/"
              className="btn btn-secondary btn-sm"
              style={{ fontSize: 12 }}
            >
              ← 코스 목록으로
            </Link>

            {token && (
              <button
                type="button"
                onClick={handleToggleLike}
                disabled={likeLoading}
                className={`btn btn-secondary btn-sm auto-detail-like-btn ${
                  liked ? "liked" : ""
                }`}
              >
                {liked ? "💜 찜해둔 코스" : "🤍 찜하기"}
              </button>
            )}

            {isOwner && (
              <button
                type="button"
                onClick={handleDelete}
                className="btn btn-danger btn-sm"
              >
                삭제
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ===== 아래: 타임라인 영역도 Auto 스타일로 ===== */}
      <section className="auto-detail-body card">
        <div className="auto-detail-body-header">
          <h2 className="auto-detail-section-title">데이트 코스 타임라인</h2>
          <p className="auto-detail-section-desc">
            내가 직접 기록해 둔 데이트 코스예요. 다음에 또 가고 싶을 때
            타임라인을 참고해 보세요.
          </p>
        </div>

        {likeError && (
          <p style={{ marginTop: 4, fontSize: 12, color: "red" }}>
            {likeError}
          </p>
        )}

        {hasSteps ? (
          <ul className="auto-detail-step-list">
            {course.steps.map((step, index) => {
              const stepNo = index + 1;
              const info = getStepInfo(step);
              const label = step.title || `코스 ${stepNo}`;

              return (
                <li key={index} className="auto-detail-step-card">
                  <div className="auto-detail-step-icon">{stepNo}</div>

                  <div className="auto-detail-step-body">
                    <h3 className="auto-detail-step-title">{label}</h3>
                    <p className="auto-detail-step-name">{info.name}</p>

                    {info.addr && (
                      <p className="auto-detail-step-addr">
                        📍 {info.addr}
                      </p>
                    )}

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
                        marginTop: 6,
                        marginBottom: info.memo ? 8 : 0,
                      }}
                    >
                      {info.time && (
                        <span
                          style={{
                            fontSize: 12,
                            padding: "4px 8px",
                            borderRadius: 999,
                            backgroundColor: "#eef2ff",
                            color: "#4f46e5",
                          }}
                        >
                          ⏰ {info.time}
                        </span>
                      )}
                      {Number(info.budget) > 0 && (
                        <span
                          style={{
                            fontSize: 12,
                            padding: "4px 8px",
                            borderRadius: 999,
                            backgroundColor: "#ecfdf3",
                            color: "#16a34a",
                          }}
                        >
                          💸 {info.budget}원
                        </span>
                      )}
                    </div>

                    {info.memo && (
                      <p
                        style={{
                          fontSize: 13,
                          color: "#4b5563",
                          whiteSpace: "pre-line",
                        }}
                      >
                        {info.memo}
                      </p>
                    )}

                    {info.url && (
                      <a
                        href={info.url}
                        target="_blank"
                        rel="noreferrer"
                        className="auto-detail-step-link"
                      >
                        카카오맵에서 보기 →
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <>
            {course.location && (
              <p style={{ marginTop: 12, color: "#6b7280", fontSize: 14 }}>
                📍 {course.location}
              </p>
            )}
            {course.description && (
              <p style={{ marginTop: 16, fontSize: 14 }}>
                {course.description}
              </p>
            )}
          </>
        )}

        <div className="auto-detail-bottom-actions">
          <Link to="/" className="btn btn-secondary btn-sm">
            ← 코스 목록으로 돌아가기
          </Link>
        </div>
      </section>
    </div>
  );
}

export default CourseDetail;