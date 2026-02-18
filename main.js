// Firebase 라이브러리 임포트 (CDN 방식)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyD55P70I7ro05W84eKKYPYo3Rclb9VIqzM",
  authDomain: "w-me-intern-project.firebaseapp.com",
  projectId: "w-me-intern-project",
  storageBucket: "w-me-intern-project.firebasestorage.app",
  messagingSenderId: "538993774904",
  appId: "1:538993774904:web:b5c4f4253d0d29d19f71cd",
  measurementId: "G-CLHV5HEWRP"
};

// Firebase 및 DB 초기화
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

// 시뮬레이션 및 로그 저장 버튼
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
        // Firebase DB에 저장
        await addDoc(collection(db, "trace_logs"), logData);
    } catch (error) {
        console.error("로그 저장 중 오류 발생:", error);
    }
});

// 미션 토글 버튼 기능
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

const AD_MEAN = 100;    // 회사가 광고하는 수치
const REAL_MEAN = 96;   // 실제 배터리 평균 성능
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

// 차트 초기화
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

// 차트 업데이트 함수
function updateChart(n, confidence) {
    const z = zTable[confidence];
    const se = STD_DEV / Math.sqrt(n); 
    
    // 표본은 '실제 성능(96)'을 기준으로 추출
    const sampleMean = generateNormal(REAL_MEAN, se);
    const lowerBound = sampleMean - (z * se);
    const upperBound = sampleMean + (z * se);

    const labels = [];
    const distData = [];
    const ciData = [];

    for (let x = 40; x <= 160; x += 1) {
        labels.push(x);
        
        // 배경 회색 곡선은 항상 광고 수치(100)를 기준으로 그림
        const y = (1 / (STD_DEV * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - AD_MEAN) / STD_DEV, 2));
        distData.push(y);

        // 신뢰구간 영역 표시 (실제 추출된 sampleMean 기준)
        if (x >= lowerBound && x <= upperBound) {
            ciData.push(y);
        } else {
            ciData.push(null);
        }
    }

    myChart.data.labels = labels;
    myChart.data.datasets[0].data = distData; // 회색 곡선 (100 중심)
    myChart.data.datasets[1].data = ciData;   // 파란 구간 (96 근처)
    myChart.data.datasets[1].label = `${confidence}% 신뢰구간 (n=${n})`;
    
    myChart.update();
}

// 버튼 이벤트 연결 (기존 runSim 클릭 리스너 내부에 추가)
document.getElementById('runSim').addEventListener('click', async () => {
    const n = Number(nSlider.value);
    const k = Number(confSlider.value);
    
    // 시각화 업데이트
    updateChart(n, k);

    // Firebase 저장 로직
    try {
        await addDoc(collection(db, "trace_logs"), {
            event: "NEW_SAMPLE",
            n: n,
            k: k,
            timestamp: new Date()
        });
        console.log("Log saved to Firebase"); 
    } catch (e) { console.error(e); }
});

// 초기 화면 렌더링
window.onload = () => updateChart(30, 95);

// --- 최종 리포트 제출 및 스마트 힌트 기능 ---

// 힌트 클릭 횟수를 추적하는 변수
let hintClickCount = 0;

// 최종 리포트 제출 기능 (report_submissions 컬렉션에 저장)
document.getElementById('submitBtn').addEventListener('click', async () => {
    const reflectionNote = document.getElementById('reflectionNote');
    const noteContent = reflectionNote.value;
    
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
            confidence_level: currentK,
            hint_usage_count: hintClickCount // 힌트 횟수 추가
        },
        timestamp: new Date()
    };

    try {
        await addDoc(collection(db, "report_submissions"), reportData);
        alert("최종 리포트가 성공적으로 제출되었습니다!");
        
        reflectionNote.value = ""; 
        hintClickCount = 0; // 제출 후 카운트 리셋
    } catch (error) {
        console.error("리포트 제출 오류:", error);
    }
});

// 스마트 힌트 기능 및 힌트 로그 저장
document.getElementById('hintBtn').addEventListener('click', async () => {
    hintClickCount++; // 클릭할 때마다 1씩 증가

    const n = Number(nSlider.value);
    const k = Number(confSlider.value);
    const output = document.getElementById('hintOutputBox');
    
    let logicHint = "";
    let misconceptionId = ""; // 오개념 ID 기록용

    // 상황별 힌트 로직
    if (n >= 500 && k === 95) {
        // M2 & M8 관련: n은 큰데 신뢰도가 낮을 때
        misconceptionId = "M2_M8";
        logicHint = "💡 표본은 충분히 많은데 신뢰도는 낮네요. 신뢰도를 99%로 높여보세요. 이때 늘어나는 구간의 길이를 감당할 만큼 표본(n)이 충분한지도 고민해봅시다.";
    } else if (n < 30) {
        // M7 관련: 표준오차의 중요성
        misconceptionId = "M7";
        logicHint = "💡 표본이 너무 적으면 n의 값이 작아져 표준오차가 커집니다. 표준오차 식에서 n이 작을 때 결과가 어떻게 될지 고민해봅시다.";
    } else if (k === 99) {
        // M3 관련: 신뢰도와 구간 길이
        misconceptionId = "M3";
        logicHint = "💡 신뢰도를 99%로 높였더니 구간이 넓어졌죠? '더 확실하게(99%)' 말하기 위해 범위를 넓게 잡는 것과 '정밀함' 사이의 관계를 고민해봅시다.";
    } else {
        // M4 관련: 신뢰도의 본질적 의미
        misconceptionId = "M4";
        logicHint = `💡 신뢰도가 ${k}%라는 것은, 우리가 이 방식을 100번 반복했을 때 ${k}번 성공한다는 뜻입니다. 즉, 이 구간 안에 모평균이 들어있을 확률이 ${k}%인 것이 아닙니다. 차이를 정확히 이해합시다!`;
    }

    // 화면에 힌트 출력
    output.innerHTML = `<div style="text-align:left; line-height:1.6; color:#92400e;">${logicHint}</div>`;

    // Firebase에 힌트 클릭 로그 (hint_logs) 저장
    try {
        await addDoc(collection(db, "hint_logs"), {
            event: "HINT_REQUEST",
            misconception_type: misconceptionId,
            current_settings: {
                sample_size: n,
                confidence_level: k
            },
            timestamp: new Date()
        });
        console.log(`Hint log saved: ${misconceptionId}`);
    } catch (error) {
        console.error("힌트 로그 저장 실패:", error);
    }

    console.log(`현재까지 힌트 확인 횟수: ${hintClickCount}`);
});