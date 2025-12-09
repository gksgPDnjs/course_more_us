// src/AICourseDetail.jsx
import { useLocation, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";

const API_BASE_URL = "http://localhost:4000";

function AICourseDetail() {
  const { state } = useLocation();
  const aiCourse = state?.aiCourse; // result + placesByOrder 들어있음
  const [heroImageUrl, setHeroImageUrl] = useState("");

  useEffect(() => {
    if (!aiCourse) return;

    // 🔎 Unsplash에서 대표 이미지 가져오기
    // 이미 프로젝트에 unsplash.js / unsplashKeyword.js 있을 텐데
    // 거기서 쓰던 API 경로 그대로 가져오면 돼.
    const fetchImage = async () => {
      try {
        const firstArea = aiCourse.steps[0]?.area || "서울";
        const query = `${firstArea} 데이트 야경`;
        const res = await axios.get(
          `${API_BASE_URL}/api/unsplash/random?query=${encodeURIComponent(
            query
          )}`
        );
        setHeroImageUrl(res.data?.url || "");
      } catch (err) {
        console.error("Unsplash 이미지 오류:", err);
      }
    };

    fetchImage();
  }, [aiCourse]);

  if (!aiCourse) {
    return (
      <div style={{ padding: 30 }}>
        <p>AI 코스 데이터를 찾을 수 없어요.</p>
        <Link to="/ai-course">AI 추천 다시 받기</Link>
      </div>
    );
  }

  const { title, summary, steps, placesByOrder } = aiCourse;

  return (
    <div className="auto-detail-page">
      {/* 🔷 1. 상단 히어로 카드 (AutoCourseDetail 상단이랑 거의 똑같이) */}
      <section className="auto-detail-hero card">
        <div className="auto-detail-hero-image">
          {heroImageUrl ? (
            <img src={heroImageUrl} alt="데이트 대표 이미지" />
          ) : (
            <div className="auto-detail-hero-placeholder">
              데이트 대표 이미지를 불러오는 중이에요…
            </div>
          )}
        </div>

        <div className="auto-detail-hero-body">
          <div className="auto-detail-hero-label">AI 맞춤 코스</div>
          <h1 className="auto-detail-title">{title}</h1>
          <p className="auto-detail-hero-summary">{summary}</p>

          {/* 나중에 '내 코스로 저장' 버튼도 여기 붙이면 됨 */}
        </div>
      </section>

      {/* 🔷 2. 지도 영역 – AutoCourseDetail에서 Kakao 지도 그리던 부분 그대로 복붙 */}
      {/*   - placesByOrder[step.order] 에 Kakao place 객체가 있으니까
           AutoCourseDetail에서 쓰던 places 배열 대신 이걸 사용하면 돼 */}

      {/* 🔷 3. 타임라인 카드 리스트 */}
      <section className="auto-detail-body card">
        <h2 className="auto-detail-section-title">데이트 코스 타임라인</h2>
        <p className="auto-detail-section-desc">
          카카오맵 기준으로 자동 추천된 데이트 코스예요.
        </p>

        <ul className="auto-detail-step-list">
          {steps.map((step, index) => {
            const stepNo = index + 1;
            const place = placesByOrder[step.order];
            const name = place?.place_name || "추천 장소를 불러오는 중이에요";
            const addr =
              place?.road_address_name ||
              place?.address_name ||
              "주소 정보 없음";

            return (
              <li key={step.order} className="auto-detail-step-card">
                <div className="auto-detail-step-icon">{stepNo}</div>
                <div className="auto-detail-step-body">
                  <h3 className="auto-detail-step-title">
                    {step.role} · {step.area}
                  </h3>
                  <p className="auto-detail-step-name">{name}</p>
                  <p className="auto-detail-step-addr">{addr}</p>
                  <p className="auto-detail-step-desc">{step.description}</p>

                  {/* '카카오맵에서 보기' 링크 등도 AutoCourseDetail에서 그대로 옮겨오면 됨 */}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

export default AICourseDetail;