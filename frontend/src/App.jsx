// src/App.jsx
import { useEffect, useState } from "react";
import {
  Routes,
  Route,
  Link,
  Outlet,
  useNavigate,
} from "react-router-dom";
import CourseDetail from "./CourseDetail.jsx";
import LoginPage from "./LoginPage.jsx";
import RecommendPage from "./RecommendPage.jsx";
import RandomPage from "./RandomPage.jsx";
import { SEOUL_REGIONS } from "./data/regions";
import "./App.css";
import AutoCourseDetail from "./AutoCourseDetail";
import HomePage from "./HomePage";
import MyPage from "./pages/Mypage.jsx";

const API_BASE_URL = "http://localhost:4000";

function getRegionLabel(cityId) {
  if (!cityId) return "";
  const region = SEOUL_REGIONS.find((r) => r.id === cityId);
  return region ? region.label : cityId;
}

// 🔐 공통 로그인 훅
function useAuth() {
  const savedUser = localStorage.getItem("currentUser");
  const currentUser = savedUser ? JSON.parse(savedUser) : null;
  const token = localStorage.getItem("token");
  const currentUserId = currentUser && (currentUser.id || currentUser._id);
  const isLoggedIn = !!token && !!currentUser;
  return { currentUser, token, currentUserId, isLoggedIn };
}

/* ===================== 공통 레이아웃 ===================== */
function Layout() {
  const { currentUser, isLoggedIn } = useAuth();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("currentUser");
    window.location.href = "/";
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-inner">
          <div className="header-top">
            <div>
              <h1 className="app-title">Course More Us</h1>
              <p className="app-subtitle">나만의 데이트 / 코스 기록하기 📝</p>
            </div>

            <div className="auth-buttons">
              {isLoggedIn ? (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleLogout}
                >
                  로그아웃
                </button>
              ) : (
                <Link to="/login" className="btn btn-secondary btn-sm">
                  로그인
                </Link>
              )}
            </div>
          </div>

          {/* 상단 네비게이션 바 */}
          <nav className="app-nav">
            <Link to="/" className="tab">
              코스 보기
            </Link>
            <Link to="/recommend" className="tab">
              추천받기
            </Link>
            <Link to="/random" className="tab">
              랜덤코스
            </Link>
            <Link to="/new" className="tab">
              코스 등록
            </Link>
            <Link to="/mypage" className="tab">
              마이페이지
            </Link>
          </nav>

          <div style={{ marginTop: 4, fontSize: 13 }}>
            {isLoggedIn ? (
              <span>{currentUser?.email} 님, 환영해요 👋</span>
            ) : (
              <span>로그인하면 코스를 저장하고 관리할 수 있어요.</span>
            )}
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="app-inner">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

/* ===================== 코스 목록 (기존 리스트 – 필요 시 사용) ===================== */
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
      const res = await fetch(
        `${API_BASE_URL}/api/courses/${courseId}/like`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "찜 처리 실패");

      if (data.liked) {
        setLikedIds((prev) => {
          const idStr = String(courseId);
          if (prev.includes(idStr)) return prev;
          return [...prev, idStr];
        });
      } else {
        setLikedIds((prev) =>
          prev.filter((cid) => cid !== String(courseId))
        );
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

      {(loading || loadingLikes) && (
        <p className="text-muted">불러오는 중...</p>
      )}

      {courses.length === 0 ? (
        <p className="text-muted">저장된 코스가 없어요.</p>
      ) : filteredCourses.length === 0 ? (
        <p className="text-muted">검색 결과가 없습니다.</p>
      ) : (
        <ul className="course-list">
          {filteredCourses.map((course) => {
            const regionLabel = getRegionLabel(course.city);
            const hasSteps =
              Array.isArray(course.steps) && course.steps.length > 0;
            const firstStep = hasSteps ? course.steps[0] : null;

            const isOwner =
              currentUserId && currentUserId === String(course.owner);
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
                  <h3
                    className="course-title"
                    style={{ margin: 0, fontSize: 20 }}
                  >
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
                  {hasSteps
                    ? `총 ${course.steps.length}단계 코스`
                    : "단계 정보 없음"}
                </p>

                {firstStep && (
                  <p style={{ marginBottom: 12, fontSize: 13 }}>
                    ⭐ 1단계: {firstStep.place}
                  </p>
                )}

                <div
                  className="course-actions"
                  style={{ display: "flex", gap: 8, marginTop: 4 }}
                >
                  <Link
                    to={`/courses/${course._id}`}
                    className="btn btn-secondary btn-sm"
                  >
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

  // 새로 추가된 필드들
  const [mood, setMood] = useState("");
  const [heroImageUrl, setHeroImageUrl] = useState(""); // 대표 이미지 URL (선택)

  const [steps, setSteps] = useState([
    { title: "1단계", place: "", memo: "", time: "", budget: "" },
    { title: "2단계", place: "", memo: "", time: "", budget: "" },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleStepChange = (index, field, value) => {
    setSteps((prev) =>
      prev.map((step, i) =>
        i === index ? { ...step, [field]: value } : step
      )
    );
  };

  const addStep = () => {
    if (steps.length >= 4) return;
    const nextIndex = steps.length + 1;
    setSteps((prev) => [
      ...prev,
      { title: `${nextIndex}단계`, place: "", memo: "", time: "", budget: "" },
    ]);
  };

  const removeStep = (index) => {
    if (steps.length <= 1) return;
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!isLoggedIn) {
      alert("로그인 후 코스를 등록할 수 있어요.");
      return;
    }

    if (!title.trim() || !cityId) {
      setError("제목과 도시를 모두 입력해 주세요.");
      return;
    }

    const cleanedSteps = steps
      .map((s) => ({
        ...s,
        budget: s.budget ? Number(s.budget) : 0,
      }))
      .filter((s) => s.place.trim() !== "");

    if (cleanedSteps.length === 0) {
      setError("최소 1개 이상의 단계에 장소를 입력해 주세요.");
      return;
    }
    if (cleanedSteps.length > 4) {
      setError("코스는 최대 4단계까지만 등록할 수 있어요.");
      return;
    }

    try {
      setLoading(true);

      const body = {
        title,
        city: cityId,
        mood: mood || undefined, // 선택 안 했으면 굳이 안 보냄
        heroImageUrl: heroImageUrl.trim() || undefined, // 비어있으면 undefined
        steps: cleanedSteps,
      };

      const res = await fetch(`${API_BASE_URL}/api/courses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "코스 등록 실패");
      }

      alert("코스가 등록되었습니다!");

      // 폼 초기화
      setTitle("");
      setCityId(SEOUL_REGIONS[0].id);
      setMood("");
      setHeroImageUrl("");
      setSteps([
        { title: "1단계", place: "", memo: "", time: "", budget: "" },
        { title: "2단계", place: "", memo: "", time: "", budget: "" },
      ]);

      navigate("/");
    } catch (err) {
      console.error(err);
      setError(err.message || "코스를 등록하는 데 실패했어요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card card-form">
      <h2 className="section-title">새 코스 등록하기</h2>

      {error && <div className="alert alert-error">{error}</div>}

      <form className="course-form" onSubmit={handleSubmit}>
        {/* 제목 */}
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input
            className="input"
            name="title"
            placeholder="코스 제목 (예: 홍대 감성 데이트)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            disabled={!isLoggedIn}
          />
        </div>

        {/* 지역 + 분위기 선택 */}
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <select
            className="input"
            value={cityId}
            onChange={(e) => setCityId(e.target.value)}
            disabled={!isLoggedIn}
          >
            {SEOUL_REGIONS.map((region) => (
              <option key={region.id} value={region.id}>
                {region.label}
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

        {/* 대표 이미지 URL 입력 (선택) */}
        <div style={{ marginBottom: 12 }}>
          <input
            className="input"
            placeholder="대표 이미지 URL (선택, 직접 찍은 사진 주소를 붙여넣기)"
            value={heroImageUrl}
            onChange={(e) => setHeroImageUrl(e.target.value)}
            disabled={!isLoggedIn}
          />
          <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
            * 이미지 주소를 입력하면 코스 카드에서 우선 사용돼요. 비워두면
            자동으로 코스 분위기에 맞는 사진을 불러와요.
          </p>
        </div>

        <div style={{ marginBottom: 8 }}>
          <p style={{ fontSize: 13, color: "#666" }}>
            데이트 코스를 2–4단계로 나눠서 작성해 주세요. (최대 4단계)
          </p>
        </div>

        {/* 단계들 */}
        {steps.map((step, index) => (
          <div
            key={index}
            className="card"
            style={{ padding: 12, marginBottom: 8 }}
          >
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
                  onClick={() => removeStep(index)}
                >
                  단계 삭제
                </button>
              )}
            </div>

            <input
              className="input"
              placeholder="장소 이름 (예: ○○카페)"
              value={step.place}
              onChange={(e) =>
                handleStepChange(index, "place", e.target.value)
              }
              disabled={!isLoggedIn}
              required={index === 0}
            />

            <input
              className="input"
              placeholder="시간 (예: 14:00)"
              value={step.time}
              onChange={(e) =>
                handleStepChange(index, "time", e.target.value)
              }
              disabled={!isLoggedIn}
              style={{ marginTop: 6 }}
            />

            <input
              className="input"
              placeholder="예산 (원, 선택)"
              value={step.budget}
              onChange={(e) =>
                handleStepChange(index, "budget", e.target.value)
              }
              disabled={!isLoggedIn}
              style={{ marginTop: 6 }}
            />

            <textarea
              className="textarea"
              placeholder="메모 (이 코스에 대한 간단한 설명)"
              value={step.memo}
              onChange={(e) =>
                handleStepChange(index, "memo", e.target.value)
              }
              rows={2}
              disabled={!isLoggedIn}
              style={{ marginTop: 6 }}
            />
          </div>
        ))}

        <button
          type="button"
          className="btn btn-secondary"
          onClick={addStep}
          disabled={!isLoggedIn || steps.length >= 4}
          style={{ marginTop: 4, marginBottom: 12 }}
        >
          {steps.length >= 4
            ? "최대 4단계까지 추가 가능"
            : "단계 추가하기"}
        </button>

        <button
          className="btn btn-primary"
          type="submit"
          disabled={loading || !isLoggedIn}
        >
          {isLoggedIn
            ? loading
              ? "저장 중..."
              : "코스 등록하기"
            : "로그인 후 등록 가능"}
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
        {/* 첫 화면 - 랜딩 홈 */}
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
      </Route>

      {/* 로그인은 레이아웃 없이 단독 페이지 */}
      <Route path="/login" element={<LoginPage />} />
    </Routes>
  );
}

export default App;