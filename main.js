// main.js

// 1. Firebase 라이브러리 임포트 (CDN 방식)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 2. Firebase 설정 (사용자님의 설정값 그대로 유지)
const firebaseConfig = {
  apiKey: "AIzaSyD55P70I7ro05W84eKKYPYo3Rclb9VIqzM",
  authDomain: "w-me-intern-project.firebaseapp.com",
  projectId: "w-me-intern-project",
  storageBucket: "w-me-intern-project.firebasestorage.app",
  messagingSenderId: "538993774904",
  appId: "1:538993774904:web:b5c4f4253d0d29d19f71cd",
  measurementId: "G-CLHV5HEWRP"
};

// 3. Firebase 및 DB 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app); // db 변수를 정의해야 addDoc이 작동합니다.

// --- 여기부터 화면 인터랙션 코드 ---

// 슬라이더 및 숫자 표시 요소 연결
const confSlider = document.getElementById('confSlider');
const confVal = document.getElementById('confVal');
const nSlider = document.getElementById('nSlider');
const nVal = document.getElementById('nVal');

// 슬라이더 실시간 숫자 업데이트
confSlider.addEventListener('input', (e) => { confVal.innerText = e.target.value; });
nSlider.addEventListener('input', (e) => { nVal.innerText = e.target.value; });

// 4. 시뮬레이션 및 로그 저장 버튼
document.getElementById('runSim').addEventListener('click', async () => {
    const n = Number(nSlider.value);
    const k = Number(confSlider.value);
    
    const logData = {
        event: "NEW_SAMPLE",
        n: n,
        k: k,
        timestamp: new Date()
    };

    try {
        // Firebase DB에 저장 (이제 addDoc과 db가 정의되어 잘 작동합니다)
        await addDoc(collection(db, "trace_logs"), logData);
        alert("새 표본이 추출되었고 로그가 DB에 저장되었습니다!");
        
        // 여기에 나중에 updateChart(n, k) 함수를 넣을 예정입니다.
    } catch (error) {
        console.error("로그 저장 중 오류 발생:", error);
    }
});

// 5. 스마트 힌트 기능
document.getElementById('hintBtn').addEventListener('click', () => {
    const n = nSlider.value;
    const output = document.getElementById('hintOutputBox');
    
    if(n < 30) {
        output.innerText = "💡 표본 크기(n)가 너무 작으면 추정의 신뢰도가 떨어져 광고 검증이 어려울 수 있어요. n을 키워볼까요?";
    } else {
        output.innerText = "💡 신뢰도를 95%에서 99%로 높였을 때, 구간의 폭이 어떻게 변하는지 그래프로 확인해보세요.";
    }
});

// 6. [핵심] 미션 토글 버튼 기능
const missionToggleBtn = document.getElementById('missionToggleBtn');
const missionContent = document.getElementById('missionContent');

missionToggleBtn.addEventListener('click', () => {
    // hidden-content와 show-content 클래스를 번갈아 가며 적용
    missionContent.classList.toggle('hidden-content');
    missionContent.classList.toggle('show-content');

    if (missionContent.classList.contains('show-content')) {
        missionToggleBtn.innerText = "🔼 미션 내용 접기";
    } else {
        missionToggleBtn.innerText = "🔍 미션 내용 보기";
    }
});