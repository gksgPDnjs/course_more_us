// src/pages/LoginPage.jsx
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function LoginPage() {
  const navigate = useNavigate();

  // ✅ Vite proxy 쓰는 경우 fetch는 "/api/..." 로 호출
  // ✅ 카카오 로그인 리다이렉트는 백엔드 오리진이 필요 (프록시 X)
  const BACKEND_ORIGIN =
    import.meta.env.VITE_BACKEND_ORIGIN || "http://localhost:4000";

  const [mode, setMode] = useState("login"); // "login" | "register"
  const [form, setForm] = useState({
    email: "",
    password: "",
    password2: "", // 회원가입 비밀번호 확인
    nickname: "",
    bio: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const switchMode = (nextMode) => {
    if (loading) return;
    setError("");
    setShowPw(false);

    setMode(nextMode);

    // 모드 전환 시 입력값 정리
    setForm((prev) => {
      const base = { ...prev, password: "", password2: "" };
      if (nextMode === "login") return { ...base, nickname: "", bio: "" };
      return base;
    });
  };

  const validateClient = () => {
    const email = (form.email || "").trim();
    const pw = form.password || "";

    if (!email) return "이메일을 입력해 주세요.";
    if (!pw) return "비밀번호를 입력해 주세요.";

    if (mode === "register") {
      if (pw.length < 8) return "비밀번호는 8자 이상으로 입력해 주세요.";
      if (form.password2 !== pw) return "비밀번호 확인이 일치하지 않아요.";
      if (!form.nickname?.trim()) return "닉네임을 입력해 주세요.";
      if (form.nickname.trim().length < 2)
        return "닉네임은 2자 이상으로 입력해 주세요.";
    }
    return "";
  };

  const title = mode === "login" ? "로그인" : "회원가입";
  const subtitle =
    mode === "login"
      ? "다시 돌아오신 걸 환영해요. 오늘의 코스를 만들어볼까요?"
      : "간단히 가입하고, 나만의 코스와 추천을 시작해요.";

  const buttonText = useMemo(() => {
    if (!loading) return mode === "login" ? "로그인" : "회원가입";
    return mode === "login" ? "로그인 중..." : "가입 중...";
  }, [loading, mode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const clientError = validateClient();
    if (clientError) {
      setError(clientError);
      return;
    }

    try {
      setLoading(true);
      setError("");

      if (mode === "login") {
        const payload = { email: form.email, password: form.password };

        const res = await fetch(`/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "로그인 실패");

        localStorage.setItem("token", data.token);
        localStorage.setItem("currentUser", JSON.stringify(data.user));

        navigate("/", { replace: true });
      } else {
        const payload = {
          email: form.email,
          password: form.password,
          nickname: form.nickname,
          bio: form.bio,
        };

        const res = await fetch(`/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "회원가입 실패");

        setMode("login");
        setForm((prev) => ({ ...prev, password: "", password2: "" }));
      }
    } catch (err) {
      console.error(err);
      setError(err?.message || "요청 중 오류가 발생했어요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    // ✅ 핵심: flex + items-center 로 "2컬럼 전체"를 세로 중앙 정렬
    <div className="relative flex min-h-[calc(100vh-64px)] items-center justify-center bg-slate-50 px-6 py-10">
      {/* 배경 장식 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-br from-indigo-200 via-fuchsia-200 to-amber-100 blur-3xl opacity-70" />
        <div className="absolute -bottom-40 left-12 h-[420px] w-[420px] rounded-full bg-gradient-to-br from-emerald-100 via-sky-100 to-indigo-100 blur-3xl opacity-70" />
      </div>

      {/* ✅ 기존 레이아웃 유지: max-w-6xl + 2컬럼 grid */}
      <div className="relative z-10 mx-auto w-full max-w-6xl">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          {/* 왼쪽: 브랜드 문구 (웹사이트 느낌) */}
          <section className="hidden lg:block">
      

            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900">
              마음에 드는 데이트 코스를
              <br />
              <span className="bg-gradient-to-r from-slate-900 to-emerald-700 bg-clip-text text-transparent">
                지금 바로
              </span>{" "}
              찾아보세요
            </h1>

            <p className="mt-4 max-w-md text-sm leading-6 text-slate-600">
              지역·분위기·예산에 맞춘 추천과 내가 만든 코스를 한 곳에서.
              <br />
              기록은 쉽고, 추천은 똑똑하게.
            </p>

            <div className="mt-6 grid max-w-md gap-3 text-sm text-slate-700">
              <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur">
                <div className="font-semibold text-slate-900">테이트 추천 코스</div>
                <div className="mt-1 text-slate-600">
                  카드형 UI로 빠르게 비교하고, 디테일 페이지로 바로 이동.
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur">
                <div className="font-semibold text-slate-900">카카오맵 기반</div>
                <div className="mt-1 text-slate-600">
                  실제 장소 데이터로 코스를 구성하고 동선도 확인할 수 있어요.
                </div>
              </div>
            </div>
          </section>

          {/* 오른쪽: 로그인 카드 */}
          <section className="mx-auto w-full max-w-md">
            <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-xl backdrop-blur">
              {/* 헤더 */}
              <div className="mb-5">
                <div className="text-xs font-semibold tracking-wide text-slate-500">
                  Course More Us
                </div>
                <h2 className="mt-1 text-2xl font-extrabold text-slate-900">
                  {title}
                </h2>
                <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
              </div>

              {/* 탭 */}
              <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  disabled={loading}
                  className={`rounded-xl py-2 text-sm font-semibold transition ${
                    mode === "login"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  로그인
                </button>
                <button
                  type="button"
                  onClick={() => switchMode("register")}
                  disabled={loading}
                  className={`rounded-xl py-2 text-sm font-semibold transition ${
                    mode === "register"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  회원가입
                </button>
              </div>

              {/* 에러 */}
              {error && (
                <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              )}

              {/* 폼 */}
              <form onSubmit={handleSubmit} className="space-y-3">
                {mode === "register" && (
                  <>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600">
                        닉네임
                      </label>
                      <input
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-300 focus:ring-4 focus:ring-slate-200"
                        name="nickname"
                        placeholder="닉네임 (2~20자)"
                        value={form.nickname}
                        onChange={handleChange}
                        minLength={2}
                        maxLength={20}
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600">
                        한 줄 소개
                        <span className="ml-1 font-medium text-slate-400">
                          (선택)
                        </span>
                      </label>
                      <textarea
                        className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-300 focus:ring-4 focus:ring-slate-200"
                        name="bio"
                        placeholder="예: 감성 카페 코스 좋아하는 대학생이에요 ☺️"
                        value={form.bio}
                        onChange={handleChange}
                        rows={2}
                        maxLength={120}
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    이메일
                  </label>
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-300 focus:ring-4 focus:ring-slate-200"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={handleChange}
                    required
                    autoComplete="email"
                  />
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-600">
                      비밀번호
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                    >
                      {showPw ? "숨기기" : "보이기"}
                    </button>
                  </div>
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-300 focus:ring-4 focus:ring-slate-200"
                    name="password"
                    type={showPw ? "text" : "password"}
                    placeholder={mode === "register" ? "8자 이상" : "••••••••"}
                    value={form.password}
                    onChange={handleChange}
                    required
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                  />
                </div>

                {mode === "register" && (
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      비밀번호 확인
                    </label>
                    <input
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-300 focus:ring-4 focus:ring-slate-200"
                      name="password2"
                      type={showPw ? "text" : "password"}
                      placeholder="비밀번호 다시 입력"
                      value={form.password2}
                      onChange={handleChange}
                      required
                      autoComplete="new-password"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {buttonText}
                </button>
              </form>

              {/* 구분선 */}
              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs font-semibold text-slate-400">
                  또는
                </span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              {/* 카카오 */}
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  if (loading) return;
                  window.location.href = `${BACKEND_ORIGIN}/api/auth/kakao`;
                }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#F0D700] bg-[#FEE500] px-4 py-3 text-sm font-semibold text-black shadow-sm transition hover:brightness-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/10">
                  🟡
                </span>
                카카오로 로그인
              </button>

              <p className="mt-4 text-center text-xs text-slate-400">
                로그인하면 서비스 이용약관 및 개인정보처리방침에 동의한 것으로
                간주돼요.
              </p>
            </div>

            {/* 아래 작은 링크 */}
            <div className="mt-4 flex items-center justify-center gap-3 text-xs text-slate-500">
              <Link className="hover:text-slate-700" to="/">
                홈으로
              </Link>
              <span className="text-slate-300">•</span>
              <Link className="hover:text-slate-700" to="/recommend">
                추천받기
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;