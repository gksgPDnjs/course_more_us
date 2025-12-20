// controllers/aiController.js
import openai from "../config/openaiClient.js";

/**
 * -----------------------------
 * Kakao helpers (server-side)
 * -----------------------------
 */
const KAKAO_KEY = process.env.KAKAO_REST_KEY;
const KAKAO_KEYWORD_URL = "https://dapi.kakao.com/v2/local/search/keyword.json";
const KAKAO_IMAGE_URL = "https://dapi.kakao.com/v2/search/image";

function assertEnv() {
  if (!KAKAO_KEY) throw new Error("KAKAO_REST_KEY가 설정되어 있지 않습니다.");
}

/** 1) 키워드(장소) 검색 */
async function kakaoKeywordSearch({ query, x, y, radius = 2000, size = 15 }) {
  assertEnv();
  const params = new URLSearchParams({ query, size: String(size) });

  if (x && y) {
    params.append("x", String(x));
    params.append("y", String(y));
    params.append("radius", String(radius));
  }

  const url = `${KAKAO_KEYWORD_URL}?${params.toString()}`;
  const res = await fetch(url, {
    headers: { Authorization: `KakaoAK ${KAKAO_KEY}` },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("Kakao keyword search failed:", res.status, data);
    return { documents: [] };
  }
  return data;
}

/** 2) 이미지 검색 (장소 이름으로 1장만) */
async function kakaoImageSearch(query) {
  try {
    assertEnv();
    const q = String(query || "").trim();
    if (!q) return null;

    const params = new URLSearchParams({
      query: q,
      sort: "accuracy",
      page: "1",
      size: "1",
    });

    const url = `${KAKAO_IMAGE_URL}?${params.toString()}`;
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${KAKAO_KEY}` },
    });

    if (!res.ok) return null;

    const data = await res.json().catch(() => ({}));
    return data?.documents?.[0]?.image_url || null;
  } catch (err) {
    console.error("kakaoImageSearch error:", err);
    return null;
  }
}

/** ✅ "서울" 결과만 남기기 (대구/부산 튀는거 방지) */
function filterSeoul(docs) {
  if (!Array.isArray(docs)) return [];
  return docs.filter((d) => {
    const addr = `${d?.road_address_name || ""} ${d?.address_name || ""}`;
    // "서울"이 포함된 주소만 통과
    return addr.includes("서울");
  });
}

/** 검색 결과 중 "그럴듯한" 장소 하나 고르기 */
function pickBestPlace(docs, usedPlaceIds = new Set()) {
  if (!Array.isArray(docs) || docs.length === 0) return null;

  const filtered = docs.filter((d) => d?.id && !usedPlaceIds.has(String(d.id)));
  const candidates = filtered.length ? filtered : docs;

  const BAD_NAME =
    /(거리|역|공원|한강|주차장|출구|광장|사거리|교차로|입구|정류장|환승센터)$/;

  const refined = candidates.filter((d) => !BAD_NAME.test(d.place_name || ""));
  const list = refined.length ? refined : candidates;

  list.sort((a, b) => {
    const da = Number(a.distance ?? 1e18);
    const db = Number(b.distance ?? 1e18);
    return da - db;
  });

  return list[0] || null;
}

function normalizePlace(doc) {
  if (!doc) return null;
  return {
    id: doc.id,
    place_name: doc.place_name,
    x: doc.x,
    y: doc.y,
    address_name: doc.address_name,
    road_address_name: doc.road_address_name,
    place_url: doc.place_url,
    phone: doc.phone,
    category_name: doc.category_name,
    distance: doc.distance,
    imageUrl: null,
  };
}

/** area로 중심점(anchor) 잡기 */
async function resolveAreaAnchor(area) {
  const candidates = [`${area}역`, `${area}입구`, `${area}거리`, `${area}`];

  for (const q of candidates) {
    const data = await kakaoKeywordSearch({ query: q, size: 5 });
    const seoulDocs = filterSeoul(data?.documents || []);
    const first = seoulDocs?.[0] || data?.documents?.[0]; // 서울 없으면 fallback
    if (first?.x && first?.y) {
      return { x: first.x, y: first.y, name: first.place_name || q };
    }
  }
  return null;
}

/** Step 하나에 대해 "실존 장소"를 찾아서 place로 확정 */
async function findPlaceForStep({ step, regionHint, anchor, radius, usedPlaceIds }) {
  const baseQueries = [];
  if (step?.kakaoQuery) baseQueries.push(step.kakaoQuery);

  const role = step?.role || "";
  const area = step?.area || regionHint || "";

  if (area && role) baseQueries.push(`${area} ${role}`);
  if (area) baseQueries.push(`${area} ${step?.kakaoQuery || role}`.trim());

  const roleBoost = (() => {
    if (/카페/.test(role)) return "감성 카페";
    if (/식사|맛집/.test(role)) return "맛집";
    if (/술|와인|바/.test(role)) return "와인바";
    if (/체험|활동/.test(role)) return "실내 체험";
    if (/산책/.test(role)) return "산책로";
    return "";
  })();
  if (area && roleBoost) baseQueries.push(`${area} ${roleBoost}`);

  const queries = [...new Set(baseQueries.filter(Boolean))];

  const radiusTrials = [radius, Math.min(radius * 2, 10000), 10000];
  const stepAreaAnchor = step?.area ? await resolveAreaAnchor(step.area) : null;
  const anchorTrials = [anchor, stepAreaAnchor].filter(Boolean);

  for (const anc of anchorTrials) {
    for (const r of radiusTrials) {
      for (const q of queries) {
        const data = await kakaoKeywordSearch({
          query: q,
          x: anc?.x,
          y: anc?.y,
          radius: r,
          size: 15,
        });

        // ✅ 서울 필터 우선 적용
        const seoulDocs = filterSeoul(data?.documents || []);
        const best = pickBestPlace(seoulDocs.length ? seoulDocs : data?.documents, usedPlaceIds);

        if (best) {
          const place = normalizePlace(best);
          usedPlaceIds.add(String(place.id));
          return { place, usedAnchor: anc, usedRadius: r, usedQuery: q };
        }
      }
    }
  }

  return { place: null, usedAnchor: anchor, usedRadius: radius, usedQuery: queries[0] || "" };
}

/** ✅ OpenAI 응답에서 JSON만 안전하게 뽑기 */
function safeParseJson(rawText) {
  const raw = String(rawText || "").trim();

  // 1) 코드블록 제거
  const noFence = raw.replace(/```json|```/gi, "").trim();

  // 2) 첫 { 부터 마지막 } 까지 잘라서 파싱 시도
  const start = noFence.indexOf("{");
  const end = noFence.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI 응답에서 JSON 객체를 찾지 못했습니다.");
  }

  const jsonOnly = noFence.slice(start, end + 1);
  return JSON.parse(jsonOnly);
}

/**
 * -----------------------------
 * Test Route
 * -----------------------------
 */
export const testAi = async (req, res) => {
  try {
    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      input: "한국어로 데이트 코스 추천 한 줄!",
    });

    const text = response.output[0]?.content?.[0]?.text?.value || response.output_text;
    res.json({ message: "성공!", aiText: text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * -----------------------------
 * ✅ Main Recommendation Logic
 * -----------------------------
 */
export const recommendCourse = async (req, res) => {
  try {
    // ✅ req.body undefined 방어 (핵심!)
    const body = req.body || {};
    const { userContext } = body;

    if (!userContext) {
      return res.status(400).json({
        message: "userContext가 필요합니다.",
        hint: "프론트/포스트맨에서 Content-Type: application/json + { userContext: {...} } 형태로 보내야 합니다.",
      });
    }

    const move = String(userContext?.car || "").toLowerCase();
    const isWalk = /도보|걷|walk/.test(move);
    const isTransit = /대중교통|지하철|버스|transit/.test(move);
    const radiusBase = isWalk ? 2000 : isTransit ? 5000 : 7000;

    const systemPrompt = `
너는 서울 데이트 코스를 기획하는 전문가야.
유저 상황을 보고 "총 3단계" 데이트 코스를 설계해줘.

[유저 정보 해석 기준]
- with(동행): 연인 / 친구 / 혼자 / 동료
- mood(기분): 설렘 / 편안 / 활동적 / 힐링 / 분위기
- weather(날씨): 맑음 / 흐림 / 비 / 눈
- budget(예산): 1인 기준
- transport(이동수단): 도보 / 대중교통 / 자차

[설계 규칙]
- 동행 유형에 따라 분위기를 조절할 것
  - 연인: 감성, 분위기
  - 친구: 캐주얼, 활동적
  - 혼자: 편안, 몰입
  - 동료: 무난, 대화 가능
- 비/눈이면 실내 위주
- 도보면 가까운 동선
- 예산을 초과하지 않도록 장소 성격 조절

제약:
- 지역은 반드시 "서울" 안에서만 구성해.
- 코스는 동선이 현실적이어야 한다.
- kakaoQuery는 카카오맵에서 실제로 검색될 확률이 높은 키워드로.
- area는 "역/동" 기준으로 명확히.

반드시 아래 JSON 형식으로만 답해.
{
  "title": "...",
  "summary": "...",
  "steps": [
    { "order": 1, "role": "...", "area": "...", "kakaoQuery": "...", "description": "..." },
    { "order": 2, "role": "...", "area": "...", "kakaoQuery": "...", "description": "..." },
    { "order": 3, "role": "...", "area": "...", "kakaoQuery": "...", "description": "..." }
  ]
}
`.trim();

    const userPrompt = `
[유저 상황]
${JSON.stringify(userContext, null, 2)}

JSON만 응답해.
`.trim();

    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_output_tokens: 700,
    });

    const raw =
      response.output?.[0]?.content?.[0]?.text?.value ||
      response.output_text ||
      "";

    let aiData;
    try {
      aiData = safeParseJson(raw);
    } catch (e) {
      console.error("JSON 파싱 실패:", raw);
      return res.status(500).json({
        message: "AI 응답을 JSON으로 파싱하는 데 실패했어요.",
        raw,
      });
    }

    const steps = Array.isArray(aiData?.steps) ? aiData.steps : [];
    if (!steps.length) {
      return res.status(500).json({ message: "AI steps 생성 실패", raw });
    }

    const regionHint =
      userContext?.region || userContext?.city || userContext?.area || "";

    const firstArea = steps[0]?.area || regionHint || "강남역";
    let anchor = await resolveAreaAnchor(firstArea);
    if (!anchor) anchor = await resolveAreaAnchor("강남역");

    const usedPlaceIds = new Set();
    const verifiedSteps = [];
    let heroImage = null;

    let currentAnchor = anchor;

    for (const step of steps) {
      const found = await findPlaceForStep({
        step,
        regionHint: regionHint || firstArea,
        anchor: currentAnchor,
        radius: radiusBase,
        usedPlaceIds,
      });

      const place = found.place;

      if (place) {
        // 이미지 붙이기 (실패해도 null이면 그냥 넘어감)
        const imgUrl = await kakaoImageSearch(place.place_name);
        place.imageUrl = imgUrl;
        if (!heroImage && imgUrl) heroImage = imgUrl;
      }

      verifiedSteps.push({
        ...step,
        _debug: {
          usedQuery: found.usedQuery,
          usedRadius: found.usedRadius,
          anchorName: found.usedAnchor?.name || null,
        },
        place,
      });

      if (place?.x && place?.y) {
        currentAnchor = { x: place.x, y: place.y, name: place.place_name };
      }
    }

    const successCount = verifiedSteps.filter((s) => s.place).length;
    if (successCount < 2) {
      return res.status(502).json({
        message: "장소 검색 실패가 많아 코스 생성에 실패했습니다. 다시 시도해주세요.",
        aiData,
      });
    }

    return res.json({
      title: aiData.title,
      summary: aiData.summary,
      regionId: regionHint,
      heroImage,
      steps: verifiedSteps,
    });
  } catch (err) {
    console.error("recommendCourse 에러:", err);
    return res.status(500).json({
      message: "AI 맞춤 코스 생성 중 오류가 발생했어요.",
      error: err.message,
    });
  }
};