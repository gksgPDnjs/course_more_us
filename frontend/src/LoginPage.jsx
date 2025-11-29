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
    nickname: "",
    bio: "",
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
        const payload = {
          email: form.email,
          password: form.password,
        };

        const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data.message || "로그인 실패");
        }

        // 백엔드 응답: { token, user: { id, email, nickname, bio } }
        localStorage.setItem("token", data.token);
        localStorage.setItem("currentUser", JSON.stringify(data.user));

        // 메인으로 이동
        navigate("/");
        window.location.reload(); // 바로 상태 반영
      } else {
        // 🆕 회원가입
        const payload = {
          email: form.email,
          password: form.password,
          nickname: form.nickname,
          bio: form.bio,
        };

        const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data.message || "회원가입 실패");
        }

        alert("회원가입이 완료됐어요! 이제 로그인 해 주세요 😊");
        setMode("login");
        // 비밀번호만 비우고, 나머지는 그대로 둬도 됨
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
    <div className="app" style={{ maxWidth: 480, margin: "40px auto" }}>
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
          : "이메일, 닉네임, 비밀번호를 입력해 새 계정을 만들어요. 닉네임과 한 줄 소개는 나중에 코스를 올릴 때 다른 유저들에게 보여져요."}
      </p>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit} className="course-form">
        {/* 회원가입에서만 보이는 필드들 */}
        {mode === "register" && (
          <>
            <input
              className="input"
              name="nickname"
              placeholder="닉네임 (2~20자)"
              value={form.nickname}
              onChange={handleChange}
              minLength={2}
              maxLength={20}
              required
            />
            <textarea
              className="textarea"
              name="bio"
              placeholder="한 줄 소개 (선택)  예: 감성 카페 코스 좋아하는 대학생이에요 ☺️"
              value={form.bio}
              onChange={handleChange}
              rows={2}
              maxLength={120}
              style={{ marginBottom: 4 }}
            />
          </>
        )}

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