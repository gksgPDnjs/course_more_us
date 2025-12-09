import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_BASE_URL = "http://localhost:4000";

function AICoursePage() {
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({
    mood: "",
    weather: "",
    region: "",
    budget: "",
    timeOfDay: "",
    car: "",
  });

  const questions = [
    {
      key: "mood",
      question: "오늘 데이트 분위기는 어떤가요?",
      options: ["설레요", "편안해요", "활동적이에요", "힐링하고 싶어요"],
    },
    {
      key: "weather",
      question: "오늘 날씨는 어떤가요?",
      options: ["맑아요", "흐려요", "비 와요", "눈 와요"],
    },
    {
      key: "region",
      question: "어느 지역으로 갈까요?",
      options: ["홍대/신촌", "강남/역삼", "성수/건대", "용산/이태원"],
    },
    {
      key: "budget",
      question: "예산은 어느 정도인가요?",
      options: ["0–2만원", "2–4만원", "4–6만원", "6만원 이상"],
    },
    {
      key: "timeOfDay",
      question: "어느 시간대인가요?",
      options: ["오전", "오후", "저녁", "밤"],
    },
    {
      key: "car",
      question: "이동 수단은 무엇인가요?",
      options: ["대중교통", "도보", "자차"],
    },
  ];

  const current = questions[step];

  const handleSelect = async (value) => {
    const updated = { ...answers, [current.key]: value };
    setAnswers(updated);

    // 마지막 질문 → AI 호출
    if (step === questions.length - 1) {
      try {
        setIsGenerating(true);

        const res = await axios.post(
          `${API_BASE_URL}/api/ai/recommend-course`,
          {
            userContext: updated,
          }
        );

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

    setStep(step + 1);
  };

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
        <p
          style={{
            fontSize: 13,
            color: "#6b7280",
            marginBottom: 18,
          }}
        >
          선택해 준 기분·날씨·지역·예산을 모두 고려해서&nbsp;
          가장 잘 어울리는 코스를 조합하고 있어요.
        </p>

        <div className="ai-generating">
          <div className="ai-generating-spinner" />
          <p className="ai-generating-text">추천 코스를 구성하는 중</p>
        </div>
      </div>
    </div>
  );
}

  return (
    <div style={{ padding: "30px" }}>
      <h1 style={{ marginBottom: 20 }}>AI 맞춤 데이트 추천</h1>

      <div
        key={step}
        className="ai-question-slide"
        style={{
          padding: "20px",
          background: "#fafafa",
          borderRadius: "16px",
        }}
      >
        <h2>{current.question}</h2>

        <div style={{ marginTop: 20 }}>
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
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AICoursePage;