// src/LoginSuccessPage.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = "http://localhost:4000";

function LoginSuccessPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      alert("카카오 로그인에 실패했어요.");
      navigate("/login");
      return;
    }

    localStorage.setItem("token", token);

    async function loadMe() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const msg = data.message || `status ${res.status}`;
          console.error("LoginSuccess /me error:", res.status, data);
          alert(`사용자 정보를 불러오지 못했어요. (${msg})`);
          navigate("/login");
          return;
        }

        const user = await res.json();
        localStorage.setItem("currentUser", JSON.stringify(user));

        navigate("/");
        window.location.reload();
      } catch (err) {
        console.error("LoginSuccess /me network error:", err);
        alert(
          "서버에 연결할 수 없어요. 백엔드가 실행 중인지 다시 확인해 주세요."
        );
        navigate("/login");
      }
    }

    loadMe();
  }, [navigate]);

  return <p>카카오 로그인 처리 중...</p>;
}

export default LoginSuccessPage;