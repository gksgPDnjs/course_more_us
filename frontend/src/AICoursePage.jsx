import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "./config";
//const API_BASE_URL = "http://localhost:4000";

function AICoursePage() {
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);

  // step: -1이면 첫 화면(랜덤 vs 맞춤) 선택
  const [step, setStep] = useState(-1);
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
        type: "chips", // ✅ pill(chips) UI
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

  const current = step >= 0 ? questions[step] : null;

  // ✅ 공통: AI 추천 호출
  const generateCourse = async (context) => {
    try {
      setIsGenerating(true);

      const res = await axios.post(`${API_BASE_URL}/api/ai/recommend-course`, {
        userContext: context,
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
  };

  // ✅ 랜덤 모드: 질문 옵션에서 무작위로 하나씩 뽑아 userContext 구성
  const makeRandomContext = () => {
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    return {
      withWho: pick(["연인", "친구", "혼자", "동료"]),
      region: pick(regionOptions),
      mood: pick(["설렘", "편안", "활동적", "힐링", "분위기"]),
      weather: pick(["맑음", "흐림", "비", "눈"]),
      budget: pick(["2만원 이하", "2~4만원", "4~7만원", "7만원 이상"]),
      car: pick(["대중교통", "도보", "자차"]),
    };
  };

  const handleSelect = async (value) => {
    if (!current) return;

    const updated = { ...answers, [current.key]: value };
    setAnswers(updated);

    // 마지막 질문 → AI 호출
    if (step === questions.length - 1) {
      await generateCourse(updated);
      return;
    }

    setStep((prev) => prev + 1);
  };

  const handleBack = () => {
    if (isGenerating) return;

    // step 0에서 뒤로 → 첫 화면(모드 선택)
    if (step === 0) {
      setStep(-1);
      return;
    }

    if (step <= -1) return;
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
              fontWeight: 600,
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

  const progressText =
    step >= 0 ? `${step + 1} / ${questions.length}` : `0 / ${questions.length}`;

  return (
    <div style={{ padding: "30px" }}>
      <h1 style={{ marginBottom: 10, fontWeight: 600 }}>AI 데이트 코스 추천</h1>

      {step === -1 ? (
        <>
          <p style={{ marginBottom: 18, color: "#6b7280", fontSize: 13 }}>
            빠르게 <strong>랜덤 추천</strong>을 받거나, 질문에 답해서{" "}
            <strong>맞춤 추천</strong>을 받을 수 있어요.
          </p>

          <div
            className="ai-question-slide"
            style={{
              padding: "20px",
              background: "#fafafa",
              borderRadius: "16px",
              border: "1px solid #eee",
            }}
          >
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
              오늘은 어떤 방식으로 추천받을까요?
            </h2>
            <p style={{ marginTop: 8, color: "#6b7280", fontSize: 13 }}>
              랜덤은 지금 상황에 맞춰 AI가 알아서 골라줘요.
            </p>

            <div
              style={{
                marginTop: 16,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <button
                onClick={async () => {
                  const ctx = makeRandomContext();
                  setAnswers(ctx);
                  await generateCourse(ctx);
                }}
                style={{
                  width: "100%",
                  padding: "14px 18px",
                  borderRadius: 14,
                  border: "1px solid #c7d2fe",
                  background: "#4f46e5",
                  color: "white",
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                🎲 랜덤으로 바로 추천받기
              </button>

              <button
                onClick={() => setStep(0)}
                style={{
                  width: "100%",
                  padding: "14px 18px",
                  borderRadius: 14,
                  border: "1px solid #e5e7eb",
                  background: "white",
                  color: "#111827",
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                🧠 질문에 답하고 맞춤 추천받기
              </button>
            </div>

            <div style={{ marginTop: 14, fontSize: 12, color: "#9ca3af" }}>
              * 맞춤 추천은 {questions.length}개의 질문으로 구성돼요.
            </div>
          </div>
        </>
      ) : (
        <>
          <p style={{ marginBottom: 18, color: "#6b7280", fontSize: 13 }}>
            질문에 답하면, 선택한 조건에 맞춰 AI가 코스를 추천해요. (
            {progressText})
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
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <h2 style={{ margin: 0, fontWeight: 600 }}>{current?.question}</h2>
              <button
                onClick={handleBack}
                disabled={step === -1}
                style={{
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                  color: "#111827",
                  cursor: "pointer",
                  height: 36,
                  whiteSpace: "nowrap",
                  fontWeight: 600,
                }}
              >
                ← 이전
              </button>
            </div>

            {/* ✅ chips UI (지역 선택) */}
            {current?.type === "chips" ? (
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
                        border: selected
                          ? "1px solid #4f46e5"
                          : "1px solid #e5e7eb",
                        background: selected ? "#4f46e5" : "#fff",
                        color: selected ? "#fff" : "#111827",
                        fontSize: 14,
                        cursor: "pointer",
                        fontWeight: 600,
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
                {current?.options.map((opt) => (
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
                      fontWeight: 600,
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default AICoursePage;