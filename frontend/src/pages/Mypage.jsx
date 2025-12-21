// src/pages/MyPage.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import CourseCard from "../CourseCard";
import { SEOUL_REGIONS } from "../data/regions";
import { buildUnsplashKeyword } from "../api/unsplashKeyword";
import { fetchUnsplashImage } from "../api/unsplash";
import { API_BASE_URL } from "../config";
//const API_BASE_URL = "http://localhost:4000";

function resolveImageUrl(raw) {
  if (!raw) return null;
  if (/^https?:\/\//.test(raw)) return raw;
  if (raw.startsWith("/uploads/")) {
    return `${API_BASE_URL}${raw}`;
  }
  return raw;
}
/** city id → label */
function getRegionLabel(cityId) {
  if (!cityId) return "";
  const region = SEOUL_REGIONS.find((r) => r.id === cityId);
  return region ? region.label : cityId;
}

/** 아주 단순한 공통 로그인 훅 (App.jsx의 useAuth랑 동일한 로직) */
function useAuth() {
  const savedUser = localStorage.getItem("currentUser");
  const currentUser = savedUser ? JSON.parse(savedUser) : null;
  const token = localStorage.getItem("token");
  const currentUserId = currentUser && (currentUser.id || currentUser._id);
  const isLoggedIn = !!token && !!currentUser;
  return { currentUser, token, currentUserId, isLoggedIn };
}

function MyPage() {
  const { currentUser, token, isLoggedIn } = useAuth();

  const [myCourses, setMyCourses] = useState([]);
  const [likedCourses, setLikedCourses] = useState([]);
  const [recentCourses, setRecentCourses] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 내 찜 목록 id 모음 (카드 상단 하트에 쓰기)
  const [likedIds, setLikedIds] = useState([]);

  // ✅ 코스별 Unsplash 썸네일 url
  const [cardImages, setCardImages] = useState({}); // { [courseId]: imageUrl }

  // 현재 탭: mine | liked | recent
  const [tab, setTab] = useState("mine");

  // ---------------------- 데이터 불러오기 ----------------------
  useEffect(() => {
    if (!isLoggedIn) {
      setMyCourses([]);
      setLikedCourses([]);
      setRecentCourses([]);
      setLikedIds([]);
      return;
    }

    const fetchAll = async () => {
      try {
        setLoading(true);
        setError("");

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

        if (!myRes.ok)
          throw new Error(myData?.message || "내 코스 목록 조회 실패");
        if (!likedRes.ok)
          throw new Error(likedData?.message || "찜한 코스 목록 조회 실패");
        if (!recentRes.ok)
          throw new Error(recentData?.message || "최근 본 코스 목록 조회 실패");

        const my = Array.isArray(myData) ? myData : [];
        const liked = Array.isArray(likedData) ? likedData : [];
        const recent = Array.isArray(recentData) ? recentData : [];

        setMyCourses(my);
        setLikedCourses(liked);
        setRecentCourses(recent);
        setLikedIds(liked.map((c) => String(c._id)));
      } catch (err) {
        console.error(err);
        setError(err.message || "마이페이지 데이터를 불러오는 데 실패했어요.");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [isLoggedIn, token]);

  // ---------------------- Unsplash 썸네일 로딩 ----------------------
  useEffect(() => {
    const all = [...myCourses, ...likedCourses, ...recentCourses];

    const targets = [];
    const seen = new Set();

    for (const course of all) {
      if (!course || !course._id) continue;
      const id = String(course._id);
      if (seen.has(id)) continue;
      seen.add(id);

      // 이미 이미지가 있으면 스킵
      if (cardImages[id]) continue;

      targets.push(course);
      if (targets.length >= 12) break; // 한 번에 너무 많이 안 부르도록
    }

    if (!targets.length) return;

    let cancelled = false;

    const load = async () => {
      const updates = {};

      for (const course of targets) {
        try {
          const keyword = buildUnsplashKeyword(course);
          const url = await fetchUnsplashImage(keyword);
          if (url) {
            updates[String(course._id)] = url;
          }
        } catch (e) {
          console.warn("MyPage Unsplash 실패:", course.title, e);
        }
      }

      if (!cancelled && Object.keys(updates).length > 0) {
        setCardImages((prev) => ({ ...prev, ...updates }));
      }
    };

    load();

    return () => {
      cancelled = true;
    };
    // cardImages는 의도적으로 deps에서 제외
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myCourses, likedCourses, recentCourses]);

  // ---------------------- 찜 토글 ----------------------
  const handleToggleLike = async (courseId) => {
    if (!isLoggedIn) {
      alert("로그인 후 찜할 수 있어요.");
      return;
    }

    const idStr = String(courseId);

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

      const likedNow = Boolean(data.liked);

      // likedIds 업데이트
      if (likedNow) {
        setLikedIds((prev) =>
          prev.includes(idStr) ? prev : [...prev, idStr]
        );
      } else {
        setLikedIds((prev) => prev.filter((cid) => cid !== idStr));
      }

      // likesCount 로컬 반영 helper
      const bumpLikes = (arr) =>
        arr.map((c) => {
          if (String(c._id) !== idStr) return c;
          const prevLikes =
            c.likesCount ?? c.likeCount ?? c.likes ?? 0;
          const diff = likedNow ? 1 : -1;
          const next = Math.max(0, prevLikes + diff);
          return { ...c, likesCount: next };
        });

      setMyCourses((prev) => bumpLikes(prev));
      setRecentCourses((prev) => bumpLikes(prev));
      setLikedCourses((prev) => bumpLikes(prev));

      // "찜한 코스" 탭 리스트 추가/제거 동기화
      if (likedNow) {
        setLikedCourses((prev) => {
          if (prev.some((c) => String(c._id) === idStr)) return prev;

          const fromMy = myCourses.find((c) => String(c._id) === idStr);
          const fromRecent = recentCourses.find(
            (c) => String(c._id) === idStr
          );
          const base = fromMy || fromRecent;
          return base ? [...prev, base] : prev;
        });
      } else {
        setLikedCourses((prev) =>
          prev.filter((c) => String(c._id) !== idStr)
        );
      }
    } catch (err) {
      console.error("toggle like error (mypage):", err);
      alert(err.message || "찜 처리 중 오류가 발생했어요.");
    }
  };

  // ---------------------- 공통 렌더링 함수 ----------------------
  // ---------------------- 공통 렌더링 함수 ----------------------
const renderCourseList = (courses, emptyText) => {
  if (loading) return <p>불러오는 중...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!courses.length) return <p className="text-muted">{emptyText}</p>;

  return (
    <ul className="course-list">
      {courses.map((course) => {
        const hasSteps =
          Array.isArray(course.steps) && course.steps.length > 0;
        const firstStep = hasSteps ? course.steps[0] : null;

        const regionLabel = getRegionLabel(course.city);
        const stepsCount = hasSteps ? course.steps.length : 0;
        const firstStepName = firstStep?.place || firstStep?.title || "";

        const likesCount =
          course.likesCount ?? course.likeCount ?? course.likes ?? undefined;

        const isLiked = likedIds.includes(String(course._id));

        // 1️⃣ 내가 올린 이미지(또는 수동 URL) 최우선
        const manualImageUrl =
          resolveImageUrl(
              course.heroImageUrl ||
                course.imageUrl ||
                course.thumbnailUrl ||
                null
           );

        // 2️⃣ 없으면 Unsplash 썸네일
        const imgUrl =
          manualImageUrl ||
            cardImages[String(course._id)] ||
            null;

        return (
          <CourseCard
            key={course._id}
            to={`/courses/${course._id}`}
            imageUrl={imgUrl}
            mood={course.mood}
            title={course.title}
            regionLabel={regionLabel}
            stepsCount={stepsCount}
            likesCount={likesCount}
            firstStep={firstStepName}
            isLiked={isLiked}
            onToggleLike={() => handleToggleLike(course._id)}
          />
        );
      })}
    </ul>
  );
};

  // ---------------------- 로그인 안 한 경우 ----------------------
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

  // ---------------------- 실제 화면 ----------------------
  return (
    <section className="card">
      <h2 className="section-title">마이페이지</h2>
      <p style={{ fontSize: 14, color: "#6b7280" }}>
        이메일: {currentUser?.email}
      </p>

      {/* 상단 탭 */}
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
          className={"tab" + (tab === "mine" ? " tab-active" : "")}
          onClick={() => setTab("mine")}
        >
          내 코스
        </button>
        <button
          type="button"
          className={"tab" + (tab === "liked" ? " tab-active" : "")}
          onClick={() => setTab("liked")}
        >
          찜한 코스
        </button>
        <button
          type="button"
          className={"tab" + (tab === "recent" ? " tab-active" : "")}
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
        {tab === "mine" &&
          renderCourseList(myCourses, "아직 내가 만든 코스가 없어요.")}
        {tab === "liked" &&
          renderCourseList(likedCourses, "아직 찜한 코스가 없어요.")}
        {tab === "recent" &&
          renderCourseList(recentCourses, "아직 최근 본 코스가 없어요.")}
      </div>
    </section>
  );
}

export default MyPage;