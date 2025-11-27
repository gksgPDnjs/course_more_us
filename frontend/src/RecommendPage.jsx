// src/RecommendPage.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SEOUL_REGIONS } from "./data/regions";

const API_BASE_URL = "http://localhost:4000";
const KAKAO_REST_KEY = import.meta.env.VITE_KAKAO_REST_KEY;

// 지역 객체에서 "대표 이름" 하나 뽑기 (핫플 검색용)
function getRegionMainName(region) {
  // 1순위: regions.js에 있는 keywords 중 첫 번째 값 사용
  if (Array.isArray(region.keywords) && region.keywords.length > 0) {
    return region.keywords[0]; // 예: "홍대", "강남역"
  }

  // 2순위: label 을 / 기준으로 잘라서 첫 조각 사용
  if (region.label) {
    return region.label.split("/")[0].trim(); // 예: "홍대/신촌/마포/연남" -> "홍대"
  }

  // 그래도 없으면 id라도 쓰기
  return region.id || "";
}

// 지역 id → 라벨
function getRegionLabel(cityId) {
  if (!cityId) return "";
  const region = SEOUL_REGIONS.find((r) => r.id === cityId);
  return region ? region.label : cityId;
}

function RecommendPage() {
  console.log("Kakao key:", KAKAO_REST_KEY);

  const [selectedRegion, setSelectedRegion] = useState("all");

  // 내 코스(백엔드)
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [coursesError, setCoursesError] = useState("");

  // 카카오 장소 리스트 (그냥 장소 목록)
  const [kakaoPlaces, setKakaoPlaces] = useState([]);
  const [kakaoLoading, setKakaoLoading] = useState(false);
  const [kakaoError, setKakaoError] = useState("");

  // ⭐ 자동 코스 여러 개를 쌓아둘 배열
  const [autoCourses, setAutoCourses] = useState([]);

  // -------------------- 1. 내 코스 불러오기 --------------------
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

  const filteredCourses =
    selectedRegion === "all"
      ? courses
      : courses.filter((c) => c.city === selectedRegion);

  // -------------------- 2. 카카오 장소 검색 (지역 핫플 리스트 용) --------------------
  const fetchKakaoPlaces = async (regionId) => {
    if (!KAKAO_REST_KEY) {
      alert("VITE_KAKAO_REST_KEY가 설정되어 있지 않아요 (.env 확인)");
      return;
    }

    const region = SEOUL_REGIONS.find((r) => r.id === regionId);
    if (!region) {
      alert("선택한 지역 정보를 찾을 수 없어요.");
      return;
    }

    const baseName = getRegionMainName(region); // 예: "홍대"
    const { x, y } = region.center || {};

    if (!x || !y) {
      alert("이 지역의 중심 좌표(center)가 설정되어 있지 않아요.");
      return;
    }

    // 공통 키워드 3개: 맛집 / 카페 / 데이트 스팟
    const keywords = [
      `${baseName} 맛집`,
      `${baseName} 카페`,
      `${baseName} 데이트 스팟`,
    ];

    const blacklistRegex = /(스터디|독서실|학원|공부|독학|고시원)/i;

    // 키워드 하나씩 카카오 API 호출하는 헬퍼
    const callKakao = async (keyword) => {
      const url =
        "https://dapi.kakao.com/v2/local/search/keyword.json" +
        `?query=${encodeURIComponent(keyword)}` +
        `&x=${x}&y=${y}` +
        `&radius=5000` + // 반경 5km
        `&size=10`;

      const res = await fetch(url, {
        headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error("카카오 장소 검색 실패:", keyword, data);
        return [];
      }

      let docs = data.documents || [];
      // 스터디카페/학원 같은 거 제거
      docs = docs.filter((p) => !blacklistRegex.test(p.place_name || ""));
      console.log("📍 카카오 핫플 검색 결과:", keyword, docs);
      return docs;
    };

    try {
      setKakaoLoading(true);
      setKakaoError("");
      setKakaoPlaces([]);

      // 3개의 키워드를 병렬로 검색
      const results = await Promise.all(keywords.map(callKakao));
      const merged = results.flat();

      if (merged.length === 0) {
        setKakaoPlaces([]);
        alert("이 지역에서 보여줄만한 장소를 찾지 못했어요 ㅠㅠ");
        return;
      }

      // id 기준으로 중복 제거
      const seen = new Set();
      const unique = [];
      for (const place of merged) {
        if (!place.id) continue;
        if (seen.has(place.id)) continue;
        seen.add(place.id);
        unique.push(place);
      }

      // 너무 많으면 상위 20개만
      const finalList = unique.slice(0, 20);

      setKakaoPlaces(finalList);
    } catch (err) {
      console.error(err);
      setKakaoError(err.message || "카카오 장소를 불러오는 데 실패했어요.");
    } finally {
      setKakaoLoading(false);
    }
  };

  // -------------------- 3. 좌표 기반 키워드 검색 (자동 코스용) --------------------
  async function searchByCategory(region, keyword) {
    if (!KAKAO_REST_KEY) {
      throw new Error("KAKAO REST KEY 누락");
    }

    const { x, y } = region.center || {};

    const blacklistRegex = /(스터디|독서실|학원|공부|독학|고시원)/i;

    const fetchOnce = async (useCenter) => {
      let url =
        "https://dapi.kakao.com/v2/local/search/keyword.json" +
        `?query=${encodeURIComponent(keyword)}` +
        `&size=15`;

      // 첫 번째 시도에서는 중심 좌표를 사용하고,
      // 두 번째 시도에서는 텍스트 검색만 사용
      if (useCenter && x && y) {
        url += `&x=${x}&y=${y}&radius=5000`;
      }

      const res = await fetch(url, {
        headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "카카오 키워드 검색 실패");
      }

      let docs = data.documents || [];
      console.log(
        "🔎 자동 코스용 검색 결과:",
        keyword,
        useCenter ? "(center 사용)" : "(center 없이)",
        docs
      );

      if (docs.length === 0) return [];

      // 1) 공통 블랙리스트(스터디카페, 학원 등 제거)
      let filtered = docs.filter(
        (p) => !blacklistRegex.test(p.place_name || "")
      );

      // 2) 키워드별 추가 필터
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
      // spot(데이트 코스)는 공통 블랙리스트만 적용

      if (filtered.length === 0) {
        filtered = docs;
      }

      return filtered;
    };

    // 1차: 중심 좌표 기준 검색
    let candidates = await fetchOnce(true);

    // 2차: 결과가 없다면, 중심 좌표 없이 텍스트 검색만
    if (!candidates || candidates.length === 0) {
      candidates = await fetchOnce(false);
    }

    if (!candidates || candidates.length === 0) return null;

    // 상위 5개 안에서 랜덤 1개 선택
    const limit = Math.min(candidates.length, 5);
    const picked = candidates[Math.floor(Math.random() * limit)];
    return picked;
  }

  // ⭐ 자동 코스 만들기 (여러 개 쌓기)
  const fetchAutoCourse = async (regionId) => {
    try {
      const region = SEOUL_REGIONS.find((r) => r.id === regionId);
      if (!region) {
        alert("선택한 지역 정보를 찾을 수 없어요.");
        return;
      }

      const baseName = getRegionMainName(region);

      // 1단계: 카페 (없어도 전체 코스를 포기하지 않음)
      const cafe = await searchByCategory(region, `${baseName} 카페`);

      // 2단계: 음식점
      const food = await searchByCategory(region, `${baseName} 맛집`);

      // 3단계: 볼거리(관광/명소)
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

      // 새로 만든 코스를 앞에 추가 (위에 쌓이게)
      setAutoCourses((prev) => [course, ...prev]);
    } catch (err) {
      console.error("자동 코스 생성 에러:", err);
      alert(err.message || "자동 코스를 만드는 중 오류가 발생했어요.");
    }
  };

  // -------------------- 4. JSX --------------------
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

      {/* 지역 선택 + 카카오 버튼들 */}
      <section
        className="card"
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        {/* 지역 버튼 */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button
            type="button"
            className={`region-btn ${
              selectedRegion === "all" ? "selected" : ""
            }`}
            onClick={() => {
              setSelectedRegion("all");
              setKakaoPlaces([]);
              setAutoCourses([]);
            }}
          >
            서울 전체
          </button>

          {/* all 제외한 지역들 */}
          {SEOUL_REGIONS.filter((r) => r.id !== "all").map((region) => (
            <button
              key={region.id}
              type="button"
              className={`region-btn ${
                selectedRegion === region.id ? "selected" : ""
              }`}
              onClick={() => {
                setSelectedRegion(region.id);
                setKakaoPlaces([]);
                setAutoCourses([]);
              }}
            >
              {region.label}
            </button>
          ))}
        </div>

        {/* 카카오 검색 버튼들 */}
        <div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              if (selectedRegion === "all") {
                alert("먼저 상단에서 특정 지역을 선택해 주세요!");
                return;
              }
              fetchKakaoPlaces(selectedRegion);
            }}
          >
            이 지역 카카오 추천 보기
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            style={{ marginLeft: 8 }}
            onClick={() => {
              if (selectedRegion === "all") {
                alert("먼저 상단에서 특정 지역을 선택해 주세요!");
                return;
              }
              fetchAutoCourse(selectedRegion);
            }}
          >
            이 지역 자동 데이트 코스 만들기 (β)
          </button>

          <p style={{ marginTop: 6, fontSize: 12, color: "#9ca3af" }}>
            * 카카오맵 API로 이 지역의 카페/맛집/볼거리를 조합해서 코스를
            만들어줘요. 버튼을 여러 번 누르면 다른 조합도 계속 나와요.
          </p>
        </div>
      </section>

      {/* ---------------- 5. 내 DB에 저장된 코스 ---------------- */}
      <section>
        <h3 style={{ margin: "20px 0 10px", fontSize: 16 }}>
          내 서비스에 등록된 코스
        </h3>

        {coursesError && (
          <p style={{ color: "red", marginBottom: 8 }}>{coursesError}</p>
        )}

        {loadingCourses ? (
          <p className="text-muted">코스를 불러오는 중...</p>
        ) : filteredCourses.length === 0 ? (
          <p style={{ fontSize: 14, color: "#6b7280" }}>
            이 지역에 등록된 코스가 아직 없어요.
          </p>
        ) : (
          <ul className="course-list">
            {filteredCourses.map((course) => {
              const regionLabel = getRegionLabel(course.city);
              const hasSteps =
                Array.isArray(course.steps) && course.steps.length > 0;
              const firstStep = hasSteps ? course.steps[0] : null;

              return (
                <li key={course._id} className="card course-card">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 6,
                    }}
                  >
                    <h4 style={{ fontSize: 18 }}>{course.title}</h4>
                    {hasSteps && (
                      <span
                        style={{
                          fontSize: 12,
                          color: "#6b7280",
                          whiteSpace: "nowrap",
                        }}
                      >
                        총 {course.steps.length}단계 코스
                      </span>
                    )}
                  </div>

                  <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>
                    📍 {regionLabel || "지역 정보 없음"}
                  </p>

                  {firstStep && (
                    <p
                      style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}
                    >
                      ⭐ 1단계: {firstStep.place}
                    </p>
                  )}

                  <Link
                    to={`/courses/${course._id}`}
                    className="btn btn-secondary btn-sm"
                  >
                    상세 보기
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ---------------- 6. 자동 생성 데이트 코스 리스트 ---------------- */}
      <section style={{ marginTop: 28 }}>
        <h3 style={{ marginBottom: 10, fontSize: 16 }}>자동 생성 데이트 코스</h3>

        {autoCourses.length === 0 ? (
          <p style={{ fontSize: 14, color: "#6b7280" }}>
            아직 자동 코스를 만들지 않았어요. 상단의{" "}
            <strong>“이 지역 자동 데이트 코스 만들기 (β)”</strong> 버튼을
            눌러보세요.
          </p>
        ) : (
          <ul className="course-list">
            {autoCourses.map((course, index) => (
              <li key={course.id || index} className="card" style={{ padding: 0 }}>
                {/* 카드 전체를 클릭하면 상세 페이지로 이동 */}
                <Link
                  to={`/auto-courses/${course.id}`}
                  state={{ course }}
                  style={{
                    display: "block",
                    padding: 16,
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 6,
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          fontSize: 12,
                          color: "#9ca3af",
                          marginBottom: 2,
                        }}
                      >
                        자동 추천 코스 #{autoCourses.length - index}
                      </p>
                      <h4 style={{ fontSize: 16 }}>{course.title}</h4>
                    </div>

                    <span
                      style={{
                        fontSize: 12,
                        color: "#4f46e5",
                        whiteSpace: "nowrap",
                      }}
                    >
                      상세 보기 ▶
                    </span>
                  </div>

                  <ol
                    style={{
                      margin: 0,
                      paddingLeft: 18,
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      fontSize: 14,
                      color: "#4b5563",
                    }}
                  >
                    {course.steps.map((step, idx) => {
                      const placeObj = step.place || step;
                      const name =
                        placeObj.place_name ||
                        placeObj.name ||
                        "장소 이름 없음";
                      const addr =
                        placeObj.road_address_name ||
                        placeObj.address_name ||
                        "";

                      return (
                        <li key={idx}>
                          <strong>
                            {idx + 1}단계 · {step.label || "코스"}
                          </strong>
                          {" — "}
                          {name}
                          {addr && (
                            <span style={{ color: "#9ca3af" }}> · {addr}</span>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---------------- 7. 카카오 추천 장소 리스트 ---------------- */}
      <section style={{ marginTop: 28 }}>
        <h3 style={{ marginBottom: 10, fontSize: 16 }}>이 지역 카카오 추천 장소</h3>

        {kakaoError && (
          <p style={{ color: "red", marginBottom: 8 }}>{kakaoError}</p>
        )}

        {kakaoLoading && (
          <p className="text-muted">카카오 장소 불러오는 중...</p>
        )}

        {!kakaoLoading && !kakaoError && kakaoPlaces.length === 0 && (
          <p style={{ fontSize: 14, color: "#6b7280" }}>
            {selectedRegion === "all"
              ? "먼저 상단에서 지역을 선택한 뒤, '이 지역 카카오 추천 보기' 버튼을 눌러보세요."
              : "아직 카카오 추천을 불러오지 않았어요. 버튼을 눌러보세요."}
          </p>
        )}

        {kakaoPlaces.length > 0 && (
          <ul className="course-list">
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
    </div>
  );
}

export default RecommendPage;