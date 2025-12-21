// src/RandomPage.jsx
import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { SEOUL_REGIONS } from "./data/regions";
import { API_BASE_URL } from "./config";
import { fetchUnsplashHero } from "./api/unsplash";

/* ------------------ 공통 유틸 ------------------ */

function getRegionLabelById(cityId) {
  if (!cityId) return "";
  const region = SEOUL_REGIONS.find((r) => r.id === cityId);
  return region ? region.label : cityId;
}

// ✅ 업로드(/uploads/...)만 백엔드 오리진이 필요함
function resolveImageUrl(raw) {
  if (!raw) return null;
  if (/^https?:\/\//.test(raw)) return raw;
  if (raw.startsWith("/uploads/")) return `${API_BASE_URL}${raw}`;
  return raw;
}

function getStepPlaceName(step) {
  if (!step) return "";
  const placeObj = step.place || step;
  return placeObj.place_name || placeObj.name || step.place || "";
}

/**
 * ✅ AutoCourseDetail과 동일한 "대표 이미지 우선순위"를 랜덤 카드에도 적용
 * 0) course.heroImage (백엔드가 내려준 대표)
 * 1) steps[0].place.imageUrl or steps[0].imageUrl
 * (리스트에서는 여기까지만 먼저 잡고)
 * 2) 없으면 Kakao image proxy fallback
 * 3) 그마저도 없으면 Unsplash fallback
 */
function resolveAutoHeroLikeDetail(course) {
  if (!course) return null;

  // 0) course.heroImage
  const h0 = resolveImageUrl(course.heroImage);
  if (h0) return h0;

  // 1) step0 imageUrl
  const step0 = course.steps?.[0];
  const step0Img = resolveImageUrl(step0?.place?.imageUrl || step0?.imageUrl);
  if (step0Img) return step0Img;

  // DB에서 썸네일 필드가 다른 이름으로 내려오는 경우도 대비
  const alt =
    resolveImageUrl(
      course.heroImageUrl ||
        course.imageUrl ||
        course.thumbnailUrl ||
        course.heroUrl
    ) || null;
  if (alt) return alt;

  return null;
}

/** ✅ Kakao keyword search via backend proxy (중요: /api로 호출!) */
async function callKakaoSearch({ keyword, x, y, radius = 5000, size = 15 }) {
  const params = new URLSearchParams({ query: keyword, size: String(size) });
  if (x && y) {
    params.append("x", String(x));
    params.append("y", String(y));
    params.append("radius", String(radius));
  }

  // ✅ 로컬: Vite proxy / 배포: Vercel rewrite
  const res = await fetch(`/api/kakao/search?${params.toString()}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return [];
  return data.documents || [];
}

/** ✅ Kakao image via backend proxy (중요: /api로 호출!) */
async function fetchKakaoHero(query) {
  const q = String(query || "").trim();
  if (!q) return null;

  const params = new URLSearchParams({ query: q });

  // ✅ 로컬: Vite proxy / 배포: Vercel rewrite
  const res = await fetch(`/api/kakao/image?${params.toString()}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return null;
  return data?.imageUrl || null;
}

function pickRandomFromTop(list, topN = 5) {
  if (!Array.isArray(list) || list.length === 0) return null;
  const limit = Math.min(list.length, topN);
  return list[Math.floor(Math.random() * limit)];
}

function filterDocs(docs, keyword) {
  const blacklistRegex = /(스터디|독서실|학원|공부|독학|고시원)/i;
  let filtered = (docs || []).filter(
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

  return filtered.length ? filtered : docs;
}

/** ✅ auto 코스 생성도 프록시 기반으로 */
async function searchByCategory(region, keyword) {
  if (!region?.center) return null;
  const { x, y } = region.center;

  const docs = await callKakaoSearch({
    keyword,
    x,
    y,
    radius: 5000,
    size: 15,
  }).catch(() => []);
  if (!docs.length) return null;

  const filtered = filterDocs(docs, keyword);
  return pickRandomFromTop(filtered, 5);
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

  if (!steps.length) return null;

  return {
    id: `auto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: `${region.label} 자동 데이트 코스`,
    regionId: region.id,
    steps,
    source: "auto",
  };
}

/* ------------------ 메인 컴포넌트 ------------------ */

function RandomPage() {
  const [selectedRegionId, setSelectedRegionId] = useState("all");

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // hero
  const [heroUrl, setHeroUrl] = useState(null);
  const [heroLoading, setHeroLoading] = useState(false);

  const selectedRegion = useMemo(
    () => SEOUL_REGIONS.find((r) => r.id === selectedRegionId) || SEOUL_REGIONS[0],
    [selectedRegionId]
  );

  const fetchRandom = async () => {
    setError("");
    setResult(null);
    setHeroUrl(null);
    setLoading(true);

    try {
      const regionId = selectedRegion?.id || "all";
      const query =
        regionId && regionId !== "all"
          ? `?city=${encodeURIComponent(regionId)}`
          : "";

      // ✅ DB 코스: /api로 호출해야 로컬/배포 모두 안정적
      const dbPromise = fetch(`/api/random${query}`)
        .then(async (res) => {
          const data = await res.json().catch(() => null);
          if (!res.ok || !data) return null;
          return { ...data, source: "user" };
        })
        .catch(() => null);

      // ✅ auto 코스(프록시 기반)
      const autoPromise =
        regionId === "all" || !selectedRegion?.center
          ? Promise.resolve(null)
          : buildAutoCourse(selectedRegion).catch(() => null);

      const [dbCourse, autoCourse] = await Promise.all([dbPromise, autoPromise]);

      const candidates = [];
      if (dbCourse) candidates.push(dbCourse);
      if (autoCourse) candidates.push(autoCourse);

      if (!candidates.length) {
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

  // ✅ result 생기면 hero 채우기 (AutoCourseDetail과 동일한 우선순위)
  useEffect(() => {
    if (!result) return;

    let cancelled = false;

    (async () => {
      try {
        setHeroLoading(true);

        // ✅ 0~1순위: AutoCourseDetail과 동일하게 "즉시" 잡아보기
        const direct = resolveAutoHeroLikeDetail(result);
        if (direct) {
          if (!cancelled) setHeroUrl(direct);
          return;
        }

        // ✅ 2순위: Kakao 이미지 검색 (프록시)
        const firstName = getStepPlaceName(result.steps?.[0]) || "";
        const regionLabel =
          result.source === "auto"
            ? getRegionLabelById(result.regionId)
            : getRegionLabelById(result.city) ||
              getRegionLabelById(result.regionId);

        const q1 = firstName ? `${firstName} ${regionLabel || "서울"}` : "";
        const q2 = `${regionLabel || "서울"} 데이트 코스`;

        const tryQueries = [q1, q2].filter(Boolean);

        for (const q of tryQueries) {
          const kakaoImg = await fetchKakaoHero(q);
          if (cancelled) return;
          if (kakaoImg) {
            setHeroUrl(kakaoImg);
            return;
          }
        }

        // ✅ 3순위: Unsplash fallback
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

  const steps = Array.isArray(result?.steps) ? result.steps : [];
  const firstStepName = getStepPlaceName(steps[0]);

  const resultRegionLabel = useMemo(() => {
    if (!result) return "";
    if (result.source === "auto") return getRegionLabelById(result.regionId);
    return (
      getRegionLabelById(result.city) ||
      getRegionLabelById(result.regionId) ||
      ""
    );
  }, [result]);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert("현재 페이지 주소를 복사했어요!");
    } catch {
      alert("주소 복사 실패 ㅠㅠ");
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          랜덤 데이트 코스
        </h2>
        <p className="text-sm font-semibold text-slate-500">
          지역을 고르고 버튼을 누르면{" "}
          <span className="text-slate-900">유저 코스 / 자동 코스</span> 중
          하나를 랜덤으로 뽑아줘요.
        </p>
      </header>

      {/* 지역 선택 카드 */}
      <section className="rounded-3xl border border-slate-200 bg-white/60 p-5 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-500">어디서 시작해볼까요?</p>
            <h3 className="text-base font-semibold text-slate-900">
              {selectedRegionId === "all"
                ? "서울 전체에서 랜덤으로 뽑기"
                : `${selectedRegion?.label}에서 랜덤으로 뽑기`}
            </h3>
            <p className="text-xs font-semibold text-slate-500">
              지역을 고른 뒤 버튼을 누르면 랜덤으로 추천해요.
            </p>
          </div>

          <button
            type="button"
            className="rounded-full border border-violet-200 bg-violet-600 px-5 py-2 text-sm font-extrabold text-white shadow-sm hover:bg-violet-700 disabled:opacity-60"
            onClick={fetchRandom}
            disabled={loading}
          >
            {loading ? "코스 뽑는 중..." : "이 지역에서 코스 뽑기 🎲"}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {SEOUL_REGIONS.map((region) => (
            <button
              key={region.id}
              type="button"
              className={[
                "rounded-full px-4 py-2 text-sm font-medium transition border shadow-sm",
                selectedRegionId === region.id
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white/70 text-slate-700 border-slate-200 hover:bg-white hover:border-slate-300",
              ].join(" ")}
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

      {/* 결과 */}
      <section className="space-y-3">
        <h3 className="text-base font-semibold text-slate-900">이번에 뽑힌 코스</h3>

        {loading && (
          <p className="text-sm font-semibold text-slate-500">코스를 뽑는 중...</p>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && !result && (
          <div className="rounded-3xl border border-slate-200 bg-white/60 p-6 text-sm font-semibold text-slate-600">
            위에서 지역을 선택하고 <strong>“이 지역에서 코스 뽑기 🎲”</strong> 버튼을 눌러보세요.
          </div>
        )}

        {result && (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white/70 shadow-sm">
            {/* 이미지 */}
            <div className="relative h-52 w-full bg-slate-100">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-200/40 via-fuchsia-200/20 to-sky-200/20" />

              {heroLoading ? (
                <div className="relative flex h-full items-center justify-center text-sm font-semibold text-slate-600">
                  이미지 불러오는 중...
                </div>
              ) : heroUrl ? (
                <img
                  src={heroUrl}
                  alt="랜덤 코스 대표 이미지"
                  className="relative h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div className="relative flex h-full items-center justify-center text-sm font-semibold text-slate-600">
                  이미지 준비중…
                </div>
              )}

              <div className="absolute left-4 top-4 flex gap-2">
                <span className="rounded-full border border-white/60 bg-slate-900/80 px-3 py-1 text-[11px] font-extrabold text-white">
                  {result.source === "auto" ? "자동 생성" : "유저 코스"}
                </span>
                <span className="rounded-full border border-white/60 bg-white/80 px-3 py-1 text-[11px] font-extrabold text-slate-800">
                  {steps.length}단계
                </span>
              </div>
            </div>

            {/* 내용 */}
            <div className="space-y-3 p-5">
              <div className="space-y-1">
                <h4 className="text-lg font-semibold tracking-tight text-slate-900">
                  {result.title}
                </h4>
                <p className="text-xs font-semibold text-slate-500">
                  📍 {resultRegionLabel || "지역 정보 없음"} · {steps.length}단계 ·{" "}
                  {result.source === "auto" ? "자동 생성 코스" : "유저가 만든 코스"}
                </p>
              </div>

              {firstStepName && (
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-xs font-extrabold text-slate-500">1단계</p>
                  <p className="text-sm font-semibold text-slate-900">{firstStepName}</p>
                </div>
              )}

              <div className="grid gap-2 sm:grid-cols-3">
                {steps.map((step, idx) => {
                  const name = getStepPlaceName(step);
                  const label = step.label || step.type || "코스";
                  return (
                    <div
                      key={idx}
                      className="rounded-2xl border border-slate-200 bg-white p-3"
                    >
                      <div className="text-xs font-extrabold text-slate-500">
                        {idx + 1}단계 · {label}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">
                        {name || "장소 정보 없음"}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  className="rounded-full border border-violet-200 bg-violet-600 px-5 py-2 text-sm font-extrabold text-white shadow-sm hover:bg-violet-700 disabled:opacity-60"
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
                  className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-extrabold text-slate-800 shadow-sm hover:border-slate-300"
                >
                  상세 페이지 보기
                </Link>

                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-extrabold text-slate-700 shadow-sm hover:border-slate-300"
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