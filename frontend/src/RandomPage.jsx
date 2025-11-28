// src/RandomPage.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { SEOUL_REGIONS } from "./data/regions";

// ⭐ Unsplash 이미지
import { fetchUnsplashHero } from "./api/unsplash";
import { buildUnsplashKeyword } from "./api/unsplashKeyword";

const API_BASE_URL = "http://localhost:4000";
const KAKAO_REST_KEY = import.meta.env.VITE_KAKAO_REST_KEY;

/* ------------------ 공통 유틸 ------------------ */

// region id → label
function getRegionLabelById(cityId) {
  if (!cityId) return "";
  const region = SEOUL_REGIONS.find((r) => r.id === cityId);
  return region ? region.label : cityId;
}

// 🔍 카카오 키워드 검색 (좌표 기반)
async function searchByCategory(region, keyword) {
  if (!KAKAO_REST_KEY) {
    console.warn("KAKAO REST KEY 누락");
    return null;
  }
  if (!region?.center) {
    console.warn("center 좌표 없음");
    return null;
  }

  const { x, y } = region.center;

  const url =
    "https://dapi.kakao.com/v2/local/search/keyword.json" +
    `?query=${encodeURIComponent(keyword)}` +
    `&x=${x}&y=${y}` +
    `&radius=5000` +
    `&size=15`;

  const res = await fetch(url, {
    headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error("카카오 키워드 검색 실패:", keyword, data);
    return null;
  }

  let docs = data.documents || [];
  if (docs.length === 0) return null;

  const blacklistRegex = /(스터디|독서실|학원|공부|독학|고시원)/i;
  let filtered = docs.filter(
    (p) => !blacklistRegex.test(p.place_name || "")
  );

  // 카페 쪽 필터
  if (keyword.includes("카페")) {
    const cafeRegex = /(카페|coffee|커피|브런치|디저트)/i;
    const onlyCafe = filtered.filter((p) =>
      cafeRegex.test(p.place_name || "")
    );
    if (onlyCafe.length > 0) filtered = onlyCafe;
  }
  // 맛집 쪽 필터
  else if (keyword.includes("맛집")) {
    const notCafeRegex = /(카페|coffee|커피|디저트|베이커리)/i;
    const onlyFood = filtered.filter(
      (p) => !notCafeRegex.test(p.place_name || "")
    );
    if (onlyFood.length > 0) filtered = onlyFood;
  }

  if (filtered.length === 0) filtered = docs;

  const limit = Math.min(filtered.length, 5);
  const picked = filtered[Math.floor(Math.random() * limit)];
  return picked;
}

// ⭐ 자동 코스 생성 (카카오)
async function buildAutoCourse(region) {
  if (!region || region.id === "all") return null;

  const cafe = await searchByCategory(region, `${region.label} 카페`);
  if (!cafe) return null;

  const food = await searchByCategory(region, `${region.label} 맛집`);
  const spot = await searchByCategory(region, `${region.label} 데이트 코스`);

  const steps = [
    cafe && { type: "cafe", label: "카페", place: cafe },
    food && { type: "food", label: "식사", place: food },
    spot && { type: "spot", label: "볼거리", place: spot },
  ].filter(Boolean);

  if (steps.length === 0) return null;

  return {
    id: `auto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: `${region.label} 자동 데이트 코스`,
    regionId: region.id,
    steps,
    source: "auto",
  };
}

function getStepPlaceName(step) {
  if (!step) return "";
  const placeObj = step.place || step;
  return (
    placeObj.place_name ||
    placeObj.name ||
    step.place ||
    "장소 이름 없음"
  );
}

/* ------------------ 메인 컴포넌트 ------------------ */

function RandomPage() {
  const [selectedRegionId, setSelectedRegionId] = useState("all");

  const [result, setResult] = useState(null); // 뽑힌 코스 (user 또는 auto)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Unsplash 썸네일
  const [heroUrl, setHeroUrl] = useState(null);

  const selectedRegion =
    SEOUL_REGIONS.find((r) => r.id === selectedRegionId) || SEOUL_REGIONS[0];

  /* ---------- 랜덤 뽑기 ---------- */
  const fetchRandom = async () => {
    setError("");
    setResult(null);
    setHeroUrl(null);
    setLoading(true);

    try {
      const regionId = selectedRegion.id;

      const query =
        regionId && regionId !== "all"
          ? `?city=${encodeURIComponent(regionId)}`
          : "";

      // 1) 백엔드에서 유저 코스 하나 랜덤
      const dbPromise = fetch(`${API_BASE_URL}/api/random${query}`)
        .then(async (res) => {
          const data = await res.json().catch(() => null);
          if (!res.ok || !data) return null;
          return { ...data, source: "user" };
        })
        .catch(() => null);

      // 2) 카카오 기반 자동 코스
      const autoPromise =
        !KAKAO_REST_KEY || !selectedRegion.center
          ? Promise.resolve(null)
          : buildAutoCourse(selectedRegion).catch(() => null);

      const [dbCourse, autoCourse] = await Promise.all([
        dbPromise,
        autoPromise,
      ]);

      const candidates = [];
      if (dbCourse) candidates.push(dbCourse);
      if (autoCourse) candidates.push(autoCourse);

      if (candidates.length === 0) {
        setError("이 지역에서 추천할 코스를 찾지 못했어요.");
        return;
      }

      const idx = Math.floor(Math.random() * candidates.length);
      const picked = candidates[idx];
      setResult(picked);
    } catch (err) {
      console.error(err);
      setError(err.message || "요청 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  /* ---------- result 바뀔 때 Unsplash 이미지 로딩 ---------- */
  useEffect(() => {
    if (!result) return;

    const keyword = buildUnsplashKeyword(
      result.source === "auto"
        ? { ...result, city: result.regionId }
        : result
    );
    console.log("🧩 RandomPage Unsplash keyword:", keyword);

    async function loadHero() {
      const url = await fetchUnsplashHero(keyword);
      console.log("🎨 RandomPage heroUrl:", url);
      if (url) setHeroUrl(url);
    }

    loadHero();
  }, [result]);

  /* ---------- 코스 정보 ---------- */
  const resultRegionLabel = result
    ? result.source === "auto"
      ? getRegionLabelById(result.regionId)
      : getRegionLabelById(result.city) || selectedRegion?.label
    : "";

  const steps = Array.isArray(result?.steps) ? result.steps : [];

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert("현재 페이지 주소를 복사했어요. 친구에게 붙여넣기 해보세요!");
    } catch (e) {
      console.error(e);
      alert("주소를 복사하는 데 실패했어요 ㅠㅠ");
    }
  };

  /* ------------------ JSX ------------------ */

  return (
    <div className="page">
      {/* 헤더 */}
      <header
        style={{
          marginBottom: 20,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <h2 className="section-title">랜덤 데이트 코스</h2>
        <p style={{ fontSize: 14, color: "#6b7280" }}>
          서울에서 <strong>어디로</strong> 갈까요? 지역을 고르고 버튼을 누르면,
          <br />
          현재 등록된 코스와 자동 생성 코스 중에서 하나를 랜덤으로 뽑아드려요.
        </p>
      </header>

      {/* 지역 선택 카드 */}
      <section
        className="card"
        style={{ display: "flex", flexDirection: "column", gap: 12 }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {SEOUL_REGIONS.map((region) => (
            <button
              key={region.id}
              type="button"
              className={`region-btn ${
                selectedRegionId === region.id ? "selected" : ""
              }`}
              onClick={() => {
                setSelectedRegionId(region.id);
                setResult(null);
                setError("");
                setHeroUrl(null);
              }}
            >
              {region.label}
            </button>
          ))}
        </div>

        <p style={{ fontSize: 12, color: "#6b7280" }}>
          * <strong>서울 전체</strong>를 선택하면 모든 지역에서 랜덤으로 코스를
          뽑아요.
        </p>

        <div style={{ marginTop: 4 }}>
          <button
            className="btn btn-primary"
            onClick={fetchRandom}
            disabled={loading}
          >
            {loading ? "뽑는 중..." : "이 지역에서 코스 뽑기 🎲"}
          </button>
        </div>
      </section>

      {/* 결과 섹션 */}
      <section style={{ marginTop: 24 }}>
        <h3 style={{ fontSize: 16, marginBottom: 12 }}>이번에 뽑힌 코스</h3>

        {loading && <p className="text-muted">코스를 뽑는 중입니다...</p>}

        {error && <p style={{ color: "red", marginTop: 4 }}>{error}</p>}

        {!loading && !error && !result && (
          <p style={{ fontSize: 14, color: "#6b7280" }}>
            위에서 지역을 선택하고{" "}
            <strong>“이 지역에서 코스 뽑기 🎲”</strong> 버튼을 눌러보세요.
          </p>
        )}

        {result && (
          <div
            className="card"
            style={{
              marginTop: 8,
              maxWidth: 880,
              marginInline: "auto",
              padding: 0,
              overflow: "hidden",
            }}
          >
            {/* 상단 이미지 */}
            <div
              style={{
                width: "100%",
                height: 260,
                background:
                  "linear-gradient(135deg,#e5e7eb,#e0f2fe,#fce7f3)",
                overflow: "hidden",
              }}
            >
              {heroUrl && (
                <img
                  src={heroUrl}
                  alt="랜덤 코스 대표 이미지"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              )}
            </div>

            {/* 본문 영역 */}
            <div style={{ padding: "20px 24px 16px" }}>
              <h4
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  marginBottom: 6,
                }}
              >
                {result.title}
              </h4>

              <p
                style={{
                  fontSize: 13,
                  color: "#6b7280",
                  marginBottom: 12,
                }}
              >
                📍 {resultRegionLabel || "지역 정보 없음"} ·{" "}
                {steps.length}단계 코스{" "}
                {result.source === "auto"
                  ? "· 자동 생성 코스"
                  : "· 유저가 만든 코스"}
              </p>

              {/* 코스 일정 리스트 */}
              <div style={{ marginTop: 8 }}>
                <h5
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    marginBottom: 8,
                  }}
                >
                  코스 일정
                </h5>

                <div
                  style={{
                    borderTop: "1px solid #e5e7eb",
                    marginTop: 4,
                    paddingTop: 8,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {steps.map((step, index) => {
                    const stepNo = index + 1;
                    const name = getStepPlaceName(step);
                    const time = step.time || "";
                    const label =
                      step.label || step.type || (stepNo === 1 ? "시작" : "코스");

                    return (
                      <div
                        key={index}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                          padding: "6px 0",
                        }}
                      >
                        <div style={{ display: "flex", gap: 12 }}>
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: "999px",
                              backgroundColor: "#ecfdf5",
                              border: "1px solid #bbf7d0",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 13,
                              fontWeight: 600,
                              color: "#15803d",
                            }}
                          >
                            {stepNo}
                          </div>
                          <div>
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                                marginBottom: 2,
                              }}
                            >
                              {name}
                            </div>
                            <div
                              style={{
                                fontSize: 12,
                                color: "#6b7280",
                              }}
                            >
                              {label}
                            </div>
                          </div>
                        </div>

                        {time && (
                          <div
                            style={{
                              fontSize: 12,
                              color: "#6b7280",
                              minWidth: 52,
                              textAlign: "right",
                            }}
                          >
                            {time}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 버튼들 */}
              <div
                style={{
                  marginTop: 20,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  justifyContent: "flex-start",
                }}
              >
                {/* 다시 뽑기 (메인) */}
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={fetchRandom}
                  disabled={loading}
                  style={{
                    flexShrink: 0,
                    minWidth: 140,
                    backgroundColor: "#166534",
                    borderColor: "#14532d",
                  }}
                >
                  {loading ? "다시 뽑는 중..." : "다시 뽑기 🎲"}
                </button>

                {/* 상세 페이지 보기 → 기존 상세 화면으로 이동 */}
                <Link
                  to={
                    result.source === "auto"
                      ? `/auto-courses/${result.id}`
                      : `/courses/${result._id}`
                  }
                  state={result.source === "auto" ? { course: result } : null}
                  className="btn btn-secondary"
                  style={{
                    flexShrink: 0,
                    minWidth: 140,
                  }}
                >
                  상세 페이지 보기
                </Link>

                {/* URL 공유(주소 복사) */}
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleCopyUrl}
                  style={{
                    flexShrink: 0,
                  }}
                >
                  URL 복사
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default RandomPage;