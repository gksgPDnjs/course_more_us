// src/KakaoTestButton.jsx
const KAKAO_API_KEY = import.meta.env.VITE_KAKAO_REST_API_KEY;

function KakaoTestButton() {
  const handleTest = async () => {
    if (!KAKAO_API_KEY) {
      alert("카카오 REST API 키가 없습니다. .env 설정 확인해줘!");
      return;
    }

    try {
      const query = "강남 카페";

      const res = await fetch(
        `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(
          query
        )}`,
        {
          headers: {
            Authorization: `KakaoAK ${KAKAO_API_KEY}`,
          },
        }
      );

      const data = await res.json();
      console.log("📍 카카오 검색 결과:", data);
      alert(`검색 결과 ${data.documents.length}개 발견! (콘솔에서 확인 가능)`);
    } catch (err) {
      console.error("카카오 검색 에러:", err);
      alert("카카오 API 호출 중 오류가 발생했어 ㅠㅠ");
    }
  };

  return (
    <button onClick={handleTest} className="btn btn-primary">
      카카오 API 테스트하기
    </button>
  );
}

export default KakaoTestButton;