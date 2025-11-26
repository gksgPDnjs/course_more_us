// src/RecommendPage.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SEOUL_REGIONS } from "./data/regions";

const API_BASE_URL = "http://localhost:4000";

function getRegionLabel(cityId) {
  if (!cityId) return "";
  const region = SEOUL_REGIONS.find((r) => r.id === cityId);
  return region ? region.label : cityId;
}

function RecommendPage() {
  const [selectedRegionId, setSelectedRegionId] = useState("all");
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 전체 코스 불러오기 (한 번)
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetch(`${API_BASE_URL}/api/courses`);
        const data = await res.json().catch(() => []);

        if (!res.ok) {
          throw new Error(data?.message || "코스 목록 조회 실패");
        }

        setCourses(data);
      } catch (err) {
        console.error(err);
        setError(err.message || "코스를 불러오는 데 실패했어요.");
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  // 선택된 지역에 맞게 필터링
  const filteredCourses = courses.filter((course) => {
    if (selectedRegionId === "all") return true;
    return course.city === selectedRegionId;
  });

  return (
    <div className="card">
      <h2 className="section-title">지역별 데이트 코스 추천</h2>

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
          * <strong>서울 전체</strong>를 선택하면 등록된 모든 코스를 볼 수 있어요.
        </p>
      </div>

      {/* 상태 표시 */}
      {loading && <p>불러오는 중...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && !error && filteredCourses.length === 0 && (
        <p style={{ marginTop: 12 }}>이 지역에는 아직 등록된 코스가 없어요.</p>
      )}

      {/* 추천 코스 리스트 */}
      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
        {filteredCourses.map((course) => (
          <div key={course._id} className="card" style={{ padding: 16 }}>
            <h3 style={{ fontSize: 18, marginBottom: 6 }}>{course.title}</h3>

            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>
              <span className="badge" style={{ marginRight: 6 }}>
                {getRegionLabel(course.city)}
              </span>
              {Array.isArray(course.steps) && course.steps.length > 0 && (
                <span>총 {course.steps.length}단계 코스</span>
              )}
            </div>

            {/* 코스 요약: 장소들을 이어서 한 줄로 보여주기 */}
            {Array.isArray(course.steps) && course.steps.length > 0 && (
              <p style={{ fontSize: 14, marginBottom: 8 }}>
                {course.steps
                  .map((step) => step.place)
                  .filter(Boolean)
                  .join(" → ")}
              </p>
            )}

            <Link
              to={`/courses/${course._id}`}
              className="btn btn-secondary btn-sm"
              style={{ marginTop: 4 }}
            >
              상세 보기
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RecommendPage;