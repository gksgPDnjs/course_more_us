import { Link } from "react-router-dom";

function HomePage() {
  return (
    <div className="home-wrapper">
      <section className="home-hero">
        {/* 🔹 알약 뱃지 */}
        <div className="home-pill">
  <span className="home-pill-icon">✦</span>
  <span className="home-pill-text">Bloom your moments</span>
</div>

        {/* 🔹 메인 타이틀 */}
        <h1 className="home-title">
          마음에 드는 데이트 코스를
          <br />
          <span className="home-title-accent">지금 바로 찾아보세요</span>
        </h1>

        {/* 🔹 설명 */}
        <p className="home-desc">
          지역을 선택하면, 3–4단계 데이트 코스를 추천해드려요.
          <br />
          고민 시간은 줄이고, 함께 보내는 시간은 늘리세요.
        </p>

        {/* 🔹 버튼 두 개 */}
        <div className="home-buttons">
          <Link to="/random" className="home-btn-primary">
            🎲 랜덤 코스 추천
          </Link>

          <Link to="/recommend" className="home-btn-secondary">
            코스 둘러보기
          </Link>
        </div>
      </section>

      {/* 🔹 안내 섹션 */}
      <section className="home-info">
        <h2 className="home-info-title">어떻게 추천해주나요?</h2>

        <ul className="home-info-list">
          <li>서울의 주요 지역을 클릭해서 동네를 고르고,</li>
          <li>카카오맵 데이터를 카페·식당·볼거리를 조합해 자동 코스를 만들고,</li>
          <li>저장/찜 기능을 통해 다시 불러볼 수 있어요.</li>
        </ul>
      </section>
    </div>
  );
}

export default HomePage;