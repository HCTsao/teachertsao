(function (scope) {
  'use strict';
  const DEFAULT_ROOT = 'https://chickenrabbit-ea442-default-rtdb.firebaseio.com/triangleBubble';

  function createTriangleDatabase(root = DEFAULT_ROOT) {
    const timestamp = () => ({ '.sv': 'timestamp' });
    const roomPath = code => {
      if (!/^[A-Z0-9]{4}$/.test(code)) throw new Error('請輸入正確的 4 碼房號');
      return 'rooms/' + code;
    };
    async function request(path, options = {}, query = {}) {
      const url = new URL(root + '/' + path + '.json');
      Object.entries(query).forEach(([key, value]) => url.searchParams.set(key, JSON.stringify(value)));
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      try {
        const response = await fetch(url, {
          method: options.method || 'GET', cache: 'no-store', signal: controller.signal,
          headers: { 'Content-Type': 'application/json', ...options.headers },
          ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {})
        });
        const data = await response.json();
        if (!response.ok && response.status !== 412) {
          throw new Error(data?.error || '資料庫連線失敗（' + response.status + '）');
        }
        return { data, status: response.status, etag: response.headers.get('ETag') };
      } finally { clearTimeout(timeout); }
    }
    // 以 ETag 條件寫入：房號不能重複、第二位玩家及同回合搶答都只能有一位成功。
    async function transaction(path, update) {
      for (let retry = 0; retry < 8; retry++) {
        const current = await request(path, { headers: { 'X-Firebase-ETag': 'true' } });
        const next = update(current.data);
        if (next === undefined) return false;
        if (!current.etag) throw new Error('資料庫未提供交易驗證，請稍後再試');
        const result = await request(path, {
          method: 'PUT', headers: { 'if-match': current.etag }, body: next
        });
        if (result.status !== 412) return true;
      }
      throw new Error('連線忙碌，請再試一次');
    }
    const rows = data => Object.entries(data || {}).map(([id, row]) => ({
      ...row, id, created_at: new Date(row.createdAt || 0).toISOString()
    }));
    return {
      async checkConnection() { await request('rooms', {}, { shallow: true }); },
      async saveLog(collection, row) {
        if (!['attempts', 'highscores'].includes(collection)) throw new Error('不支援的紀錄類型');
        return (await request(collection, {
          method: 'POST', body: { ...row, createdAt: timestamp() }
        })).data.name;
      },
      async listScores(limit = 10) {
        const result = await request('highscores', {}, { orderBy: 'score', limitToLast: limit });
        return rows(result.data).sort((a, b) => b.score - a.score || b.createdAt - a.createdAt);
      },
      async listAttempts({ date, cls, name, wrongOnly } = {}) {
        const query = { orderBy: 'createdAt' };
        if (date) {
          const start = new Date(date + 'T00:00:00');
          const end = new Date(start);
          end.setDate(end.getDate() + 1);
          query.startAt = start.getTime();
          query.endAt = end.getTime() - 1;
        } else { query.limitToLast = 500; }
        const result = await request('attempts', {}, query);
        return rows(result.data).filter(row => (!cls || row.class === cls) &&
          (!name || row.name === name) && (!wrongOnly || row.correct === false))
          .sort((a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id)).slice(0, 500);
      },
      async getRoom(code) { return (await request(roomPath(code))).data; },
      async createRoom(code, name) {
        const created = await transaction(roomPath(code), room => room ? undefined : {
          code, p1_name: name, p2_name: '', p1_score: 0, p2_score: 0,
          round: 1, turn: 'p1', phase: 'lobby', last_actor: '', winner: '',
          last_sides: [3, 4, 5], last_guess: false, last_can: true, last_correct: false,
          createdAt: timestamp(), updatedAt: timestamp()
        });
        if (!created) throw new Error('房號重複，請重試');
      },
      async joinRoom(code, name) {
        return transaction(roomPath(code), room => {
          if (!room) throw new Error('找不到這個房間，請確認房號');
          if (room.p2_name || room.phase !== 'lobby') throw new Error('這個房間已經客滿或開始了');
          return { ...room, p2_name: name, phase: 'answer', updatedAt: timestamp() };
        });
      },
      async claimRound(code, round, actor) {
        return transaction(roomPath(code), room => {
          if (!room || room.round !== round || room.last_actor || room.winner || room.phase !== 'answer') return;
          return { ...room, last_actor: actor, claimedAt: timestamp(), updatedAt: timestamp() };
        });
      },
      async completeRound(code, round, actor, patch) {
        const completed = await transaction(roomPath(code), room => {
          if (!room || room.round !== round || room.last_actor !== actor) return;
          return { ...room, ...patch, claimedAt: null, updatedAt: timestamp() };
        });
        if (!completed) throw new Error('回合已更新，請等候畫面同步');
      },
      async releaseClaim(code, round, actor) {
        return transaction(roomPath(code), room => {
          if (!room || room.round !== round || room.last_actor !== actor) return;
          return { ...room, last_actor: '', claimedAt: null, updatedAt: timestamp() };
        });
      },
      async releaseStaleClaim(code) {
        return transaction(roomPath(code), room => {
          if (!room?.last_actor || !room.claimedAt || Date.now() - room.claimedAt < 20000) return;
          return { ...room, last_actor: '', claimedAt: null, updatedAt: timestamp() };
        });
      },
      async startRoom(code) {
        return transaction(roomPath(code), room => {
          if (!room || room.phase !== 'lobby' || !room.p2_name) return;
          return { ...room, phase: 'answer', updatedAt: timestamp() };
        });
      }
    };
  }
  function showSaveError(error) {
    console.error('學習紀錄儲存失敗', error);
    let notice = document.getElementById('database-status');
    if (!notice) {
      notice = document.createElement('div');
      notice.id = 'database-status';
      notice.setAttribute('role', 'status');
      notice.style.cssText = 'position:fixed;bottom:8px;left:8px;z-index:2000;background:#fff3cd;color:#713f12;padding:6px 10px;border-radius:8px;font:14px system-ui';
      document.body.appendChild(notice);
    }
    notice.textContent = '⚠️ 學習紀錄尚未儲存成功，請確認網路連線。';
  }
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createTriangleDatabase, escapeHTML };
  } else {
    scope.TriangleDatabase = createTriangleDatabase();
    scope.TriangleDatabase.showSaveError = showSaveError;
    scope.TriangleDatabase.escapeHTML = escapeHTML;
  }
})(typeof window !== 'undefined' ? window : globalThis);
