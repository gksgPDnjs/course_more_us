// src/pages/AICourseTestPage.jsx
import { useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "./config";
//const API_BASE_URL = "http://localhost:4000";

function AICourseTestPage() {
  const [loading, setLoading] = useState(false);
  const [course, setCourse] = useState(null);
  const [error, setError] = useState("");

  const handleAiRecommend = async () => {
    try {
      setLoading(true);
      setError("");
      setCourse(null);

      // 일단은 테스트용으로 userContext 하드코딩
      const userContext = {
        mood: "설레요",
        weather: "맑아요",
        region: "홍대/신촌",
        budget: "2-4만원",
        timeOfDay: "저녁",
        car: "대중교통",
      };

      const res = await axios.post(
        `${API_BASE_URL}/api/ai/recommend-course`,
        { userContext }
      );

      setCourse(res.data); // { title, summary, steps: [...] }
    } catch (err) {
      console.error(err);
      setError("AI 추천을 불러오는 중 오류가 발생했어요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: "0 16px" }}>
      <h1>AI 맞춤 코스 (테스트)</h1>
      <p style={{ color: "#666", marginBottom: 16 }}>
        버튼을 눌러서 백엔드의 <code>/api/ai/recommend-course</code>를 호출해볼게요.
      </p>

      <button
        onClick={handleAiRecommend}
        disabled={loading}
        style={{
          padding: "10px 16px",
          borderRadius: 999,
          border: "none",
          background: "#ff6f9c",
          color: "white",
          cursor: "pointer",
        }}
      >
        {loading ? "AI가 코스를 만드는 중..." : "AI에게 코스 추천받기"}
      </button>

      {error && (
        <p style={{ marginTop: 16, color: "#e03131" }}>
          {error}
        </p>
      )}

      {course && (
        <div style={{ marginTop: 24 }}>
          <h2>{course.title}</h2>
          <p style={{ color: "#555" }}>{course.summary}</p>

          <div style={{ marginTop: 16 }}>
            {course.steps?.map((step) => (
              <div
                key={step.order}
                style={{
                  borderRadius: 16,
                  border: "1px solid #eee",
                  padding: "12px 14px",
                  marginBottom: 10,
                }}
              >
                <strong>
                  {step.order}. {step.role} · {step.area}
                </strong>
                <p style={{ margin: "4px 0 2px" }}>{step.description}</p>
                <small style={{ color: "#777" }}>
                  Kakao 검색 키워드: {step.kakaoQuery}
                </small>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default AICourseTestPage;