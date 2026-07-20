// =====================================================
// SWELL (script.js)
// 구성: ① 스팟 데이터(지금은 가짜 → API로 교체) ② 점수 계산
//       ③ 점수 카드 render ④ 라이트박스(이미지/영상)
//       ⑤ 스크롤 리빌
// 배운 것 총동원: 토큰, render 패턴, map+join, 모달,
//                 IntersectionObserver, null 방어!
// =====================================================

// ---------- 스팟 목록 (🏷️ [수정 지점 6] 팀이 정한 스팟으로!) ----------
// obsCode: 바다누리 관측소 번호 — 인증키 발급 후 실제 코드로 채우기
const SPOTS = [
  { name: "양양 죽도", en: "Yangyang Jukdo", obsCode: "TW_XXXX", nx: 92, ny: 133 },
  { name: "양양 인구", en: "Yangyang Ingu",  obsCode: "TW_XXXX", nx: 92, ny: 132 },
  { name: "부산 송정", en: "Busan Songjeong", obsCode: "TW_XXXX", nx: 99, ny: 75 },
  { name: "제주 중문", en: "Jeju Jungmun",   obsCode: "TW_XXXX", nx: 51, ny: 32 },
];

// =====================================================
// 🔌🔌🔌 [API 연결 지점 A] — 이 함수만 바꾸면 사이트 전체가 실데이터로! 🔌🔌🔌
// 지금: 가짜 데이터를 돌려주는 연습용 함수 (UI 개발용)
// 나중: 아래 주석의 fetch 코드로 교체 (뉴스 프로젝트 getNews와 같은 구조)
// =====================================================
const getSpotData = async (spot) => {
  // ----- [지금] 가짜 데이터: UI를 먼저 완성하기 위한 재료 -----
  const mock = {
    "양양 죽도": { waveHeight: 0.8, windSpeed: 3,  pty: 0 },
    "양양 인구": { waveHeight: 0.4, windSpeed: 2,  pty: 0 },
    "부산 송정": { waveHeight: 1.7, windSpeed: 5,  pty: 0 },
    "제주 중문": { waveHeight: null, windSpeed: 6, pty: 1 },  // 결측 테스트용
  };
  return mock[spot.name];

  /* ----- [나중] 진짜 API 연결 코드 (주석 해제 + 키 입력) -----
  try {
    // 1) 바다누리: 파고 (응답 봉투: result.meta / result.data)
    const seaUrl = `http://www.khoa.go.kr/api/oceangrid/데이터종류/search.do?ServiceKey=${SEA_KEY}&ObsCode=${spot.obsCode}&ResultType=json`;
    const seaRes = await fetch(seaUrl);
    const seaData = await seaRes.json();
    const waveHeight = Number(seaData.result.data[0].wave_height); // ← 필드명은 첫 호출 후 console.log로 확인!

    // 2) 기상청: 풍속(WSD)·강수형태(PTY) (봉투: response.body.items.item)
    const kmaRes = await fetch(기상청URL);
    const kmaData = await kmaRes.json();
    const items = kmaData.response.body.items.item;
    const windSpeed = Number(items.find(i => i.category === "WSD").obsrValue);
    const pty = Number(items.find(i => i.category === "PTY").obsrValue);

    return { waveHeight, windSpeed, pty };
  } catch (error) {
    return { waveHeight: null, windSpeed: null, pty: null };  // 실패 시 결측 처리
  }
  ----------------------------------------------------------- */
};

// =====================================================
// ② 서핑 점수 계산 (surfScore.js에서 확정한 로직 그대로)
// =====================================================
const scoreWave = (h) => {
  if (h == null) return null;
  if (h < 0.3) return 10;
  if (h < 0.5) return 30;
  if (h <= 1.0) return 50;
  if (h <= 1.5) return 35;
  return 15;
};
const scoreWind = (w) => {
  if (w == null) return null;
  if (w < 4) return 30;
  if (w < 8) return 20;
  if (w < 12) return 10;
  return 0;
};
const scoreWeather = (p) => (p == null ? null : Number(p) === 0 ? 20 : 5);

const translateWave = (h) => {
  if (h == null) return "정보 없음";
  if (h < 0.3) return "발목";
  if (h < 0.5) return "무릎";
  if (h < 0.8) return "허리";
  if (h <= 1.2) return "가슴";
  if (h <= 1.5) return "어깨";
  return "머리 이상 ⚠️";
};

const getSurfScore = ({ waveHeight, windSpeed, pty }) => {
  const w = scoreWave(waveHeight), s = scoreWind(windSpeed), t = scoreWeather(pty);
  if (w === null || s === null || t === null)
    return { total: "–", grade: "gray", label: "데이터 부족", message: "관측 데이터가 부족해요." };
  const total = w + s + t;
  if (waveHeight > 1.5)
    return { total, grade: "red", label: "위험", message: "오늘은 구경만! 파도가 너무 높아요." };
  if (total >= 80) return { total, grade: "green", label: "서핑 가자!", message: "최고의 컨디션이에요." };
  if (total >= 55) return { total, grade: "yellow", label: "무난해요", message: "즐길 만한 바다예요." };
  return { total, grade: "red", label: "쉬어가요", message: "다음 스웰을 기다려요." };
};

// =====================================================
// ③ 점수 카드 render (뉴스 프로젝트의 render와 같은 뼈대!)
// =====================================================
const renderScores = async () => {
  let cardsHTML = "";

  for (const spot of SPOTS) {
    const data = await getSpotData(spot);      // 🔌 A지점에서 데이터 받기
    const score = getSurfScore(data);

    cardsHTML += `
      <article class="score-card grade-${score.grade}">
        <h3>${spot.name}</h3>
        <p class="spot-en">${spot.en}</p>
        <div class="score-badge">
          <span class="num">${score.total}</span>
          <span class="label">${score.label}</span>
        </div>
        <div class="score-detail">
          파고 <b>${data.waveHeight ?? "–"}m (${translateWave(data.waveHeight)})</b><br />
          바람 <b>${data.windSpeed ?? "–"} m/s</b> · 강수 <b>${data.pty === 0 ? "없음" : data.pty == null ? "–" : "있음"}</b>
        </div>
        <p class="score-msg">${score.message}</p>
      </article>
    `;
  }

  document.getElementById("score-board").innerHTML = cardsHTML;
};

// =====================================================
// ④ 라이트박스: 이미지/영상을 눌러서 크게 보기 (모달 패턴!)
// =====================================================
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");
const lightboxVideo = document.getElementById("lightbox-video");

// 갤러리 사진 클릭 → 그 사진을 크게
const openLightbox = (figure) => {
  const img = figure.querySelector("img");
  lightboxImg.src = img.src;
  lightboxImg.style.display = "block";
  lightboxVideo.style.display = "none";
  lightbox.classList.add("open");
};

// 필름 포스터 클릭 → 영상 재생
const openVideo = () => {
  lightboxImg.style.display = "none";
  lightboxVideo.style.display = "block";
  lightbox.classList.add("open");
  lightboxVideo.currentTime = 0;
  lightboxVideo.play();
};

// 닫기: × 버튼 / 배경 클릭 (영상·이미지 자체 클릭은 무시)
const closeLightbox = (event) => {
  if (event.target === lightbox || event.target.classList.contains("lightbox-close")) {
    lightbox.classList.remove("open");
    lightboxVideo.pause();             // 안 멈추면 소리만 남는 유령! (배운 것)
  }
};

// ESC 키로도 닫기
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    lightbox.classList.remove("open");
    lightboxVideo.pause();
  }
});

// =====================================================
// ⑤ 스크롤 리빌 (IntersectionObserver 감시원)
// =====================================================
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("show");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15 }
);
document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

// ---------- 시작 ----------
renderScores();