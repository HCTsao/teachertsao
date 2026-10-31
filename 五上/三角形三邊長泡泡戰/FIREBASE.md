# 三角泡泡戰資料庫

- Firebase 專案：HighGrade（`chickenrabbit-ea442`）
- Realtime Database：`https://chickenrabbit-ea442-default-rtdb.firebaseio.com`
- 本遊戲資料根路徑：`triangleBubble`，由 `firebase-db.js` 統一連線。

## 資料

| 路徑 | 用途 |
| --- | --- |
| `triangleBubble/attempts/{pushId}` | 單人、雙人及電腦對戰的每次作答；班級、姓名、座號、三邊、判斷、正解、對錯、來源及伺服器時間 |
| `triangleBubble/highscores/{pushId}` | 單人遊戲結算成績；依分數排序的排行榜 |
| `triangleBubble/rooms/{四碼房號}` | 雙人房間、雙方名稱、分數、回合、搶答鎖及更新時間 |

原 Supabase 設定是尚未填寫的範例值，沒有可由該設定存取的舊資料需要移轉。

## 查詢索引與權限

Firebase 規則在 `triangleBubble/attempts` 加入 `.indexOn: ["createdAt"]`，
在 `triangleBubble/highscores` 加入 `.indexOn: ["score"]`。
教師後台可依日期、班級、姓名及錯題篩選，最多顯示 500 筆；未選日期時查最近 500 筆。

專案原有根規則為公開讀寫；這次只補查詢索引，未建立教師身分驗證。
遊戲中的老師專區密碼只是頁面入口，不是資料庫的存取保護。
正式處理學生資料時，仍需另行規劃 Firebase Authentication 與資料庫規則。
不能把管理員私鑰或服務帳戶金鑰放入靜態網站。

## 雙人同步

建立房間、第二位玩家加入、搶答及回合結算都採 Firebase ETag 條件寫入。
發生同時寫入時重新讀取並重試，避免兩人同時搶到同一回合或第三人擠入房間。
寫入學習紀錄失敗時會在頁面顯示提醒。

Firebase REST API：
[條件寫入](https://firebase.google.com/docs/database/rest/save-data#section-conditional-requests)、
[查詢與索引](https://firebase.google.com/docs/database/rest/retrieve-data)。
