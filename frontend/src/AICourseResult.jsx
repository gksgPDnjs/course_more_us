// src/AICourseResult.jsx
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchUnsplashHero } from "./api/unsplash";

function AICourseResult() {
  const { state } = useLocation();
  const navigate = useNavigate();

  // ✅ 추천 결과는 state.result로 전달받는 구조
  const aiCourse = state?.result ?? null;

  // ✅ Unsplash fallback 이미지 (서버 heroImage 없을 때만 사용)
  const [heroFallback, setHeroFallback] = useState(null);

  // 지도 ref
  const mapRef = useRef(null);

  /* -----------------------------------------
     ✅ 대표 이미지: 서버 heroImage 우선 + Unsplash fallback
  ----------------------------------------- */
  const heroUrl = useMemo(() => {
    return aiCourse?.heroImage || heroFallback;
  }, [aiCourse?.heroImage, heroFallback]);

  useEffect(() => {
    if (!aiCourse) return;
    if (aiCourse.heroImage) return; // 서버 heroImage 있으면 끝

    (async () => {
      const keyword = `${aiCourse.title} 데이트 코스`;
      const url = await fetchUnsplashHero(keyword);
      setHeroFallback(url);
    })();
  }, [aiCourse]);

  /* -----------------------------------------
     ✅ steps 정리: place가 step 안에 이미 포함(백엔드 검증)
     - place 없으면 null로 둠
  ----------------------------------------- */
  const steps = useMemo(() => {
    if (!aiCourse?.steps?.length) return [];
    return aiCourse.steps.map((s) => ({
      ...s,
      place: s.place || null,
    }));
  }, [aiCourse]);

  /* -----------------------------------------
     ✅ 지도용 points 만들기
     - place.x, place.y가 있는 step만 좌표로 변환
  ----------------------------------------- */
  const points = useMemo(() => {
    if (!steps.length) return [];
    return steps
      .map((step, idx) => {
        const place = step.place;
        if (!place) return null;

        const lng = parseFloat(place.x);
        const lat = parseFloat(place.y);
        if (Number.isNaN(lng) || Number.isNaN(lat)) return null;

        const url =
          place.place_url ||
          (place.id ? `https://place.map.kakao.com/${place.id}` : "");

        return {
          idx,
          order: step.order,
          lat,
          lng,
          name: place.place_name || `장소 ${idx + 1}`,
          url,
          place,
        };
      })
      .filter(Boolean);
  }, [steps]);

  /* -----------------------------------------
     ✅ 단계 사이 거리/시간 계산 (직선거리 기반)
     - useMemo로 계산해서 setState 필요 없음
  ----------------------------------------- */
  const distances = useMemo(() => {
    if (!window.kakao || !window.kakao.maps) return [];
    if (!points || points.length < 2) return [];

    const kakao = window.kakao;
    const path = points.map((p) => new kakao.maps.LatLng(p.lat, p.lng));

    const out = [];
    for (let i = 0; i < path.length - 1; i++) {
      const seg = new kakao.maps.Polyline({ path: [path[i], path[i + 1]] });
      const meters = seg.getLength();

      // 도보(4km/h ≈ 67m/min)
      const walkMin = Math.max(1, Math.round(meters / 67));

      // 자차(시내 평균 15km/h ≈ 250m/min) 대략치
      const driveMin = Math.max(1, Math.round(meters / 250));

      out.push({ from: i, to: i + 1, meters, walkMin, driveMin });
    }
    return out;
  }, [points]);

  /* -----------------------------------------
     ✅ Kakao 지도 렌더링 + 마커 + 오버레이 + 폴리라인
  ----------------------------------------- */
  useEffect(() => {
    if (!aiCourse?.steps?.length) return;
    if (!window.kakao || !window.kakao.maps) return;
    if (!mapRef.current) return;
    if (!points.length) return;

    const kakao = window.kakao;

    // 지도 초기화(중복 렌더 방지)
    mapRef.current.innerHTML = "";

    const center = new kakao.maps.LatLng(points[0].lat, points[0].lng);
    const map = new kakao.maps.Map(mapRef.current, {
      center,
      level: 5,
    });

    const bounds = new kakao.maps.LatLngBounds();
    const path = [];

    points.forEach((p) => {
      const pos = new kakao.maps.LatLng(p.lat, p.lng);
      bounds.extend(pos);
      path.push(pos);

      const marker = new kakao.maps.Marker({ map, position: pos });

      if (p.url) {
        kakao.maps.event.addListener(marker, "click", () => {
          window.open(p.url, "_blank");
        });
      }

      const overlayContent = `
        <div style="
          background:#111827;
          color:#fff;
          border-radius:999px;
          padding:4px 10px;
          font-size:12px;
          font-weight:600;
          box-shadow:0 8px 18px rgba(0,0,0,0.18);
          transform:translateY(-10px);
          white-space:nowrap;
        ">
          ${p.idx + 1}단계
        </div>
      `;

      new kakao.maps.CustomOverlay({
        map,
        position: pos,
        content: overlayContent,
        yAnchor: 1,
      });
    });

    map.setBounds(bounds, 40, 40, 40, 40);

    if (path.length >= 2) {
      const polyline = new kakao.maps.Polyline({
        path,
        strokeWeight: 4,
        strokeColor: "#f97316",
        strokeOpacity: 0.85,
        strokeStyle: "solid",
      });
      polyline.setMap(map);
    }
  }, [aiCourse, points]);

  /* -----------------------------------------
     ✅ state 없음 → 처리
  ----------------------------------------- */
  if (!aiCourse) {
    return (
      <div style={{ padding: 40 }}>
        <h2>AI 코스 데이터를 찾을 수 없어요.</h2>
        <button
          onClick={() => navigate("/ai-course")}
          style={{
            marginTop: 20,
            padding: "10px 16px",
            borderRadius: 8,
            background: "#6366f1",
            color: "#fff",
            border: "none",
            cursor: "pointer",
          }}
        >
          AI 추천 다시 받기
        </button>
      </div>
    );
  }

  /* -----------------------------------------
     ✅ UI
  ----------------------------------------- */
  return (
    <div className="auto-detail-page">
      {/* 상단 히어로 */}
      <section className="auto-detail-hero">
        <div className="auto-detail-hero-image-wrap">
          <div className="auto-detail-hero-bg" />
          {heroUrl ? (
            <img
              src={heroUrl}
              alt="대표 이미지"
              className="auto-detail-hero-image"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: 200,
                background: "#e5e7eb",
                borderRadius: 20,
              }}
            />
          )}
        </div>

        <div className="auto-detail-hero-content">
          <p className="auto-detail-badge">AI 맞춤 코스</p>
          <h1 className="auto-detail-title">{aiCourse.title}</h1>
          <p className="auto-detail-section-desc">{aiCourse.summary}</p>
        </div>
      </section>

      {/* 지도 */}
      <section className="card" style={{ marginTop: 16, padding: 16 }}>
        <h2 className="auto-detail-section-title" style={{ marginBottom: 8 }}>
          오늘 코스 지도
        </h2>
        <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
          각 단계 위치와 동선을 한 눈에 볼 수 있어요. (마커 클릭 → 카카오맵)
        </p>

        <div
          ref={mapRef}
          style={{
            width: "100%",
            height: 280,
            borderRadius: 16,
            overflow: "hidden",
            background: "#e5e7eb",
          }}
        />
      </section>

      {/* 타임라인 */}
      <section className="auto-detail-body card">
        <div className="auto-detail-body-header">
          <h2 className="auto-detail-section-title">데이트 코스 타임라인</h2>
          <p className="auto-detail-section-desc">
            실제 카카오 장소로 검증된 코스예요.
          </p>
        </div>

        <ul className="auto-detail-step-list">
          {steps.map((step, index) => {
            const place = step.place;

            const name = place?.place_name || "장소 매칭 실패";
            const addr =
              place?.road_address_name ||
              place?.address_name ||
              "주소 정보 없음";

            const kakaoUrl =
              place?.place_url ||
              (place?.id ? `https://place.map.kakao.com/${place.id}` : "");

            const dist = distances.find((d) => d.from === index);

            return (
              <li key={step.order ?? index} className="auto-detail-step-card">
                <div className="auto-detail-step-icon">{index + 1}</div>

                <div className="auto-detail-step-body">
                  <h4 className="auto-detail-step-title">
                    {step.role} · {step.area}
                  </h4>

              

                  <p className="auto-detail-step-name">{step.description}</p>

                  <p className="auto-detail-step-addr" style={{ marginTop: 6 }}>
                    📍 <strong>{name}</strong>
                    <br />
                    {addr}
                  </p>

                  {dist && (
                    <p className="auto-detail-step-distance">
                      다음 장소까지{" "}
                      <strong>{dist.walkMin}분</strong> (도보) ·{" "}
                      <strong>{dist.driveMin}분</strong> (자차) ·{" "}
                      {Math.round(dist.meters)}m
                    </p>
                  )}

                  {kakaoUrl && (
                    <a
                      href={kakaoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="auto-detail-step-link"
                    >
                      카카오맵에서 바로 보기 →
                    </a>
                  )}

                  <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 6 }}>
                    (검색 키워드: {step.kakaoQuery})
                  </p>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="auto-detail-bottom-actions">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigate("/ai-course")}
          >
            다시 추천받기
          </button>
        </div>
      </section>
    </div>
  );
}

export default AICourseResult;