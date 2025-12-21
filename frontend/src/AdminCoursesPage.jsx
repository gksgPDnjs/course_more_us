// src/AdminCoursesPage.jsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SEOUL_REGIONS } from "./data/regions";
import { API_BASE_URL } from "./config";
//const API_BASE_URL = "http://localhost:4000";

// 지역 id → 라벨
function getRegionLabel(cityId) {
  if (!cityId) return "";
  const region = SEOUL_REGIONS.find((r) => r.id === cityId);
  return region ? region.label : cityId;
}

// 간단 auth 훅 (다른 파일에서 쓰는 패턴 그대로)
function useAuth() {
  const savedUser = localStorage.getItem("currentUser");
  const currentUser = savedUser ? JSON.parse(savedUser) : null;
  const token = localStorage.getItem("token");
  const isLoggedIn = !!token && !!currentUser;
  return { currentUser, token, isLoggedIn };
}

function AdminCoursesPage() {
  const { currentUser, token, isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  // 필터용 (전체 / 승인 / 대기)
  const [statusFilter, setStatusFilter] = useState("all");

  // 1) 코스 목록 불러오기
  useEffect(() => {
    const fetchAdminCourses = async () => {
      if (!token) return;

      try {
        setLoading(true);
        setErrMsg("");

        const res = await fetch(`${API_BASE_URL}/api/admin/courses`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        const data = await res.json().catch(() => null);

        if (!res.ok || !data) {
          throw new Error(data?.message || "관리자 코스 목록 조회 실패");
        }

        setCourses(data);
      } catch (err) {
        console.error("admin courses fetch error:", err);
        setErrMsg(err.message || "코스를 불러오는 중 오류가 발생했어요.");
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchAdminCourses();
    }
  }, [token]);

  // 401/403 / 비로그인 처리
  if (!isLoggedIn) {
    return (
      <div className="page">
        <section className="card" style={{ padding: 20 }}>
          <h2 className="section-title">관리자 코스 관리</h2>
          <p style={{ marginTop: 8 }}>로그인 후 이용할 수 있습니다.</p>
          <button
            className="btn btn-primary btn-sm"
            style={{ marginTop: 12 }}
            onClick={() => navigate("/login")}
          >
            로그인 페이지로 이동
          </button>
        </section>
      </div>
    );
  }

  // (선택) role 표시 – role이 안 들어와 있으면 그냥 “?”로 나올 수도 있음
  const isAdmin = currentUser?.role === "admin";

  const filteredCourses = courses.filter((c) => {
    if (statusFilter === "approved") return c.approved === true;
    if (statusFilter === "pending") return !c.approved;
    return true;
  });

  // 2) 승인 / 승인 취소
  const handleToggleApprove = async (course) => {
    if (!window.confirm(
      course.approved
        ? "이 코스를 승인 취소할까요?"
        : "이 코스를 승인 처리할까요?"
    )) {
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/admin/courses/${course._id}/approve`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ approved: !course.approved }),
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "승인 처리 실패");
      }

      setCourses((prev) =>
        prev.map((c) => (c._id === course._id ? data : c))
      );
    } catch (err) {
      console.error("admin approve error:", err);
      alert(err.message || "승인 처리 중 오류가 발생했어요.");
    }
  };

  // 3) 삭제
  const handleDelete = async (course) => {
    if (
      !window.confirm(
        `정말 이 코스를 삭제할까요?\n\n제목: ${course.title}`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/admin/courses/${course._id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "코스 삭제 실패");
      }

      setCourses((prev) => prev.filter((c) => c._id !== course._id));
    } catch (err) {
      console.error("admin delete error:", err);
      alert(err.message || "코스 삭제 중 오류가 발생했어요.");
    }
  };

  return (
    <div className="page">
      <header
        style={{
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div>
          <h2 className="section-title">관리자 코스 관리</h2>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
            모든 유저가 등록한 코스를 한눈에 보고 승인 / 삭제할 수 있는 페이지예요.
            {isAdmin ? " (현재 계정: 관리자)" : ""}
          </p>
        </div>

        <Link to="/" className="btn btn-secondary btn-sm">
          ← 메인으로
        </Link>
      </header>

      <section className="card" style={{ padding: 16 }}>
        {/* 필터 영역 */}
        <div
          style={{
            marginBottom: 12,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <FilterButton
              label="전체"
              active={statusFilter === "all"}
              onClick={() => setStatusFilter("all")}
            />
            <FilterButton
              label="승인됨"
              active={statusFilter === "approved"}
              onClick={() => setStatusFilter("approved")}
            />
            <FilterButton
              label="승인 대기"
              active={statusFilter === "pending"}
              onClick={() => setStatusFilter("pending")}
            />
          </div>

          <span style={{ fontSize: 12, color: "#6b7280" }}>
            총 {courses.length}개 코스 / 현재 {filteredCourses.length}개 표시 중
          </span>
        </div>

        {errMsg && (
          <p style={{ color: "red", marginBottom: 8 }}>{errMsg}</p>
        )}

        {loading ? (
          <p className="text-muted">불러오는 중...</p>
        ) : filteredCourses.length === 0 ? (
          <p style={{ fontSize: 14, color: "#6b7280" }}>
            아직 등록된 코스가 없거나, 현재 필터에 해당하는 코스가 없어요.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid #e5e7eb",
                    backgroundColor: "#f9fafb",
                  }}
                >
                  <th style={thStyle}>제목</th>
                  <th style={thStyle}>지역</th>
                  <th style={thStyle}>단계</th>
                  <th style={thStyle}>작성자</th>
                  <th style={thStyle}>상태</th>
                  <th style={thStyle}>생성일</th>
                  <th style={thStyle}>관리</th>
                </tr>
              </thead>
              <tbody>
                {filteredCourses.map((course) => {
                  const regionLabel = getRegionLabel(course.city);
                  const stepsCount = Array.isArray(course.steps)
                    ? course.steps.length
                    : 0;
                  const ownerName =
                    course.owner?.nickname || course.owner?.email || "-";
                  const createdAt = course.createdAt
                    ? new Date(course.createdAt).toLocaleString()
                    : "-";

                  return (
                    <tr
                      key={course._id}
                      style={{
                        borderBottom: "1px solid #f3f4f6",
                      }}
                    >
                      <td style={tdStyle}>
                        <Link
                          to={`/courses/${course._id}`}
                          style={{ color: "#111827", textDecoration: "none" }}
                        >
                          {course.title}
                        </Link>
                      </td>
                      <td style={tdStyle}>{regionLabel || "-"}</td>
                      <td style={tdStyle}>{stepsCount}</td>
                      <td style={tdStyle}>{ownerName}</td>
                      <td style={tdStyle}>
                        {course.approved ? (
                          <span style={{ color: "#16a34a" }}>승인됨</span>
                        ) : (
                          <span style={{ color: "#b45309" }}>대기</span>
                        )}
                      </td>
                      <td style={tdStyle}>{createdAt}</td>
                      <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleToggleApprove(course)}
                          style={{ marginRight: 6 }}
                        >
                          {course.approved ? "승인 취소" : "승인"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(course)}
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

const thStyle = {
  textAlign: "left",
  padding: "8px 10px",
  fontWeight: 600,
  fontSize: 12,
  color: "#6b7280",
};

const tdStyle = {
  padding: "8px 10px",
  fontSize: 13,
  color: "#111827",
};

function FilterButton({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        borderRadius: 999,
        border: "1px solid " + (active ? "#4f46e5" : "#e5e7eb"),
        padding: "4px 10px",
        fontSize: 12,
        backgroundColor: active ? "#eef2ff" : "white",
        color: active ? "#3730a3" : "#4b5563",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

export default AdminCoursesPage;