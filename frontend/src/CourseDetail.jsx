// src/CourseDetail.jsx
import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";

const API_BASE_URL = "http://localhost:4000";

function CourseDetail() {
  const { id } = useParams(); // URL의 :id 가져오기
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  // 수정 모드 상태
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    category: "",
    description: "",
    location: "",
  });

  // 코스 하나 가져오기
  const fetchCourse = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/courses/${id}`);
      if (!res.ok) {
        throw new Error("Failed to fetch course");
      }
      const data = await res.json();
      setCourse(data);
    } catch (error) {
      console.error("Error fetching course:", error);
    } finally {
      setLoading(false);
    }
  };

  // 코스 수정하기
  const handleUpdate = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/courses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      if (!res.ok) throw new Error("Failed to update course");

      const updated = await res.json();
      setCourse(updated); // 화면에 바로 반영
      setIsEditing(false); // 수정 모드 종료
    } catch (error) {
      console.error("Update error:", error);
      alert("수정에 실패했어요 😢");
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

  // 코스를 못 찾은 경우
  if (!course) {
    return (
      <div className="app">
        <p>코스를 찾을 수 없습니다.</p>
        <Link to="/" className="btn btn-secondary" style={{ marginTop: 12 }}>
          ← 목록으로
        </Link>
      </div>
    );
  }

  // ✏️ 수정 모드일 때 화면
  if (isEditing) {
    return (
      <div className="app">
        <Link to="/" className="btn btn-secondary" style={{ marginBottom: 12 }}>
          ← 목록으로
        </Link>

        <div className="card">
          <h2 className="section-title">코스 수정하기</h2>

          <input
            className="input"
            name="title"
            value={editForm.title}
            onChange={(e) =>
              setEditForm({ ...editForm, title: e.target.value })
            }
          />

          <input
            className="input"
            name="category"
            value={editForm.category}
            onChange={(e) =>
              setEditForm({ ...editForm, category: e.target.value })
            }
          />

          <input
            className="input"
            name="location"
            value={editForm.location}
            onChange={(e) =>
              setEditForm({ ...editForm, location: e.target.value })
            }
          />

          <textarea
            className="textarea"
            name="description"
            rows={3}
            value={editForm.description}
            onChange={(e) =>
              setEditForm({ ...editForm, description: e.target.value })
            }
          />

          <div className="course-actions" style={{ marginTop: 12 }}>
            <button className="btn btn-primary" onClick={handleUpdate}>
              저장하기
            </button>
            <button
              className="btn btn-secondary"
              style={{ marginLeft: 8 }}
              onClick={() => setIsEditing(false)}
            >
              취소
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 👀 기본 보기 모드 화면
  return (
    <div className="app">
      <Link to="/" className="btn btn-secondary" style={{ marginBottom: 12 }}>
        ← 목록으로
      </Link>

      <div className="card">
        <h1 className="course-title" style={{ fontSize: 22 }}>
          {course.title}
        </h1>

        <div style={{ marginTop: 8, marginBottom: 8 }}>
          <span className="badge">{course.category}</span>
        </div>

        <p className="course-meta">📍 {course.location}</p>
        <p style={{ marginTop: 16 }}>{course.description}</p>

        <div className="course-actions" style={{ marginTop: 16 }}>
          <button
            className="btn btn-primary"
            onClick={() => {
              setIsEditing(true);
              setEditForm({
                title: course.title,
                category: course.category,
                description: course.description,
                location: course.location,
              });
            }}
          >
            수정하기
          </button>
        </div>
      </div>
    </div>
  );
}

export default CourseDetail;
