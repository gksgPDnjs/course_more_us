// src/AICourseResult.jsx
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { fetchUnsplashHero } from "./api/unsplash";

const API_BASE_URL = "http://localhost:4000";

function AICourseResult() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const aiCourse = state?.result;

  // 대표 이미지
  const [heroUrl, setHeroUrl] = useState(null);

  // Kakao 장소 정보
  const [placesByOrder, setPlacesByOrder] = useState({});
  const mapRef = useRef(null);

  /* ---------------------- 🔥 Unsplash 대표 이미지 ---------------------- */
  useEffect(() => {
    if (!aiCourse) return;

    async function loadImage() {
      const keyword = `${aiCourse.title} 데이트 코스`;
      const url = await fetchUnsplashHero(keyword);
      setHeroUrl(url);
    }

    loadImage();
  }, [aiCourse]);

  /* ---------------------- 🔥 Kakao 장소 정보 불러오기 ---------------------- */
  useEffect(() => {
    if (!aiCourse?.steps) return;

    const fetchAll = async () => {
      const promises = aiCourse.steps.map((step) =>
        axios
          .get(
            `${API_BASE_URL}/api/kakao/search?query=${encodeURIComponent(
              step.kakaoQuery
            )}`
          )
          .then((res) => ({
            order: step.order,
            place: res.data?.documents?.[0] || null,
          }))
          .catch(() => ({ order: step.order, place: null }))
      );

      const result = await Promise.all(promises);
      const mapping = {};
      result.forEach((item) => (mapping[item.order] = item.place));
      setPlacesByOrder(mapping);
    };

    fetchAll();
  }, [aiCourse]);

  /* ---------------------- 🔥 Kakao 지도 표시 ---------------------- */
  useEffect(() => {
    if (!aiCourse?.steps || !window.kakao) return;

    const kakao = window.kakao;
    const container = mapRef.current;
    if (!container) return;

    const points = aiCourse.steps
      .map((step) => {
        const place = placesByOrder[step.order];
        if (!place) return null;

        const x = parseFloat(place.x);
        const y = parseFloat(place.y);
        if (Number.isNaN(x) || Number.isNaN(y)) return null;

        return { lat: y, lng: x };
      })
      .filter(Boolean);

    if (points.length === 0) return;

    const map = new kakao.maps.Map(container, {
      center: new kakao.maps.LatLng(points[0].lat, points[0].lng),
      level: 5,
    });

    const bounds = new kakao.maps.LatLngBounds();
    const path = [];

    points.forEach((p, index) => {
      const pos = new kakao.maps.LatLng(p.lat, p.lng);
      path.push(pos);
      bounds.extend(pos);

      new kakao.maps.Marker({ map, position: pos });

      new kakao.maps.CustomOverlay({
        map,
        position: pos,
        content: `<div style="background:#111827;color:#fff;padding:4px 8px;border-radius:8px;font-size:12px;">${index + 1}단계</div>`,
        yAnchor: 1,
      });
    });

    map.setBounds(bounds);

    if (path.length >= 2) {
  const polyline = new kakao.maps.Polyline({
    path,
    strokeWeight: 4,
    strokeColor: "#f97316",
    strokeOpacity: 0.85,
    strokeStyle: "solid",
  });

  // 🔥 반드시 setMap으로 지도에 올려주기
  polyline.setMap(map);
}
  }, [aiCourse, placesByOrder]);

  /* ---------------------- 🔥 state 없음 → 에러 처리 ---------------------- */
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
          }}
        >
          AI 추천 다시 받기
        </button>
      </div>
    );
  }

  /* ---------------------- 🔥 UI ---------------------- */
  return (
    <div className="auto-detail-page">
      {/* 상단 카드 */}
      <section className="auto-detail-hero">
        <div className="auto-detail-hero-image-wrap">
          {heroUrl ? (
            <img src={heroUrl} alt="대표 이미지" className="auto-detail-hero-image" />
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
          <h1 className="auto-detail-title">{aiCourse.title}</h1>
          <p className="auto-detail-section-desc">{aiCourse.summary}</p>
        </div>
      </section>

      {/* 지도 */}
      <section className="card" style={{ marginTop: 20, padding: 20 }}>
        <h3 style={{ marginBottom: 12 }}>오늘 코스 지도</h3>
        <div
          ref={mapRef}
          style={{
            width: "100%",
            height: 280,
            borderRadius: 16,
            background: "#ddd",
          }}
        />
      </section>

      {/* 타임라인 */}
      <section className="card" style={{ padding: 20, marginTop: 20 }}>
        <h3>데이트 코스 타임라인</h3>

        <ul className="auto-detail-step-list">
          {aiCourse.steps.map((step, index) => {
            const place = placesByOrder[step.order];
            const name = place?.place_name || "장소 불러오는 중…";
            const addr =
              place?.road_address_name ||
              place?.address_name ||
              "주소 정보 없음";

            const kakaoUrl =
              place?.place_url ||
              (place?.id ? `https://place.map.kakao.com/${place.id}` : "");

            return (
              <li key={step.order} className="auto-detail-step-card">
                <div className="auto-detail-step-icon">{index + 1}</div>
                <div className="auto-detail-step-body">
                  <h4 className="auto-detail-step-title">
                    {step.role} · {step.area}
                  </h4>
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
                      style={{ display: "inline-block", marginTop: 6 }}
                    >
                      카카오맵에서 바로 보기 →
                    </a>
                  )}

                  <p style={{ fontSize: 12, color: "#999", marginTop: 4 }}>
                    (검색 키워드: {step.kakaoQuery})
                  </p>
                </div>
              </li>
            );
          })}
        </ul>

        <button
          className="btn btn-secondary btn-sm"
          style={{ marginTop: 20 }}
          onClick={() => navigate("/ai-course")}
        >
          다시 추천받기
        </button>
      </section>
    </div>
  );
}

export default AICourseResult;