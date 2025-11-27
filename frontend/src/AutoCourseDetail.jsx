// src/AutoCourseDetail.jsx
import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { SEOUL_REGIONS } from "./data/regions";
import { fetchUnsplashHero } from "./api/unsplash";
import { buildUnsplashKeyword } from "./api/unsplashKeyword";

const API_BASE_URL = "http://localhost:4000";

function getRegionLabel(cityId) {
  if (!cityId) return "";
  const region = SEOUL_REGIONS.find((r) => r.id === cityId);
  return region ? region.label : cityId;
}

function getPlaceInfo(place) {
  if (!place) return { name: "장소 이름 없음", addr: "", url: null };

  const name = place.place_name || place.name || "장소 이름 없음";
  const addr = place.road_address_name || place.address_name || "";
  const url = place.place_url || null;

  return { name, addr, url };
}

function AutoCourseDetail() {
  const location = useLocation();
  const navigate = useNavigate();

  const course = location.state?.course;
  const token = localStorage.getItem("token");

  // ✅ state / hook 들은 항상 컴포넌트 상단에서 호출
  const [savedCourseId, setSavedCourseId] = useState(null);
  const [liked, setLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  // 🎨 대표 이미지 (Unsplash)
  const [heroUrl, setHeroUrl] = useState(null);
  const [heroLoading, setHeroLoading] = useState(false);

  /* --------------------------------------
     🔥 Unsplash 대표 이미지 로딩
  -------------------------------------- */
  useEffect(() => {
    if (!course) return; // 코스 없으면 아무 것도 안 함

    const keyword = buildUnsplashKeyword({
      ...course,
      city: course.regionId, // city 필드 강제 매핑
    });

    console.log("🧩 AutoCourseDetail Unsplash keyword:", keyword);

    async function loadHero() {
      setHeroLoading(true);
      const url = await fetchUnsplashHero(keyword);
      console.log("🎨 AutoCourseDetail heroUrl:", url);
      setHeroUrl(url);
      setHeroLoading(false);
    }

    loadHero();
  }, [course]);

  // 🔴 여기서부터는 훅 없음 — 조건부 return 가능
  if (!course) {
    return (
      <section className="card" style={{ padding: 20 }}>
        <h2 className="section-title">자동 생성 코스 상세</h2>
        <p style={{ marginTop: 10 }}>
          이 페이지는 추천 페이지에서 자동 생성된 코스를 통해서만 열 수 있어요.
          <br />
          <button
            className="btn btn-secondary btn-sm"
            style={{ marginTop: 10 }}
            onClick={() => navigate(-1)}
          >
            이전 페이지로 돌아가기
          </button>
        </p>
      </section>
    );
  }

  const regionLabel = getRegionLabel(course.regionId);
  const totalSteps = course.steps?.length || 0;

  // ------------------------------------------------
  // 1. 자동 코스를 실제 "내 코스"로 저장
  // ------------------------------------------------
  const ensureSavedCourse = async () => {
    if (savedCourseId) return savedCourseId;

    if (!token) {
      alert("로그인 후 내 코스로 저장할 수 있어요.");
      return null;
    }

    try {
      setSaveLoading(true);

      const payload = {
        title: course.title,
        city: course.regionId,
        mood: "auto",
        steps: (course.steps || []).map((step) => {
          const placeObj = step.place || step;
          const { name, addr, url } = getPlaceInfo(placeObj);
          return {
            title: step.label || step.type || "코스",
            place: name,
            memo: "",
            time: "",
            budget: 0,
            address: addr || "",
            kakaoPlaceId: placeObj.id || "",
            kakaoUrl: url || "",
          };
        }),
      };

      const res = await fetch(`${API_BASE_URL}/api/courses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "코스 저장 실패");
      }

      setSavedCourseId(data._id);
      return data._id;
    } catch (err) {
      console.error("ensureSavedCourse error:", err);
      alert(err.message || "코스를 저장하는 중 오류가 발생했어요.");
      return null;
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSaveMyCourse = async () => {
    const id = await ensureSavedCourse();
    if (!id) return;

    alert("내 코스에 저장했어요! (코스 탭에서 확인할 수 있어요)");
  };

  const handleToggleLike = async () => {
    if (!token) {
      alert("로그인 후 찜할 수 있어요.");
      return;
    }

    const realId = await ensureSavedCourse();
    if (!realId) return;

    try {
      setLikeLoading(true);

      const res = await fetch(
        `${API_BASE_URL}/api/courses/${realId}/like`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "찜 처리 실패");
      }

      setLiked(data.liked);
    } catch (err) {
      console.error("toggle like error (auto):", err);
      alert(err.message || "찜 처리 중 오류가 발생했어요.");
    } finally {
      setLikeLoading(false);
    }
  };

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
            📍 {regionLabel || "지역 정보 없음"} · 총 {totalSteps}단계 코스
          </p>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={handleToggleLike}
            disabled={likeLoading}
            className="btn btn-secondary btn-sm"
            style={{
              minWidth: 96,
              backgroundColor: liked ? "#f97373" : "white",
              color: liked ? "white" : "#111827",
              borderColor: liked ? "#f97373" : "#e5e7eb",
            }}
          >
            {liked ? "💜 찜해둔 코스" : "🤍 찜하기"}
          </button>

          <button
            type="button"
            onClick={handleSaveMyCourse}
            disabled={saveLoading}
            className="btn btn-primary btn-sm"
          >
            {saveLoading ? "저장 중..." : "내 코스로 저장"}
          </button>
        </div>
      </header>

      {/* ⭐ 대표 이미지 (Unsplash) */}
      <div
        style={{
          marginBottom: 20,
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: "0 18px 40px rgba(15,23,42,0.12)",
          background:
            "linear-gradient(135deg,#eef2ff,#fce7f3,#e0f2fe)",
          minHeight: 160,
        }}
      >
        {heroLoading && (
          <div
            style={{
              width: "100%",
              height: 220,
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
            alt="자동 생성 코스 대표 이미지"
            style={{
              width: "100%",
              height: 220,
              objectFit: "cover",
              display: "block",
            }}
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        )}
      </div>

      {/* 타임라인 */}
      <h3 style={{ marginBottom: 12, fontSize: 16 }}>데이트 코스 타임라인</h3>

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
          const placeObj = step.place || step;
          const { name, addr, url } = getPlaceInfo(placeObj);

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
                  style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}
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
                  {step.label || step.type || "코스"} · {name}
                </p>
                <p
                  style={{
                    marginBottom: 8,
                    fontSize: 13,
                    color: "#6b7280",
                  }}
                >
                  {addr || "주소 정보 없음"}
                </p>

                {url && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary btn-sm"
                  >
                    카카오맵에서 보기
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 24, display: "flex", gap: 8 }}>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => navigate(-1)}
        >
          ← 추천 목록으로 돌아가기
        </button>
      </div>
    </section>
  );
}

export default AutoCourseDetail;