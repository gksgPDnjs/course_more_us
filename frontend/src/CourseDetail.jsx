// src/CourseDetail.jsx
import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { SEOUL_REGIONS } from "./data/regions";
import { fetchUnsplashHero } from "./api/unsplash";
import { buildUnsplashKeyword } from "./api/unsplashKeyword";

const API_BASE_URL = "http://localhost:4000";

/** 업로드 이미지 / 일반 URL을 모두 처리하는 헬퍼 */
function resolveImageUrl(url) {
  if (!url) return null;
  if (url.startsWith("http")) return url; // 이미 완전한 주소면 그대로
  return `${API_BASE_URL}${url}`;         // /uploads/xxx → http://localhost:4000/uploads/xxx
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

  // 1순위: DB에 저장된 kakaoUrl
  let url = step.kakaoUrl || step.url || "";

  // 2순위: kakaoPlaceId 가 있으면 Kakao place URL 재구성
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
     🔥 대표 이미지 로딩
     1) 내가 업로드한 heroImageUrl / imageUrl / thumbnailUrl 우선
     2) 없으면 Unsplash에서 대체 이미지
  -------------------------------------- */
  useEffect(() => {
    if (!course) return;

    // 1️⃣ 수동 이미지 먼저 확인
    const manualRaw =
      course.heroImageUrl ||
      course.imageUrl ||
      course.thumbnailUrl ||
      "";

    const manualResolved = resolveImageUrl(manualRaw);

    if (manualResolved) {
      setHeroUrl(manualResolved);
      setHeroLoading(false);
      return; // 업로드 이미지 있으면 Unsplash는 안 감
    }

    // 2️⃣ 수동 이미지가 없을 때만 Unsplash 호출
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
  const totalSteps = hasSteps ? course.steps.length : 0;

  return (
    <section className="card" style={{ padding: 20 }}>
      {/* 상단 헤더 */}
      <header
        style={{
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div>
          <h2 className="section-title" style={{ marginBottom: 8 }}>
            {course.title}
          </h2>
          <p style={{ fontSize: 14, color: "#6b7280" }}>
            {regionLabel && <>📍 {regionLabel}</>}{" "}
            {hasSteps && <>· 총 {totalSteps}단계 코스</>}
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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

          {isOwner && (
            <button
              className="btn btn-danger btn-sm"
              onClick={handleDelete}
              style={{ minWidth: 80 }}
            >
              삭제
            </button>
          )}
        </div>
      </header>

      {/* 🔙 위 왼쪽 구석에 작은 뒤로가기 버튼 */}
      <div style={{ marginBottom: 12 }}>
        <Link
          to="/"
          className="btn btn-secondary btn-sm"
          style={{ fontSize: 12 }}
        >
          ← 목록으로
        </Link>
      </div>

      {/* ⭐ 대표 이미지 */}
      <div
        style={{
          marginBottom: 20,
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: "0 18px 40px rgba(15,23,42,0.12)",
          position: "relative",
          background: "linear-gradient(135deg,#eef2ff,#fce7f3,#e0f2fe)",
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

      {likeError && (
        <p style={{ marginTop: 4, fontSize: 12, color: "red" }}>{likeError}</p>
      )}

      {/* 👣 타임라인 / 설명 */}
      {hasSteps ? (
        <>
          <h3 style={{ marginBottom: 12, fontSize: 16 }}>
            데이트 코스 타임라인
          </h3>

          <div
            style={{
              borderLeft: "2px solid #e5e7eb",
              paddingLeft: 16,
              marginLeft: 10,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {course.steps.map((step, index) => {
              const stepNo = index + 1;
              const info = getStepInfo(step);

              return (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start",
                  }}
                >
                  {/* 동그라미 + 단계 번호 */}
                  <div
                    style={{
                      width: 40,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      marginTop: 8,
                    }}
                  >
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "999px",
                        background:
                          "radial-gradient(circle at 30% 30%, #a855f7, #4f46e5)",
                        boxShadow:
                          "0 10px 20px rgba(79,70,229,0.25), 0 0 0 6px rgba(129,140,248,0.15)",
                      }}
                    />
                    <span
                      style={{
                        marginTop: 6,
                        fontSize: 12,
                        color: "#6b7280",
                      }}
                    >
                      {stepNo}단계
                    </span>
                  </div>

                  {/* 내용 카드 */}
                  <div
                    style={{
                      flex: 1,
                      background:
                        "radial-gradient(circle at top left,#ffffff,#f9fafb)",
                      borderRadius: 18,
                      padding: "14px 16px",
                      boxShadow:
                        "0 18px 40px rgba(15,23,42,0.08), 0 0 0 1px rgba(148,163,184,0.15)",
                    }}
                  >
                    <p
                      style={{
                        marginBottom: 4,
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#111827",
                      }}
                    >
                      {info.name}
                    </p>

                    {info.addr && (
                      <p
                        style={{
                          marginBottom: 8,
                          fontSize: 13,
                          color: "#6b7280",
                        }}
                      >
                        📍 {info.addr}
                      </p>
                    )}

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
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
                        className="btn btn-secondary btn-sm"
                        style={{ marginTop: 8 }}
                      >
                        카카오맵에서 보기
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
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
    </section>
  );
}

export default CourseDetail;