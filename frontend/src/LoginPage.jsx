// src/LoginPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = "http://localhost:4000";

function LoginPage() {
  const navigate = useNavigate();

  // mode: "login" 또는 "register"
  const [mode, setMode] = useState("login");

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // 공통 submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");

      if (mode === "login") {
        // 🔐 로그인
        const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data.message || "로그인 실패");
        }

        // 백엔드 응답: { token, user: { id, email } }
        localStorage.setItem("token", data.token);
        localStorage.setItem("currentUser", JSON.stringify(data.user));

        // 메인으로 이동
        navigate("/");
        window.location.reload(); // 바로 상태 반영
      } else {
        // 🆕 회원가입
        const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data.message || "회원가입 실패");
        }

        alert("회원가입이 완료됐어요! 이제 로그인 해 주세요 😊");
        setMode("login");
        // 비밀번호만 비워주기
        setForm((prev) => ({ ...prev, password: "" }));
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "요청 중 오류가 발생했어요.");
    } finally {
      setLoading(false);
    }
  };

  const title = mode === "login" ? "로그인" : "회원가입";
  const buttonText =
    mode === "login"
      ? loading
        ? "로그인 중..."
        : "로그인"
      : loading
      ? "회원가입 중..."
      : "회원가입";

  return (
    <div className="app" style={{ maxWidth: 400, margin: "40px auto" }}>
      <h1 className="app-title" style={{ marginBottom: 8 }}>
        {title}
      </h1>

      {/* 탭 전환 */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 16,
          fontSize: 14,
        }}
      >
        <button
          type="button"
          onClick={() => setMode("login")}
          className={mode === "login" ? "tab tab-active" : "tab"}
        >
          로그인
        </button>
        <button
          type="button"
          onClick={() => setMode("register")}
          className={mode === "register" ? "tab tab-active" : "tab"}
        >
          회원가입
        </button>
      </div>

      <p style={{ marginBottom: 16, fontSize: 13, color: "#666" }}>
        {mode === "login"
          ? "이미 가입한 이메일과 비밀번호로 로그인해 주세요."
          : "이메일과 비밀번호를 입력해 새 계정을 만들어요."}
      </p>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit} className="course-form">
        <input
          className="input"
          name="email"
          type="email"
          placeholder="이메일"
          value={form.email}
          onChange={handleChange}
          required
        />
        <input
          className="input"
          name="password"
          type="password"
          placeholder="비밀번호"
          value={form.password}
          onChange={handleChange}
          required
        />

        <button className="btn btn-primary" type="submit" disabled={loading}>
          {buttonText}
        </button>
      </form>
    </div>
  );
}

export default LoginPage;
