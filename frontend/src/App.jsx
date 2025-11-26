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

const API_BASE_URL = "http://localhost:4000";

function getRegionLabel(cityId) {
  if (!cityId) return "";
  const region = SEOUL_REGIONS.find((r) => r.id === cityId);
  return region ? region.label : cityId;
}

// 🔐 공통으로 로그인 정보 읽는 작은 훅
function useAuth() {
  const savedUser = localStorage.getItem("currentUser");
  const currentUser = savedUser ? JSON.parse(savedUser) : null;
  const token = localStorage.getItem("token");
  const currentUserId = currentUser && (currentUser.id || currentUser._id);
  const isLoggedIn = !!token && !!currentUser;
  return { currentUser, token, currentUserId, isLoggedIn };
}

// ===================== 상단 레이아웃 (공통 헤더 + 네비게이션) =====================
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
        {/* ✅ 헤더도 app-inner 안에서만 정렬되도록 */}
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

          {/* 로그인 안내 문구 */}
          <div style={{ marginTop: 4, fontSize: 13 }}>
            {isLoggedIn ? (
              <span>{currentUser?.email} 님, 환영해요 👋</span>
            ) : (
              <span>로그인하면 코스를 저장하고 관리할 수 있어요.</span>
            )}
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠도 공통 폭(app-inner) 안에서만 */}
      <main className="app-main">
        <div className="app-inner">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

// ===================== 페이지 1: 코스 목록 (코스 보기) =====================
// ===================== 페이지 1: 코스 목록 (코스 보기) =====================
function CourseListPage() {
  const { currentUserId, token, isLoggedIn } = useAuth();

  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 💜 내가 찜한 코스 id 목록
  const [likedIds, setLikedIds] = useState([]);
  const [loadingLikes, setLoadingLikes] = useState(false);

  // 코스 목록 가져오기
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

  // 💜 내가 찜한 코스 목록 가져오기
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
      // 에러는 크게 알림 안 띄우고 조용히 무시
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

  // 검색 (제목 기준)
  const filteredCourses = courses.filter((course) =>
    course.title.toLowerCase().includes(search.toLowerCase())
  );

  // 삭제
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
      // 삭제된 코스가 찜 목록에 있었다면 제거
      setLikedIds((prev) => prev.filter((cid) => cid !== id));
    } catch (err) {
      console.error(err);
      setError("코스를 삭제하는 데 실패했어요.");
    } finally {
      setLoading(false);
    }
  };

  // 💜 리스트에서 바로 찜 토글
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

      // 서버에서 { liked: true/false } 돌려준다고 가정
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
                {/* 제목 + 지역 */}
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

                  {/* 💜 리스트에서 바로 찜 버튼 */}
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

                {/* 대표 단계 1개 보여주기 */}
                {firstStep && (
                  <p style={{ marginBottom: 12, fontSize: 13 }}>
                    ⭐ 1단계: {firstStep.place}
                  </p>
                )}

                {/* 버튼들 */}
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

// ===================== 페이지 2: 코스 등록 =====================
function NewCoursePage() {
  const { token, isLoggedIn } = useAuth();
  const navigate = useNavigate();

  // 서울 지역 선택용
  const [title, setTitle] = useState("");
  const [cityId, setCityId] = useState(SEOUL_REGIONS[0].id); // 기본값: 첫 번째 지역

  // 단계들 (최대 4개). 처음엔 2~3단계 제공
  const [steps, setSteps] = useState([
    { title: "1단계", place: "",  memo: "", time: "", budget: "" },
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
    if (steps.length <= 1) return; // 최소 1단계는 남겨두기
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

    // place가 비어있는 단계는 제외
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

      const res = await fetch(`${API_BASE_URL}/api/courses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          city: cityId,      // 🔥 여기! region id를 city 필드로 보냄
          steps: cleanedSteps,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "코스 등록 실패");
      }

      alert("코스가 등록되었습니다!");

      // 폼 초기화
      setTitle("");
      setCityId(SEOUL_REGIONS[0].id);
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
        {/* 기본 정보 */}
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

        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
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
        </div>

        <div style={{ marginBottom: 8 }}>
          <p style={{ fontSize: 13, color: "#666" }}>
            데이트 코스를 2–4단계로 나눠서 작성해 주세요. (최대 4단계)
          </p>
        </div>

        {/* 단계 입력 */}
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

        {/* 단계 추가 버튼 */}
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

        {/* 제출 버튼 */}
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

// ===================== 페이지 3: 마이페이지 (기본 틀만) =====================
// ===================== 페이지 3: 마이페이지 (내 코스 / 찜 / 최근 본 코스) =====================
function MyPage() {
  const { currentUser, isLoggedIn, token } = useAuth();

  const [myCourses, setMyCourses] = useState([]);
  const [likedCourses, setLikedCourses] = useState([]);
  const [recentCourses, setRecentCourses] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 현재 선택된 탭: mine | liked | recent
  const [tab, setTab] = useState("mine");

  useEffect(() => {
    if (!isLoggedIn) return;

    const fetchAll = async () => {
      try {
        setLoading(true);
        setError("");

        // 세 가지를 동시에 요청
        const [myRes, likedRes, recentRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/courses/mine`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE_URL}/api/courses/liked/me`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE_URL}/api/courses/recent/me`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const [myData, likedData, recentData] = await Promise.all([
          myRes.json().catch(() => []),
          likedRes.json().catch(() => []),
          recentRes.json().catch(() => []),
        ]);

        if (!myRes.ok) throw new Error(myData?.message || "내 코스 목록 조회 실패");
        if (!likedRes.ok)
          throw new Error(likedData?.message || "찜한 코스 목록 조회 실패");
        if (!recentRes.ok)
          throw new Error(recentData?.message || "최근 본 코스 목록 조회 실패");

        setMyCourses(Array.isArray(myData) ? myData : []);
        setLikedCourses(Array.isArray(likedData) ? likedData : []);
        setRecentCourses(Array.isArray(recentData) ? recentData : []);
      } catch (err) {
        console.error(err);
        setError(err.message || "마이페이지 데이터를 불러오는 데 실패했어요.");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [isLoggedIn, token]);

  // 🔐 로그인 안 한 경우
  if (!isLoggedIn) {
    return (
      <section className="card">
        <h2 className="section-title">마이페이지</h2>
        <p>로그인 후 이용할 수 있어요.</p>
        <Link to="/login" className="btn btn-primary" style={{ marginTop: 12 }}>
          로그인하러 가기
        </Link>
      </section>
    );
  }

  // ===== 탭별 렌더링 함수들 =====
  const renderMyCourses = () => {
    if (loading) return <p>불러오는 중...</p>;
    if (error) return <p style={{ color: "red" }}>{error}</p>;
    if (!myCourses.length)
      return <p className="text-muted">아직 내가 만든 코스가 없어요.</p>;

    return myCourses.map((course) => {
      const hasSteps = Array.isArray(course.steps) && course.steps.length > 0;
      const regionLabel = getRegionLabel(course.city);

      return (
        <div key={course._id} className="card" style={{ padding: 12 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 4,
            }}
          >
            <h4 style={{ fontSize: 15 }}>{course.title}</h4>
            {hasSteps && (
              <span style={{ fontSize: 12, color: "#6b7280" }}>
                총 {course.steps.length}단계
              </span>
            )}
          </div>

          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>
            {regionLabel && `📍 ${regionLabel}`}
          </p>

          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>
            {hasSteps
              ? course.steps
                  .map((s) => s.place)
                  .filter(Boolean)
                  .join(" → ")
              : "등록된 단계 정보가 없습니다."}
          </p>

          <div style={{ display: "flex", gap: 8 }}>
            <Link
              to={`/courses/${course._id}`}
              className="btn btn-secondary btn-sm"
            >
              상세 보기
            </Link>
          </div>
        </div>
      );
    });
  };

  const renderLikedCourses = () => {
    if (loading) return <p>불러오는 중...</p>;
    if (error) return <p style={{ color: "red" }}>{error}</p>;
    if (!likedCourses.length)
      return <p className="text-muted">아직 찜한 코스가 없어요.</p>;

    return likedCourses.map((course) => {
      const hasSteps = Array.isArray(course.steps) && course.steps.length > 0;
      const regionLabel = getRegionLabel(course.city);

      return (
        <div key={course._id} className="card" style={{ padding: 12 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 4,
            }}
          >
            <h4 style={{ fontSize: 15 }}>{course.title}</h4>
            {hasSteps && (
              <span style={{ fontSize: 12, color: "#6b7280" }}>
                총 {course.steps.length}단계
              </span>
            )}
          </div>

          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>
            {regionLabel && `📍 ${regionLabel}`}
          </p>

          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>
            {hasSteps
              ? course.steps
                  .map((s) => s.place)
                  .filter(Boolean)
                  .join(" → ")
              : "등록된 단계 정보가 없습니다."}
          </p>

          <div style={{ display: "flex", gap: 8 }}>
            <Link
              to={`/courses/${course._id}`}
              className="btn btn-secondary btn-sm"
            >
              상세 보기
            </Link>
          </div>
        </div>
      );
    });
  };

  const renderRecentCourses = () => {
    if (loading) return <p>불러오는 중...</p>;
    if (error) return <p style={{ color: "red" }}>{error}</p>;
    if (!recentCourses.length)
      return <p className="text-muted">아직 최근 본 코스가 없어요.</p>;

    return recentCourses.map((course) => {
      const hasSteps = Array.isArray(course.steps) && course.steps.length > 0;
      const regionLabel = getRegionLabel(course.city);

      return (
        <div key={course._id} className="card" style={{ padding: 12 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 4,
            }}
          >
            <h4 style={{ fontSize: 15 }}>{course.title}</h4>
            {hasSteps && (
              <span style={{ fontSize: 12, color: "#6b7280" }}>
                총 {course.steps.length}단계
              </span>
            )}
          </div>

          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>
            {regionLabel && `📍 ${regionLabel}`}
          </p>

          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>
            {hasSteps
              ? course.steps
                  .map((s) => s.place)
                  .filter(Boolean)
                  .join(" → ")
              : "등록된 단계 정보가 없습니다."}
          </p>

          <div style={{ display: "flex", gap: 8 }}>
            <Link
              to={`/courses/${course._id}`}
              className="btn btn-secondary btn-sm"
            >
              상세 보기
            </Link>
          </div>
        </div>
      );
    });
  };

  // ===== 실제 화면 =====
  return (
    <section className="card">
      <h2 className="section-title">마이페이지</h2>
      <p style={{ fontSize: 14, color: "#6b7280" }}>
        이메일: {currentUser?.email}
      </p>

      {/* 상단 탭 영역 */}
      <div
        style={{
          marginTop: 16,
          marginBottom: 12,
          display: "flex",
          gap: 8,
        }}
      >
        <button
          type="button"
          className={
            "tab" + (tab === "mine" ? " tab-active" : "")
          }
          onClick={() => setTab("mine")}
        >
          내 코스
        </button>
        <button
          type="button"
          className={
            "tab" + (tab === "liked" ? " tab-active" : "")
          }
          onClick={() => setTab("liked")}
        >
          찜한 코스
        </button>
        <button
          type="button"
          className={
            "tab" + (tab === "recent" ? " tab-active" : "")
          }
          onClick={() => setTab("recent")}
        >
          최근 본 코스
        </button>
      </div>

      {/* 탭별 내용 */}
      <div
        style={{
          marginTop: 4,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {tab === "mine" && renderMyCourses()}
        {tab === "liked" && renderLikedCourses()}
        {tab === "recent" && renderRecentCourses()}
      </div>
    </section>
  );
}

// ===================== 최상위 라우터 =====================
function App() {
  return (
    <Routes>
      {/* 공통 레이아웃 */}
      <Route path="/" element={<Layout />}>
        {/* index: 코스 목록 */}
        <Route index element={<CourseListPage />} />
        {/* 코스 등록 */}
        <Route path="new" element={<NewCoursePage />} />
        {/* 마이페이지 */}
        <Route path="mypage" element={<MyPage />} />
        {/* 코스 상세 */}
        <Route path="courses/:id" element={<CourseDetail />} />
      </Route>

      {/* 로그인은 레이아웃 없이 단독 페이지 */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="recommend" element={<RecommendPage />} />
      <Route path="random" element={<RandomPage />} />

    </Routes>
  );
}

export default App;
