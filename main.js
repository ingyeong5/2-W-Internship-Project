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

// --- 통계 시뮬레이션 상수 및 유틸리티 ---
const TRUE_MEAN = 100;
const STD_DEV = 15;

// 신뢰도별 Z-값 매핑
const zTable = {
    95: 1.96, 96: 2.05, 97: 2.17, 98: 2.33, 99: 2.58
};

// 정규분포 난수 생성 (Box-Muller 변환)
function generateNormal(mean, std) {
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z * std + mean;
}

// 1. 차트 초기화
const ctx = document.getElementById('ciChart').getContext('2d');
let myChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [], // x축 (배터리 수명)
        datasets: [
            {
                label: '배터리 수명 분포 (모집단)',
                data: [],
                borderColor: '#cbd5e1',
                backgroundColor: 'rgba(203, 213, 225, 0.2)',
                fill: true,
                pointRadius: 0
            },
            {
                label: '95% 신뢰구간',
                data: [],
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                fill: true,
                borderWidth: 3,
                pointRadius: 5
            }
        ]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: { display: false },
            x: { title: { display: true, text: '배터리 수명 (시간)' } }
        }
    }
});

// 2. 차트 업데이트 함수
function updateChart(n, confidence) {
    const z = zTable[confidence];
    const se = STD_DEV / Math.sqrt(n); // 표준오차
    
    // 무작위 표본 평균 생성 (시뮬레이션 느낌)
    const sampleMean = generateNormal(TRUE_MEAN, se);
    const lowerBound = sampleMean - (z * se);
    const upperBound = sampleMean + (z * se);

    // 정규분포 곡선 데이터 생성 (x축 40~160)
    const labels = [];
    const distData = [];
    const ciData = [];

    for (let x = 40; x <= 160; x += 1) {
        labels.push(x);
        // 모집단 분포 함수 값
        const y = (1 / (STD_DEV * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - TRUE_MEAN) / STD_DEV, 2));
        distData.push(y);

        // 신뢰구간 영역 표시 (현재 표본 평균 기준)
        if (x >= lowerBound && x <= upperBound) {
            ciData.push(y);
        } else {
            ciData.push(null);
        }
    }

    myChart.data.labels = labels;
    myChart.data.datasets[0].data = distData;
    myChart.data.datasets[1].data = ciData;
    myChart.data.datasets[1].label = `${confidence}% 신뢰구간 (n=${n})`;
    
    myChart.update();
}

// 3. 버튼 이벤트 연결 (기존 runSim 클릭 리스너 내부에 추가)
document.getElementById('runSim').addEventListener('click', async () => {
    const n = Number(nSlider.value);
    const k = Number(confSlider.value);
    
    // 시각화 업데이트
    updateChart(n, k);

    // Firebase 저장 로직 (기존 코드 유지)
    try {
        await addDoc(collection(db, "trace_logs"), {
            event: "NEW_SAMPLE",
            n: n,
            k: k,
            timestamp: new Date()
        });
        // alert 대신 조용한 알림이나 콘솔 로그가 학습 흐름에 더 좋습니다.
        console.log("Log saved to Firebase"); 
    } catch (e) { console.error(e); }
});

// 초기 화면 렌더링
window.onload = () => updateChart(30, 95);


// 7. 최종 리포트 제출 기능 (새로운 컬렉션 'report_submissions' 사용)
document.getElementById('submitBtn').addEventListener('click', async () => {
    const reflectionNote = document.getElementById('reflectionNote');
    const noteContent = reflectionNote.value;
    
    // 현재 슬라이더 상태값도 함께 저장하여 분석의 맥락을 파악합니다.
    const currentN = Number(nSlider.value);
    const currentK = Number(confSlider.value);

    if (!noteContent.trim()) {
        alert("리포트 내용을 작성해주세요.");
        return;
    }

    const reportData = {
        type: "FINAL_REPORT",
        content: noteContent,
        settings: { 
            sample_size: currentN, 
            confidence_level: currentK 
        },
        timestamp: new Date()
    };

    try {
        // 'report_submissions'라는 별도의 컬렉션에 저장합니다.
        await addDoc(collection(db, "report_submissions"), reportData);
        
        alert("최종 리포트가 성공적으로 제출되었습니다!");
        
        // 제출 후 입력창 초기화
        reflectionNote.value = ""; 
        console.log("Report submitted successfully:", reportData);
    } catch (error) {
        console.error("리포트 제출 중 오류 발생:", error);
        alert("제출에 실패했습니다. 네트워크 상태를 확인해주세요.");
    }
});