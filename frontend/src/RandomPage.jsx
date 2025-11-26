// src/RandomPage.jsx
import { useState } from "react";
import { SEOUL_REGIONS } from "./data/regions";

const API_BASE_URL = "http://localhost:4000";

function RandomPage() {
  // 선택된 서울 지역 id (기본값: all = 서울 전체)
  const [selectedRegionId, setSelectedRegionId] = useState("all");

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 현재 선택된 region 객체 (label 표시용)
  const selectedRegion =
    SEOUL_REGIONS.find((r) => r.id === selectedRegionId) || SEOUL_REGIONS[0];

  // 랜덤 코스 가져오기
  const fetchRandom = async () => {
    setError("");
    setResult(null);
    setLoading(true);

    try {
      const regionId = selectedRegion.id;

      // all 이면 쿼리 없이, 아니면 ?city= 붙여서 요청
      const query =
        regionId && regionId !== "all"
          ? `?city=${encodeURIComponent(regionId)}`
          : "";

      const res = await fetch(`${API_BASE_URL}/api/random${query}`);
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || "랜덤 추천 실패");
      }

      if (!data) {
        setError("해당 지역의 코스가 없습니다.");
      } else {
        setResult(data);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "요청 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2 className="section-title">랜덤 데이트 코스</h2>

      {/* 지역 선택 영역 */}
      <div style={{ marginBottom: 16 }}>
        <p style={{ marginBottom: 8, fontSize: 14 }}>
          서울에서 <strong>어디로</strong> 갈까요?
        </p>

        {/* 🔥 지역 칩 버튼들 */}
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
              onClick={() => setSelectedRegionId(region.id)}
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
          뽑아요.
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
        <div className="card" style={{ padding: 16, marginTop: 8 }}>
          <h3 style={{ marginBottom: 4 }}>{result.title}</h3>
          <p style={{ marginBottom: 4 }}>
            📍 {selectedRegion?.label || "선택된 지역"}
          </p>

          {result.steps?.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <strong>첫 단계:</strong> {result.steps[0].place}
            </div>
          )}

          <a
            href={`/courses/${result._id}`}
            className="btn btn-secondary"
            style={{ marginTop: 12, display: "inline-block" }}
          >
            상세 보기
          </a>
        </div>
      )}
    </div>
  );
}

export default RandomPage;