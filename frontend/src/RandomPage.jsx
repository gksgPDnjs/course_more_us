// src/RandomPage.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { SEOUL_REGIONS } from "./data/regions";

// Unsplash
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

// 카카오 키워드 검색 (좌표 기반)
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

  // 카페 필터
  if (keyword.includes("카페")) {
    const cafeRegex = /(카페|coffee|커피|브런치|디저트)/i;
    const onlyCafe = filtered.filter((p) =>
      cafeRegex.test(p.place_name || "")
    );
    if (onlyCafe.length > 0) filtered = onlyCafe;
  }
  // 맛집 필터
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

// 자동 코스 생성 (카카오)
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

  const [result, setResult] = useState(null); // 뽑힌 코스
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Unsplash
  const [heroUrl, setHeroUrl] = useState(null);
  const [heroLoading, setHeroLoading] = useState(false);

  const selectedRegion =
    SEOUL_REGIONS.find((r) => r.id === selectedRegionId) || SEOUL_REGIONS[0];

  /* ---------- 랜덤 뽑기 ---------- */
  const fetchRandom = async () => {
    setError("");
    setResult(null);
    setHeroUrl(null);

    setLoading(true);

    try {
      const region = selectedRegion;
      const regionId = region?.id || "all";

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

      // 2) 카카오 기반 자동 코스 (서울 전체일 땐 제외)
      const autoPromise =
        regionId === "all" || !KAKAO_REST_KEY || !region?.center
          ? Promise.resolve(null)
          : buildAutoCourse(region).catch(() => null);

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
    if (!result) {
      setHeroUrl(null);
      return;
    }

    const keywordCourse =
      result.source === "auto"
        ? { ...result, city: result.regionId }
        : result || {};

    const keyword = buildUnsplashKeyword(keywordCourse);
    console.log("🧩 RandomPage Unsplash keyword:", keyword);

    async function loadHero() {
      try {
        setHeroLoading(true);
        const url = await fetchUnsplashHero(keyword);
        console.log("🎨 RandomPage heroUrl:", url);
        if (url) setHeroUrl(url);
      } catch (e) {
        console.error("RandomPage hero image error:", e);
      } finally {
        setHeroLoading(false);
      }
    }

    loadHero();
  }, [result]);

  /* ---------- 코스 정보 파생 값 ---------- */
  let resultRegionLabel = "";
  let steps = [];
  let firstStepName = "";

  if (result && Array.isArray(result.steps)) {
    steps = result.steps;
    const first = steps[0];
    firstStepName = getStepPlaceName(first);

    if (result.source === "auto") {
      resultRegionLabel = getRegionLabelById(result.regionId);
    } else {
      // user 코스: city 없을 수도 있으니 방어
      resultRegionLabel =
        getRegionLabelById(result.city) ||
        getRegionLabelById(result.regionId) ||
        "";
    }
  }

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert("현재 페이지 주소를 복사했어요. 친구에게 붙여넣기 해보세요!");
    } catch (e) {
      console.error(e);
      alert("주소를 복사하는 데 실패했어요 ㅠㅠ");
    }
  };

  const isRerollLoading = loading; // 버튼 로딩 class 용

  /* ------------------ JSX ------------------ */

  return (
    <div className="random-page">
      {/* 헤더 */}
      <header className="random-header">
        <h2 className="section-title">랜덤 데이트 코스</h2>
        <p>
          서울에서 <strong>어디로</strong> 갈까요? 지역을 고르고 버튼을 누르면,
          <br />
          현재 등록된 코스와 자동 생성 코스 중에서 하나를 랜덤으로 뽑아드려요.
        </p>
      </header>

      {/* 지역 선택 카드 */}
      {/* 지역 선택 카드 (예쁜 칩 + 설명 + 액션 버튼) */}
<section className="card random-region-card">
  <div className="random-region-header">
    <div>
      <p className="random-region-eyebrow">어디서 시작해볼까요?</p>
      <h3 className="random-region-title">
        {selectedRegionId === "all"
          ? "서울 전체에서 랜덤으로 뽑기"
          : `${selectedRegion?.label}에서 랜덤으로 뽑기`}
      </h3>
      <p className="random-region-sub">
        상단에서 지역을 고른 뒤, 아래 버튼을 누르면 현재 등록된 코스와
        자동 생성 코스 중 하나를 뽑아드려요.
      </p>
    </div>

    <button
      className={`btn btn-primary random-reroll-btn ${
        loading ? "random-reroll-btn-loading" : ""
      }`}
      onClick={fetchRandom}
      disabled={loading}
    >
      {loading ? "코스 뽑는 중..." : "이 지역에서 코스 뽑기 🎲"}
    </button>
  </div>

  <div className="random-region-pills">
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

  <p className="random-region-help">
    <span>TIP</span>
    <span>
      <strong>서울 전체</strong>를 선택하면 모든 지역의 코스를 섞어서 뽑고,
      특정 지역을 선택하면 그 지역에 맞는 코스만 골라줘요.
    </span>
  </p>
</section>

      {/* 결과 섹션 */}
      <section className="random-result-section">
        <h3>이번에 뽑힌 코스</h3>

        {loading && (
          <p className="text-muted">코스를 뽑는 중입니다...</p>
        )}

        {error && <p className="random-error">{error}</p>}

        {!loading && !error && !result && (
          <p className="random-hint">
            위에서 지역을 선택하고{" "}
            <strong>“이 지역에서 코스 뽑기 🎲”</strong> 버튼을 눌러보세요.
          </p>
        )}

        {result && (
          <div className="random-result-card">
            {/* 이미지 영역 */}
            <div className="random-result-image-wrap">
              <div className="random-result-image-bg" />
              {heroLoading ? (
                <div className="random-result-image-skeleton">
                  이미지 불러오는 중...
                </div>
              ) : heroUrl ? (
                <img
                  src={heroUrl}
                  alt="랜덤 코스 대표 이미지"
                  className="random-result-image"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              ) : (
                <div className="random-result-image-skeleton">
                  데이트 무드 찾는 중...
                </div>
              )}

              <div className="random-result-badges">
                <span className="random-result-badge-type">
                  {result.source === "auto"
                    ? "자동 생성 코스"
                    : "유저가 만든 코스"}
                </span>
                <span className="random-result-badge-steps">
                  {steps.length}단계 코스
                </span>
              </div>
            </div>

            {/* 본문 영역 */}
            <div className="random-result-body">
              <h4 className="random-result-title">{result.title}</h4>

              <p className="random-result-meta">
                📍 {resultRegionLabel || "지역 정보 없음"} · {steps.length}
                단계 코스 ·{" "}
                {result.source === "auto"
                  ? "자동 생성 코스"
                  : "유저가 만든 코스"}
              </p>

              {firstStepName && (
                <p className="random-result-firststep">
                  <span>1단계</span>
                  {firstStepName}
                </p>
              )}

              <p className="random-result-desc">
                코스 일정은 아래 순서대로 이동해보면 좋아요. 마음에 들면 상세
                페이지에서 카카오맵 링크와 메모를 같이 확인할 수 있어요.
              </p>

              {/* 코스 일정 리스트 */}
              <div className="random-step-list">
                {steps.map((step, index) => {
                  const stepNo = index + 1;
                  const name = getStepPlaceName(step);
                  const label =
                    step.label ||
                    step.type ||
                    (stepNo === 1 ? "시작" : "코스");

                  return (
                    <div key={index} className="random-step-item">
                      <div className="random-step-index">{stepNo}</div>
                      <div className="random-step-info">
                        <div className="random-step-name">{name}</div>
                        <div className="random-step-label">{label}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 버튼들 */}
              <div className="random-result-actions">
                <button
                  type="button"
                  className={
                    "btn btn-primary random-reroll-btn" +
                    (isRerollLoading ? " random-reroll-btn-loading" : "")
                  }
                  onClick={fetchRandom}
                  disabled={loading}
                >
                  {loading ? "다시 뽑는 중..." : "다시 뽑기 🎲"}
                </button>

                <Link
                  to={
                    result.source === "auto"
                      ? `/auto-courses/${result.id}`
                      : `/courses/${result._id}`
                  }
                  state={result.source === "auto" ? { course: result } : null}
                  className="btn btn-secondary"
                >
                  상세 페이지 보기
                </Link>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleCopyUrl}
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