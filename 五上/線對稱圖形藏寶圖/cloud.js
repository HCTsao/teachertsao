import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {getAuth,signInAnonymously,GoogleAuthProvider,signInWithPopup,signOut} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {getDatabase,ref,get,set,query,orderByChild,limitToLast} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';
const config={apiKey:'AIzaSyCFNaVRETt862_As1hF7Mfyr22pKM5-lvk',authDomain:'chickenrabbit-ea442.firebaseapp.com',databaseURL:'https://chickenrabbit-ea442-default-rtdb.firebaseio.com',projectId:'chickenrabbit-ea442',appId:'1:65728951973:web:efff912caf5f6f185abf4c'};
const app=initializeApp(config,'symmetryTreasure'),auth=getAuth(app),db=getDatabase(app),OWNER='a0987912307@gmail.com',ROOT='symmetryTreasure',HISTORY='symmetryTreasure.records.v2';
const $=id=>document.getElementById(id);let enabled=false,syncing=false;
const teacher=u=>u?.email===OWNER&&u.emailVerified&&u.providerData.some(p=>p.providerId==='google.com');
function status(text){const el=$('cloudStatus')||$('saveStatus');if(el)el.textContent=text;}
async function checkGate(){
 const base=config.databaseURL+'/'+ROOT;
 const gate=await fetch(base+'/config/cloudEnabled.json',{cache:'no-store'});if(!gate.ok||await gate.json()!==true)return false;
 // 若根節點仍公開，拒絕傳送紀錄，避免只加登入介面卻未實際保護資料。
 const privacy=await fetch(base+'/records.json?shallow=true',{cache:'no-store'});
 if(privacy.status!==401&&privacy.status!==403)throw Error('資料權限尚未完成，暫不傳送學生資料。');
 return true;
}
async function sync(){if(!enabled||syncing||!$('startBtn'))return;syncing=true;try{
 await auth.authStateReady();if(!auth.currentUser)await signInAnonymously(auth);
 let all=JSON.parse(localStorage.getItem(HISTORY)||'[]');
 for(const row of all.filter(r=>!r.cloudSynced)){
  const location=ref(db,ROOT+'/records/'+row.id);let exists=false;
  try{exists=(await get(location)).exists();}catch(e){if(e.code!=='PERMISSION_DENIED'&&!String(e.code).includes('permission-denied'))throw e;}
  if(!exists){const clean={...row,ownerUid:auth.currentUser.uid};delete clean.cloudSynced;await set(location,clean);}
  // 重新讀取以保留同步期間學生剛新增的紀錄。
  const latest=JSON.parse(localStorage.getItem(HISTORY)||'[]');const found=latest.find(r=>r.id===row.id);if(found)found.cloudSynced=true;localStorage.setItem(HISTORY,JSON.stringify(latest));
 }
 status('學習紀錄已同步到教師專用資料庫。');
 }catch(e){status('雲端尚未同步成功；紀錄仍留在此裝置，可先匯出備份。');console.error(e);}finally{syncing=false;}}
async function load(){if(!teacher(auth.currentUser)){status('請使用指定教師帳號登入。');return;}
 try{status('查詢中…');const data=await get(query(ref(db,ROOT+'/records'),orderByChild('at'),limitToLast(1000)));const rows=Object.values(data.val()||{}).filter(r=>(!$('filterDate').value||new Date(r.at).toLocaleDateString('sv-SE')===$('filterDate').value)&&(!$('filterClass').value||r.student.className.includes($('filterClass').value))&&(!$('filterName').value||r.student.name.includes($('filterName').value))).sort((a,b)=>b.at.localeCompare(a.at));$('cloudRows').replaceChildren();for(const r of rows){let tr=document.createElement('tr');for(const v of [new Date(r.at).toLocaleString(),r.student.className,r.student.name,r.level,({check:'檢查',complete:'完成',hint:'提示'})[r.kind],r.attempts,r.hints,r.elapsed]){let td=document.createElement('td');td.textContent=v;tr.append(td);}$('cloudRows').append(tr);}status(`最近 1000 筆中符合條件 ${rows.length} 筆。`);}catch(e){status('查詢失敗，請確認登入與資料權限。');console.error(e);}}
if($('cloudLogin')){
 $('cloudLogin').onclick=async()=>{try{if(!enabled)return;await signInWithPopup(auth,new GoogleAuthProvider());if(!teacher(auth.currentUser)){await signOut(auth);status('此帳號未獲教師查詢授權。');return;}$('cloudFilters').hidden=false;$('cloudLogout').hidden=false;await load();}catch(e){status('登入未完成，請確認 Google 登入設定及瀏覽器彈出視窗。');console.error(e);}};
 $('cloudLogout').onclick=async()=>{await signOut(auth);$('cloudFilters').hidden=true;$('cloudRows').replaceChildren();$('cloudLogout').hidden=true;status('已登出。');};$('cloudQuery').onclick=load;
}
try{enabled=await checkGate();if($('cloudLogin'))$('cloudLogin').disabled=!enabled;if(!enabled)status('Firebase 教師權限尚待確認；完整紀錄目前保留在此裝置。');else if($('cloudLogin')){await auth.authStateReady();if(teacher(auth.currentUser)){$('cloudFilters').hidden=false;$('cloudLogout').hidden=false;await load();}else status('請使用教師 Google 帳號登入。');}else await sync();}catch(e){status(e.message||'雲端尚未啟用，紀錄保留在此裝置。');}
window.addEventListener('treasure-record',sync);window.addEventListener('online',sync);
