// src/RecommendPage.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SEOUL_REGIONS } from "./data/regions";
import CourseCard from "./CourseCard";
import { API_BASE_URL } from "./config";
//const API_BASE_URL = "http://localhost:4000";

/** 이미지 경로를 완전한 URL로 변환 */
function resolveImageUrl(raw) {
  if (!raw) return null;
  if (/^https?:\/\//.test(raw)) return raw;
  if (raw.startsWith("/uploads/")) return `${API_BASE_URL}${raw}`;
  return raw;
}

// ✅ 카카오 이미지 프록시(백엔드)로 썸네일 1장 받아오기
async function fetchKakaoImageUrl(query) {
  const q = String(query || "").trim();
  if (!q) return null;

  try {
    const params = new URLSearchParams({ query: q });
    const res = await fetch(`${API_BASE_URL}/api/kakao/image?${params.toString()}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return null;
    return data.imageUrl || null;
  } catch (e) {
    console.warn("fetchKakaoImageUrl failed:", e);
    return null;
  }
}

/* ---------------- 공통 유틸 / 간단 auth 훅 ---------------- */

// 지역 객체에서 "대표 이름" 하나 뽑기 (핫플 검색용)
function getRegionMainName(region) {
  if (Array.isArray(region.keywords) && region.keywords.length > 0) return region.keywords[0];
  if (region.label) return region.label.split("/")[0].trim();
  return region.id || "";
}

// 지역 id → 라벨
function getRegionLabel(cityId) {
  if (!cityId) return "";
  const region = SEOUL_REGIONS.find((r) => r.id === cityId);
  return region ? region.label : cityId;
}

// App의 useAuth와 동일한 간단 버전
function useAuth() {
  const savedUser = localStorage.getItem("currentUser");
  const currentUser = savedUser ? JSON.parse(savedUser) : null;
  const token = localStorage.getItem("token");
  const currentUserId = currentUser && (currentUser.id || currentUser._id);
  const isLoggedIn = !!token && !!currentUser;
  return { currentUser, token, currentUserId, isLoggedIn };
}

function RecommendPage() {
  const { token, isLoggedIn } = useAuth();

  const [selectedRegionId, setSelectedRegionId] = useState("all");
  const [activeTab, setActiveTab] = useState("user"); // user | auto | kakao

  // 1) 유저 코스
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [coursesError, setCoursesError] = useState("");

  // likes
  const [likedIds, setLikedIds] = useState([]);
  const [loadingLikes, setLoadingLikes] = useState(false);

  // auto courses
  const [autoCourses, setAutoCourses] = useState([]);

  // thumbnails cache
  const [cardImages, setCardImages] = useState({});
  const [autoCardImages, setAutoCardImages] = useState({});

  // kakao places
  const [kakaoPlaces, setKakaoPlaces] = useState([]);
  const [kakaoLoading, setKakaoLoading] = useState(false);
  const [kakaoError, setKakaoError] = useState("");

  // --- 코스 목록 ---
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoadingCourses(true);
        setCoursesError("");

        const res = await fetch(`${API_BASE_URL}/api/courses`);
        const data = await res.json().catch(() => []);

        if (!res.ok) throw new Error(data?.message || "코스 목록 조회 실패");

        // approved === true인 코스만 + auto 제외
        const approvedCourses = Array.isArray(data)
          ? data.filter((c) => c.approved === true && c.sourceType !== "auto")
          : [];

        setCourses(approvedCourses);
      } catch (err) {
        console.error(err);
        setCoursesError(err.message || "코스를 불러오는 중 오류가 발생했어요.");
      } finally {
        setLoadingCourses(false);
      }
    };

    fetchCourses();
  }, []);

  // --- 내가 찜한 코스 id 목록 ---
  useEffect(() => {
    if (!isLoggedIn) {
      setLikedIds([]);
      return;
    }

    const fetchLiked = async () => {
      try {
        setLoadingLikes(true);

        const res = await fetch(`${API_BASE_URL}/api/courses/liked/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401) {
          console.warn("liked/me 401: token invalid/expired");
          setLikedIds([]);
          return;
        }

        const data = await res.json().catch(() => []);
        if (!res.ok) {
          console.error("liked/me error:", res.status, data);
          setLikedIds([]);
          return;
        }

        const ids = Array.isArray(data) ? data.map((c) => String(c._id)) : [];
        setLikedIds(ids);
      } catch (err) {
        console.error("fetchLiked network error:", err);
        setLikedIds([]);
      } finally {
        setLoadingLikes(false);
      }
    };

    fetchLiked();
  }, [isLoggedIn, token]);

  const filteredCourses =
    selectedRegionId === "all" ? courses : courses.filter((c) => c.city === selectedRegionId);

  /* --------------------------------------
   * ✅ 1) 유저 코스 리스트용 Kakao 이미지 로딩
   -------------------------------------- */
  useEffect(() => {
    if (!filteredCourses || filteredCourses.length === 0) return;

    const targets = filteredCourses.slice(0, 6);

    const load = async () => {
      const updates = {};

      for (const course of targets) {
        if (course.heroImageUrl || course.imageUrl || course.thumbnailUrl) continue;
        if (cardImages[course._id]) continue;

        const regionLabel = getRegionLabel(course.city);
        const q = `${regionLabel || "서울"} ${course.title || "데이트"}`.trim();

        const url = await fetchKakaoImageUrl(q);
        if (url) updates[course._id] = url;
      }

      if (Object.keys(updates).length > 0) {
        setCardImages((prev) => ({ ...prev, ...updates }));
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredCourses]);

  /* --------------------------------------
   * ✅ 2) 자동 코스 리스트용 Kakao 이미지 로딩
   -------------------------------------- */
  useEffect(() => {
    if (!autoCourses || autoCourses.length === 0) return;

    const targets = autoCourses.slice(0, 6);

    const load = async () => {
      const updates = {};

      for (const course of targets) {
        if (!course.id) continue;
        if (autoCardImages[course.id]) continue;
        if (course.heroImageUrl) continue;

        const first = course.steps?.[0]?.place || course.steps?.[0] || null;
        const placeName = first?.place_name || first?.name || "";
        const regionLabel = getRegionLabel(course.regionId);

        const q = (
          placeName ? `${placeName} ${regionLabel || "서울"}` : `${regionLabel || "서울"} 데이트 코스`
        ).trim();

        const url = await fetchKakaoImageUrl(q);
        if (url) updates[course.id] = url;
      }

      if (Object.keys(updates).length > 0) {
        setAutoCardImages((prev) => ({ ...prev, ...updates }));
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCourses]);

  // 💜 리스트에서 바로 찜 토글
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

      const idStr = String(courseId);

      if (data.liked) {
        setLikedIds((prev) => (prev.includes(idStr) ? prev : [...prev, idStr]));
      } else {
        setLikedIds((prev) => prev.filter((cid) => cid !== idStr));
      }

      setCourses((prev) =>
        prev.map((c) => {
          if (String(c._id) !== idStr) return c;
          const prevLikes = c.likesCount ?? c.likeCount ?? c.likes ?? 0;
          const diff = data.liked ? 1 : -1;
          return { ...c, likesCount: Math.max(0, prevLikes + diff) };
        })
      );
    } catch (err) {
      console.error("toggle like error (recommend):", err);
      alert(err.message || "찜 처리 중 오류가 발생했어요.");
    }
  };

  // -------------------- 카카오 장소 검색 --------------------
  async function callKakaoSearch({ keyword, x, y, radius = 5000, size = 15 }) {
    const params = new URLSearchParams({ query: keyword, size: String(size) });

    if (x && y) {
      params.append("x", String(x));
      params.append("y", String(y));
      params.append("radius", String(radius));
    }

    const res = await fetch(`${API_BASE_URL}/api/kakao/search?${params.toString()}`);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error("카카오 프록시 실패:", data);
      throw new Error(data.message || "카카오 프록시 오류");
    }

    return data.documents || [];
  }

  const fetchKakaoPlaces = async (regionId) => {
    const region = SEOUL_REGIONS.find((r) => r.id === regionId);
    if (!region) {
      alert("선택한 지역 정보를 찾을 수 없어요.");
      return;
    }

    const baseName = getRegionMainName(region);
    const { x, y } = region.center || {};
    const blacklistRegex = /(스터디|독서실|학원|공부|독학|고시원)/i;

    const keywords = [`${baseName} 맛집`, `${baseName} 카페`, `${baseName} 데이트 스팟`];

    try {
      setKakaoLoading(true);
      setKakaoError("");
      setKakaoPlaces([]);

      const results = await Promise.all(
        keywords.map((keyword) =>
          callKakaoSearch({ keyword, x, y, radius: 5000, size: 10 }).catch(() => [])
        )
      );

      const merged = results.flat();

      if (merged.length === 0) {
        setKakaoPlaces([]);
        alert("이 지역에서 보여줄만한 장소를 찾지 못했어요 ㅠㅠ");
        return;
      }

      const seen = new Set();
      const unique = [];
      for (const place of merged) {
        if (!place.id) continue;
        if (seen.has(place.id)) continue;
        if (blacklistRegex.test(place.place_name || "")) continue;
        seen.add(place.id);
        unique.push(place);
      }

      setKakaoPlaces(unique.slice(0, 20));
    } catch (err) {
      console.error(err);
      setKakaoError(err.message || "카카오 장소를 불러오는 데 실패했어요.");
    } finally {
      setKakaoLoading(false);
    }
  };

  // -------------------- 자동 코스 --------------------
  const PLACE_BLACKLIST = /(스터디|독서실|학원|공부|독학|고시원)/i;
  const CAFE_REGEX = /(카페|coffee|커피|브런치|디저트)/i;
  const NOT_CAFE_REGEX = /(카페|coffee|커피|디저트|베이커리)/i;

  function filterPlacesByCategory(docs, keyword) {
    if (!docs || docs.length === 0) return [];
    let filtered = docs.filter((p) => !PLACE_BLACKLIST.test(p.place_name || ""));

    if (keyword.includes("카페")) {
      const onlyCafe = filtered.filter((p) => CAFE_REGEX.test(p.place_name || ""));
      if (onlyCafe.length > 0) filtered = onlyCafe;
    } else if (keyword.includes("맛집")) {
      const onlyFood = filtered.filter((p) => !NOT_CAFE_REGEX.test(p.place_name || ""));
      if (onlyFood.length > 0) filtered = onlyFood;
    }

    if (filtered.length === 0) return docs;
    return filtered;
  }

  async function searchByCategoryWithCenter(center, keyword, radius = 5000, size = 15) {
    const { x, y } = center || {};

    const docs = await callKakaoSearch({
      keyword,
      x: x && y ? x : undefined,
      y: x && y ? y : undefined,
      radius: x && y ? radius : undefined,
      size,
    }).catch(() => []);

    if (!docs || docs.length === 0) return null;

    const filtered = filterPlacesByCategory(docs, keyword);
    const limit = Math.min(filtered.length, 5);
    const idx = Math.floor(Math.random() * limit);
    return filtered[idx];
  }

  const fetchAutoCourse = async (regionId) => {
    try {
      const region = SEOUL_REGIONS.find((r) => r.id === regionId);
      if (!region) {
        alert("선택한 지역 정보를 찾을 수 없어요.");
        return;
      }

      const baseName = getRegionMainName(region);

      const cafe = await searchByCategoryWithCenter(region.center, `${baseName} 카페`, 5000);
      if (!cafe) {
        alert("이 지역에서 카페 후보를 찾지 못했어요 ㅠㅠ");
        return;
      }

      let food = await searchByCategoryWithCenter({ x: cafe.x, y: cafe.y }, `${baseName} 맛집`, 1000);
      if (!food) {
        food = await searchByCategoryWithCenter(region.center, `${baseName} 맛집`, 5000);
      }

      let spotCenter;
      if (food?.x && food?.y) spotCenter = { x: food.x, y: food.y };
      else if (cafe?.x && cafe?.y) spotCenter = { x: cafe.x, y: cafe.y };
      else spotCenter = region.center;

      let spot = await searchByCategoryWithCenter(spotCenter, `${baseName} 데이트 코스`, 2000);
      if (!spot) {
        spot = await searchByCategoryWithCenter(region.center, `${baseName} 데이트 코스`, 5000);
      }

      const steps = [
        cafe && { type: "cafe", label: "카페", place: cafe },
        food && { type: "food", label: "식사", place: food },
        spot && { type: "spot", label: "볼거리", place: spot },
      ].filter(Boolean);

      if (steps.length === 0) {
        alert("이 지역 근처에서 후보를 못 찾았어요. 다른 지역도 한번 시도해 볼래요?");
        return;
      }

      const course = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: `${region.label} 자동 데이트 코스`,
        regionId,
        createdAt: new Date().toISOString(),
        steps,
        heroImageUrl: null,
      };

      const firstPlaceName = steps?.[0]?.place?.place_name || "";
      const thumbQuery = firstPlaceName ? `${firstPlaceName} ${region.label}` : `${region.label} 데이트 코스`;

      const heroImageUrl = await fetchKakaoImageUrl(thumbQuery);
      if (heroImageUrl) course.heroImageUrl = heroImageUrl;

      setAutoCourses((prev) => [course, ...prev]);
    } catch (err) {
      console.error("자동 코스 생성 에러:", err);
      alert(err.message || "자동 코스를 만드는 중 오류가 발생했어요.");
    }
  };

  // -------------------- UI helpers --------------------
  const regionBtnClass = (active) =>
    [
      "rounded-full px-4 py-2 text-sm font-medium transition border shadow-sm",
      active
        ? "bg-violet-600 text-white border-violet-300/40 shadow-[0_14px_30px_rgba(124,58,237,0.18)]"
        : "bg-white/70 text-slate-700 border-slate-200 hover:bg-white hover:border-slate-300",
    ].join(" ");

  const tabClass = (active) =>
    [
      "rounded-full px-4 py-2 text-sm font-medium transition border shadow-sm",
      active
        ? "bg-slate-900 text-white border-slate-900 shadow-[0_14px_30px_rgba(15,23,42,0.14)]"
        : "bg-white/70 text-slate-700 border-slate-200 hover:bg-white hover:border-slate-300",
    ].join(" ");

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <section className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          지역별 데이트 코스 추천
        </h2>
        <p className="text-sm font-semibold text-slate-500">
          서울에서 <span className="text-slate-900">어디로</span> 갈까요?
        </p>
      </section>

      {/* 지역 선택 */}
      <section className="rounded-3xl border border-slate-200 bg-white/60 p-5 shadow-sm backdrop-blur">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={regionBtnClass(selectedRegionId === "all")}
            onClick={() => {
              setSelectedRegionId("all");
              setKakaoPlaces([]);
              setAutoCourses([]);
            }}
          >
            서울 전체
          </button>

          {SEOUL_REGIONS.filter((r) => r.id !== "all").map((region) => (
            <button
              key={region.id}
              type="button"
              className={regionBtnClass(selectedRegionId === region.id)}
              onClick={() => {
                setSelectedRegionId(region.id);
                setKakaoPlaces([]);
                setAutoCourses([]);
              }}
            >
              {region.label}
            </button>
          ))}
        </div>

        <p className="mt-3 text-xs font-semibold text-slate-500">
          * 서울 전체를 선택하면 모든 지역의 코스를 함께 보여줘요. 특정 지역을 선택하면 그 지역 추천만 볼 수 있어요.
        </p>
      </section>

      {/* 탭 */}
      <section className="flex flex-wrap gap-2">
        <button type="button" className={tabClass(activeTab === "user")} onClick={() => setActiveTab("user")}>
          유저 코스
        </button>
        <button type="button" className={tabClass(activeTab === "auto")} onClick={() => setActiveTab("auto")}>
          랜덤 코스
        </button>
        <button type="button" className={tabClass(activeTab === "kakao")} onClick={() => setActiveTab("kakao")}>
          카카오 장소
        </button>
      </section>

      {/* 유저 코스 */}
      {activeTab === "user" && (
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <h3 className="text-base font-semibold text-slate-900">내 서비스에 등록된 코스</h3>
            <div className="text-xs font-semibold text-slate-500">
              {selectedRegionId === "all" ? "전체" : getRegionLabel(selectedRegionId)}
            </div>
          </div>

          {coursesError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {coursesError}
            </div>
          )}

          {(loadingCourses || loadingLikes) && (
            <p className="text-sm font-semibold text-slate-500">코스를 불러오는 중...</p>
          )}

          {!loadingCourses && !loadingLikes && (
            <>
              {filteredCourses.length === 0 ? (
                <div className="rounded-3xl border border-slate-200 bg-white/60 p-6 text-sm font-semibold text-slate-600">
                  {selectedRegionId === "all"
                    ? "아직 등록된 코스가 없어요. 코스 등록 페이지에서 첫 코스를 만들어볼까요?"
                    : "이 지역에 등록된 코스가 아직 없어요."}
                  <div className="mt-3">
                    <Link
                      to="/new"
                      className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-extrabold text-slate-800 shadow-sm hover:border-slate-300"
                    >
                      코스 만들기 →
                    </Link>
                  </div>
                </div>
              ) : (
                <ul className="course-list">
                  {filteredCourses.map((course) => {
                    const regionLabel = getRegionLabel(course.city);
                    const hasSteps = Array.isArray(course.steps) && course.steps.length > 0;
                    const firstStep = hasSteps ? course.steps[0] : null;

                    const likes = course.likesCount ?? course.likeCount ?? course.likes ?? undefined;
                    const isLiked = likedIds.includes(String(course._id));

                    const manualImageUrl = resolveImageUrl(
                      course.heroImageUrl || course.imageUrl || course.thumbnailUrl || null
                    );

                    const finalImgUrl = manualImageUrl || cardImages[course._id] || null;

                    return (
                      <CourseCard
                        key={course._id}
                        to={`/courses/${course._id}`}
                        imageUrl={finalImgUrl}
                        mood={course.mood}
                        title={course.title}
                        regionLabel={regionLabel}
                        stepsCount={hasSteps ? course.steps.length : 0}
                        likesCount={likes}
                        firstStep={firstStep?.place || firstStep?.title || firstStep?.name}
                        isLiked={isLiked}
                        onToggleLike={() => handleToggleLike(course._id)}
                      />
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </section>
      )}

      {/* 자동 코스 */}
      {activeTab === "auto" && (
        <section className="space-y-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900">이 지역 랜덤 데이트 코스</h3>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                * 카카오맵 API로 카페/맛집/볼거리를 조합해요. 버튼을 여러 번 누르면 다른 조합이 나와요.
              </p>
            </div>

            <button
              type="button"
              className="rounded-full border border-violet-200 bg-violet-600 px-5 py-2 text-sm font-extrabold text-white shadow-sm hover:bg-violet-700"
              onClick={() => {
                if (selectedRegionId === "all") {
                  alert("먼저 상단에서 특정 지역을 선택해 주세요!");
                  return;
                }
                fetchAutoCourse(selectedRegionId);
              }}
            >
              자동 데이트 코스 만들기
            </button>
          </div>

          {autoCourses.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white/60 p-6 text-sm font-semibold text-slate-600">
              아직 자동 코스를 만들지 않았어요. 위 버튼을 눌러 첫 자동 코스를 만들어보세요.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {autoCourses.map((course, index) => (
                <AutoCourseCardTW
                  key={course.id || index}
                  course={course}
                  index={index}
                  imageUrl={course.heroImageUrl || autoCardImages[course.id] || null}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* 카카오 장소 */}
      {activeTab === "kakao" && (
        <section className="space-y-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900">이 지역 카카오 추천 장소</h3>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                * 카카오맵 API로 인기 카페/맛집/데이트 스팟을 보여줘요.
              </p>
            </div>

            <button
              type="button"
              className="rounded-full border border-slate-200 bg-slate-900 px-5 py-2 text-sm font-extrabold text-white shadow-sm hover:bg-slate-800"
              onClick={() => {
                if (selectedRegionId === "all") {
                  alert("먼저 상단에서 특정 지역을 선택해 주세요!");
                  return;
                }
                fetchKakaoPlaces(selectedRegionId);
              }}
            >
              이 지역 카카오 추천 보기
            </button>
          </div>

          {kakaoError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {kakaoError}
            </div>
          )}

          {kakaoLoading && <p className="text-sm font-semibold text-slate-500">카카오 장소 불러오는 중...</p>}

          {!kakaoLoading && !kakaoError && kakaoPlaces.length === 0 && (
            <div className="rounded-3xl border border-slate-200 bg-white/60 p-6 text-sm font-semibold text-slate-600">
              {selectedRegionId === "all"
                ? "먼저 상단에서 지역을 선택한 뒤, 버튼을 눌러보세요."
                : "아직 카카오 추천을 불러오지 않았어요. 위 버튼을 눌러보세요."}
            </div>
          )}

          {kakaoPlaces.length > 0 && (
            <ul className="grid gap-3 md:grid-cols-2">
              {kakaoPlaces.map((place) => (
                <li
                  key={place.id}
                  className="rounded-3xl border border-slate-200 bg-white/60 p-5 shadow-sm backdrop-blur"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="text-sm font-black text-slate-900">{place.place_name}</h4>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-extrabold text-slate-700">
                      카카오
                    </span>
                  </div>

                  <p className="mt-2 text-xs font-semibold text-slate-600">
                    📍 {place.road_address_name || place.address_name || "주소 정보 없음"}
                  </p>

                  {place.phone && (
                    <p className="mt-1 text-xs font-semibold text-slate-600">☎ {place.phone}</p>
                  )}

                  <div className="mt-4">
                    <a
                      href={place.place_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-extrabold text-slate-800 shadow-sm hover:border-slate-300"
                    >
                      카카오맵에서 보기 →
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

/* ===================== 자동 코스 카드 (Tailwind 버전) ===================== */
function AutoCourseCardTW({ course, index, imageUrl }) {
  const firstStep = course.steps?.[0];
  const placeObj = firstStep?.place || firstStep || {};
  const firstName =
    placeObj.place_name || placeObj.name || firstStep?.label || "첫 단계 정보 없음";

  const stepsCount = course.steps?.length || 0;

  return (
    <Link to={`/auto-courses/${course.id}`} state={{ course }} className="block">
      <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white/70 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
        {/* 이미지 */}
        <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-violet-100 via-fuchsia-100 to-sky-100">
          {imageUrl && (
            <img
              src={imageUrl}
              alt={course.title}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          )}

          {/* 배지 */}
          <div className="absolute left-3 top-3 flex gap-2">
            <span className="rounded-full bg-slate-900/85 px-3 py-1 text-xs font-semibold text-white">
              자동 생성
            </span>
            <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-800">
              {stepsCount}단계
            </span>
          </div>
        </div>

        {/* 내용 */}
        <div className="p-4">
          <p className="text-xs font-semibold text-slate-500">자동 추천 코스 #{index + 1}</p>

          <h4 className="mt-1 line-clamp-1 text-base font-extrabold text-slate-900">
            {course.title}
          </h4>

          {firstName && (
            <p className="mt-2 line-clamp-1 text-sm text-slate-700">
              <span className="mr-2 inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-700">
                1단계
              </span>
              {firstName}
            </p>
          )}

          <div className="mt-4 flex justify-end">
            <span className="text-sm font-extrabold text-violet-700">자세히 보기 →</span>
          </div>
        </div>
      </article>
    </Link>
  );
}

export default RecommendPage;