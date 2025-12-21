// src/AutoCourseDetail.jsx
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useState, useEffect, useRef, useMemo } from "react";
import { SEOUL_REGIONS } from "./data/regions";
import { API_BASE_URL } from "./config";

// -------------------- utils --------------------

function getRegionLabel(cityId) {
  if (!cityId) return "";
  const region = SEOUL_REGIONS.find((r) => r.id === cityId);
  return region ? region.label : cityId;
}

// ✅ 업로드(/uploads/...)만 백엔드 오리진이 필요함
function resolveImageUrl(raw) {
  if (!raw) return null;
  if (/^https?:\/\//.test(raw)) return raw;
  if (raw.startsWith("/uploads/")) return `${API_BASE_URL}${raw}`;
  return raw;
}

// 🔎 Kakao place → 이름/주소/URL 정리 + URL 보정
function getPlaceInfo(placeObj) {
  if (!placeObj) {
    return { name: "장소 이름 없음", addr: "", url: "" };
  }

  const name =
    placeObj.place_name || placeObj.name || placeObj.place || "장소 이름 없음";

  const addr =
    placeObj.road_address_name ||
    placeObj.address_name ||
    placeObj.address ||
    "";

  const kakaoPlaceId = placeObj.id || placeObj.kakaoPlaceId || "";
  let url = placeObj.place_url || "";

  if (!url && kakaoPlaceId) {
    url = `https://place.map.kakao.com/${kakaoPlaceId}`;
  }

  return { name, addr, url };
}

// -------------------- component --------------------

function AutoCourseDetail() {
  const location = useLocation();
  const navigate = useNavigate();
  const { autoId } = useParams();

  // ✅ 1) state로 들어온 코스 우선
  // ✅ 2) 새로고침/직접접속 대비: sessionStorage에서 복구
  const course = useMemo(() => {
    const fromState = location.state?.course;
    if (fromState) return fromState;

    try {
      const saved = sessionStorage.getItem(`autoCourse:${autoId}`);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.warn("AutoCourseDetail sessionStorage parse failed:", e);
      return null;
    }
  }, [location.state, autoId]);

  const token = localStorage.getItem("token");

  // ✅ 저장/찜 관련 상태
  const [savedCourseId, setSavedCourseId] = useState(null);
  const [liked, setLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  // 🎨 대표 이미지
  const [heroUrl, setHeroUrl] = useState(null);
  const [heroLoading, setHeroLoading] = useState(false);

  // 🗺️ 지도 + 거리 정보
  const mapContainerRef = useRef(null);
  const [distances, setDistances] = useState([]); // [{ from, to, meters, minutes }]

  /* --------------------------------------
     ✅ 대표 이미지 로딩 우선순위
     0) course.heroImage (백엔드가 내려준 대표)
     1) course.steps[0].place.imageUrl (step 이미지)
     2) 없으면 /api/kakao/image 로 fallback 검색 (프록시)
  -------------------------------------- */
  useEffect(() => {
    if (!course) return;

    let cancelled = false;

    async function loadHero() {
      try {
        setHeroLoading(true);

        // ✅ 0순위: heroImage
        const h0 = resolveImageUrl(course?.heroImage);
        if (h0) {
          if (!cancelled) setHeroUrl(h0);
          return;
        }

        // ✅ 1순위: step0 imageUrl
        const step0 = course?.steps?.[0];
        const step0Img = resolveImageUrl(step0?.place?.imageUrl || step0?.imageUrl);
        if (step0Img) {
          if (!cancelled) setHeroUrl(step0Img);
          return;
        }

        // ✅ 2순위: fallback (카카오 이미지 검색 proxy) - /api 로 통일!
        const firstPlace = step0?.place || step0 || {};
        const placeName =
          firstPlace.place_name || firstPlace.name || firstPlace.place || "";

        const regionLabel = getRegionLabel(course.regionId);

        const q1 = placeName ? `${placeName} ${regionLabel || "서울"}` : "";
        const q2 = `${regionLabel || "서울"} 데이트 코스`;
        const tryQueries = [q1, q2].filter(Boolean);

        for (const q of tryQueries) {
          const params = new URLSearchParams({ query: q });
          const res = await fetch(`/api/kakao/image?${params.toString()}`);
          const data = await res.json().catch(() => ({}));

          if (cancelled) return;

          if (res.ok && data?.imageUrl) {
            setHeroUrl(data.imageUrl);
            return;
          }
        }

        if (!cancelled) setHeroUrl(null);
      } catch (e) {
        if (!cancelled) {
          console.warn("AutoCourseDetail hero load failed:", e);
          setHeroUrl(null);
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

  /* --------------------------------------
     🗺️ Kakao 지도 + 거리 계산
  -------------------------------------- */
  useEffect(() => {
    if (!course || !course.steps || course.steps.length === 0) return;
    if (!window.kakao || !window.kakao.maps) {
      console.error("Kakao Maps SDK가 아직 로드되지 않았어요.");
      return;
    }

    const container = mapContainerRef.current;
    if (!container) return;

    const { kakao } = window;

    const points = course.steps
      .map((step) => {
        const placeObj = step.place || step;
        const x = parseFloat(placeObj.x);
        const y = parseFloat(placeObj.y);

        if (Number.isNaN(x) || Number.isNaN(y)) return null;

        const { name } = getPlaceInfo(placeObj);
        return { lat: y, lng: x, name };
      })
      .filter(Boolean);

    if (points.length === 0) {
      console.warn("지도에 표시할 좌표가 없어요.");
      return;
    }

    const center = new kakao.maps.LatLng(points[0].lat, points[0].lng);
    const map = new kakao.maps.Map(container, { center, level: 4 });

    const bounds = new kakao.maps.LatLngBounds();
    const path = [];

    points.forEach((p, idx) => {
      const position = new kakao.maps.LatLng(p.lat, p.lng);
      path.push(position);
      bounds.extend(position);

      const placeObj = course.steps[idx].place || course.steps[idx];
      const { url } = getPlaceInfo(placeObj);

      const marker = new kakao.maps.Marker({ position, map });

      if (url) {
        kakao.maps.event.addListener(marker, "click", () => {
          window.open(url, "_blank");
        });
      }

      const overlayContent = `
        <div
          style="
            background:#111827;
            color:#fff;
            border-radius:999px;
            padding:4px 8px;
            font-size:12px;
            font-weight:600;
            transform:translateY(-8px);
            box-shadow:0 2px 6px rgba(0,0,0,0.2);
          "
        >
          ${idx + 1}단계
        </div>
      `;

      new kakao.maps.CustomOverlay({
        position,
        content: overlayContent,
        yAnchor: 1,
        map,
      });
    });

    map.setBounds(bounds, 40, 40, 40, 40);

    if (path.length >= 2) {
      const polyline = new kakao.maps.Polyline({
        path,
        strokeWeight: 4,
        strokeColor: "#f97316",
        strokeOpacity: 0.8,
        strokeStyle: "solid",
      });
      polyline.setMap(map);
    }

    const newDistances = [];
    if (path.length >= 2) {
      for (let i = 0; i < path.length - 1; i++) {
        const segmentLine = new kakao.maps.Polyline({
          path: [path[i], path[i + 1]],
        });
        const meters = segmentLine.getLength();
        const minutes = Math.max(1, Math.round(meters / 67)); // 대충 도보 4km/h

        newDistances.push({ from: i, to: i + 1, meters, minutes });
      }
    }

    setDistances(newDistances);
  }, [course]);

  // -------------------- no course fallback --------------------

  if (!course) {
    return (
      <section className="card" style={{ padding: 20 }}>
        <h2 className="section-title">자동 생성 코스 상세</h2>
        <p style={{ marginTop: 10 }}>
          이 페이지는 추천/랜덤에서 만든 자동 코스로 들어왔을 때만 열 수 있어요.
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
  // 1) 자동 코스를 실제 "내 코스"로 저장
  // ------------------------------------------------
  const ensureSavedCourse = async () => {
    if (savedCourseId) return savedCourseId;

    if (!token) {
      alert("로그인 후 저장할 수 있어요.");
      return null;
    }

    try {
      setSaveLoading(true);

      const mappedSteps = (course.steps || []).map((step) => {
        const placeObj = step.place || step;

        const name =
          placeObj.place_name || placeObj.name || step.label || "코스";
        const addr = placeObj.road_address_name || placeObj.address_name || "";
        const kakaoUrl = placeObj.place_url || "";
        const placeId = placeObj.id || placeObj.kakaoPlaceId || "";

        return {
          title: step.label || step.type || "코스",
          place: name,
          memo: "",
          time: "",
          budget: 0,
          address: addr,
          kakaoPlaceId: placeId,
          kakaoUrl,
        };
      });

      const payload = {
        title: course.title,
        city: course.regionId,
        mood: "자동 생성",
        steps: mappedSteps,
      };

      // ⚠️ 저장/찜/내 코스 관련은 백엔드 직접 호출(API_BASE_URL) 유지
      const res = await fetch(`${API_BASE_URL}/api/courses/auto`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "자동 생성 코스 저장 실패");
      }

      setSavedCourseId(data._id);
      return data._id;
    } catch (err) {
      console.error("ensureSavedCourse error:", err);
      alert(err.message || "자동 생성 코스를 저장하는 중 오류가 발생했어요.");
      return null;
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSaveMyCourse = async () => {
    const id = await ensureSavedCourse();
    if (!id) return;
    alert("내 코스에 저장했어요! (자동 생성 코스)");
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

      const res = await fetch(`${API_BASE_URL}/api/courses/${realId}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

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

  // -------------------- render --------------------

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
                e.currentTarget.style.display = "none";
              }}
            />
          )}

          {heroLoading && (
            <div style={{ padding: 16, color: "#6b7280", fontSize: 13 }}>
              대표 이미지를 불러오는 중이에요...
            </div>
          )}
        </div>

        <div className="auto-detail-hero-content">
          <p className="auto-detail-badge">자동 추천 코스</p>
          <h1 className="auto-detail-title">{course.title}</h1>
          <p className="auto-detail-submeta">
            📍 {regionLabel || "지역 정보 없음"} · 총 {totalSteps}단계 코스
          </p>

          <div className="auto-detail-hero-buttons">
            <button
              type="button"
              onClick={handleToggleLike}
              disabled={likeLoading}
              className={`btn btn-secondary btn-sm auto-detail-like-btn ${liked ? "liked" : ""}`}
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

      {/* 🗺️ 코스 전체를 보여주는 지도 */}
      <section className="card" style={{ marginTop: 16, padding: 16 }}>
        <h2 className="auto-detail-section-title" style={{ marginBottom: 8, fontSize: 16 }}>
          오늘 코스 지도
        </h2>
        <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
          각 단계 위치와 동선을 한 눈에 볼 수 있어요.
        </p>
        <div
          ref={mapContainerRef}
          style={{
            width: "100%",
            height: "260px",
            borderRadius: 16,
            overflow: "hidden",
            background: "#e5e7eb",
          }}
        />
      </section>

      {/* 아래 내용 카드 영역 */}
      <section className="auto-detail-body card">
        <div className="auto-detail-body-header">
          <h2 className="auto-detail-section-title">데이트 코스 타임라인</h2>
          <p className="auto-detail-section-desc">
            카카오맵 기반으로 자동 추천된 코스예요. 마음에 들면 위 버튼으로 내 코스에 저장해 둘 수 있어요.
          </p>
        </div>

        <ul className="auto-detail-step-list">
          {course.steps.map((step, index) => {
            const stepNo = index + 1;
            const placeObj = step.place || step;
            const { name, addr, url } = getPlaceInfo(placeObj);
            const dist = distances.find((d) => d.from === index);

            return (
              <li key={index} className="auto-detail-step-card">
                <div className="auto-detail-step-icon">{stepNo}</div>

                <div className="auto-detail-step-body">
                  <h3 className="auto-detail-step-title">
                    {step.label || step.type || "코스"}
                  </h3>
                  <p className="auto-detail-step-name">{name}</p>
                  <p className="auto-detail-step-addr">{addr || "주소 정보 없음"}</p>

                  {dist && (
                    <p
                      className="auto-detail-step-distance"
                      style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}
                    >
                      다음 장소까지 도보 약 <strong>{dist.minutes}분</strong> ({Math.round(dist.meters)}m)
                    </p>
                  )}

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
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}>
            ← 추천 목록으로 돌아가기
          </button>
        </div>
      </section>
    </div>
  );
}

export default AutoCourseDetail;