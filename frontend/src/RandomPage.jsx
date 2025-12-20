// src/RandomPage.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { SEOUL_REGIONS } from "./data/regions";

import { fetchUnsplashHero } from "./api/unsplash";

const API_BASE_URL = "http://localhost:4000";
const KAKAO_REST_KEY = import.meta.env.VITE_KAKAO_REST_KEY;

/* ------------------ 공통 유틸 ------------------ */

function getRegionLabelById(cityId) {
  if (!cityId) return "";
  const region = SEOUL_REGIONS.find((r) => r.id === cityId);
  return region ? region.label : cityId;
}

async function searchByCategory(region, keyword) {
  if (!KAKAO_REST_KEY) return null;
  if (!region?.center) return null;

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
  if (!res.ok) return null;

  let docs = data.documents || [];
  if (docs.length === 0) return null;

  const blacklistRegex = /(스터디|독서실|학원|공부|독학|고시원)/i;
  let filtered = docs.filter((p) => !blacklistRegex.test(p.place_name || ""));

  if (keyword.includes("카페")) {
    const cafeRegex = /(카페|coffee|커피|브런치|디저트)/i;
    const onlyCafe = filtered.filter((p) => cafeRegex.test(p.place_name || ""));
    if (onlyCafe.length > 0) filtered = onlyCafe;
  } else if (keyword.includes("맛집")) {
    const notCafeRegex = /(카페|coffee|커피|디저트|베이커리)/i;
    const onlyFood = filtered.filter((p) => !notCafeRegex.test(p.place_name || ""));
    if (onlyFood.length > 0) filtered = onlyFood;
  }

  if (filtered.length === 0) filtered = docs;

  const limit = Math.min(filtered.length, 5);
  return filtered[Math.floor(Math.random() * limit)];
}

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
  return placeObj.place_name || placeObj.name || step.place || "";
}

async function fetchKakaoHero(query) {
  const q = String(query || "").trim();
  if (!q) return null;

  const params = new URLSearchParams({ query: q });
  const res = await fetch(`${API_BASE_URL}/api/kakao/image?${params.toString()}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return null;
  return data?.imageUrl || null;
}

/* ------------------ 메인 컴포넌트 ------------------ */

function RandomPage() {
  const [selectedRegionId, setSelectedRegionId] = useState("all");

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ✅ AI처럼 heroImage(=kakao) 우선 → 없으면 unsplash fallback
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
      const region = selectedRegion;
      const regionId = region?.id || "all";

      const query =
        regionId && regionId !== "all" ? `?city=${encodeURIComponent(regionId)}` : "";

      const dbPromise = fetch(`${API_BASE_URL}/api/random${query}`)
        .then(async (res) => {
          const data = await res.json().catch(() => null);
          if (!res.ok || !data) return null;
          return { ...data, source: "user" };
        })
        .catch(() => null);

      const autoPromise =
        regionId === "all" || !KAKAO_REST_KEY || !region?.center
          ? Promise.resolve(null)
          : buildAutoCourse(region).catch(() => null);

      const [dbCourse, autoCourse] = await Promise.all([dbPromise, autoPromise]);

      const candidates = [];
      if (dbCourse) candidates.push(dbCourse);
      if (autoCourse) candidates.push(autoCourse);

      if (candidates.length === 0) {
        setError("이 지역에서 추천할 코스를 찾지 못했어요.");
        return;
      }

      const picked = candidates[Math.floor(Math.random() * candidates.length)];
      setResult(picked);
    } catch (err) {
      console.error(err);
      setError(err.message || "요청 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ result 생기면: "AI처럼" 대표 이미지 만들기
  useEffect(() => {
    if (!result) return;

    let cancelled = false;

    (async () => {
      try {
        setHeroLoading(true);

        // 0) 이미 서버에서 heroImage가 내려온 구조면 바로 사용(미래 대비)
        if (result.heroImage) {
          if (!cancelled) setHeroUrl(result.heroImage);
          return;
        }

        // 1) 1단계 장소명 기반(=AI가 하는 방식에 가장 가까움)
        const firstName = getStepPlaceName(result.steps?.[0]) || "";
        const regionLabel =
          result.source === "auto"
            ? getRegionLabelById(result.regionId)
            : getRegionLabelById(result.city) || getRegionLabelById(result.regionId);

        // ✅ “장소명 + 지역” 우선 → 실패 시 “지역 + 코스” (절대 지역만 단독으로 크게 검색하지 않기)
        const q1 = firstName ? `${firstName} ${regionLabel || "서울"}` : "";
        const q2 = `${regionLabel || "서울"} ${result.title} 데이트`;

        const queries = [q1, q2].filter(Boolean);

        for (const q of queries) {
          const kakaoImg = await fetchKakaoHero(q);
          if (cancelled) return;
          if (kakaoImg) {
            setHeroUrl(kakaoImg);
            return;
          }
        }

        // 2) 그래도 없으면 Unsplash fallback
        const keyword = `${regionLabel || "서울"} ${result.title} 데이트`;
        const u = await fetchUnsplashHero(keyword);
        if (!cancelled) setHeroUrl(u || null);
      } catch (e) {
        console.error("Random hero load error:", e);
        if (!cancelled) setHeroUrl(null);
      } finally {
        if (!cancelled) setHeroLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [result]);

  /* ---------- 파생 값 ---------- */
  let resultRegionLabel = "";
  let steps = [];
  let firstStepName = "";

  if (result && Array.isArray(result.steps)) {
    steps = result.steps;
    firstStepName = getStepPlaceName(steps[0]);

    if (result.source === "auto") {
      resultRegionLabel = getRegionLabelById(result.regionId);
    } else {
      resultRegionLabel =
        getRegionLabelById(result.city) || getRegionLabelById(result.regionId) || "";
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

  return (
    <div className="random-page">
      <header className="random-header">
        <h2 className="section-title">랜덤 데이트 코스</h2>
        <p>
          서울에서 <strong>어디로</strong> 갈까요? 지역을 고르고 버튼을 누르면,
          <br />
          현재 등록된 코스와 자동 생성 코스 중에서 하나를 랜덤으로 뽑아드려요.
        </p>
      </header>

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
              상단에서 지역을 고른 뒤, 아래 버튼을 누르면 현재 등록된 코스와 자동 생성 코스 중
              하나를 뽑아드려요.
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
              className={`region-btn ${selectedRegionId === region.id ? "selected" : ""}`}
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
      </section>

      <section className="random-result-section">
        <h3>이번에 뽑힌 코스</h3>

        {loading && <p className="text-muted">코스를 뽑는 중입니다...</p>}
        {error && <p className="random-error">{error}</p>}

        {!loading && !error && !result && (
          <p className="random-hint">
            위에서 지역을 선택하고 <strong>“이 지역에서 코스 뽑기 🎲”</strong> 버튼을 눌러보세요.
          </p>
        )}

        {result && (
          <div className="random-result-card">
            <div className="random-result-image-wrap">
              <div className="random-result-image-bg" />

              {heroLoading ? (
                <div className="random-result-image-skeleton">이미지 불러오는 중...</div>
              ) : heroUrl ? (
                <img
                  src={heroUrl}
                  alt="랜덤 코스 대표 이미지"
                  className="random-result-image"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div className="random-result-image-skeleton">이미지 준비중…</div>
              )}

              <div className="random-result-badges">
                <span className="random-result-badge-type">
                  {result.source === "auto" ? "자동 생성 코스" : "유저가 만든 코스"}
                </span>
                <span className="random-result-badge-steps">{steps.length}단계 코스</span>
              </div>
            </div>

            <div className="random-result-body">
              <h4 className="random-result-title">{result.title}</h4>

              <p className="random-result-meta">
                📍 {resultRegionLabel || "지역 정보 없음"} · {steps.length}단계 코스 ·{" "}
                {result.source === "auto" ? "자동 생성 코스" : "유저가 만든 코스"}
              </p>

              {firstStepName && (
                <p className="random-result-firststep">
                  <span>1단계</span>
                  {firstStepName}
                </p>
              )}

              <div className="random-step-list">
                {steps.map((step, index) => {
                  const stepNo = index + 1;
                  const name = getStepPlaceName(step);
                  const label = step.label || step.type || (stepNo === 1 ? "시작" : "코스");

                  return (
                    <div key={index} className="random-step-item">
                      <div className="random-step-index">{stepNo}</div>
                      <div className="random-step-info">
                        <div className="random-step-name">{name || "장소 정보 없음"}</div>
                        <div className="random-step-label">{label}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="random-result-actions">
                <button
                  type="button"
                  className={
                    "btn btn-primary random-reroll-btn" +
                    (loading ? " random-reroll-btn-loading" : "")
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

                <button type="button" className="btn btn-secondary btn-sm" onClick={handleCopyUrl}>
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