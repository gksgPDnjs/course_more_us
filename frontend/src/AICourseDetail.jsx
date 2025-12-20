// src/AICourseDetail.jsx
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchUnsplashHero } from "./api/unsplash";

function AICourseDetail() {
  const { state } = useLocation();
  const navigate = useNavigate();

  // ✅ state 우선, 없으면 localStorage에서 복구
  const [aiCourse, setAiCourse] = useState(state?.aiCourse ?? null);

  // 대표 이미지
  const [heroUrl, setHeroUrl] = useState(null);
  const [heroLoading, setHeroLoading] = useState(false);

  // 지도
  const mapContainerRef = useRef(null);

  // 1) 마운트 시 localStorage 복구 (경고 0)
  useEffect(() => {
    if (state?.aiCourse) return;

    const cached = localStorage.getItem("aiCourse:last");
    if (!cached) return;

    try {
      setAiCourse(JSON.parse(cached));
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) 코스가 들어오면 localStorage에 저장(상세보기 새로고침 대비)
  useEffect(() => {
    if (!aiCourse) return;
    try {
      localStorage.setItem("aiCourse:last", JSON.stringify(aiCourse));
    } catch {
      // ignore
    }
  }, [aiCourse]);

  // 3) 대표 이미지(Unsplash)
  useEffect(() => {
    if (!aiCourse) return;

    const keyword =
      aiCourse.title?.trim()?.length > 0
        ? `${aiCourse.title} 데이트`
        : "Seoul date cafe restaurant night";

    (async () => {
      setHeroLoading(true);
      const url = await fetchUnsplashHero(keyword, aiCourse.title);
      setHeroUrl(url);
      setHeroLoading(false);
    })();
  }, [aiCourse]);

  // 4) 지도에 찍을 좌표 리스트 만들기
  // - aiCourse.steps 안에 place가 있거나
  // - aiCourse.placesByOrder[order] 형태로 place가 들어있거나
  const points = useMemo(() => {
    if (!aiCourse?.steps?.length) return [];

    const placesByOrder = aiCourse.placesByOrder || {};

    const result = aiCourse.steps
      .map((step, idx) => {
        const place =
          placesByOrder?.[step.order] || step.place || step?.kakaoPlace || null;

        if (!place) return null;

        const x = parseFloat(place.x); // 경도
        const y = parseFloat(place.y); // 위도
        if (Number.isNaN(x) || Number.isNaN(y)) return null;

        const name = place.place_name || place.name || `장소 ${idx + 1}`;
        const url =
          place.place_url || (place.id ? `https://place.map.kakao.com/${place.id}` : "");

        return {
          lat: y,
          lng: x,
          name,
          url,
          order: step.order,
          idx,
        };
      })
      .filter(Boolean);

    return result;
  }, [aiCourse]);

  // 5) 카카오 지도 렌더링 + 마커 + 폴리라인
  useEffect(() => {
    if (!aiCourse) return;
    if (!mapContainerRef.current) return;
    if (!window.kakao || !window.kakao.maps) return;

    if (!points.length) return;

    const { kakao } = window;

    const center = new kakao.maps.LatLng(points[0].lat, points[0].lng);
    const map = new kakao.maps.Map(mapContainerRef.current, {
      center,
      level: 5,
    });

    const bounds = new kakao.maps.LatLngBounds();
    const path = [];

    points.forEach((p) => {
      const position = new kakao.maps.LatLng(p.lat, p.lng);
      bounds.extend(position);
      path.push(position);

      const marker = new kakao.maps.Marker({
        position,
        map,
      });

      // 클릭 시 카카오맵 상세로 이동
      if (p.url) {
        kakao.maps.event.addListener(marker, "click", () => {
          window.open(p.url, "_blank");
        });
      }

      // 번호 오버레이
      const overlayContent = `
        <div style="
          background:#111827;
          color:#fff;
          border-radius:999px;
          padding:4px 8px;
          font-size:12px;
          font-weight:600;
          transform:translateY(-10px);
          box-shadow:0 2px 10px rgba(0,0,0,0.2);
          white-space:nowrap;
        ">
          ${p.idx + 1}단계
        </div>
      `;

      new kakao.maps.CustomOverlay({
        position,
        content: overlayContent,
        yAnchor: 1,
        map,
      });
    });

    // 전체가 보이도록 범위 조정
    map.setBounds(bounds, 40, 40, 40, 40);

    // ✅ 경로(폴리라인) 연결
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

  // state/localStorage 둘 다 없을 때
  if (!aiCourse) {
    return (
      <div style={{ padding: 30 }}>
        <h2>AI 코스 데이터를 찾을 수 없어요.</h2>
        <button
          className="btn btn-secondary btn-sm"
          style={{ marginTop: 12 }}
          onClick={() => navigate("/ai-course")}
        >
          AI 추천 다시 받기
        </button>
      </div>
    );
  }

  const { title, summary, steps } = aiCourse;
  const placesByOrder = aiCourse.placesByOrder || {};

  return (
    <div className="auto-detail-page">
      {/* 상단 히어로 */}
      <section className="auto-detail-hero">
        <div className="auto-detail-hero-image-wrap">
          <div className="auto-detail-hero-bg" />
          {!heroLoading && heroUrl && (
            <img
              src={heroUrl}
              alt="AI 코스 대표 이미지"
              className="auto-detail-hero-image"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          )}
          {heroLoading && (
            <div style={{ padding: 16, color: "#6b7280", fontSize: 13 }}>
              데이트 대표 이미지를 불러오는 중이에요...
            </div>
          )}
        </div>

        <div className="auto-detail-hero-content">
          <p className="auto-detail-badge">AI 맞춤 코스</p>
          <h1 className="auto-detail-title">{title}</h1>
          <p className="auto-detail-section-desc">{summary}</p>
        </div>
      </section>

      {/* 지도 */}
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
            height: 260,
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
            실제 카카오 장소가 매칭되면 “카카오맵에서 바로 보기”로 확인할 수 있어요.
          </p>
        </div>

        <ul className="auto-detail-step-list">
          {steps.map((step, index) => {
            const place = placesByOrder?.[step.order] || step.place || null;

            const name = place?.place_name || "추천 장소를 불러오는 중…";
            const addr =
              place?.road_address_name || place?.address_name || "주소 정보 없음";

            const kakaoUrl =
              place?.place_url || (place?.id ? `https://place.map.kakao.com/${place.id}` : "");

            return (
              <li key={step.order ?? index} className="auto-detail-step-card">
                <div className="auto-detail-step-icon">{index + 1}</div>
                <div className="auto-detail-step-body">
                  <h3 className="auto-detail-step-title">
                    {step.role} · {step.area}
                  </h3>

                  <p className="auto-detail-step-name">{step.description}</p>

                  <p className="auto-detail-step-addr">
                    📍 {name}
                    <br />
                    {addr}
                  </p>

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

                  <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
                    (검색 키워드: {step.kakaoQuery})
                  </p>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="auto-detail-bottom-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}>
            ← 이전으로
          </button>
        </div>
      </section>
    </div>
  );
}

export default AICourseDetail;