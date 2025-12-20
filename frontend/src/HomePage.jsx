import { Link } from "react-router-dom";

function HomePage() {
  return (
    <div className="relative min-h-[calc(100vh-64px)] w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] overflow-hidden bg-[#fafafa]">
      {/* =========================
          Background: bright mesh + subtle grid + soft noise
         ========================= */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        {/* pastel mesh */}
        <div className="absolute inset-0 bg-[radial-gradient(900px_circle_at_20%_10%,rgba(236,72,153,0.18),transparent_55%),radial-gradient(900px_circle_at_80%_25%,rgba(168,85,247,0.18),transparent_60%),radial-gradient(900px_circle_at_50%_95%,rgba(56,189,248,0.14),transparent_55%)]" />

        {/* subtle grid */}
        <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(15,23,42,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.06)_1px,transparent_1px)] [background-size:56px_56px]" />

        {/* top fade */}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(250,250,250,0.92),rgba(250,250,250,0.75),rgba(250,250,250,0.92))]" />

        {/* noise */}
        <div
          className="absolute inset-0 opacity-[0.06] mix-blend-multiply"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)' opacity='.55'/%3E%3C/svg%3E\")",
          }}
        />
      </div>

      <div className="mx-auto w-full max-w-6xl px-6 py-12 md:py-16">
        {/* =========================
            HERO
           ========================= */}
        <section className="relative overflow-hidden rounded-[32px] border border-slate-200/70 bg-white/70 shadow-[0_30px_90px_rgba(15,23,42,0.12)] backdrop-blur">
          {/* inner glow */}
          <div className="pointer-events-none absolute -top-20 left-1/2 h-56 w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-300/35 via-fuchsia-300/25 to-sky-300/25 blur-3xl" />

          <div className="grid gap-10 px-7 py-10 md:grid-cols-2 md:items-center md:px-12 md:py-14">
            {/* LEFT: copy */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/70 px-4 py-2 text-xs font-extrabold text-slate-700 shadow-sm">
                <span className="inline-flex h-2 w-2 rounded-full bg-rose-400 shadow-[0_0_0_4px_rgba(244,63,94,0.14)]" />
                ✨ Course More Us
                <span className="text-slate-300">•</span>
                데이트 코스 추천
              </div>

              <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight text-slate-900 md:text-5xl">
                마음에 드는 데이트 코스를
                <br />
                <span className="bg-gradient-to-r from-slate-900 via-violet-700 to-fuchsia-700 bg-clip-text text-transparent">
                  지금 바로 찾아보세요
                </span>
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600">
                지역·분위기·예산에 맞춰 동선을 자연스럽게 조합해요.
                <br className="hidden md:block" />
                마음에 들면 저장하고, 다음 데이트에 바로 꺼내쓰기.
              </p>

              {/* CTA */}
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  to="/random"
                  className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-violet-700 hover:shadow-[0_14px_30px_rgba(124,58,237,0.22)]"
                >
                  🎲 랜덤 코스 추천
                  <span className="text-white/80 transition group-hover:translate-x-0.5">
                    →
                  </span>
                </Link>

                <Link
                  to="/recommend"
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white/70 px-5 py-3 text-sm font-extrabold text-slate-800 shadow-sm backdrop-blur transition hover:bg-white hover:border-slate-300"
                >
                  코스 둘러보기
                </Link>

                <Link
                  to="/ai-course"
                  className="inline-flex items-center justify-center rounded-2xl border border-fuchsia-200 bg-fuchsia-50/70 px-5 py-3 text-sm font-extrabold text-fuchsia-700 shadow-sm backdrop-blur transition hover:bg-fuchsia-50 hover:border-fuchsia-300"
                >
                  🤖 AI 맞춤 코스
                </Link>
              </div>

              {/* micro badges */}
              <div className="mt-7 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                <span className="rounded-full border border-slate-200 bg-white/70 px-3 py-2 shadow-sm backdrop-blur">
                  📍 서울 주요 지역 지원
                </span>
                <span className="rounded-full border border-slate-200 bg-white/70 px-3 py-2 shadow-sm backdrop-blur">
                  🗺️ 카카오맵 기반 동선
                </span>
                <span className="rounded-full border border-slate-200 bg-white/70 px-3 py-2 shadow-sm backdrop-blur">
                  💾 저장/찜으로 다시보기
                </span>
              </div>

              {/* mini stats */}
              <div className="mt-8 grid max-w-md grid-cols-3 gap-3">
                <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 shadow-sm">
                  <div className="text-lg font-extrabold text-slate-900">3–4</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">
                    코스 단계
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 shadow-sm">
                  <div className="text-lg font-extrabold text-slate-900">1분</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">
                    빠른 추천
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 shadow-sm">
                  <div className="text-lg font-extrabold text-slate-900">Pick</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">
                    저장/찜
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: preview mock */}
            <div className="relative">
              <div className="absolute -inset-4 rounded-[36px] bg-gradient-to-br from-violet-200/45 via-fuchsia-200/30 to-sky-200/30 blur-2xl" />

              <div className="relative overflow-hidden rounded-[28px] border border-slate-200/70 bg-white/75 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur">
                {/* top bar */}
                <div className="flex items-center justify-between border-b border-slate-200/70 bg-white/70 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-300/90" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-300/90" />
                  </div>
                  <div className="text-xs font-semibold text-slate-500">
                    추천 미리보기
                  </div>
                </div>

                {/* content */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-extrabold text-slate-900">
                        오늘의 코스 ✨
                      </div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">
                        성수 · 감성 · 2–3만원대
                      </div>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-extrabold text-slate-700">
                      3단계
                    </span>
                  </div>

                  <div className="mt-5 space-y-3">
                    {[
                      { t: "카페", n: "창가 좋은 로스터리", d: "도보 6분" },
                      { t: "식당", n: "분위기 좋은 파스타", d: "도보 8분" },
                      { t: "산책", n: "한강 야경 스팟", d: "도보 12분" },
                    ].map((it, idx) => (
                      <div
                        key={idx}
                        className="group flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 transition hover:bg-white hover:border-slate-300"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-sm">
                            {idx === 0 ? "☕" : idx === 1 ? "🍝" : "🌙"}
                          </div>
                          <div>
                            <div className="text-xs font-extrabold text-slate-800">
                              {it.t} · {it.n}
                            </div>
                            <div className="mt-0.5 text-[11px] font-semibold text-slate-500">
                              {it.d}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs font-extrabold text-slate-300 transition group-hover:text-slate-500">
                          →
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex gap-2">
                    <div className="flex-1 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-center text-xs font-extrabold text-slate-800 transition hover:bg-white hover:border-slate-300">
                      🗺️ 동선 보기
                    </div>
                    <div className="flex-1 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-center text-xs font-extrabold text-slate-800 transition hover:bg-white hover:border-slate-300">
                      💾 저장하기
                    </div>
                  </div>
                </div>

                {/* bottom soft fade */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white/70 to-transparent" />
              </div>
            </div>
          </div>
        </section>

        {/* =========================
            TRUST STRIP
           ========================= */}
        <section className="mt-10">
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 rounded-3xl border border-slate-200/70 bg-white/65 px-6 py-5 shadow-sm backdrop-blur">
            {[
              "중복 없는 동선 구성",
              "저장/찜으로 재사용",
              "지역별 코스 둘러보기",
              "AI 맞춤 추천(확장)",
            ].map((t) => (
              <div key={t} className="text-xs font-extrabold text-slate-600">
                {t}
              </div>
            ))}
          </div>
        </section>

        {/* =========================
            HOW IT WORKS
           ========================= */}
        <section className="mt-14">
          <div className="text-center">
            <h2 className="text-lg font-extrabold text-slate-900">
              어떻게 추천해주나요?
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              자연스러운 동선을 만들고, 마음에 들면 저장해두면 끝.
            </p>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {[
              {
                icon: "📍",
                title: "지역 선택",
                desc: "서울 주요 지역 중 원하는 동네를 고르면 시작해요.",
              },
              {
                icon: "🧩",
                title: "코스 조합",
                desc: "카페·식당·볼거리를 조합해 3–4단계로 구성해요.",
              },
              {
                icon: "💾",
                title: "저장 & 다시보기",
                desc: "마음에 들면 저장/찜해서 다음에 바로 꺼내볼 수 있어요.",
              },
            ].map((c) => (
              <div
                key={c.title}
                className="group relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white/65 p-6 shadow-sm backdrop-blur transition hover:bg-white/80"
              >
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-violet-200/70 via-fuchsia-200/45 to-sky-200/45 blur-2xl transition group-hover:opacity-90" />
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-base">
                  {c.icon}
                </div>
                <div className="text-sm font-extrabold text-slate-900">
                  {c.title}
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {c.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* =========================
            CTA BOTTOM
           ========================= */}
        <section className="mt-14">
          <div className="relative overflow-hidden rounded-[28px] border border-slate-200/70 bg-white/65 px-7 py-10 text-center shadow-sm backdrop-blur">
            <div className="pointer-events-none absolute -top-24 left-1/2 h-56 w-[850px] -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-200/70 via-fuchsia-200/45 to-sky-200/45 blur-3xl" />
            <h3 className="text-xl font-extrabold text-slate-900">
              오늘 데이트, 코스 고민 끝.
            </h3>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-500">
              랜덤 추천으로 빠르게 시작하거나, 코스 둘러보기에서 취향대로 찾아보세요.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/random"
                className="inline-flex items-center justify-center rounded-2xl bg-violet-600 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-violet-700"
              >
                🎲 랜덤 추천 시작
              </Link>
              <Link
                to="/recommend"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white/70 px-5 py-3 text-sm font-extrabold text-slate-800 shadow-sm transition hover:bg-white hover:border-slate-300"
              >
                코스 둘러보기
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-12 flex items-center justify-center text-xs text-slate-400">
          © {new Date().getFullYear()} Course More Us
        </footer>
      </div>
    </div>
  );
}

export default HomePage;