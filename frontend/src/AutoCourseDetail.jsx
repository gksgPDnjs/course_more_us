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

// 🔎 Kakao place → 이름/주소/URL 정리 + URL 보정
function getPlaceInfo(place) {
  if (!place) return { name: "장소 이름 없음", addr: "", url: null };

  const name = place.place_name || place.name || "장소 이름 없음";
  const addr = place.road_address_name || place.address_name || "";

  // 1순위: Kakao API가 준 place_url
  let url = place.place_url || place.kakaoUrl || null;

  // 2순위: id 로 place URL 생성
  const placeId = place.id || place.kakaoPlaceId;
  if (!url && placeId) {
    url = `https://place.map.kakao.com/${placeId}`;
  }

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
          const placeId = placeObj.id || placeObj.kakaoPlaceId || "";

          return {
            title: step.label || step.type || "코스",
            place: name,
            memo: "",
            time: "",
            budget: 0,
            address: addr || "",
            kakaoPlaceId: placeId,
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

  /* --------------------------------------
     ✅ 여기부터 UI (코스모스 카드 스타일)
  -------------------------------------- */
  return (
    <div className="auto-detail-page">
      {/* 상단 히어로 카드 */}
      <section className="auto-detail-hero">
        <div className="auto-detail-hero-image-wrap">
          <div className="auto-detail-hero-bg" />
          {!heroLoading && heroUrl && (
            <img
              src={heroUrl}
              alt="자동 생성 코스 대표 이미지"
              className="auto-detail-hero-image"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          )}
        </div>

        <div className="auto-detail-hero-content">
          <p className="auto-detail-badge">자동 추천 코스</p>
          <h1 className="auto-detail-title">{course.title}</h1>
          <p className="auto-detail-submeta">
            📍 {regionLabel || "지역 정보 없음"} · 총 {totalSteps}
            단계 코스
          </p>

          <div className="auto-detail-hero-buttons">
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

            <button
              type="button"
              onClick={handleSaveMyCourse}
              disabled={saveLoading}
              className="btn btn-primary btn-sm"
            >
              {saveLoading ? "저장 중..." : "내 코스로 저장"}
            </button>
          </div>
        </div>
      </section>

      {/* 아래 내용 카드 영역 */}
      <section className="auto-detail-body card">
        <div className="auto-detail-body-header">
          <h2 className="auto-detail-section-title">데이트 코스 타임라인</h2>
          <p className="auto-detail-section-desc">
            카카오맵 기반으로 자동 추천된 코스예요. 마음에 들면 위 버튼으로
            내 코스에 저장해 둘 수 있어요.
          </p>
        </div>

        <ul className="auto-detail-step-list">
          {course.steps.map((step, index) => {
            const stepNo = index + 1;
            const placeObj = step.place || step;
            const { name, addr, url } = getPlaceInfo(placeObj);

            return (
              <li key={index} className="auto-detail-step-card">
                {/* 왼쪽 번호 동그라미 */}
                <div className="auto-detail-step-icon">{stepNo}</div>

                {/* 내용 */}
                <div className="auto-detail-step-body">
                  <h3 className="auto-detail-step-title">
                    {step.label || step.type || "코스"}
                  </h3>
                  <p className="auto-detail-step-name">{name}</p>
                  <p className="auto-detail-step-addr">
                    {addr || "주소 정보 없음"}
                  </p>

                  {url && (
                    <a
                      href={url}
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

        <div className="auto-detail-bottom-actions">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigate(-1)}
          >
            ← 추천 목록으로 돌아가기
          </button>
        </div>
      </section>
    </div>
  );
}

export default AutoCourseDetail;