// src/App.jsx
import { useEffect, useState } from "react";
import {
  Routes,
  Route,
  Link,
  NavLink,
  Outlet,
  useNavigate,
} from "react-router-dom";

import CourseDetail from "./CourseDetail.jsx";
import LoginPage from "./LoginPage.jsx";
import RecommendPage from "./RecommendPage.jsx";
import RandomPage from "./RandomPage.jsx";
import { SEOUL_REGIONS } from "./data/regions";
import "./App.css";
import AutoCourseDetail from "./AutoCourseDetail.jsx";
import HomePage from "./HomePage.jsx";
import MyPage from "./pages/Mypage.jsx";
import AdminCoursesPage from "./AdminCoursesPage";
import LoginSuccessPage from "./LoginSuccessPage.jsx";
import AICourseTestPage from "./AICourseTestPage.jsx";
import AICoursePage from "./AICoursePage.jsx";
import AICourseResult from "./AICourseResult.jsx";
import AICourseDetail from "./AICourseDetail.jsx";

const API_BASE_URL = "http://localhost:4000";

// 🔐 공통 로그인 훅
function useAuth() {
  const savedUser = localStorage.getItem("currentUser");
  const currentUser = savedUser ? JSON.parse(savedUser) : null;
  const token = localStorage.getItem("token");
  const currentUserId = currentUser && (currentUser.id || currentUser._id);
  const isLoggedIn = !!token && !!currentUser;
  return { currentUser, token, currentUserId, isLoggedIn };
}

// (기존에 쓰던 getRegionLabel – 필요하면 그대로 사용)
function getRegionLabel(cityId) {
  if (!cityId) return "";
  const region = SEOUL_REGIONS.find((r) => r.id === cityId);
  return region ? region.label : cityId;
}

/* ===================== 공통 레이아웃 ===================== */
function Layout() {
  const { currentUser, isLoggedIn } = useAuth();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("currentUser");
    window.location.href = "/";
  };

  // ✅ 랜덤 탭만 제거 (라우트는 유지)
  const navItems = [
    { to: "/recommend", label: "추천 받기" },
    { to: "/ai-course", label: "AI 맞춤 코스" },
    { to: "/new", label: "코스 만들기" },
    { to: "/mypage", label: "마이페이지" },
  ];

  const navClass = ({ isActive }) =>
    [
      "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition",
      "border shadow-sm backdrop-blur",
      isActive
        ? "bg-violet-600 text-white border-violet-300/40 shadow-[0_14px_30px_rgba(124,58,237,0.18)]"
        : "bg-white/70 text-slate-700 border-slate-200 hover:bg-white hover:border-slate-300",
    ].join(" ");

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* ✅ 새 헤더 (홈 무드 통일) */}
      <header className="sticky top-0 z-50">
        <div className="bg-[#fafafa]/70 backdrop-blur">
          <div className="pointer-events-none h-px w-full bg-gradient-to-r from-transparent via-violet-200/70 to-transparent" />

          <div className="mx-auto max-w-6xl px-6">
            <div className="flex flex-col gap-4 py-5 md:flex-row md:items-center md:justify-between">
              {/* Brand */}
              <Link to="/" className="group inline-flex items-center gap-3">
                <div className="relative">
                  <div className="absolute -inset-2 rounded-2xl bg-gradient-to-br from-violet-200/70 via-fuchsia-200/50 to-sky-200/50 blur-xl opacity-70 transition group-hover:opacity-90" />
                  <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200/70 bg-white/70 shadow-sm">
                    <span className="text-lg">✨</span>
                  </div>
                </div>

                <div className="leading-tight">
                  <div className="text-lg font-semibold tracking-tight text-slate-900">
                    Course More Us
                  </div>
                  <div className="text-xs font-semibold text-slate-500">
                    데이트 코스 추천 & 기록 서비스 📝
                  </div>
                </div>
              </Link>

              {/* Auth */}
              <div className="flex items-center gap-2 md:justify-end">
                {isLoggedIn ? (
                  <>
                    <span className="hidden md:inline text-xs font-semibold text-slate-600">
                      {currentUser?.email} 님 👋
                    </span>
                    <button
                      onClick={handleLogout}
                      className="rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-xs font-extrabold text-slate-700 shadow-sm hover:bg-white hover:border-slate-300"
                    >
                      로그아웃
                    </button>
                  </>
                ) : (
                  <Link
                    to="/login"
                    className="rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-xs font-extrabold text-slate-700 shadow-sm hover:bg-white hover:border-slate-300"
                  >
                    로그인
                  </Link>
                )}
              </div>
            </div>

            {/* Nav */}
            <nav className="flex flex-wrap gap-2 pb-4">
              {navItems.map((it) => (
                <NavLink key={it.to} to={it.to} className={navClass}>
                  {it.label}
                </NavLink>
              ))}
            </nav>

            {/* Hint line */}
            <div className="pb-5 text-xs font-semibold text-slate-500">
              {isLoggedIn ? (
                <span>저장/찜한 코스는 마이페이지에서 바로 확인할 수 있어요.</span>
              ) : (
                <span>로그인하면 코스를 저장하고 찜할 수 있어요.</span>
              )}
            </div>
          </div>

          <div className="h-px w-full bg-slate-200/70" />
        </div>
      </header>

      {/* ✅ 메인 컨텐츠 */}
      <main className="mx-auto max-w-6xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}

/* ===================== (필요시) 코스 리스트 페이지 ===================== */
/* 지금은 실제 라우트에서 안 쓰고 있으니까, 필요 없으면 삭제해도 돼 */
function CourseListPage() {
  const { currentUserId, token, isLoggedIn } = useAuth();

  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [likedIds, setLikedIds] = useState([]);
  const [loadingLikes, setLoadingLikes] = useState(false);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API_BASE_URL}/api/courses`);
      if (!res.ok) throw new Error("Failed to fetch courses");
      const data = await res.json();
      setCourses(data);
    } catch (err) {
      console.error(err);
      setError("코스를 불러오는 데 실패했어요.");
    } finally {
      setLoading(false);
    }
  };

  const fetchLikedCourses = async () => {
    if (!isLoggedIn) {
      setLikedIds([]);
      return;
    }
    try {
      setLoadingLikes(true);
      const res = await fetch(`${API_BASE_URL}/api/courses/liked/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => []);

      if (!res.ok) throw new Error(data?.message || "찜 목록 조회 실패");

      const ids = Array.isArray(data) ? data.map((c) => String(c._id)) : [];
      setLikedIds(ids);
    } catch (err) {
      console.error("fetchLikedCourses error:", err);
    } finally {
      setLoadingLikes(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    fetchLikedCourses();
  }, [isLoggedIn, token]);

  const filteredCourses = courses.filter((course) =>
    course.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id) => {
    if (!isLoggedIn) {
      alert("로그인이 필요합니다.");
      return;
    }

    const ok = window.confirm("정말 이 코스를 삭제할까요?");
    if (!ok) return;

    try {
      setLoading(true);
      setError("");

      const res = await fetch(`${API_BASE_URL}/api/courses/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.message || "삭제 실패 😢");
        return;
      }

      setCourses((prev) => prev.filter((c) => c._id !== id));
      setLikedIds((prev) => prev.filter((cid) => cid !== id));
    } catch (err) {
      console.error(err);
      setError("코스를 삭제하는 데 실패했어요.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLike = async (courseId) => {
    if (!isLoggedIn) {
      alert("로그인 후 찜할 수 있어요.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/courses/${courseId}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "찜 처리 실패");

      if (data.liked) {
        setLikedIds((prev) => {
          const idStr = String(courseId);
          if (prev.includes(idStr)) return prev;
          return [...prev, idStr];
        });
      } else {
        setLikedIds((prev) => prev.filter((cid) => cid !== String(courseId)));
      }
    } catch (err) {
      console.error("toggle like error:", err);
      alert(err.message || "찜 처리 중 오류가 발생했어요.");
    }
  };

  return (
    <section className="section-list">
      <h2 className="section-title">저장된 코스들</h2>

      {error && <div className="alert alert-error">{error}</div>}

      <input
        className="input"
        placeholder="제목으로 검색"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 12 }}
      />

      {(loading || loadingLikes) && <p className="text-muted">불러오는 중...</p>}

      {courses.length === 0 ? (
        <p className="text-muted">저장된 코스가 없어요.</p>
      ) : filteredCourses.length === 0 ? (
        <p className="text-muted">검색 결과가 없습니다.</p>
      ) : (
        <ul className="course-list">
          {filteredCourses.map((course) => {
            const regionLabel = getRegionLabel(course.city);
            const hasSteps = Array.isArray(course.steps) && course.steps.length > 0;
            const firstStep = hasSteps ? course.steps[0] : null;

            const isOwner = currentUserId && currentUserId === String(course.owner);
            const isLiked = likedIds.includes(String(course._id));

            return (
              <li key={course._id} className="card course-card">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <h3 className="course-title" style={{ margin: 0, fontSize: 20 }}>
                    {course.title}
                  </h3>

                  {isLoggedIn && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleToggleLike(course._id)}
                    >
                      {isLiked ? "💜" : "🤍"}
                    </button>
                  )}
                </div>

                <p style={{ color: "#666", marginBottom: 8, fontSize: 13 }}>
                  📍 {regionLabel} ·{" "}
                  {hasSteps ? `총 ${course.steps.length}단계 코스` : "단계 정보 없음"}
                </p>

                {firstStep && (
                  <p style={{ marginBottom: 12, fontSize: 13 }}>
                    ⭐ 1단계: {firstStep.place}
                  </p>
                )}

                <div className="course-actions" style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <Link to={`/courses/${course._id}`} className="btn btn-secondary btn-sm">
                    상세 보기
                  </Link>

                  {isOwner && (
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(course._id)}
                    >
                      삭제
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ===================== 새 코스 등록 페이지 ===================== */

const MOOD_OPTIONS = [
  { value: "", label: "선택하지 않음" },
  { value: "감성", label: "감성 / 분위기" },
  { value: "힐링", label: "힐링 / 조용한" },
  { value: "먹방", label: "먹방 / 맛집" },
  { value: "활동적인", label: "활동적인 / 체험" },
  { value: "데이트", label: "전형적인 데이트" },
  { value: "특별한날", label: "기념일 / 특별한 날" },
];

function NewCoursePage() {
  const { token, isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [cityId, setCityId] = useState(SEOUL_REGIONS[0].id);

  const [mood, setMood] = useState("");
  const [heroImageFile, setHeroImageFile] = useState(null);
  const [heroImageUrl, setHeroImageUrl] = useState("");

  const [steps, setSteps] = useState([
    { title: "1단계", place: "", memo: "", time: "", budget: "" },
    { title: "2단계", place: "", memo: "", time: "", budget: "" },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleStepChange = (index, field, value) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  };

  const addStep = () => {
    if (steps.length >= 4) return;
    const next = steps.length + 1;
    setSteps((prev) => [...prev, { title: `${next}단계`, place: "", memo: "", time: "", budget: "" }]);
  };

  const removeStep = (idx) => {
    if (steps.length <= 1) return;
    setSteps((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!isLoggedIn) {
      alert("로그인 후 코스를 등록할 수 있어요.");
      return;
    }

    if (!title.trim()) {
      setError("제목을 입력해 주세요.");
      return;
    }

    const cleanedSteps = steps
      .map((s) => ({ ...s, budget: s.budget ? Number(s.budget) : 0 }))
      .filter((s) => s.place.trim());

    if (cleanedSteps.length === 0) {
      setError("최소 1개의 장소는 입력해야 합니다.");
      return;
    }

    setLoading(true);

    let finalImageUrl = heroImageUrl.trim() || null;

    if (!finalImageUrl && heroImageFile) {
      try {
        const formData = new FormData();
        formData.append("image", heroImageFile);

        const uploadRes = await fetch(`${API_BASE_URL}/api/upload/image`, {
          method: "POST",
          body: formData,
        });

        const uploadData = await uploadRes.json().catch(() => ({}));
        if (uploadRes.ok && uploadData.url) {
          finalImageUrl = uploadData.url;
        } else {
          console.error("이미지 업로드 실패:", uploadData);
        }
      } catch (err) {
        console.error("이미지 업로드 오류:", err);
      }
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/courses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          city: cityId,
          mood: mood || undefined,
          heroImageUrl: finalImageUrl || undefined,
          steps: cleanedSteps,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "코스 등록 실패");

      alert("코스가 등록되었습니다!");
      navigate("/");

      setTitle("");
      setCityId(SEOUL_REGIONS[0].id);
      setMood("");
      setHeroImageFile(null);
      setHeroImageUrl("");
      setSteps([
        { title: "1단계", place: "", memo: "", time: "", budget: "" },
        { title: "2단계", place: "", memo: "", time: "", budget: "" },
      ]);
    } catch (err) {
      console.error(err);
      setError(err.message || "코스 등록 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card card-form">
      <h2 className="section-title">새 코스 등록하기</h2>

      {error && <div className="alert alert-error">{error}</div>}

      <form className="course-form" onSubmit={handleSubmit}>
        <input
          className="input"
          placeholder="코스 제목 (예: 홍대 감성 데이트)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={!isLoggedIn}
          required
          style={{ marginBottom: 12 }}
        />

        <div style={{ display: "flex", gap: 8 }}>
          <select
            className="input"
            value={cityId}
            onChange={(e) => setCityId(e.target.value)}
            disabled={!isLoggedIn}
          >
            {SEOUL_REGIONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>

          <select
            className="input"
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            disabled={!isLoggedIn}
          >
            {MOOD_OPTIONS.map((opt) => (
              <option key={opt.value || "none"} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 600 }}>대표 이미지 업로드 (선택)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setHeroImageFile(e.target.files?.[0] || null)}
            disabled={!isLoggedIn}
            style={{ marginTop: 6 }}
          />
          <p style={{ fontSize: 12, color: "#777" }}>
            파일을 선택하면 저장할 때 자동으로 업로드돼요.
          </p>
        </div>

        <div style={{ marginTop: 8 }}>
          <input
            className="input"
            placeholder="또는 이미지 URL 직접 입력 (선택)"
            value={heroImageUrl}
            onChange={(e) => setHeroImageUrl(e.target.value)}
            disabled={!isLoggedIn}
          />
          <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
            * URL을 입력하면 파일보다 이 주소가 우선으로 사용돼요.
          </p>
        </div>

        <div style={{ marginTop: 16, marginBottom: 8, fontSize: 13, color: "#666" }}>
          데이트 코스를 2–4단계로 작성해 주세요. (최대 4단계)
        </div>

        {steps.map((step, i) => (
          <div key={i} className="card" style={{ padding: 12, marginBottom: 8 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <strong>{step.title}</strong>
              {steps.length > 1 && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => removeStep(i)}
                >
                  단계 삭제
                </button>
              )}
            </div>

            <input
              className="input"
              placeholder="장소 이름 (예: ○○카페)"
              value={step.place}
              onChange={(e) => handleStepChange(i, "place", e.target.value)}
              required={i === 0}
            />

            <input
              className="input"
              placeholder="시간 (예: 14:00)"
              value={step.time}
              onChange={(e) => handleStepChange(i, "time", e.target.value)}
              style={{ marginTop: 6 }}
            />

            <input
              className="input"
              placeholder="예산 (원, 선택)"
              value={step.budget}
              onChange={(e) => handleStepChange(i, "budget", e.target.value)}
              style={{ marginTop: 6 }}
            />

            <textarea
              className="textarea"
              placeholder="메모 (이 코스에 대한 간단한 설명)"
              value={step.memo}
              onChange={(e) => handleStepChange(i, "memo", e.target.value)}
              rows={2}
              style={{ marginTop: 6 }}
            />
          </div>
        ))}

        <button
          type="button"
          className="btn btn-secondary"
          onClick={addStep}
          disabled={steps.length >= 4 || !isLoggedIn}
          style={{ marginTop: 4, marginBottom: 12 }}
        >
          {steps.length >= 4 ? "최대 4단계까지 추가 가능" : "단계 추가하기"}
        </button>

        <button className="btn btn-primary" type="submit" disabled={loading || !isLoggedIn}>
          {isLoggedIn ? (loading ? "저장 중..." : "코스 등록하기") : "로그인 후 등록 가능"}
        </button>
      </form>
    </section>
  );
}

/* ===================== 최상위 라우터 ===================== */
function App() {
  return (
    <Routes>
      {/* 공통 레이아웃 */}
      <Route path="/" element={<Layout />}>
        {/* ✅ 홈(랜딩) */}
        <Route index element={<HomePage />} />

        {/* 코스 등록 */}
        <Route path="new" element={<NewCoursePage />} />

        {/* 마이페이지 */}
        <Route path="mypage" element={<MyPage />} />

        {/* 코스 상세 */}
        <Route path="courses/:id" element={<CourseDetail />} />

        {/* 자동 생성 코스 상세 */}
        <Route path="auto-courses/:autoId" element={<AutoCourseDetail />} />

        {/* 추천 / 랜덤 */}
        <Route path="recommend" element={<RecommendPage />} />
        <Route path="random" element={<RandomPage />} />
        <Route path="ai-test" element={<AICourseTestPage />} />

        {/* ai 관련 */}
        <Route path="ai-course" element={<AICoursePage />} />
        <Route path="ai-course/result" element={<AICourseResult />} />
        <Route path="ai-course/detail" element={<AICourseDetail />} />

        {/* 🔥 관리자 페이지 */}
        <Route path="admin/courses" element={<AdminCoursesPage />} />
      </Route>

      {/* 로그인은 레이아웃 없이 단독 페이지 */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/login/success" element={<LoginSuccessPage />} />
    </Routes>
  );
}

export default App;