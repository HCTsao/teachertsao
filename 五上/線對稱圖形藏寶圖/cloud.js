// 線對稱圖形尋寶圖 - Firebase 非同步日誌同步模組 (v7 強化雙軌同步版)
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

  // 嘗試載入相容版 Firebase SDK
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

  // 監聽遊戲作答事件，背景非同步寫入 Firebase (SDK + REST 雙軌保障)
  window.addEventListener('treasure-record', function(e) {
    try {
      const detail = e.detail;
      if (!detail) return;

      const recordId = detail.id || ('rec_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7));
      const axisRaw = detail.axis || 'V';
      const isAxisV = axisRaw === 'V';

      const payload = {
        id: recordId,
        timestamp: Date.now(),
        dateStr: new Date().toISOString().split('T')[0],
        at: detail.at || new Date().toISOString(),
        className: (detail.student && detail.student.className) || '未設定',
        seat: (detail.student && detail.student.seat) || '-',
        studentName: (detail.student && detail.student.name) || '訪客',
        level: Number(detail.level) || 1,
        shapeName: detail.shapeName || `圖形 ${detail.level || 1}`,
        kind: detail.kind || 'check', // check, complete, hint
        mode: detail.mode || 'simple',
        modeLabel: detail.modeLabel || (detail.mode === 'advanced' ? '進階模式(格點連線)' : '簡單模式(方格填色)'),
        axis: isAxisV ? '左右對稱 (鉛直軸)' : '上下對稱 (水平軸)',
        axisRaw: axisRaw,
        attempts: Number(detail.attempts) || 0,
        hints: Number(detail.hints) || 0,
        elapsed: Number(detail.elapsed) || 0,
        wrongCount: Array.isArray(detail.wrong) ? detail.wrong.length : 0,
        missingCount: Array.isArray(detail.missing) ? detail.missing.length : 0,
        isCorrect: detail.kind === 'complete' || (detail.correct === true),
        // 核心座標資料：供教師後台放大檢視圖形與正解重現
        given: Array.isArray(detail.given) ? detail.given : [],
        cells: Array.isArray(detail.cells) ? detail.cells : [],
        target: Array.isArray(detail.target) ? detail.target : [],
        wrongCells: Array.isArray(detail.wrong) ? detail.wrong : [],
        missingCells: Array.isArray(detail.missing) ? detail.missing : []
      };

      // 1. Firebase JS SDK 寫入
      if (database) {
        database.ref(ROOT + '/' + recordId).set(payload).catch(() => {});
      }

      // 2. REST API 雙軌直送 (確保 WebSocket 延遲或阻擋時仍 100% 寫入)
      const restUrl = `${firebaseConfig.databaseURL}/${ROOT}/${recordId}.json`;
      fetch(restUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => {});

    } catch (err) {
      // 靜默捕捉，絕不干擾學生作答
    }
  });
})();
