// 線對稱圖形尋寶圖 - Firebase 非同步日誌同步模組
(function() {
  const firebaseConfig = {
    apiKey: 'AIzaSyCFNaVRETt862_As1hF7Mfyr22pKM5-lvk',
    authDomain: 'chickenrabbit-ea442.firebaseapp.com',
    databaseURL: 'https://chickenrabbit-ea442-default-rtdb.firebaseio.com',
    projectId: 'chickenrabbit-ea442',
    appId: '1:65728951973:web:efff912caf5f6f185abf4c'
  };

  let database = null;
  const ROOT = 'symmetryTreasure/records';

  function initFirebase() {
    try {
      if (typeof firebase !== 'undefined' && !firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        database = firebase.database();
      } else if (typeof firebase !== 'undefined') {
        database = firebase.database();
      }
    } catch (e) {
      console.warn('Firebase 初始化未完成，保持離線運作：', e);
    }
  }

  // 嘗試載入相容版 Firebase SDK (若頁面尚未引入)
  if (typeof firebase === 'undefined') {
    const s1 = document.createElement('script');
    s1.src = 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js';
    s1.onload = () => {
      const s2 = document.createElement('script');
      s2.src = 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database-compat.js';
      s2.onload = () => {
        initFirebase();
      };
      document.head.appendChild(s2);
    };
    document.head.appendChild(s1);
  } else {
    initFirebase();
  }

  // 監聽遊戲作答事件，背景非同步寫入 Firebase
  window.addEventListener('treasure-record', function(e) {
    try {
      const detail = e.detail;
      if (!detail) return;

      const payload = {
        id: detail.id || ('rec_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)),
        timestamp: Date.now(),
        dateStr: new Date().toISOString().split('T')[0],
        at: detail.at || new Date().toISOString(),
        className: (detail.student && detail.student.className) || '未設定',
        seat: (detail.student && detail.student.seat) || '-',
        studentName: (detail.student && detail.student.name) || '訪客',
        level: detail.level || 1,
        kind: detail.kind || 'check', // check, complete, hint
        axis: detail.axis === 'V' ? '左右對稱 (鉛直軸)' : '上下對稱 (水平軸)',
        attempts: Number(detail.attempts) || 0,
        hints: Number(detail.hints) || 0,
        elapsed: Number(detail.elapsed) || 0,
        wrongCount: Array.isArray(detail.wrong) ? detail.wrong.length : 0,
        missingCount: Array.isArray(detail.missing) ? detail.missing.length : 0,
        isCorrect: detail.kind === 'complete' || (detail.correct === true)
      };

      if (database) {
        database.ref(ROOT + '/' + payload.id).set(payload).catch(() => {});
      }
    } catch (err) {
      // 靜默捕捉，絕不干擾學生作答
    }
  });
})();
