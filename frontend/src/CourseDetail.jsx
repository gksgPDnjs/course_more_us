// src/CourseDetail.jsx
import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { SEOUL_REGIONS } from "./data/regions";

const API_BASE_URL = "http://localhost:4000";

// city(지역 id) -> 라벨 변환
function getRegionLabel(cityId) {
  if (!cityId) return "";
  const region = SEOUL_REGIONS.find((r) => r.id === cityId);
  return region ? region.label : cityId;
}

function CourseDetail() {
  const { id } = useParams(); // URL 파라미터 (:id)
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  // ❤️ 찜 상태
  const [liked, setLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);

  // 🔐 로그인한 사용자 + 토큰
  const savedUser = localStorage.getItem("currentUser");
  const currentUser = savedUser ? JSON.parse(savedUser) : null;
  const token = localStorage.getItem("token");

  // id 또는 _id 둘 다 대비
  const currentUserId = currentUser && (currentUser.id || currentUser._id);

  // 내가 작성한 코스인지 여부
  const isOwner =
    !!currentUserId && course && currentUserId === String(course.owner);

  // ❤️ 이 코스가 내가 찜한 코스인지 확인
  const fetchLikedState = async (courseId) => {
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/courses/liked/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) return;

      const list = await res.json().catch(() => []);
      const exists =
        Array.isArray(list) &&
        list.some((c) => String(c._id) === String(courseId));

      setLiked(exists);
    } catch (err) {
      console.error("fetchLikedState error:", err);
    }
  };

  // ❤️ 찜 토글
  const handleToggleLike = async () => {
    if (!token) {
      alert("로그인 후 찜할 수 있어요.");
      return;
    }
    if (!course || !course._id) return;

    try {
      setLikeLoading(true);

      const res = await fetch(
        `${API_BASE_URL}/api/courses/${course._id}/like`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "찜 처리 실패");
      }

      // 서버에서 돌려준 liked 플래그로 상태 업데이트
      setLiked(data.liked);
    } catch (err) {
      console.error("toggle like error:", err);
      alert(err.message || "찜 처리 중 오류가 발생했어요.");
    } finally {
      setLikeLoading(false);
    }
  };

  // 👀 최근 본 코스 기록
  const recordRecentView = async (courseId) => {
    if (!token) return;

    try {
      await fetch(`${API_BASE_URL}/api/courses/${courseId}/view`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error("recordRecentView error:", err);
    }
  };

  // 특정 코스 불러오기
  const fetchCourse = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/courses/${id}`);
      if (!res.ok) throw new Error("Failed to fetch course");
      const data = await res.json();

      setCourse(data);

      // 코스가 로딩되면 좋아요 상태 + 최근 본 코스 기록
      const courseId = data._id || id;
      await Promise.all([fetchLikedState(courseId), recordRecentView(courseId)]);
    } catch (error) {
      console.error("Error fetching course:", error);
    } finally {
      setLoading(false);
    }
  };

  // 삭제 기능
  const handleDelete = async () => {
    if (!token) {
      alert("로그인이 필요합니다.");
      return;
    }

    if (!window.confirm("정말 삭제할까요?")) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/courses/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.message || "삭제 실패 😢");
        return;
      }

      alert("삭제되었습니다.");
      window.location.href = "/"; // 목록으로 이동
    } catch (error) {
      console.error("Delete error:", error);
      alert("삭제 실패 😢");
    }
  };

  useEffect(() => {
    fetchCourse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // 로딩 중
  if (loading) {
    return (
      <div className="app">
        <p className="text-muted">불러오는 중...</p>
      </div>
    );
  }

  // 해당 코스 없음
  if (!course) {
    return (
      <div className="app">
        <p>코스를 찾을 수 없습니다.</p>
        <Link to="/" className="btn btn-secondary">
          ← 목록으로
        </Link>
      </div>
    );
  }

  const regionLabel = getRegionLabel(course.city || course.location);
  const hasSteps = Array.isArray(course.steps) && course.steps.length > 0;

  // 👀 상세 페이지 화면 (타임라인 UI)
  return (
    <div className="app">
      <Link to="/" className="btn btn-secondary" style={{ marginBottom: 12 }}>
        ← 목록으로
      </Link>

      <h1 className="course-title" style={{ fontSize: 24 }}>
        {course.title}
      </h1>

      <div
        style={{
          marginTop: 4,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <p style={{ color: "#666", margin: 0 }}>
          {regionLabel && <>📍 {regionLabel}</>}{" "}
          {hasSteps && <>· 총 {course.steps.length}단계 코스</>}
        </p>

        {token && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleToggleLike}
            disabled={likeLoading}
          >
            {liked ? "💜 찜 취소" : "🤍 찜하기"}
          </button>
        )}
      </div>

      {/* steps가 있으면 타임라인, 없으면 기존 설명 표시 (옛날 코스 호환용) */}
      {hasSteps ? (
        <>
          <hr style={{ margin: "20px 0" }} />

          <h2 className="section-title" style={{ marginBottom: 16 }}>
            데이트 코스 타임라인
          </h2>

          <div className="timeline">
            {/* 세로 라인 */}
            <div className="timeline-line" />

            {/* 단계별 코스 카드 */}
            {course.steps.map((step, index) => (
              <div key={index} className="timeline-item">
                {/* 동그란 점 + 단계 번호 */}
                <div className="timeline-dot-wrapper">
                  <div className="timeline-dot" />
                  <span className="timeline-step-index">{index + 1}단계</span>
                </div>

                {/* 내용 카드 */}
                <div className="timeline-card">
                  <h3 className="timeline-title">
                    {step.place || "장소 미입력"}
                  </h3>

                  <div className="timeline-meta">
                    {step.time && (
                      <span className="timeline-tag">⏰ {step.time}</span>
                    )}
                    {step.budget !== undefined &&
                      step.budget !== null &&
                      step.budget !== "" &&
                      Number(step.budget) > 0 && (
                        <span className="timeline-tag">
                          💸 {step.budget}원
                        </span>
                      )}
                  </div>

                  {step.memo && (
                    <p className="timeline-memo">{step.memo}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        // 아직 steps 안 쓰는 예전 코스용 (호환)
        <>
          {course.location && (
            <p className="course-meta">📍 {course.location}</p>
          )}
          {course.description && (
            <p style={{ marginTop: 16 }}>{course.description}</p>
          )}
        </>
      )}

      {/* 🔥 오직 owner에게만 보이는 버튼들 (지금은 삭제만) */}
      {isOwner && (
        <div className="course-actions" style={{ marginTop: 24 }}>
          <button className="btn btn-danger" onClick={handleDelete}>
            삭제
          </button>
        </div>
      )}
    </div>
  );
}

export default CourseDetail;