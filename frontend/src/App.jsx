// src/App.jsx
import { useEffect, useState } from "react";
import { Routes, Route, Link } from "react-router-dom";
import CourseDetail from "./CourseDetail.jsx";

const API_BASE_URL = "http://localhost:4000";

function App() {
  // 코스 관련 상태
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState({
    title: "",
    category: "",
    description: "",
    location: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 필터 상태
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("전체");

  // 🔐 인증 관련 상태
  const [currentUser, setCurrentUser] = useState(null); // {id, email}
  const [token, setToken] = useState("");
  const [authMode, setAuthMode] = useState("login"); // "login" or "register"
  const [authForm, setAuthForm] = useState({ email: "", password: "" });
  const [authError, setAuthError] = useState("");

  // 코스 목록 불러오기
  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API_BASE_URL}/api/courses`);
      if (!res.ok) {
        throw new Error("Failed to fetch courses");
      }
      const data = await res.json();
      setCourses(data);
    } catch (err) {
      console.error(err);
      setError("코스를 불러오는 데 실패했어요.");
    } finally {
      setLoading(false);
    }
  };

  // 처음 화면 렌더링 될 때 실행
  useEffect(() => {
    fetchCourses();

    // 🔐 로컬스토리지에서 토큰/유저 복원
    const savedToken = localStorage.getItem("cmu_token");
    const savedUser = localStorage.getItem("cmu_user");
    if (savedToken && savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setToken(savedToken);
        setCurrentUser(parsed);
      } catch (e) {
        console.error("Failed to parse saved user", e);
      }
    }
  }, []);

  // 입력 폼 상태 업데이트
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // 🔐 로그인/회원가입 폼 입력 상태 업데이트
  const handleAuthChange = (e) => {
    const { name, value } = e.target;
    setAuthForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // 🔐 로그인/회원가입 요청 처리
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    try {
      setAuthError("");
      const endpoint =
        authMode === "login" ? "/api/auth/login" : "/api/auth/register";

      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authForm),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || "인증에 실패했습니다.");
      }

      if (authMode === "register") {
        // 회원가입 성공 → 로그인 탭으로 전환
        alert("회원가입이 완료되었습니다. 이제 로그인 해주세요!");
        setAuthMode("login");
        setAuthForm((prev) => ({ email: prev.email, password: "" }));
      } else {
        // 로그인 성공 → 토큰/유저 저장
        setToken(data.token);
        setCurrentUser(data.user);
        localStorage.setItem("cmu_token", data.token);
        localStorage.setItem("cmu_user", JSON.stringify(data.user));
        setAuthForm({ email: "", password: "" });
      }
    } catch (err) {
      console.error(err);
      setAuthError(err.message || "인증 중 오류가 발생했습니다.");
    }
  };

  // 🔐 로그아웃
  const handleLogout = () => {
    setCurrentUser(null);
    setToken("");
    localStorage.removeItem("cmu_token");
    localStorage.removeItem("cmu_user");
  };

  // 새 코스 등록
  const handleSubmit = async (e) => {
    e.preventDefault();

    // 🔐 로그인 안 했으면 막기
    if (!token) {
      alert("코스를 추가하려면 먼저 로그인 해주세요.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await fetch(`${API_BASE_URL}/api/courses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // 나중에 백엔드에서 토큰 검사 붙이기 좋게 미리 보내두기
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        throw new Error("Failed to create course");
      }

      const created = await res.json();

      setCourses((prev) => [created, ...prev]);

      setForm({
        title: "",
        category: "",
        description: "",
        location: "",
      });
    } catch (err) {
      console.error(err);
      setError("코스를 생성하는 데 실패했어요.");
    } finally {
      setLoading(false);
    }
  };

  // 코스 삭제
  const handleDelete = async (id) => {
    // 🔐 로그인 안 했으면 막기
    if (!token) {
      alert("코스를 삭제하려면 먼저 로그인 해주세요.");
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
        throw new Error("Failed to delete course");
      }

      setCourses((prev) => prev.filter((c) => c._id !== id));
    } catch (err) {
      console.error(err);
      setError("코스를 삭제하는 데 실패했어요.");
    } finally {
      setLoading(false);
    }
  };

  // 카테고리 목록
  const categories = [
    "전체",
    ...Array.from(new Set(courses.map((c) => c.category))),
  ];

  // 검색 + 카테고리 필터 적용된 코스 목록
  const filteredCourses = courses.filter((course) => {
    const matchesCategory =
      selectedCategory === "전체" || course.category === selectedCategory;

    const q = searchTerm.trim().toLowerCase();
    const matchesSearch =
      q === "" ||
      course.title.toLowerCase().includes(q) ||
      course.description.toLowerCase().includes(q) ||
      course.location.toLowerCase().includes(q);

    return matchesCategory && matchesSearch;
  });

  return (
    <Routes>
      {/* 메인(목록) 페이지 */}
      <Route
        path="/"
        element={
          <div className="app">
            <header className="app-header">
              <h1 className="app-title">Course More Us</h1>
              <p className="app-subtitle">나만의 데이트 / 코스 기록하기 📝</p>
            </header>

            {/* 🔐 로그인/회원가입 카드 */}
            <section className="card auth-card">
              {currentUser ? (
                <div className="auth-info">
                  <div>
                    <span className="text-muted">로그인 계정</span>
                    <div>{currentUser.email}</div>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
                    로그아웃
                  </button>
                </div>
              ) : (
                <>
                  <div className="auth-toggle">
                    <button
                      type="button"
                      className={authMode === "login" ? "active" : ""}
                      onClick={() => setAuthMode("login")}
                    >
                      로그인
                    </button>
                    <button
                      type="button"
                      className={authMode === "register" ? "active" : ""}
                      onClick={() => setAuthMode("register")}
                    >
                      회원가입
                    </button>
                  </div>
                  <form className="auth-form" onSubmit={handleAuthSubmit}>
                    <input
                      className="input"
                      name="email"
                      type="email"
                      placeholder="이메일"
                      value={authForm.email}
                      onChange={handleAuthChange}
                      required
                    />
                    <input
                      className="input"
                      name="password"
                      type="password"
                      placeholder="비밀번호"
                      value={authForm.password}
                      onChange={handleAuthChange}
                      required
                    />
                    {authError && (
                      <p className="text-muted" style={{ color: "#b91c1c" }}>
                        {authError}
                      </p>
                    )}
                    <button className="btn btn-primary btn-sm" type="submit">
                      {authMode === "login" ? "로그인" : "회원가입"}
                    </button>
                  </form>
                </>
              )}
            </section>

            {/* 에러 메시지 (코스 관련) */}
            {error && <div className="alert alert-error">{error}</div>}

            {/* 새 코스 등록 폼 */}
            <section className="card card-form">
              <h2 className="section-title">새 코스 추가하기</h2>
              {!currentUser && (
                <p className="text-muted" style={{ marginBottom: 8 }}>
                  코스를 추가하려면 먼저 로그인 해주세요.
                </p>
              )}
              <form className="course-form" onSubmit={handleSubmit}>
                <input
                  className="input"
                  name="title"
                  placeholder="코스 제목 (예: 홍대 감성 데이트)"
                  value={form.title}
                  onChange={handleChange}
                  required
                />
                <div className="form-row">
                  <input
                    className="input"
                    name="category"
                    placeholder="카테고리 (예: 데이트, 혼놀, 가족...)"
                    value={form.category}
                    onChange={handleChange}
                    required
                  />
                  <input
                    className="input"
                    name="location"
                    placeholder="위치 (예: 서울 홍대)"
                    value={form.location}
                    onChange={handleChange}
                    required
                  />
                </div>
                <textarea
                  className="textarea"
                  name="description"
                  placeholder="코스 설명 (간단한 동선, 가게 이름 등)"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  required
                />
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={loading || !currentUser}
                >
                  {loading ? "저장 중..." : "코스 추가하기"}
                </button>
              </form>
            </section>

            {/* 코스 리스트 + 필터 */}
            <section className="section-list">
              <h2 className="section-title">저장된 코스들</h2>

              {/* 검색 + 카테고리 필터 UI */}
              <div className="filters">
                <input
                  className="input filter-search"
                  type="text"
                  placeholder="제목, 설명, 위치로 검색"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />

                <div className="filter-chips">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      className={
                        "chip" +
                        (selectedCategory === cat ? " chip-active" : "")
                      }
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {loading && courses.length === 0 && (
                <p className="text-muted">불러오는 중...</p>
              )}

              {!loading && courses.length === 0 ? (
                <p className="text-muted">
                  아직 저장된 코스가 없어요. 하나 추가해볼까요?
                </p>
              ) : !loading &&
                courses.length > 0 &&
                filteredCourses.length === 0 ? (
                <p className="text-muted">
                  검색/필터 조건에 맞는 코스가 없어요.
                </p>
              ) : (
                <ul className="course-list">
                  {filteredCourses.map((course) => (
                    <li key={course._id} className="card course-card">
                      <Link
                        to={`/course/${course._id}`}
                        className="course-card-link"
                      >
                        <div className="course-card-header">
                          <h3 className="course-title">{course.title}</h3>
                          <span className="badge">{course.category}</span>
                        </div>
                        <div className="course-meta">
                          <span>📍 {course.location}</span>
                        </div>
                        <p className="course-description">
                          {course.description}
                        </p>
                      </Link>

                      <div className="course-actions">
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(course._id)}
                          disabled={!currentUser}
                        >
                          삭제
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        }
      />

      {/* 코스 상세 페이지 */}
      <Route path="/course/:id" element={<CourseDetail />} />
    </Routes>
  );
}

export default App;
