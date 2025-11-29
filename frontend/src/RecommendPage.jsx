// src/RecommendPage.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SEOUL_REGIONS } from "./data/regions";
import CourseCard from "./CourseCard";
import { buildUnsplashKeyword } from "./api/unsplashKeyword";
import { fetchUnsplashImage } from "./api/unsplash";

const API_BASE_URL = "http://localhost:4000";
/** 이미지 경로를 완전한 URL로 변환 */
function resolveImageUrl(raw) {
  if (!raw) return null;
  // 이미 http로 시작하면 그대로 사용 (Unsplash, 향후 서버 도메인 포함 값)
  if (/^https?:\/\//.test(raw)) return raw;
  // "/uploads/xxxxx.jpg" 형태면 백엔드 주소를 붙여줌
  if (raw.startsWith("/uploads/")) {
    return `${API_BASE_URL}${raw}`;
  }
  return raw; // 그 외는 일단 그대로
}

/* ---------------- 공통 유틸 / 간단 auth 훅 ---------------- */

// 지역 객체에서 "대표 이름" 하나 뽑기 (핫플 검색용)
function getRegionMainName(region) {
  if (Array.isArray(region.keywords) && region.keywords.length > 0) {
    return region.keywords[0]; // 예: "홍대", "강남역"
  }
  if (region.label) {
    return region.label.split("/")[0].trim(); // 예: "홍대/신촌/마포/연남" -> "홍대"
  }
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
  // ✅ 로그인 정보
  const { token, isLoggedIn } = useAuth();

  // ✅ 지역 선택 (id 기준: "all", "gangnam" ...)
  const [selectedRegionId, setSelectedRegionId] = useState("all");

  // ✅ 탭: user / auto / kakao
  const [activeTab, setActiveTab] = useState("user");

  // -------------------- 1. 내 코스(백엔드) --------------------
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [coursesError, setCoursesError] = useState("");

  // 💜 내가 찜한 코스 id 목록
  const [likedIds, setLikedIds] = useState([]);
  const [loadingLikes, setLoadingLikes] = useState(false);

  // ⬇ 유저 코스 카드 썸네일 이미지 (Unsplash)
  const [cardImages, setCardImages] = useState({});

  // ⬇ 자동 코스 카드 썸네일 이미지 (Unsplash)
  const [autoCardImages, setAutoCardImages] = useState({});
  const [autoCourses, setAutoCourses] = useState([]);

  // --- 코스 목록 ---
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoadingCourses(true);
        setCoursesError("");

        const res = await fetch(`${API_BASE_URL}/api/courses`);
        const data = await res.json().catch(() => []);

        if (!res.ok) {
          throw new Error(data?.message || "코스 목록 조회 실패");
        }

        setCourses(data);
      } catch (err) {
        console.error(err);
        setCoursesError(
          err.message || "코스를 불러오는 중 오류가 발생했어요."
        );
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
        const data = await res.json().catch(() => []);

        if (!res.ok) {
          throw new Error(data?.message || "찜한 코스 목록 조회 실패");
        }

        const ids = Array.isArray(data) ? data.map((c) => String(c._id)) : [];
        setLikedIds(ids);
      } catch (err) {
        console.error("fetchLiked (recommend) error:", err);
      } finally {
        setLoadingLikes(false);
      }
    };

    fetchLiked();
  }, [isLoggedIn, token]);

  const filteredCourses =
    selectedRegionId === "all"
      ? courses
      : courses.filter((c) => c.city === selectedRegionId);

  // 🔥 1) 유저 코스 리스트용 Unsplash 대표 이미지 로딩
  useEffect(() => {
    if (!filteredCourses || filteredCourses.length === 0) return;

    const targets = filteredCourses.slice(0, 6); // 앞 6개만

    const load = async () => {
      const updates = {};

      for (const course of targets) {
        // 이미 이미지가 있으면 다시 안 불러옴
        if (course.heroImageUrl || course.imageUrl || course.thumbnailUrl) {
        continue;
      }


        try {
          const keyword = buildUnsplashKeyword(course);
          const url = await fetchUnsplashImage(keyword, course._id);
          if (url) {
            updates[course._id] = url;
          }
        } catch (e) {
          console.warn("RecommendPage Unsplash 실패 (user):", course.title, e);
        }
      }

      if (Object.keys(updates).length > 0) {
        setCardImages((prev) => ({ ...prev, ...updates }));
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredCourses]); // cardImages는 일부러 deps에서 제외

  // 🔥 2) 자동 코스 리스트용 Unsplash 대표 이미지 로딩
  useEffect(() => {
    if (!autoCourses || autoCourses.length === 0) return;

    const targets = autoCourses.slice(0, 6); // 앞 6개만

    const load = async () => {
      const updates = {};

      for (const course of targets) {
        if (!course.id) continue;
        // 이미 이미지가 있으면 다시 안 불러옴
         if (cardImages[String(course._id)]) continue;
        try {
          const keyword = buildUnsplashKeyword({
            ...course,
            city: course.regionId, // regionId를 city로 매핑
          });
          const url = await fetchUnsplashImage(keyword, course.id);
          if (url) {
            updates[course.id] = url;
          }
        } catch (e) {
          console.warn(
            "RecommendPage Unsplash 실패 (auto):",
            course.title,
            e
          );
        }
      }

      if (Object.keys(updates).length > 0) {
        setAutoCardImages((prev) => ({ ...prev, ...updates }));
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCourses]); // autoCardImages는 일부러 deps에서 제외

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

      const idStr = String(courseId);

      if (data.liked) {
        // 새로 찜
        setLikedIds((prev) =>
          prev.includes(idStr) ? prev : [...prev, idStr]
        );
      } else {
        // 찜 해제
        setLikedIds((prev) => prev.filter((cid) => cid !== idStr));
      }

      // 로컬 likesCount도 같이 업데이트 (있을 때만)
      setCourses((prev) =>
        prev.map((c) => {
          if (String(c._id) !== idStr) return c;
          const prevLikes =
            c.likesCount ?? c.likeCount ?? c.likes ?? 0;
          const diff = data.liked ? 1 : -1;
          const next = Math.max(0, prevLikes + diff);
          return { ...c, likesCount: next };
        })
      );
    } catch (err) {
      console.error("toggle like error (recommend):", err);
      alert(err.message || "찜 처리 중 오류가 발생했어요.");
    }
  };

  // -------------------- 2. 카카오 장소 리스트 (핫플) --------------------
  const [kakaoPlaces, setKakaoPlaces] = useState([]);
  const [kakaoLoading, setKakaoLoading] = useState(false);
  const [kakaoError, setKakaoError] = useState("");

  // 🔁 카카오 프록시 호출 공통 함수
  async function callKakaoSearch({ keyword, x, y, radius = 5000, size = 15 }) {
    const params = new URLSearchParams({
      query: keyword,
      size: String(size),
    });

    if (x && y) {
      params.append("x", String(x));
      params.append("y", String(y));
      params.append("radius", String(radius));
    }

    const res = await fetch(
      `${API_BASE_URL}/api/kakao/search?${params.toString()}`
    );

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

    const baseName = getRegionMainName(region); // 예: "홍대"
    const { x, y } = region.center || {};
    const blacklistRegex = /(스터디|독서실|학원|공부|독학|고시원)/i;

    const keywords = [
      `${baseName} 맛집`,
      `${baseName} 카페`,
      `${baseName} 데이트 스팟`,
    ];

    try {
      setKakaoLoading(true);
      setKakaoError("");
      setKakaoPlaces([]);

      const results = await Promise.all(
        keywords.map((keyword) =>
          callKakaoSearch({ keyword, x, y, radius: 5000, size: 10 }).catch(
            () => []
          )
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

  // -------------------- 3. 좌표 기반 키워드 검색 (자동 코스용) --------------------
  async function searchByCategory(region, keyword) {
    const { x, y } = region.center || {};
    const blacklistRegex = /(스터디|독서실|학원|공부|독학|고시원)/i;

    const fetchOnce = async (useCenter) => {
      let params = {
        keyword,
        size: 15,
      };

      if (useCenter && x && y) {
        params.x = x;
        params.y = y;
        params.radius = 5000;
      }

      const docs = await callKakaoSearch({
        keyword: params.keyword,
        x: params.x,
        y: params.y,
        radius: params.radius,
        size: params.size,
      }).catch(() => []);

      if (!docs || docs.length === 0) return [];

      let filtered = docs.filter(
        (p) => !blacklistRegex.test(p.place_name || "")
      );

      if (keyword.includes("카페")) {
        const cafeRegex = /(카페|coffee|커피|브런치|디저트)/i;
        const onlyCafe = filtered.filter((p) =>
          cafeRegex.test(p.place_name || "")
        );
        if (onlyCafe.length > 0) filtered = onlyCafe;
      } else if (keyword.includes("맛집")) {
        const notCafeRegex = /(카페|coffee|커피|디저트|베이커리)/i;
        const onlyFood = filtered.filter(
          (p) => !notCafeRegex.test(p.place_name || "")
        );
        if (onlyFood.length > 0) filtered = onlyFood;
      }

      if (filtered.length === 0) return docs;
      return filtered;
    };

    let candidates = await fetchOnce(true);

    if (!candidates || candidates.length === 0) {
      candidates = await fetchOnce(false);
    }

    if (!candidates || candidates.length === 0) return null;

    const limit = Math.min(candidates.length, 5);
    return candidates[Math.floor(Math.random() * limit)];
  }

  // -------------------- 4. 자동 코스 여러 개 쌓기 --------------------
  const fetchAutoCourse = async (regionId) => {
    try {
      const region = SEOUL_REGIONS.find((r) => r.id === regionId);
      if (!region) {
        alert("선택한 지역 정보를 찾을 수 없어요.");
        return;
      }

      const baseName = getRegionMainName(region);

      const cafe = await searchByCategory(region, `${baseName} 카페`);
      const food = await searchByCategory(region, `${baseName} 맛집`);
      const spot = await searchByCategory(region, `${baseName} 데이트 코스`);

      const steps = [
        cafe && { type: "cafe", label: "카페", place: cafe },
        food && { type: "food", label: "식사", place: food },
        spot && { type: "spot", label: "볼거리", place: spot },
      ].filter(Boolean);

      if (steps.length === 0) {
        alert(
          "이 지역 근처에서 카페/식당/볼거리 후보를 못 찾았어요. 다른 지역도 한번 시도해 볼래요?"
        );
        return;
      }

      const course = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: `${region.label} 자동 데이트 코스`,
        regionId,
        createdAt: new Date().toISOString(),
        steps,
      };

      console.log("✨ 자동 코스 생성 결과:", course);
      setAutoCourses((prev) => [course, ...prev]);
    } catch (err) {
      console.error("자동 코스 생성 에러:", err);
      alert(err.message || "자동 코스를 만드는 중 오류가 발생했어요.");
    }
  };

  // -------------------- 5. JSX --------------------
  return (
    <div className="page">
      {/* 헤더 영역 */}
      <header
        style={{
          marginBottom: 20,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <h2 className="section-title">지역별 데이트 코스 추천</h2>
        <p style={{ fontSize: 14, color: "#6b7280" }}>
          서울에서 <strong>어디로</strong> 갈까요?
        </p>
      </header>

      {/* ✅ 지역 선택 카드 */}
      <section
        className="card"
        style={{ display: "flex", flexDirection: "column", gap: 12 }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button
            type="button"
            className={`region-btn ${
              selectedRegionId === "all" ? "selected" : ""
            }`}
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
              className={`region-btn ${
                selectedRegionId === region.id ? "selected" : ""
              }`}
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

        <p
          style={{
            marginTop: 4,
            fontSize: 12,
            color: "#6b7280",
          }}
        >
          * 서울 전체를 선택하면 모든 지역의 코스를 함께 보여줘요. 특정
          지역을 선택하면 그 지역에 맞는 추천만 볼 수 있어요.
        </p>
      </section>

      {/* ✅ 탭 바 */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: 16,
          marginBottom: 8,
          borderBottom: "1px solid #e5e7eb",
          paddingBottom: 4,
        }}
      >
        <TabButton
          label="내 서비스에 등록된 코스"
          active={activeTab === "user"}
          onClick={() => setActiveTab("user")}
        />
        <TabButton
          label="이 지역 자동 데이트 코스"
          active={activeTab === "auto"}
          onClick={() => setActiveTab("auto")}
        />
        <TabButton
          label="이 지역 카카오 추천 장소"
          active={activeTab === "kakao"}
          onClick={() => setActiveTab("kakao")}
        />
      </div>

      {/* --- 5-1. 내 서비스에 등록된 코스 탭 --- */}
      {activeTab === "user" && (
        <section>
          <h3 style={{ margin: "12px 0 10px", fontSize: 16 }}>
            내 서비스에 등록된 코스
          </h3>

          {coursesError && (
            <p style={{ color: "red", marginBottom: 8 }}>{coursesError}</p>
          )}

          {(loadingCourses || loadingLikes) && (
            <p className="text-muted">코스를 불러오는 중...</p>
          )}

          {!loadingCourses && !loadingLikes && (
            <>
              {filteredCourses.length === 0 ? (
                <p style={{ fontSize: 14, color: "#6b7280" }}>
                  {selectedRegionId === "all"
                    ? "아직 등록된 코스가 없어요. 코스 등록 페이지에서 첫 코스를 만들어볼까요?"
                    : "이 지역에 등록된 코스가 아직 없어요."}
                </p>
              ) : (
                <ul className="course-list">
                  {filteredCourses.map((course) => {
                    const regionLabel = getRegionLabel(course.city);
                    const hasSteps =
                      Array.isArray(course.steps) &&
                      course.steps.length > 0;
                    const firstStep = hasSteps ? course.steps[0] : null;

                    const likes =
                      course.likesCount ??
                      course.likeCount ??
                      course.likes ??
                      undefined;

                    const isLiked = likedIds.includes(
                      String(course._id)
                    );
                    const manualImageUrl = resolveImageUrl(
                    course.heroImageUrl ||
                      course.imageUrl ||
                      course.thumbnailUrl ||
                      null
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
                        firstStep={
                          firstStep?.place ||
                          firstStep?.title ||
                          firstStep?.name
                        }
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

      {/* --- 5-2. 자동 생성 데이트 코스 탭 --- */}
      {activeTab === "auto" && (
        <section style={{ marginTop: 8 }}>
          <h3 style={{ marginBottom: 10, fontSize: 16 }}>
            이 지역 자동 데이트 코스
          </h3>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              if (selectedRegionId === "all") {
                alert("먼저 상단에서 특정 지역을 선택해 주세요!");
                return;
              }
              fetchAutoCourse(selectedRegionId);
            }}
          >
            이 지역 자동 데이트 코스 만들기 (β)
          </button>

          <p style={{ marginTop: 6, fontSize: 12, color: "#9ca3af" }}>
            * 카카오맵 API로 이 지역의 카페/맛집/볼거리를 조합해서 코스를
            만들어줘요. 버튼을 여러 번 누르면 다른 조합도 계속 나와요.
          </p>

          {autoCourses.length === 0 ? (
            <p style={{ fontSize: 14, color: "#6b7280", marginTop: 12 }}>
              아직 자동 코스를 만들지 않았어요. 위 버튼을 눌러 첫 자동 코스를
              만들어보세요.
            </p>
          ) : (
            <ul className="course-list" style={{ marginTop: 16 }}>
              {autoCourses.map((course, index) => (
                <AutoCourseCard
                  key={course.id || index}
                  course={course}
                  index={index}
                  imageUrl={autoCardImages[course.id] || null}
                />
              ))}
            </ul>
          )}
        </section>
      )}

      {/* --- 5-3. 카카오 추천 장소 탭 --- */}
      {activeTab === "kakao" && (
        <section style={{ marginTop: 8 }}>
          <h3 style={{ marginBottom: 10, fontSize: 16 }}>
            이 지역 카카오 추천 장소
          </h3>

          <button
            type="button"
            className="btn btn-primary"
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

          <p style={{ marginTop: 6, fontSize: 12, color: "#9ca3af" }}>
            * 카카오맵 API로 이 지역의 인기 카페/맛집/데이트 스팟을 보여줘요.
          </p>

          {kakaoError && (
            <p style={{ color: "red", marginBottom: 8 }}>{kakaoError}</p>
          )}

          {kakaoLoading && (
            <p className="text-muted">카카오 장소 불러오는 중...</p>
          )}

          {!kakaoLoading && !kakaoError && kakaoPlaces.length === 0 && (
            <p style={{ fontSize: 14, color: "#6b7280", marginTop: 12 }}>
              {selectedRegionId === "all"
                ? "먼저 상단에서 지역을 선택한 뒤, '이 지역 카카오 추천 보기' 버튼을 눌러보세요."
                : "아직 카카오 추천을 불러오지 않았어요. 위 버튼을 눌러보세요."}
            </p>
          )}

          {kakaoPlaces.length > 0 && (
            <ul className="course-list" style={{ marginTop: 16 }}>
              {kakaoPlaces.map((place) => (
                <li key={place.id} className="card" style={{ padding: 16 }}>
                  <h4 style={{ fontSize: 15, marginBottom: 4 }}>
                    {place.place_name}
                  </h4>
                  <p
                    style={{
                      fontSize: 13,
                      color: "#6b7280",
                      marginBottom: 4,
                    }}
                  >
                    📍{" "}
                    {place.road_address_name ||
                      place.address_name ||
                      "주소 정보 없음"}
                  </p>
                  {place.phone && (
                    <p
                      style={{
                        fontSize: 12,
                        color: "#6b7280",
                        marginBottom: 4,
                      }}
                    >
                      ☎ {place.phone}
                    </p>
                  )}
                  <a
                    href={place.place_url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary btn-sm"
                  >
                    카카오맵에서 보기
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

// ✅ 탭 버튼 작은 컴포넌트
function TabButton({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: "none",
        background: "transparent",
        padding: "6px 12px",
        borderRadius: 999,
        fontSize: 13,
        cursor: "pointer",
        color: active ? "#111827" : "#6b7280",
        fontWeight: active ? 600 : 500,
        backgroundColor: active ? "#e0e7ff" : "transparent",
      }}
    >
      {label}
    </button>
  );
}

// ✅ 자동 생성 코스용 카드 컴포넌트
function AutoCourseCard({ course, index, imageUrl }) {
  const firstStep = course.steps?.[0];
  const placeObj = firstStep?.place || firstStep || {};
  const firstName =
    placeObj.place_name ||
    placeObj.name ||
    firstStep?.label ||
    "첫 단계 정보 없음";

  const stepsCount = course.steps?.length || 0;

  return (
    <li className="course-card-wrapper">
      <Link
        to={`/auto-courses/${course.id}`}
        state={{ course }}
        className="course-card-link"
        style={{ textDecoration: "none", color: "inherit" }}
      >
        <article className="course-card-outer">
          {/* 이미지 영역 */}
          <div className="course-card-image-wrap">
            <div className="course-card-image-inner">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={course.title}
                  className="course-card-image"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              ) : null}

              {/* 이미지가 없어도 보이는 그라디언트 배경 */}
              {!imageUrl && (
                <div className="course-card-image-placeholder" />
              )}

              <span className="course-card-mood-badge">자동 생성</span>
            </div>
          </div>

          {/* 내용 영역 */}
          <div className="course-card-body">
            <p className="course-card-meta-small">
              자동 추천 코스 #{index + 1}
            </p>

            <h4 className="course-card-title">{course.title}</h4>

            {firstName && (
              <p className="course-card-firststep">1단계: {firstName}</p>
            )}

            <div className="course-card-footer">
              <span className="course-card-footer-meta">
                {stepsCount}단계 코스
              </span>
            </div>
          </div>
        </article>
      </Link>
    </li>
  );
}

export default RecommendPage;