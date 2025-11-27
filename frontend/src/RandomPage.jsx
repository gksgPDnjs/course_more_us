// src/RandomPage.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { SEOUL_REGIONS } from "./data/regions";

// ⭐ Unsplash 이미지 로딩
import { fetchUnsplashHero } from "./api/unsplash";
import { buildUnsplashKeyword } from "./api/unsplashKeyword";

const API_BASE_URL = "http://localhost:4000";
const KAKAO_REST_KEY = import.meta.env.VITE_KAKAO_REST_KEY;

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

  if (filtered.length === 0) filtered = docs;

  const limit = Math.min(filtered.length, 5);
  const picked = filtered[Math.floor(Math.random() * limit)];
  return picked;
}

// ⭐ 자동 코스 생성
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

// 스텝들의 타입 요약 (카페 → 식사 → 볼거리)
function summarizeStepFlow(steps = []) {
  if (!steps.length) return "";
  const names = steps
    .map((s) => s.label || s.type)
    .filter(Boolean)
    .map((x) =>
      x === "cafe" ? "카페" : x === "food" ? "식사" : x === "spot" ? "볼거리" : x
    );
  if (!names.length) return "";
  return names.join(" → ");
}

function RandomPage() {
  const [selectedRegionId, setSelectedRegionId] = useState("all");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ⭐ Unsplash 대표 이미지
  const [heroUrl, setHeroUrl] = useState(null);
  const [heroLoading, setHeroLoading] = useState(false);

  const selectedRegion =
    SEOUL_REGIONS.find((r) => r.id === selectedRegionId) || SEOUL_REGIONS[0];

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

      const dbPromise = fetch(`${API_BASE_URL}/api/random${query}`)
        .then(async (res) => {
          const data = await res.json().catch(() => null);
          if (!res.ok) return null;
          return { ...data, source: "user" };
        })
        .catch(() => null);

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
      setResult(candidates[idx]);
    } catch (err) {
      setError(err.message || "요청 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const resultRegionLabel = result
    ? result.source === "auto"
      ? getRegionLabelById(result.regionId)
      : getRegionLabelById(result.city) || selectedRegion?.label
    : "";

  const firstStep = result?.steps?.[0];

  // ⭐ result가 바뀔 때 대표 이미지 로딩
  useEffect(() => {
    if (!result) return;

    const keyword = buildUnsplashKeyword(result);
    console.log("🧩 RandomPage Unsplash keyword:", keyword);

    async function loadHero() {
      setHeroLoading(true);
      const url = await fetchUnsplashHero(keyword);
      console.log("🎨 RandomPage heroUrl:", url);
      setHeroUrl(url);
      setHeroLoading(false);
    }

    loadHero();
  }, [result]);

  const flowSummary = result ? summarizeStepFlow(result.steps) : "";

  return (
    <div className="card">
      <h2 className="section-title">랜덤 데이트 코스</h2>

      {/* 지역 선택 */}
      <div style={{ marginBottom: 16 }}>
        <p style={{ marginBottom: 8, fontSize: 14 }}>
          서울에서 <strong>어디로</strong> 갈까요?
        </p>

        <div className="region-pill-wrap">
          {SEOUL_REGIONS.map((region) => (
            <button
              key={region.id}
              type="button"
              className={
                selectedRegionId === region.id
                  ? "region-btn selected"
                  : "region-btn"
              }
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

        <p
          style={{
            marginTop: 8,
            fontSize: 12,
            color: "#6b7280",
          }}
        >
          * <strong>서울 전체</strong>를 선택하면 모든 지역에서 랜덤으로 코스를
          뽑아요. (유저 코스 + 자동 코스)
        </p>
      </div>

      <button
        className="btn btn-primary"
        onClick={fetchRandom}
        disabled={loading}
      >
        {loading ? "뽑는 중..." : "이 지역에서 코스 뽑기 🎲"}
      </button>

      <hr style={{ margin: "20px 0" }} />

      {loading && <p>불러오는 중...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {!loading && !error && !result && (
        <p>위에서 지역을 선택하고 버튼을 눌러보세요!</p>
      )}

      {result && (
        <div
          className="card"
          style={{
            padding: 16,
            marginTop: 8,
            borderRadius: 24,
            boxShadow:
              "0 18px 40px rgba(15,23,42,0.08), 0 0 0 1px rgba(226,232,240,0.8)",
            background:
              "radial-gradient(circle at top left,#ffffff,#f9fafb)",
          }}
        >
          {/* 상단 이미지 + 메타 정보 */}
          <div
            style={{
              position: "relative",
              borderRadius: 18,
              overflow: "hidden",
              marginBottom: 12,
              background:
                "linear-gradient(135deg,#eef2ff,#fce7f3,#e0f2fe)",
              minHeight: 140,
            }}
          >
            {heroLoading && (
              <div
                style={{
                  width: "100%",
                  height: 160,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  color: "#6b7280",
                }}
              >
                이미지 불러오는 중...
              </div>
            )}

            {!heroLoading && heroUrl && (
              <img
                src={heroUrl}
                alt="대표 이미지"
                style={{
                  width: "100%",
                  height: 160,
                  objectFit: "cover",
                  display: "block",
                }}
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            )}

            {/* 왼쪽 위 지역 배지 */}
            {resultRegionLabel && (
              <div
                style={{
                  position: "absolute",
                  left: 12,
                  top: 10,
                  padding: "4px 10px",
                  borderRadius: 999,
                  fontSize: 11,
                  backgroundColor: "rgba(15,23,42,0.75)",
                  color: "white",
                  backdropFilter: "blur(6px)",
                }}
              >
                📍 {resultRegionLabel}
              </div>
            )}

            {/* 오른쪽 위 코스 타입 배지 */}
            <div
              style={{
                position: "absolute",
                right: 12,
                top: 10,
                padding: "4px 10px",
                borderRadius: 999,
                fontSize: 11,
                backgroundColor:
                  result.source === "auto"
                    ? "rgba(99,102,241,0.9)"
                    : "rgba(15,23,42,0.8)",
                color: "white",
                backdropFilter: "blur(6px)",
              }}
            >
              {result.source === "auto" ? "자동 코스" : "유저 코스"}
            </div>
          </div>

          {/* 텍스트 정보 */}
          <h3 style={{ marginBottom: 4, fontSize: 18 }}>
            {result.title}
          </h3>

          <p
            style={{
              marginBottom: 6,
              fontSize: 13,
              color: "#6b7280",
            }}
          >
            {flowSummary
              ? `이 코스는 ${flowSummary} 흐름으로 이어져요.`
              : "이 코스의 단계 구성을 함께 둘러볼까요?"}
          </p>

          {firstStep && (
            <div
              style={{
                marginTop: 6,
                fontSize: 14,
                padding: "8px 10px",
                borderRadius: 12,
                backgroundColor: "#f3f4ff",
                color: "#4b5563",
              }}
            >
              <strong>1단계 추천 장소</strong> ·{" "}
              {getStepPlaceName(firstStep)}
            </div>
          )}

          {/* 상세 보기 버튼 */}
          {result.source === "auto" ? (
            <Link
              to={`/auto-courses/${result.id}`}
              state={{ course: result }}
              className="btn btn-secondary"
              style={{
                marginTop: 12,
                display: "inline-block",
                fontSize: 14,
              }}
            >
              상세 보기
            </Link>
          ) : (
            <Link
              to={`/courses/${result._id}`}
              className="btn btn-secondary"
              style={{
                marginTop: 12,
                display: "inline-block",
                fontSize: 14,
              }}
            >
              상세 보기
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export default RandomPage;