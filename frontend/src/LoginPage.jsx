// src/LoginPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = ""; // vite proxy 쓰는 중이면 "" 유지

function LoginPage() {
  const navigate = useNavigate();

  const [mode, setMode] = useState("login"); // "login" | "register"
  const [form, setForm] = useState({
    email: "",
    password: "",
    nickname: "",
    bio: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");

      if (mode === "login") {
        const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: form.email, password: form.password }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "로그인 실패");

        localStorage.setItem("token", data.token);
        localStorage.setItem("currentUser", JSON.stringify(data.user));
        navigate("/", { replace: true });
        window.location.reload();
      } else {
        const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: form.email,
            password: form.password,
            nickname: form.nickname,
            bio: form.bio,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "회원가입 실패");

        alert("회원가입 완료! 이제 로그인해 주세요 😊");
        setMode("login");
        setForm((prev) => ({ ...prev, password: "" }));
      }
    } catch (err) {
      setError(err.message || "요청 중 오류가 발생했어요.");
    } finally {
      setLoading(false);
    }
  };

  const title = mode === "login" ? "로그인" : "회원가입";
  const subtitle =
    mode === "login"
      ? "이메일로 로그인하거나 카카오로 빠르게 시작해요."
      : "새 계정을 만들고, 나만의 데이트 코스를 기록해요.";

  return (
    <div className="auth-page">
      <div className="auth-shell">
        {/* 왼쪽 브랜드 영역 */}
        <div className="auth-brand">
          <div className="auth-brand-inner">
            <div className="auth-logo">Course More Us</div>
            <div className="auth-brand-badge">데이트 코스 추천 & 기록</div>

            <h1 className="auth-brand-title">
              마음에 드는 데이트 코스를
              <br />
              지금 바로 찾아보세요
            </h1>
            <p className="auth-brand-desc">
              지역·기분·날씨를 바탕으로 코스를 추천하고,
              <br />
              마음에 들면 저장/찜으로 다시 꺼내볼 수 있어요.
            </p>

            {/* 장식 카드 */}
            <div className="auth-brand-card">
              <div className="auth-brand-card-row">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </div>
              <div className="auth-brand-card-line" />
              <div className="auth-brand-card-line short" />
            </div>
          </div>
        </div>

        {/* 오른쪽 폼 영역 */}
        <div className="auth-form">
          <div className="auth-card">
            <div className="auth-top">
              <h2 className="auth-title">{title}</h2>
              <p className="auth-subtitle">{subtitle}</p>
            </div>

            {/* 탭 */}
            <div className="auth-tabs">
              <button
                type="button"
                className={`auth-tab ${mode === "login" ? "active" : ""}`}
                onClick={() => setMode("login")}
              >
                로그인
              </button>
              <button
                type="button"
                className={`auth-tab ${mode === "register" ? "active" : ""}`}
                onClick={() => setMode("register")}
              >
                회원가입
              </button>
            </div>

            {error && <div className="auth-alert">{error}</div>}

            <form onSubmit={handleSubmit} className="auth-fields">
              {mode === "register" && (
                <>
                  <label className="field">
                    <span>닉네임</span>
                    <input
                      name="nickname"
                      placeholder="닉네임 (2~20자)"
                      value={form.nickname}
                      onChange={handleChange}
                      minLength={2}
                      maxLength={20}
                      required
                    />
                  </label>

                  <label className="field">
                    <span>한 줄 소개</span>
                    <textarea
                      name="bio"
                      placeholder="예: 감성 카페 코스 좋아해요 ☺️"
                      value={form.bio}
                      onChange={handleChange}
                      rows={2}
                      maxLength={120}
                    />
                  </label>
                </>
              )}

              <label className="field">
                <span>이메일</span>
                <input
                  name="email"
                  type="email"
                  placeholder="email@example.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </label>

              <label className="field">
                <span>비밀번호</span>
                <input
                  name="password"
                  type="password"
                  placeholder="비밀번호"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
              </label>

              <button className="auth-submit" type="submit" disabled={loading}>
                {mode === "login"
                  ? loading
                    ? "로그인 중..."
                    : "로그인"
                  : loading
                  ? "회원가입 중..."
                  : "회원가입"}
              </button>

              <div className="auth-divider">
                <span>또는</span>
              </div>

              <button
                type="button"
                className="auth-kakao"
                onClick={() => {
                  // 카카오 로그인은 전체 주소가 제일 안전(프록시 영향 X)
                  window.location.href = `http://localhost:4000/api/auth/kakao`;
                }}
              >
                카카오로 계속하기
              </button>

              <p className="auth-footnote">
                로그인하면 서비스 이용약관 및 개인정보처리방침에 동의한 것으로
                간주됩니다.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;