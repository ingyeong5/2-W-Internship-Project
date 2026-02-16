// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD55P70I7ro05W84eKKYPYo3Rclb9VIqzM",
  authDomain: "w-me-intern-project.firebaseapp.com",
  projectId: "w-me-intern-project",
  storageBucket: "w-me-intern-project.firebasestorage.app",
  messagingSenderId: "538993774904",
  appId: "1:538993774904:web:b5c4f4253d0d29d19f71cd",
  measurementId: "G-CLHV5HEWRP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// 여기부터 기능성 코드
// 시뮬레이션 로직
const ctx = document.getElementById('ciChart').getContext('2d');
let myChart = new Chart(ctx, { type: 'bar', data: { labels: ['신뢰구간'], datasets: [] } });

document.getElementById('runSim').addEventListener('click', async () => {
    const n = Number(document.getElementById('sampleN').value);
    const k = Number(document.getElementById('confRange').value);
    
    // 1. 로그 데이터 스냅샷 생성
    const logData = {
        event: "NEW_SAMPLE",
        n: n,
        k: k,
        timestamp: new Date()
    };

    // 2. Firebase DB에 저장 (교수님 피드백 핵심!)
    await addDoc(collection(db, "trace_logs"), logData);
    alert("로그가 DB에 저장되었습니다!");

    // 3. 차트 그리기 (단순화된 시각화)
    updateChart(n, k);
});

// 힌트 시스템 (챗봇 대신 로그 기반 힌트)
document.getElementById('hintBtn').addEventListener('click', () => {
    const n = document.getElementById('sampleN').value;
    const hintText = document.getElementById('hintText');
    hintText.classList.remove('hidden');
    
    if(n < 30) {
        hintText.innerText = "힌트: 표본 크기(n)가 30보다 작으면 추정의 신뢰도가 떨어질 수 있어요. n을 더 키워볼까요?";
    } else {
        hintText.innerText = "힌트: 신뢰도를 95%에서 99%로 높였을 때, 구간의 폭이 어떻게 변했나요?";
    }
});