import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_BASE_URL = "http://localhost:4000";

function AICoursePage() {
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({
    withWho: "",
    region: "",
    mood: "",
    weather: "",
    budget: "",
    car: "",
  });

  // ✅ 지역 옵션(캡처처럼 길게/많이)
  const regionOptions = useMemo(
    () => [
      "서울 전체",
      "강남/삼성/신사/압구정",
      "서초/교대/고터/사당",
      "잠실/송파/강동",
      "홍대/신촌/마포/연남",
      "여의도/영등포",
      "용산/이태원",
      "종로/경복궁/혜화",
    ],
    []
  );

  // ✅ 질문 6개 (최종)
  const questions = useMemo(
    () => [
      {
        key: "withWho",
        question: "누구와 함께인가요?",
        type: "buttons",
        options: ["연인", "친구", "혼자", "동료"],
      },
      {
        key: "region",
        question: "어느 지역으로 갈까요?",
        type: "buttons", // ✅ 캡처처럼 pill 선택 UI
        options: regionOptions,
      },
      {
        key: "mood",
        question: "오늘 기분은 어떤가요?",
        type: "buttons",
        options: ["설렘", "편안", "활동적", "힐링", "분위기"],
      },
      {
        key: "weather",
        question: "지금 날씨는 어떤가요?",
        type: "buttons",
        options: ["맑음", "흐림", "비", "눈"],
      },
      {
        key: "budget",
        question: "1인당 예산은 어느 정도인가요?",
        type: "buttons",
        options: ["2만원 이하", "2~4만원", "4~7만원", "7만원 이상"],
      },
      {
        key: "car",
        question: "이동 수단은 무엇인가요?",
        type: "buttons",
        options: ["대중교통", "도보", "자차"],
      },
    ],
    [regionOptions]
  );

  const current = questions[step];

  const handleSelect = async (value) => {
    const updated = { ...answers, [current.key]: value };
    setAnswers(updated);

    // 마지막 질문 → AI 호출
    if (step === questions.length - 1) {
      try {
        setIsGenerating(true);

        const res = await axios.post(`${API_BASE_URL}/api/ai/recommend-course`, {
          userContext: updated,
        });

        navigate("/ai-course/result", {
          state: { result: res.data },
        });
      } catch (err) {
        console.error("AI 추천 오류:", err);
        alert("AI 추천 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.");
      } finally {
        setIsGenerating(false);
      }
      return;
    }

    setStep((prev) => prev + 1);
  };

  const handleBack = () => {
    if (isGenerating) return;
    if (step === 0) return;
    setStep((prev) => prev - 1);
  };

  // ✅ 로딩 화면
  if (isGenerating) {
    return (
      <div
        style={{
          minHeight: "320px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <div
          style={{
            maxWidth: "420px",
            width: "100%",
            borderRadius: "22px",
            padding: "24px 22px 26px",
            background:
              "radial-gradient(circle at top left, #eef2ff, #fce7f3, #fff7ed)",
            boxShadow: "0 18px 40px rgba(15, 23, 42, 0.16)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 40,
              height: 40,
              borderRadius: "999px",
              background: "rgba(79, 70, 229, 0.12)",
              color: "#4f46e5",
              fontSize: 20,
              marginBottom: 12,
            }}
          >
            ✨
          </div>
          <h1
            style={{
              fontSize: 18,
              fontWeight: 700,
              marginBottom: 6,
              color: "#111827",
            }}
          >
            AI가 오늘의 데이트 코스를 만드는 중이에요
          </h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 18 }}>
            선택한 조건을 바탕으로 서울 안에서 현실적인 동선을 찾고 있어요.
          </p>

          <div className="ai-generating">
            <div className="ai-generating-spinner" />
            <p className="ai-generating-text">추천 코스를 구성하는 중</p>
          </div>
        </div>
      </div>
    );
  }

  const progressText = `${step + 1} / ${questions.length}`;

  return (
    <div style={{ padding: "30px" }}>
      <h1 style={{ marginBottom: 10 }}>AI 맞춤 데이트 추천</h1>
      <p style={{ marginBottom: 18, color: "#6b7280", fontSize: 13 }}>
        질문에 답하면, 선택한 조건에 맞춰 AI가 코스를 추천해요. ({progressText})
      </p>

      <div
        key={step}
        className="ai-question-slide"
        style={{
          padding: "20px",
          background: "#fafafa",
          borderRadius: "16px",
          border: "1px solid #eee",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <h2 style={{ margin: 0 }}>{current.question}</h2>
          <button
            onClick={handleBack}
            disabled={step === 0}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              background: step === 0 ? "#f3f4f6" : "#fff",
              color: step === 0 ? "#9ca3af" : "#111827",
              cursor: step === 0 ? "not-allowed" : "pointer",
              height: 36,
              whiteSpace: "nowrap",
            }}
          >
            ← 이전
          </button>
        </div>

        {/* ✅ chips UI (지역 선택) */}
        {current.type === "chips" ? (
          <div
            style={{
              marginTop: 18,
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            {current.options.map((opt) => {
              const selected = answers[current.key] === opt;
              return (
                <button
                  key={opt}
                  onClick={() => handleSelect(opt)}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 999,
                    border: selected ? "1px solid #4f46e5" : "1px solid #e5e7eb",
                    background: selected ? "#4f46e5" : "#fff",
                    color: selected ? "#fff" : "#111827",
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        ) : (
          // ✅ 기본 버튼 UI
          <div style={{ marginTop: 18 }}>
            {current.options.map((opt) => (
              <button
                key={opt}
                onClick={() => handleSelect(opt)}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "14px 18px",
                  borderRadius: 12,
                  marginBottom: 12,
                  border: "1px solid #ddd",
                  background: "white",
                  fontSize: 16,
                  cursor: "pointer",
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AICoursePage;