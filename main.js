import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, query, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 1. Firebase 설정
const firebaseConfig = {
    apiKey: "AIzaSyD55P70I7ro05W84eKKYPYo3Rclb9VIqzM",
    authDomain: "w-me-intern-project.firebaseapp.com",
    projectId: "w-me-intern-project",
    storageBucket: "w-me-intern-project.firebasestorage.app",
    messagingSenderId: "538993774904",
    appId: "1:538993774904:web:b5c4f4253d0d29d19f71cd",
    measurementId: "G-CLHV5HEWRP"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- 전역 변수 및 설정 추적 ---
let userNickname = "";
let hintCount = 0;       // 힌트 총 사용 개수
let totalCount = 0;      // 생성한 총 표본 개수
let lastN = null; 
let lastK = null; 

const AD_MEAN = 100;
const REAL_MEAN = 96;
const STD_DEV = 15;
const zTable = { 95: 1.96, 96: 2.05, 97: 2.17, 98: 2.33, 99: 2.58 };

function generateNormal(mean, std) {
    const u1 = Math.random(), u2 = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z * std + mean;
}

// --- 슬라이더 수치 업데이트 ---
const nSlider = document.getElementById('nSlider');
const nVal = document.getElementById('nVal');
const confSlider = document.getElementById('confSlider');
const confVal = document.getElementById('confVal');

if(nSlider && nVal) nSlider.addEventListener('input', (e) => { nVal.innerText = e.target.value; });
if(confSlider && confVal) confSlider.addEventListener('input', (e) => { confVal.innerText = e.target.value; });

// 닉네임 등록
document.getElementById('startBtn').addEventListener('click', () => {
    const nick = document.getElementById('nicknameInput').value;
    if (nick.trim()) {
        userNickname = nick;
        document.getElementById('loginModal').style.display = 'none';
        document.querySelector('.user-name').innerText = userNickname;
    }
});

// 차트 초기화
const ctx = document.getElementById('ciChart').getContext('2d');
let myChart = new Chart(ctx, {
    type: 'bar',
    data: { 
        labels: [], 
        datasets: [{ 
            label: '신뢰구간 범위', 
            data: [], 
            backgroundColor: [], 
            borderRadius: 6,
            categoryPercentage: 1.0,
            barPercentage: 0.8
        }] 
    },
    options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        scales: { 
            x: { min: 70, max: 130, title: { display: true, text: '배터리 수명 (시간)', font: { weight: 'bold' } } },
            y: { ticks: { autoSkip: false, font: { size: 10 }, padding: 10 } }
        },
        plugins: {
            annotation: {
                annotations: {
                    line1: { type: 'line', xMin: 100, xMax: 100, borderColor: 'red', borderWidth: 2, borderDash: [5, 5], label: { content: '광고(100)', display: true } }
                }
            },
            legend: { display: false }
        }
    }
});

// --- [수정] 1. simulation_logs 저장 로직 ---
document.getElementById('runSim').addEventListener('click', async () => {
    if (!userNickname) return alert("닉네임을 먼저 등록하세요.");

    const n = Number(nSlider.value);
    const k = Number(confSlider.value);
    const z = zTable[k];
    const se = STD_DEV / Math.sqrt(n);

    const settingsChanged = (n !== lastN || k !== lastK);
    let currentBatchResults = []; // 현재 추출된 5개 범위 저장용

    for (let i = 0; i < 5; i++) {
        totalCount++;
        const sampleMean = generateNormal(REAL_MEAN, se);
        const lower = sampleMean - (z * se);
        const upper = sampleMean + (z * se);
        const isHit = (lower <= AD_MEAN && upper >= AD_MEAN);
        
        const rangeText = `${lower.toFixed(2)} ~ ${upper.toFixed(2)}`;
        currentBatchResults.push(`표본#${totalCount} - ${rangeText}`);

        let label = `#${totalCount}`;
        if (i === 0 && settingsChanged) label += ` (n=${n}, k=${k}%)`;

        myChart.data.labels.push(label);
        myChart.data.datasets[0].data.push([lower, upper]);
        myChart.data.datasets[0].backgroundColor.push(isHit ? 'rgba(37, 99, 235, 0.6)' : 'rgba(239, 68, 68, 0.6)');
    }

    lastN = n; lastK = k;

    while (myChart.data.labels.length > 50) {
        myChart.data.labels.shift();
        myChart.data.datasets[0].data.shift();
        myChart.data.datasets[0].backgroundColor.shift();
    }
    myChart.update();

    const totalBars = myChart.data.datasets[0].data.length;
    const hitBars = myChart.data.datasets[0].backgroundColor.filter(c => c.includes('37, 99, 235')).length;
    document.getElementById('hitCount').innerText = `${hitBars} / ${totalBars}`;

    // simulation_logs 컬렉션 저장
    try {
        await addDoc(collection(db, "simulation_logs"), {
            nickname: userNickname,
            n: n,
            k: k,
            results: currentBatchResults,
            timestamp: new Date()
        });
    } catch (e) { console.error("시뮬레이션 로그 저장 실패:", e); }
});

// 초기화
document.getElementById('resetBtn').addEventListener('click', () => {
    totalCount = 0; hintCount = 0;
    lastN = null; lastK = null;
    myChart.data.labels = [];
    myChart.data.datasets[0].data = [];
    myChart.data.datasets[0].backgroundColor = [];
    myChart.update();
    document.getElementById('hitCount').innerText = "0 / 0";
});

// --- [수정] 2. hint_logs 저장 로직 ---
document.getElementById('hintBtn').addEventListener('click', async () => {
    hintCount++;
    const n = Number(nSlider.value);
    const k = Number(confSlider.value);
    const output = document.getElementById('hintOutputBox');
    
    let msg = "";
    let mid = ""; 

    if (n >= 500 && k === 95) {
        mid = "표본과 신뢰도의 조화 (M2, M8)";
        msg = `표본은 충분히 많은데 신뢰도는 낮네요. 신뢰도를 99%로 높여보세요. 이때 늘어나는 구간의 길이를 감당할 만큼 표본(n)이 충분한지도 고민해봅시다.`;
    } else if (n < 30) {
        mid = "표준오차의 이해 (M7)";
        msg = `표본이 너무 적으면 n의 값이 작아져 표준오차가 커집니다. 표준오차 식에서 n이 작을 때 결과가 어떻게 될지 고민해봅시다.`;
    } else if (k === 99) {
        mid = "신뢰도와 구간의 폭의 관계 (M3)";
        msg = `신뢰도를 99%로 높였더니 구간이 넓어졌죠? '더 확실하게(99%)' 말하기 위해 범위를 넓게 잡는 것과 '정밀함' 사이의 관계를 고민해봅시다.`;
    } else {
        mid = "신뢰도의 본질적 의미 (M4)";
        msg = `신뢰도가 ${k}%라는 것은, 우리가 이 방식을 100번 반복했을 때 ${k}번 성공한다는 뜻입니다. 즉, 이 구간 안에 모평균이 들어있을 확률이 ${k}%인 것이 아닙니다. 차이를 정확히 이해합시다!`;
    }

    output.innerHTML = `<div style="line-height: 1.6;">💡 ${msg}</div>`;

    try {
        await addDoc(collection(db, "hint_logs"), {
            nickname: userNickname,
            n: n,
            k: k,
            misconception_type: mid,
            total_samples_generated: totalCount,
            timestamp: new Date()
        });
    } catch (e) { console.error("힌트 로그 저장 실패:", e); }
});

// --- [수정] 3. report_submissions 저장 로직 ---
document.getElementById('submitBtn').addEventListener('click', async () => {
    const content = document.getElementById('reflectionNote').value;
    if (!content.trim()) return alert("내용을 입력하세요.");
    
    try {
        await addDoc(collection(db, "report_submissions"), {
            nickname: userNickname,
            n: Number(nSlider.value),
            k: Number(confSlider.value),
            content: content,
            total_hints_used: hintCount,
            total_samples_generated: totalCount,
            timestamp: new Date()
        });
        alert("리포트가 성공적으로 제출되었습니다!");
        document.getElementById('reflectionNote').value = "";
    } catch (e) { console.error("리포트 제출 실패:", e); }
});

// 미션 토글 및 관리자 모드
document.getElementById('missionToggleBtn').addEventListener('click', () => {
    const content = document.getElementById('missionContent');
    content.classList.toggle('hidden-content');
    document.getElementById('missionToggleBtn').innerText = content.classList.contains('hidden-content') ? "🔍 미션 내용 보기" : "🔼 미션 내용 접기";
});

document.getElementById('adminTrigger').addEventListener('click', () => {
    const sec = document.getElementById('adminSection');
    const isHidden = (sec.style.display === 'none' || sec.style.display === '');
    if (isHidden) {
        sec.style.display = 'block';
        loadReports();
        setTimeout(() => sec.scrollIntoView({ behavior: 'smooth' }), 50);
    } else {
        sec.style.display = 'none';
    }
});

document.getElementById('refreshBtn').addEventListener('click', loadReports);

async function loadReports() {
    const body = document.getElementById('reportTableBody');
    body.innerHTML = '<tr><td colspan="6">데이터 로딩 중...</td></tr>';
    
    try {
        const q = query(collection(db, "report_submissions"), orderBy("timestamp", "desc"));
        const snap = await getDocs(q);
        body.innerHTML = '';
        
        snap.forEach(doc => {
            const d = doc.data();
            body.insertAdjacentHTML('beforeend', `
                <tr>
                    <td>${d.nickname}</td>
                    <td>${d.n}</td>
                    <td>${d.k}%</td>
                    <td>${d.total_hints_used}회</td>
                    <td>${d.total_samples_generated}개</td>
                    <td>${d.content}</td>
                </tr>
            `);
        });
    } catch (e) {
        console.error("데이터 로드 실패:", e);
        body.innerHTML = '<tr><td colspan="6" style="color:red;">데이터 로딩 실패</td></tr>';
    }
}