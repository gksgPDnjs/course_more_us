import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

function LoginSuccessPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // ✅ StrictMode 중복 실행 방지 (탭/새로고침에도 안정적)
    const already = sessionStorage.getItem("kakao_login_processing");
    if (already === "1") return;
    sessionStorage.setItem("kakao_login_processing", "1");

    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      sessionStorage.removeItem("kakao_login_processing");
      alert("카카오 로그인에 실패했어요. (token 없음)");
      navigate("/login", { replace: true });
      return;
    }

    localStorage.setItem("token", token);

    (async () => {
      try {
        const res = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          sessionStorage.removeItem("kakao_login_processing");
          console.error("LoginSuccess /me error:", res.status, data);
          alert(`사용자 정보를 불러오지 못했어요. (${data.message || res.status})`);
          navigate("/login", { replace: true });
          return;
        }

        localStorage.setItem("currentUser", JSON.stringify(data));

        // ✅ 성공하면 메인으로
        sessionStorage.removeItem("kakao_login_processing");
        navigate("/", { replace: true });
      } catch (err) {
        sessionStorage.removeItem("kakao_login_processing");
        console.error("LoginSuccess /me network error:", err);
        alert("서버에 연결할 수 없어요. 백엔드가 실행 중인지 확인해 주세요.");
        navigate("/login", { replace: true });
      }
    })();
  }, [navigate]);

  return <p style={{ padding: 16 }}>카카오 로그인 처리 중...</p>;
}

export default LoginSuccessPage;