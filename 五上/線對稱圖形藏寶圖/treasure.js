'use strict';
const W=12,H=10,VERSION=2,SAVE='symmetryTreasure.resume.v2',HISTORY='symmetryTreasure.records.v2';
const $=id=>document.getElementById(id);
const mirror=(key,axis)=>{let[r,c]=key.split(',').map(Number);return axis==='V'?`${r},${W-1-c}`:`${H-1-r},${c}`;};
const reflectToHorizontal=given=>given.map(k=>{let[r,c]=k.split(',').map(Number);return `${c-1},${r+1}`;});
const BASE=[
 ['3,3','3,4','4,2','4,5','5,2','5,5','6,3','6,4'],
 ['4,2','4,3','4,4','5,2','5,4','6,2','6,3','6,4','3,3','3,4'],
 ['3,2','4,2','5,2','6,2','2,3','7,3','3,4','4,4','5,4','6,4','4,5','5,5'],
 ['2,3','3,3','3,4','4,3','4,4','4,5','5,3','6,3','6,4','7,2','7,3','2,4','5,4'],
 ['2,3','2,4','3,2','3,5','4,2','4,3','4,4','4,5','5,3','5,4','6,4','7,3','7,4','7,5','3,3','3,4']
];
function makeLevels(variant=false){return BASE.map((given,i)=>{let axis=i%2?'H':'V';let cells=axis==='H'?reflectToHorizontal(given):[...given];if(variant&&Math.random()<.5)cells=cells.map(k=>{let[r,c]=k.split(',').map(Number);return axis==='V'?`${H-1-r},${c}`:`${r},${W-1-c}`;});return {axis,given:cells,id:`v2-${i+1}`};});}
let run=null,tool='draw',undo=[],stroke=null,lastCheck=null,hintTarget=null;
const cells=new Map();
const storage={get(k,fallback){try{return JSON.parse(localStorage.getItem(k))??fallback;}catch{return fallback;}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true;}catch{$('saveStatus').textContent='æ­¤è?ç½®ç„¡æ³•æš«å­˜é€²åº¦ï¼Œé›¢?‹é??¢å??¯èƒ½?ºå¤±??;return false;}}};
function answer(){return new Set(run.levels[run.index].given.map(k=>mirror(k,run.levels[run.index].axis)));}
function editable(key){let[r,c]=key.split(',').map(Number);return r>=0&&r<H&&c>=0&&c<W&&(run.levels[run.index].axis==='V'?c>=W/2:r>=H/2);}
function progress(){return run.results[run.index];}
function persist(){if(run)storage.set(SAVE,run);$('resumeBtn').hidden=!storage.get(SAVE,null);}
function message(text){$('msg').textContent=text;}
function record(kind,extra={}){
 const row={id:crypto.randomUUID(),runId:run.id,at:new Date().toISOString(),kind,mode:run.mode,level:run.index+1,axis:run.levels[run.index].axis,bankVersion:VERSION,given:run.levels[run.index].given,student:{...run.student},cells:[...run.mine],attempts:run.failures,hints:run.hints,elapsed:Math.round((Date.now()-run.startedAt)/1000),...extra};
 const rows=storage.get(HISTORY,[]);rows.push(row);storage.set(HISTORY,rows.slice(-2000));
 $('saveStatus').textContent='å­¸ç?ç´€?„å·²?²å??¨æ­¤è£ç½®??;
 window.dispatchEvent(new CustomEvent('treasure-record', {detail: row}));
}
function start(resume=false){
 if(resume){let saved=storage.get(SAVE,null);if(!validSave(saved)){message('?Šé€²åº¦?¼å?ä¸ç›¸å®¹ï?è«‹é??°é?å§‹ã€?);$('resumeBtn').hidden=true;return;}run=saved;run.startedAt=Date.now()-run.elapsed*1000;}
 else{run={version:VERSION,id:crypto.randomUUID(),mode:$('mode').value,student:{className:$('inClass').value.trim(),name:$('inName').value.trim()||'è¨ªå®¢',seat:$('inSeat').value.trim()},levels:makeLevels($('variant').checked),index:0,mine:[],results:{},failures:0,hints:0,hintStage:0,elapsed:0,startedAt:Date.now(),passed:false};}
 $('startScreen').hidden=true;$('gameScreen').hidden=false;$('endScreen').hidden=true;$('menuBtn').hidden=false;
 undo=[];lastCheck=null;hintTarget=null;build();refresh();persist();
}
function validSave(s){return s?.version===VERSION&&['challenge','practice'].includes(s.mode)&&Array.isArray(s.levels)&&s.levels.length===5&&Number.isInteger(s.index)&&s.index>=0&&s.index<5&&Array.isArray(s.mine)&&s.levels.every(l=>['V','H'].includes(l.axis)&&Array.isArray(l.given)&&l.given.every(k=>/^\d+,\d+$/.test(k)&&k.split(',').map(Number).every((v,i)=>v>=0&&v<(i?W:H))));}
function menu(){if(run){run.elapsed=Math.round((Date.now()-run.startedAt)/1000);persist();}stroke=null;$('startScreen').hidden=false;$('gameScreen').hidden=true;$('endScreen').hidden=true;$('menuBtn').hidden=true;$('resumeBtn').hidden=!storage.get(SAVE,null);}
function choose(i){if(!run||i===run.index)return;if(run.mode==='challenge'&&!run.results[i])return;load(i);}
function load(i){stroke=null;run.index=i;run.mine=run.results[i]?.cells?[...run.results[i].cells]:[];run.passed=Boolean(run.results[i]);run.failures=0;run.hints=0;run.hintStage=0;run.startedAt=Date.now();undo=[];lastCheck=null;hintTarget=null;build();refresh();persist();message(run.passed?'?™ä??œå·²ç¶“å??ï?ä¸æ??è?? é?å¹?€?:'?ˆæ‰¾?ºå??‰æ ¼ï¼Œå??‹å??«ã€?);}
function build(){const g=$('grid');g.replaceChildren();cells.clear();const lv=run.levels[run.index],given=new Set(lv.given);$('axisLine').className=lv.axis.toLowerCase();for(let r=0;r<H;r++)for(let c=0;c<W;c++){let k=`${r},${c}`,b=document.createElement('button');b.type='button';b.dataset.key=k;b.className='cell';b.setAttribute('role','gridcell');b.setAttribute('aria-label',`ç¬?${r+1} ?—ï?ç¬?${c+1} æ¬?{given.has(k)?'ï¼Œé??®æ ¼':''}`);b.disabled=!editable(k);if(given.has(k))b.classList.add('given');b.addEventListener('keydown',e=>{let delta={ArrowLeft:[0,-1],ArrowRight:[0,1],ArrowUp:[-1,0],ArrowDown:[1,0]}[e.key];if(delta){e.preventDefault();let next=cells.get(`${r+delta[0]},${c+delta[1]}`);if(next&&!next.disabled)next.focus();}else if(e.key===' '||e.key==='Enter'){e.preventDefault();if(!e.repeat&&!run.passed){remember();paint(k,tool==='draw'?!run.mine.includes(k):false);commitStroke();}}});g.append(b);cells.set(k,b);}}
function refresh(){if(!run)return;const given=new Set(run.levels[run.index].given);for(const[k,b]of cells){const has=run.mine.includes(k);b.classList.toggle('mine',has);b.textContent=given.has(k)||has?'??:'';b.setAttribute('aria-selected',String(has));b.classList.remove('wrong','missing','pair');}
 $('levelTitle').textContent=`ç¬?${run.index+1} ??Â· ${run.levels[run.index].axis==='V'?'å·¦å³å°ç¨±':'ä¸Šä?å°ç¨±'}`;
 $('levelLabel').textContent=`${run.index+1} / 5`;$('gold').textContent=Object.values(run.results).reduce((n,r)=>n+r.gold,0);$('stars').textContent=`${Object.keys(run.results).length} / 5`;
 $('checkBtn').disabled=run.passed;$('hintBtn').disabled=run.passed||run.failures<3;$('undoBtn').disabled=run.passed||!undo.length;$('clearBtn').disabled=run.passed;
 $('hintBtn').textContent=run.failures<3?`?ç¤ºï¼ˆå??—è©¦ ${3-run.failures} æ¬¡å??‹æ”¾ï¼‰`:'?†æ­¥?ç¤º';$('nextBtn').hidden=!run.passed;$('nextBtn').textContent=run.index===4?'?¥ç?å­¸ç??æ? ??:'ä¸‹ä?????;
 $('islands').replaceChildren();run.levels.forEach((_,i)=>{let b=document.createElement('button');b.className='island'+(i===run.index?' active':'')+(run.results[i]?' done':'');b.textContent=run.results[i]?'??:i+1;b.disabled=run.mode==='challenge'&&!run.results[i]&&i!==run.index;b.setAttribute('aria-label',`ç¬?${i+1} ??{run.results[i]?'ï¼Œå·²å®Œæ?':''}`);b.onclick=()=>choose(i);$('islands').append(b);});
}
function remember(){undo.push([...run.mine]);if(undo.length>40)undo.shift();}
function paint(k,value){if(!editable(k)||run.passed)return;const m=new Set(run.mine);value?m.add(k):m.delete(k);run.mine=[...m];const b=cells.get(k);b.classList.toggle('mine',value);b.textContent=value?'??:'';b.classList.remove('wrong','missing','pair');b.setAttribute('aria-selected',String(value));}
function commitStroke(){stroke=null;$('undoBtn').disabled=!undo.length;persist();}
function hit(e){return document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-key]')?.dataset.key;}
function begin(e){if(!run||run.passed||stroke||e.button>0)return;const k=hit(e);if(!k||!editable(k))return;e.preventDefault();remember();stroke={id:e.pointerId,value:tool==='draw'?!run.mine.includes(k):false,last:k,seen:new Set([k])};$('grid').setPointerCapture(e.pointerId);paint(k,stroke.value);}
function move(e){if(!stroke||stroke.id!==e.pointerId)return;e.preventDefault();const k=hit(e);if(!k||!editable(k))return;const[a,b]=stroke.last.split(',').map(Number),[r,c]=k.split(',').map(Number),steps=Math.max(Math.abs(r-a),Math.abs(c-b));for(let n=1;n<=steps;n++){let cell=`${Math.round(a+(r-a)*n/steps)},${Math.round(b+(c-b)*n/steps)}`;if(!stroke.seen.has(cell)){paint(cell,stroke.value);stroke.seen.add(cell);}}stroke.last=k;}
function finish(e){if(stroke&&stroke.id===e.pointerId)commitStroke();}
function check(){if(!run||run.passed)return;if(!run.mine.length){message('?ˆè©¦?—å??ºè‡³å°‘ä??‹å??‰æ ¼ï¼Œå??‰æª¢?¥ã€?);return;}const signature=[...run.mine].sort().join(';');if(signature===lastCheck){message('?ˆèª¿?´å?å½¢ï??æª¢?¥ä?æ¬¡ï??¸å?ç­”æ?ä¸æ??è?è¨ˆæ¬¡??);return;}lastCheck=signature;
 const ans=answer(),wrong=run.mine.filter(k=>!ans.has(k)),missing=[...ans].filter(k=>!run.mine.includes(k));if(wrong.length||missing.length)run.failures++;record('check',{wrong,missing,correct:!wrong.length&&!missing.length});
 if(!wrong.length&&!missing.length){run.passed=true;if(!progress())run.results[run.index]={cells:[...run.mine],gold:50,attempts:run.failures,hints:run.hints,seconds:Math.round((Date.now()-run.startedAt)/1000),independent:run.hints===0};record('complete',{correct:true});refresh();persist();message('å¯¶ç®±?“é?ï¼å???50 ?‘å¹£?‚é€™ä??œç??å‹µ?ªæ??¼æ”¾ä¸€æ¬¡ã€?);return;}
 refresh();message(`?„è?èª¿æ•´ï¼šå???${wrong.length} ?¼ï?æ¼ç•« ${missing.length} ?¼ã€?{run.failures<3?'æª¢æŸ¥å°æ?ä½ç½®?‡åˆ°ç´…ç??„è??¢ã€?:'?¯ä½¿?¨ã€Œå?æ­¥æ?ç¤ºã€å??©ã€?}`);persist();}
function hint(){if(run.passed||run.failures<3)return;run.hints++;run.hintStage=Math.min(3,run.hintStage+1);const ans=answer(),missing=[...ans].filter(k=>!run.mine.includes(k)),wrong=run.mine.filter(k=>!ans.has(k));refresh();if(run.hintStage===1){message('å°ç¨±?„å…©?¼é€?µ·ä¾†æ??‚ç›´ç©¿é?ç´…ç?ï¼Œå…©?¼åˆ°ç´…ç??„è??¢ç›¸ç­‰ã€‚å??‹é?è¿‘ç?ç·šç??¼å???);}
 else if(run.hintStage===2){hintTarget=missing[0]||wrong[0];if(hintTarget){cells.get(hintTarget)?.classList.add('pair');cells.get(mirror(hintTarget,run.levels[run.index].axis))?.classList.add('pair');}message('ç´«è‰²æ¡†æ˜¯ä¸€çµ„å??‰ä?ç½®ã€‚è?å¯Ÿå??‘åœ¨ç´…ç??©å´?„è??¢ï??è‡ªè¡Œä¿®æ­?€?);}
 else{remember();if(missing.length){paint(missing[0],true);message('ç¤ºç?è£œä?ä¸€?‹å??‰æ ¼ï¼Œå…¶ä»–æ ¼å­è??ªå·±å®Œæ???);}else if(wrong.length){paint(wrong[0],false);message('ç¤ºç?ç§»é™¤ä¸€?‹å??«ç??¼å?ï¼Œå?æª¢æŸ¥?¶ä?ä½ç½®??);}else message('?–å½¢å·²ç?å°ç¨±ï¼Œæ?æª¢æŸ¥ç¢ºè??§ï?');}
 record('hint',{stage:run.hintStage});persist();}
function result(){stroke=null;$('gameScreen').hidden=true;$('endScreen').hidden=false;$('summary').replaceChildren();let completed=Object.entries(run.results);$('finalScore').textContent=`å®Œæ? ${completed.length} ?œï???${completed.reduce((n,[,r])=>n+r.gold,0)} ?‘å¹£?‚`;
 for(const[i,r]of completed){let p=document.createElement('p');p.textContent=`ç¬?${Number(i)+1} ?œï?${r.independent?'?¨ç?å®Œæ?':'ä½¿ç”¨å¼•å?å®Œæ?'}ï½œé?è©?${r.attempts} æ¬¡ï??ç¤º ${r.hints} æ¬¡ï?${r.seconds} ç§’`;$('summary').append(p);}persist();}
function tutorial(){let d=$('tutorial');d.showModal();$('demo').replaceChildren();for(let c=0;c<6;c++){let b=document.createElement('span');b.className='demo-cell'+([1,4].includes(c)?' pair':'');b.textContent=c===1?'??:c===4?'??:'';$('demo').append(b);}}
$('grid').addEventListener('pointerdown',begin);$('grid').addEventListener('pointermove',move);for(const type of ['pointerup','pointercancel','lostpointercapture'])$('grid').addEventListener(type,finish);
$('drawBtn').onclick=()=>{tool='draw';$('drawBtn').setAttribute('aria-pressed','true');$('eraseBtn').setAttribute('aria-pressed','false');};$('eraseBtn').onclick=()=>{tool='erase';$('drawBtn').setAttribute('aria-pressed','false');$('eraseBtn').setAttribute('aria-pressed','true');};
$('undoBtn').onclick=()=>{if(run.passed||!undo.length)return;run.mine=undo.pop();refresh();persist();message('å·²å¾©?Ÿä?ä¸€ç­†æ?ä½œã€?);};$('clearBtn').onclick=()=>{if(run.passed||!run.mine.length)return;remember();run.mine=[];refresh();persist();message('å·²æ??¤ï??¯ç”¨å¾©å?ä¸Šä?æ­¥é??Ÿã€?);};
$('checkBtn').onclick=check;$('hintBtn').onclick=hint;$('startBtn').onclick=()=>start();$('resumeBtn').onclick=()=>start(true);$('menuBtn').onclick=menu;$('nextBtn').onclick=()=>run.index===4?result():load(run.index+1);$('resultBtn').onclick=result;$('againBtn').onclick=menu;$('tutorialBtn').onclick=tutorial;$('closeTutorial').onclick=()=>$('tutorial').close();
$('resumeBtn').hidden=!storage.get(SAVE,null);window.addEventListener('pagehide',()=>{if(run){run.elapsed=Math.round((Date.now()-run.startedAt)/1000);persist();}});
