const PAGES=['dashboard','accounts','history','stats','budget','invest','settings'];
const PALETTE=['#1D9E75','#D85A30','#378ADD','#BA7517','#534AB7','#D4537E','#888780','#5DCAA5','#E24B4A','#EF9F27'];
const THEMES=[
  {id:'dark',name:'🌙 Dark',bg:'#0a0a0c',ac:'#5DCAA5'},
  {id:'light',name:'☀️ Light',bg:'#f8f7f4',ac:'#1D9E75'},
  {id:'midnight',name:'🌊 Midnight',bg:'#060b18',ac:'#5b8cff'},
  {id:'ocean',name:'🐚 Ocean',bg:'#04161c',ac:'#2fd4c4'},
  {id:'forest',name:'🌲 Forest',bg:'#0a140d',ac:'#4ade80'},
  {id:'sunset',name:'🌅 Sunset',bg:'#1a0f12',ac:'#ff8a5c'},
  {id:'grape',name:'🍇 Grape',bg:'#120a1c',ac:'#b794f6'},
  {id:'mocha',name:'☕ Mocha',bg:'#181210',ac:'#d4a373'},
  {id:'nord',name:'❄️ Nord',bg:'#2e3440',ac:'#88c0d0'},
  {id:'rose',name:'🌹 Rose',bg:'#1a1013',ac:'#fb7185'}
];
const ICONS=['🍜','🎬','🛵','🎮','📦','💵','💻','🎬','📈','🏠','🍺','☕','💊','🏥','📱','🎵','📚','✈️','🎁','👕','💇','🐕','⛽','🔌','📡','🛒','🎯','🏋️','💪','🎨','🖥️','⌨️','🎥','🔧','📸','🎤','🪙','🥇','💳','🏦','💰','📊','🎓','🏢','🍕','🍔','🥤','🧃','🍰'];
const DEF_CHI=[{name:'Ăn uống',emoji:'🍜',color:'#D85A30'},{name:'Thiết bị',emoji:'🎬',color:'#378ADD'},{name:'Di chuyển',emoji:'🛵',color:'#BA7517'},{name:'Giải trí',emoji:'🎮',color:'#534AB7'},{name:'Khác',emoji:'📦',color:'#888780'}];
const DEF_THU=[{name:'Lương',emoji:'💵',color:'#1D9E75'},{name:'Freelance',emoji:'💻',color:'#5DCAA5'},{name:'Dự án phim',emoji:'🎬',color:'#378ADD'},{name:'Đầu tư',emoji:'📈',color:'#BA7517'},{name:'Khác',emoji:'📦',color:'#888780'}];
const ACC_ICONS={cash:'💵',techcombank:'🏦',momo:'📱',vietinbank:'🏛',acb:'🏦',paypal:'💳',shopeepay:'🛒',other:'📦'};
const ACC_NAMES={cash:'Tiền mặt',techcombank:'Techcombank',momo:'MoMo',vietinbank:'VietinBank',acb:'ACB',paypal:'PayPal',shopeepay:'ShopeePay',other:'Khác'};

let txData=JSON.parse(localStorage.getItem('fin_tx')||'[]');
let budgets=JSON.parse(localStorage.getItem('fin_budgets')||'{}');
let opening=parseFloat(localStorage.getItem('fin_opening')||'0');
let catsChi=JSON.parse(localStorage.getItem('fin_cats_chi')||'null')||DEF_CHI;
let catsThu=JSON.parse(localStorage.getItem('fin_cats_thu')||'null')||DEF_THU;
let investments=JSON.parse(localStorage.getItem('fin_inv')||'[]');
let accounts=JSON.parse(localStorage.getItem('fin_accounts')||'[]');
let theme=localStorage.getItem('fin_theme')||'dark';
let soundOn=localStorage.getItem('fin_sound')!=='false';
let newColorChi=PALETTE[0],newColorThu=PALETTE[0],newIconChi=ICONS[0],newIconThu=ICONS[5];
let viewMonth=new Date().getMonth(),viewYear=new Date().getFullYear();
let charts={};
// Google Sheets sync đã gỡ — chỉ còn Firebase. Vô hiệu hoá hoàn toàn đường Sheets.
let syncUrl='';localStorage.removeItem('fin_sync_url');
let syncConnected=false;
if(localStorage.getItem('fin_cats')&&!localStorage.getItem('fin_cats_chi')){catsChi=JSON.parse(localStorage.getItem('fin_cats'));localStorage.setItem('fin_cats_chi',JSON.stringify(catsChi));}

const $=id=>document.getElementById(id);
const fmt=n=>'₫'+Math.round(Math.abs(n)).toLocaleString('vi-VN');
const fmtShort=n=>{const a=Math.abs(n);if(a>=1e9)return(n/1e9).toFixed(1)+'B';if(a>=1e6)return(n/1e6).toFixed(1)+'M';if(a>=1e3)return(n/1e3).toFixed(0)+'K';return String(n);};
const timeStr=iso=>new Date(iso).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'});
const dateStr=iso=>new Date(iso).toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit'});
const fullDate=iso=>new Date(iso).toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'});

/* ── SMART INPUT: nhập 5→5000, 50→50000, 500→500000, 5000→5000000 ── */
function smartAmount(raw){
  const n=parseFloat(raw);if(!n||isNaN(n))return 0;
  return n*1000;
}
function smartPreview(input,previewId){
  const n=parseFloat(input.value);
  const el=$(previewId);if(!el)return;
  if(!n||isNaN(n)){el.textContent='';return;}
  el.textContent='= '+fmt(n*1000);
}

/* ── SOUND ── */
const audioCtx=new (window.AudioContext||window.webkitAudioContext)();
function playClick(){if(!soundOn)return;const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.connect(g);g.connect(audioCtx.destination);o.frequency.value=800;g.gain.value=.08;o.start();g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+.08);o.stop(audioCtx.currentTime+.08);}
function playSuccess(){if(!soundOn)return;[800,1200].forEach((f,i)=>{const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.connect(g);g.connect(audioCtx.destination);o.frequency.value=f;g.gain.value=.06;o.start(audioCtx.currentTime+i*.08);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+i*.08+.1);o.stop(audioCtx.currentTime+i*.08+.1);});}
/* HAPTIC: rung nhẹ khi chạm nút. iOS dùng mẹo toggle <input switch>; Android dùng Vibration API. */
let _hapticLast=0;
function hapticTap(){
  const now=(window.performance&&performance.now)?performance.now():Date.now();
  if(now-_hapticLast<40)return; // chống rung dồn khi 1 thao tác bắn nhiều event
  _hapticLast=now;
  try{if(navigator.vibrate)navigator.vibrate(8);}catch(e){}            // Android / trình duyệt hỗ trợ
  try{const l=document.getElementById('hapticLabel');if(l)l.click();}catch(e){} // iOS 17.4+
}
/* Gắn haptic cho MỌI nút/điều khiển (cả phần tử thêm động) bằng event delegation. */
document.addEventListener('pointerdown',function(e){
  if(e.pointerType==='mouse')return; // chỉ rung trên cảm ứng
  const t=e.target.closest('button,.btn,.btn-full,.mob-nav-btn,.nav-item,.fab,.chi-type-btn,.quick-chip,.theme-btn,.tx-del,.acc-edit,.acc-card,.tg-month-chip,.icon-opt,.color-opt,[onclick],input[type="checkbox"],input[type="radio"],select');
  if(t&&t.id!=='hapticSwitch')hapticTap();
},{passive:true,capture:true});

/* ── PERSIST ── */
const save=()=>{localStorage.setItem('fin_tx',JSON.stringify(txData));setDirty();fbSaveAll();};
const saveCatsChi=()=>{localStorage.setItem('fin_cats_chi',JSON.stringify(catsChi));cloudSaveSettings();fbSaveAll();};
const saveCatsThu=()=>{localStorage.setItem('fin_cats_thu',JSON.stringify(catsThu));cloudSaveSettings();fbSaveAll();};
const saveBudgets=()=>{localStorage.setItem('fin_budgets',JSON.stringify(budgets));cloudSaveSettings();fbSaveAll();};
const saveInv=()=>{localStorage.setItem('fin_inv',JSON.stringify(investments));setDirty();fbSaveAll();};
const saveAccounts=()=>{localStorage.setItem('fin_accounts',JSON.stringify(accounts));setDirty();cloudSaveSettings();fbSaveAll();};
function saveOpening(){opening=parseFloat($('openingBal').value)||0;localStorage.setItem('fin_opening',opening);cloudSaveSettings();fbSaveAll();}
function toggleSound(){soundOn=!soundOn;localStorage.setItem('fin_sound',soundOn);$('soundToggle').className='toggle'+(soundOn?' on':'');if(soundOn)playClick();}
function setTheme(t){theme=t;document.body.setAttribute('data-theme',t);localStorage.setItem('fin_theme',t);renderThemeRow();}

/* ── TOAST ── */
function showToast(msg,ok=true){const t=$('toast');t.textContent=(ok?'✓ ':'✗ ')+msg;t.style.borderColor=ok?'rgba(29,158,117,.4)':'rgba(216,90,48,.4)';t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200);}

/* ── NAV ── */
function showPage(p){playClick();document.querySelectorAll('.page').forEach(el=>el.classList.remove('active'));$('page-'+p).classList.add('active');document.querySelectorAll('.nav-item').forEach(el=>el.classList.toggle('active',el.dataset.page===p));document.querySelectorAll('.gn-item').forEach(el=>el.classList.toggle('active',el.dataset.page===p));gnSync();if(p==='accounts')renderAccounts();if(p==='history')renderHistory();if(p==='stats')renderStats();if(p==='budget')renderBudget();if(p==='invest')renderInvest();if(p==='settings')renderSettings();if(p==='tragop')renderTragop();if(p==='gold')initGoldPage();}

/* ── MONTH ── */
function changeMonth(d){viewMonth+=d;if(viewMonth>11){viewMonth=0;viewYear++;}if(viewMonth<0){viewMonth=11;viewYear--;}updateAll();}
function getViewMonthTx(){return txData.filter(t=>{const d=new Date(t.date);return d.getMonth()===viewMonth&&d.getFullYear()===viewYear;});}
function monthLabel(){return new Date(viewYear,viewMonth).toLocaleDateString('vi-VN',{month:'long',year:'numeric'});}

/* ── ACCOUNTS ── */
function addAccount(){
  const type=$('accType').value;
  const name=$('accName').value.trim()||ACC_NAMES[type];
  const bal=smartAmount($('accBal').value);
  if(!bal){showToast('Nhập số dư',false);return;}
  accounts.push({id:Date.now(),type,name,balance:bal});
  saveAccounts();$('accName').value='';$('accBal').value='';$('accPreview').textContent='';
  renderAccounts();updateAll();playSuccess();showToast('Đã thêm: '+name);
}
function deleteAccount(id){accounts=accounts.filter(a=>a.id!==id);saveAccounts();renderAccounts();updateAll();}
function updateAccBal(id,raw){const a=accounts.find(x=>x.id===id);if(a){a.balance=smartAmount(raw);saveAccounts();renderAccounts();updateAll();}}
function totalAccounts(){return accounts.reduce((s,a)=>s+a.balance,0);}

function renderAccounts(){
  const total=totalAccounts();
  $('accTotalMetric').innerHTML=`<div class="metric"><div class="label">Tổng tài khoản</div><div class="val val-white">${fmt(total)}</div><div class="sub-val">${accounts.length} tài khoản</div></div>`;
  $('accGrid').innerHTML=accounts.map(a=>`
    <div class="acc-card">
      <span class="acc-icon">${ACC_ICONS[a.type]||'📦'}</span>
      <div class="acc-info"><div class="acc-name">${a.name}</div><div class="acc-bal">${fmt(a.balance)}</div></div>
      <span class="acc-edit" onclick="const v=prompt('Số dư mới (smart: 5000=5tr):',${a.balance/1000});if(v!==null)updateAccBal(${a.id},v)">✏</span>
      <span class="acc-edit" onclick="if(confirm('Xóa?'))deleteAccount(${a.id})" style="color:var(--red)">✕</span>
    </div>`).join('')||'<div class="empty">Chưa có tài khoản</div>';
}

/* ── CATEGORIES ── */
function getCats(type){return type==='thu'?catsThu:catsChi;}
function saveCatsF(type){type==='thu'?saveCatsThu():saveCatsChi();}
function addCat(type){
  const list=getCats(type);const name=$(type==='thu'?'newCatNameThu':'newCatNameChi').value.trim();
  const icon=type==='thu'?newIconThu:newIconChi;const color=type==='thu'?newColorThu:newColorChi;
  if(!name){showToast('Nhập tên',false);return;}
  if(list.find(c=>c.name===name)){showToast('Đã tồn tại',false);return;}
  list.push({name,emoji:icon,color});
  saveCatsF(type);$(type==='thu'?'newCatNameThu':'newCatNameChi').value='';
  renderSettings();rebuildSelects();playSuccess();showToast('Đã thêm: '+icon+' '+name);
}
function deleteCat(type,name){if(!confirm('Xóa "'+name+'"?'))return;const list=getCats(type);const idx=list.findIndex(c=>c.name===name);if(idx>-1)list.splice(idx,1);saveCatsF(type);renderSettings();rebuildSelects();}
function renameCat(type,old,val){if(!val.trim()||val===old)return;txData.forEach(t=>{if(t.cat===old)t.cat=val.trim();});save();const c=getCats(type).find(c=>c.name===old);if(c)c.name=val.trim();saveCatsF(type);rebuildSelects();}
function setCatEmoji(type,name,emoji){const c=getCats(type).find(c=>c.name===name);if(c){c.emoji=emoji;saveCatsF(type);}}

function rebuildSelects(){
  const tc=$('thuCat');if(tc)tc.innerHTML=catsThu.map(c=>`<option value="${c.name}">${c.emoji} ${c.name}</option>`).join('');
  const cc=$('chiCat');if(cc)cc.innerHTML=catsChi.map(c=>`<option value="${c.name}">${c.emoji} ${c.name}</option>`).join('');
  const fc=$('filterCat');if(fc)fc.innerHTML='<option value="all">Mọi danh mục</option>'+[...catsThu,...catsChi].map(c=>`<option value="${c.name}">${c.name}</option>`).join('');
  buildQuickChips();
}
function buildQuickChips(){
  const tr=$('quickThuRow');if(tr)tr.innerHTML=catsThu.slice(0,3).map(c=>`<button class="quick-chip" onclick="quickFill('thu','${c.name}')">${c.emoji} ${c.name}</button>`).join('');
  const cr=$('quickChiRow');if(cr)cr.innerHTML=catsChi.slice(0,4).map(c=>`<button class="quick-chip" onclick="quickFill('chi','${c.name}')">${c.emoji} ${c.name}</button>`).join('');
}
function quickFill(type,cat){playClick();if(type==='thu'){$('thuCat').value=cat;$('thuAmt').focus();}else{$('chiCat').value=cat;$('chiAmt').focus();}}

/* ── CHI TYPE TOGGLE ── */
let chiType='normal';
function setChiType(type){
  chiType=type;
  document.querySelectorAll('.chi-type-btn').forEach(b=>b.classList.toggle('active',b.dataset.val===type));
  const hint=$('chiTypeHint');
  const card=$('chiFormCard');
  const title=$('chiFormTitle');
  if(hint){
    hint.textContent=type==='normal'?'Trừ vào tiền dùng trong tháng · không ảnh hưởng tiết kiệm':'⚠ Trừ thẳng tổng tài sản & tiết kiệm';
    hint.className=type==='normal'?'chi-hint-normal':'chi-hint-extra';
  }
  if(card){
    card.classList.remove('mode-normal','mode-extra');
    card.classList.add('mode-'+type);
  }
  if(title) title.textContent=type==='normal'?'↘ Thêm khoản chi':'⚡ Thêm khoản chi ngoài';
  const btn=$('chiSubmitBtn');
  if(btn){
    btn.textContent=type==='normal'?'− Thêm chi tiêu':'⚡ Thêm chi ngoài';
    btn.className=type==='normal'?'btn-full btn-full-red':'btn-full btn-full-amber';
  }
  // Chạm/click đổi loại chi → sáng nhanh các ô bị tác động (chạy cả trên mobile, không cần hover)
  flashHighlight(type);
  playClick();
}

/* Bộ điều khiển vệt sáng — gộp 3 nguồn kích hoạt để tránh chập chờn (nhất là trên mobile):
     • focus  : đang nhập vào ô thu/chi → GIỮ sáng ổn định, không phụ thuộc hover/timer.
     • hover  : desktop rê chuột lên card.
     • flash  : chạm nhanh đổi loại chi (setChiType) → sáng tạm ~1.8s.
   Ưu tiên focus > hover > flash. Tính kind động theo chiType nên đổi loại chi vẫn đúng.
   updateAll() render lại #dashMetrics có thể xoá class → reapplyFlash() áp lại theo trạng thái. */
let _hlHoverKind=null,_hlFocusCard=null,_hlFlashKind=null,_hlFlashTimer=null;
function _hlKind(){
  if(_hlFocusCard==='chi')return chiType||'normal';
  if(_hlFocusCard==='thu')return 'thu';
  if(_hlHoverKind)return _hlHoverKind;
  return _hlFlashKind;
}
function _hlRefresh(){try{if(typeof hlOn!=='function')return;const k=_hlKind();if(k)hlOn(k);else hlOff();}catch(e){}}
function flashHighlight(kind){
  try{
    if(typeof hlOn!=='function')return;
    clearTimeout(_hlFlashTimer);
    _hlFlashKind=kind;
    _hlRefresh();
    // Hết thời gian flash chỉ tắt nếu KHÔNG còn đang nhập/hover (focus/hover vẫn giữ sáng).
    _hlFlashTimer=setTimeout(function(){_hlFlashKind=null;_hlRefresh();},1800);
  }catch(e){}
}
// Áp lại vệt sáng đang hoạt động sau khi #dashMetrics được vẽ lại.
function reapplyFlash(){_hlRefresh();}

/* ── ADD TX (smart amount) ── */
function addTx(type){
  const cat=$(type+'Cat').value;const note=$(type+'Note').value.trim()||cat;
  const rawAmt=parseFloat($(type+'Amt').value);
  const amt=smartAmount(rawAmt);
  if(!amt||amt<=0){showToast('Nhập số tiền',false);return;}
  const tx={id:Date.now(),type,note,cat,amount:amt,date:new Date().toISOString()};
  if(type==='chi') tx.budgetType=chiType;
  txData.push(tx);save();$(type+'Note').value='';$(type+'Amt').value='';$(type+'Preview')&&($(type+'Preview').textContent='');
  updateAll();playSuccess();showToast(type==='thu'?'Thu: +'+fmt(amt):(chiType==='extra'?'Chi ngoài: -':'Chi: -')+fmt(amt),type==='thu');cloudAddTx(tx);
  if(tx.budgetType==='extra')cloudSaveSettings();
}
function deleteTx(id){const t=txData.find(x=>String(x.id)===String(id));if(!t)return;if(!confirm('Xoá giao dịch này?'))return;txData=txData.filter(x=>String(x.id)!==String(id));save();updateAll();if($('page-history').classList.contains('active'))renderHistory();playClick();cloudDeleteTx(t.id);}
function clearMonth(){
  const toDelete=txData.filter(t=>{const d=new Date(t.date);return d.getMonth()===viewMonth&&d.getFullYear()===viewYear;});
  txData=txData.filter(t=>{const d=new Date(t.date);return!(d.getMonth()===viewMonth&&d.getFullYear()===viewYear);});
  save();updateAll();
  // Delete each from cloud individually (JSONP = reliable)
  toDelete.forEach(t=>cloudDeleteTx(t.id));
  // Also push full state
  setTimeout(()=>cloudPushAll(),2000);
  showToast('Đã xóa '+toDelete.length+' giao dịch');
}
function clearAllData(){if(!confirm('Xóa TOÀN BỘ?'))return;txData=[];investments=[];accounts=[];save();saveInv();saveAccounts();updateAll();showToast('Đã xóa');cloudPushAll();}

/* ── DASHBOARD ── */
function updateAll(){
  const mTx=getViewMonthTx();
  // 1 vòng lặp cho thu/chi tháng + đếm (thay 4 lần filter+reduce)
  let thu=0,chi=0,thuN=0,chiN=0;
  for(const t of mTx){if(t.type==='thu'){thu+=t.amount;thuN++;}else if(t.type==='chi'){chi+=t.amount;chiN++;}}
  // 1 vòng lặp cho toàn bộ thu/chi (thay 2 lần filter+reduce trên cả txData)
  let allThu=0,allChi=0;
  for(const t of txData){if(t.type==='thu')allThu+=t.amount;else if(t.type==='chi')allChi+=t.amount;}
  const invPnL=investments.reduce((s,i)=>(i.curPrice-i.buyPrice)*i.qty+s,0);
  const accTotal=totalAccounts();
  const sodu=opening+allThu-allChi+invPnL;
  const net=thu-chi;
  const assets=sodu+accTotal;
  const sav=getSavings();              // gọi 1 lần thay vì 4
  const eoy=getEndOfYearProjection();  // dự phóng tài sản tích lũy cuối năm
  $('monthLabel').textContent=monthLabel();
  $('dashMetrics').innerHTML=`
    <div class="metric" data-m="assets"><div class="label">Tổng tài sản</div><div class="val ${assets>=0?'val-white':'val-red'}">${fmt(assets)}</div><div class="sub-val">Số dư + Tài khoản + Đầu tư</div></div>
    <div class="metric" data-m="eoy"><div class="label">Tài sản cuối năm ${eoy.year}</div><div class="val ${eoy.projected>=0?'val-white':'val-red'}">${eoy.projected<0?'−':''}${fmt(eoy.projected)}</div><div class="sub-val">${salaryData?`Dự phóng · còn ${eoy.n} tháng${eoy.received?` · Th${eoy.curM+1} đã nhận ✓`:''}`:`Nhập lương tháng để dự phóng · còn ${eoy.n} tháng`}</div></div>
    <div class="metric" data-m="savings"><div class="label">Tiết kiệm</div><div class="val ${sav>=0?'val-green':'val-red'}">${sav>=0?'':'−'}${fmt(Math.abs(sav))}</div><div class="sub-val">${monthMoneyData?'Tổng tài sản − tiền dùng còn lại':'Chưa đặt tiền dùng trong tháng'}</div></div>`;
  renderMonthList(mTx);renderMonthChart(mTx);renderMonthMoney();renderSalaryProjection();try{animMetrics({assets:assets,eoy:eoy.projected,savings:sav});}catch(e){console.warn("anim",e);}try{renderInsights(mTx);}catch(e){console.warn("insight",e);}try{reapplyFlash();}catch(e){}
}

function renderMonthList(txs){
  const el=$('monthList');if(!txs.length){el.innerHTML='<div class="empty">Chưa có giao dịch</div>';return;}
  el.innerHTML=[...txs].reverse().map(t=>`<div class="tx-item" style="cursor:pointer" onclick="openEditTx('${t.id}')"><div class="tx-left"><div class="tx-dot ${t.type==='thu'?'green':'red'}"></div><div class="tx-info"><div class="tx-note">${t.note}${t.budgetType==='extra'?'<span class="badge-extra">ngoài</span>':''}</div><div class="tx-meta">${t.cat} · ${dateStr(t.date)} ${timeStr(t.date)}</div></div></div><div class="tx-right"><span class="tx-amt ${t.type==='thu'?'val-green':'val-red'}">${t.type==='thu'?'+':'-'}${fmt(t.amount)}</span><span class="tx-del" onclick="event.stopPropagation();deleteTx('${t.id}')">✕</span></div></div>`).join('');
}
function renderMonthChart(txs){
  if(typeof Chart==='undefined')return; // Chart.js chưa nạp xong → bỏ qua, tránh crash init()
  const thuTotal=txs.filter(t=>t.type==='thu').reduce((s,t)=>s+t.amount,0);
  // Gộp CHI theo danh mục TỪ DỮ LIỆU THẬT → không bỏ sót khi tên danh mục đã đổi/đồng bộ khác
  const chiByCat={};
  txs.filter(t=>t.type==='chi').forEach(t=>{const k=t.cat||'Khác';chiByCat[k]=(chiByCat[k]||0)+t.amount;});
  const catColor={};catsChi.forEach(c=>{catColor[c.name]=c.color;});
  // Danh mục đang cấu hình (có chi) trước, danh mục lạ (đã xoá/đổi tên) xếp sau
  const ordered=[];
  catsChi.forEach(c=>{if(chiByCat[c.name]>0){ordered.push([c.name,chiByCat[c.name],c.color]);delete chiByCat[c.name];}});
  const extra=['#9C6ADE','#E8B44A','#3AAFA9','#D4537E','#5DCAA5','#888780'];let ei=0;
  Object.keys(chiByCat).forEach(k=>{if(chiByCat[k]>0)ordered.push([k,chiByCat[k],extra[ei++%extra.length]]);});
  const chiTotal=ordered.reduce((s,o)=>s+o[1],0);
  const labels=['Thu nhập',...ordered.map(o=>o[0])];
  const data=[thuTotal,...ordered.map(o=>o[1])];
  const colors=['#1D9E75',...ordered.map(o=>o[2])];
  const empty=!thuTotal&&!chiTotal;
  if(charts.month)charts.month.destroy();
  charts.month=new Chart($('monthChart'),{type:'doughnut',data:{labels:empty?['Chưa có dữ liệu']:labels,datasets:[{data:empty?[1]:data,backgroundColor:empty?['#33333a']:colors,borderWidth:0,hoverOffset:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right',labels:{font:{size:10},color:'#888780',boxWidth:8,padding:8}},tooltip:{callbacks:{label:c=>empty?'Chưa có giao dịch':(' '+c.label+': '+fmt(c.raw))}}}}});
}

/* ── HISTORY ── */
function resetFilters(){$('filterType').value='all';$('filterCat').value='all';$('filterMonth').value='';if($('filterText'))$('filterText').value='';if($('filterMin'))$('filterMin').value='';if($('filterMax'))$('filterMax').value='';renderHistory();}
function renderHistory(){
  let f=[...txData].reverse();
  const type=$('filterType').value,cat=$('filterCat').value,month=$('filterMonth').value;
  const q=(($('filterText')&&$('filterText').value)||'').trim().toLowerCase();
  const minK=parseFloat($('filterMin')&&$('filterMin').value),maxK=parseFloat($('filterMax')&&$('filterMax').value);
  const min=isNaN(minK)?null:minK*1000,max=isNaN(maxK)?null:maxK*1000;
  if(type==='thu')f=f.filter(t=>t.type==='thu');else if(type==='chi')f=f.filter(t=>t.type==='chi');else if(type==='chi-normal')f=f.filter(t=>t.type==='chi'&&t.budgetType!=='extra');else if(type==='chi-extra')f=f.filter(t=>t.type==='chi'&&t.budgetType==='extra');
  if(cat!=='all')f=f.filter(t=>t.cat===cat);
  if(month)f=f.filter(t=>t.date.slice(0,7)===month);
  if(q)f=f.filter(t=>((t.note||'')+' '+(t.cat||'')).toLowerCase().includes(q));
  if(min!=null)f=f.filter(t=>t.amount>=min);
  if(max!=null)f=f.filter(t=>t.amount<=max);
  // Tóm tắt kết quả lọc
  const sum=$('filterSummary');
  if(sum){const tThu=f.filter(t=>t.type==='thu').reduce((s,t)=>s+t.amount,0),tChi=f.filter(t=>t.type==='chi').reduce((s,t)=>s+t.amount,0);
    sum.innerHTML=f.length?`<span><b>${f.length}</b> giao dịch</span><span>Thu <b class="val-green">+${fmt(tThu)}</b></span><span>Chi <b class="val-red">-${fmt(tChi)}</b></span>`:'';}
  const b=$('historyBody');
  if(!f.length){b.innerHTML='<tr><td colspan="6" style="text-align:center;color:var(--text3);padding:20px">Không có giao dịch khớp bộ lọc</td></tr>';return;}
  b.innerHTML=f.map(t=>`<tr onclick="openEditTx('${t.id}')"><td style="color:var(--text2)">${fullDate(t.date)} ${timeStr(t.date)}</td><td><span class="badge ${t.type==='thu'?'badge-green':'badge-red'}">${t.type==='thu'?'Thu':t.budgetType==='extra'?'Chi ngoài':'Chi'}</span></td><td style="color:var(--text2)">${t.cat}</td><td>${t.note}</td><td style="text-align:right;font-weight:500" class="${t.type==='thu'?'val-green':'val-red'}">${t.type==='thu'?'+':'-'}${fmt(t.amount)}</td><td><span class="tx-del" onclick="event.stopPropagation();deleteTx('${t.id}')">✕</span></td></tr>`).join('');
}

/* ── STATS ── */
function renderStats(){const last7=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);return d.toISOString().slice(0,10);});const thuD=last7.map(d=>txData.filter(t=>t.type==='thu'&&t.date.slice(0,10)===d).reduce((s,t)=>s+t.amount,0));const chiD=last7.map(d=>txData.filter(t=>t.type==='chi'&&t.date.slice(0,10)===d).reduce((s,t)=>s+t.amount,0));const lab=last7.map(d=>{const dd=new Date(d+'T00:00');return dd.getDate()+'/'+(dd.getMonth()+1);});if(charts.week)charts.week.destroy();charts.week=new Chart($('weekChart'),{type:'bar',data:{labels:lab,datasets:[{label:'Thu',data:thuD,backgroundColor:'rgba(29,158,117,.7)',borderRadius:4},{label:'Chi',data:chiD,backgroundColor:'rgba(216,90,48,.7)',borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#888780',font:{size:10},boxWidth:8}}},scales:{x:{grid:{display:false},ticks:{color:'#555',font:{size:10}}},y:{grid:{color:'rgba(128,128,128,.1)'},ticks:{color:'#555',font:{size:10},callback:v=>fmtShort(v)}}}}});const ct=catsChi.map(c=>txData.filter(t=>t.cat===c.name).reduce((s,t)=>s+t.amount,0));if(charts.cat)charts.cat.destroy();charts.cat=new Chart($('catChart'),{type:'bar',data:{labels:catsChi.map(c=>c.emoji+' '+c.name),datasets:[{data:ct,backgroundColor:catsChi.map(c=>c.color),borderRadius:4}]},options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{color:'rgba(128,128,128,.1)'},ticks:{color:'#555',font:{size:10},callback:v=>fmtShort(v)}},y:{grid:{display:false},ticks:{color:'#888780',font:{size:10}}}}}});const total=ct.reduce((s,v)=>s+v,0);$('catBreakdown').innerHTML=catsChi.map((c,i)=>{const pct=total>0?Math.round(ct[i]/total*100):0;return `<div class="stats-cat-row"><span>${c.emoji} ${c.name}</span><div style="flex:1;display:flex;align-items:center;gap:6px;margin:0 12px"><div class="cat-bar-wrap" style="flex:1"><div class="cat-bar" style="width:${pct}%;background:${c.color}"></div></div><span style="font-size:10px;color:var(--text2)">${pct}%</span></div><span style="font-weight:500;color:${c.color}">${fmt(ct[i])}</span></div>`;}).join('');$('statsPeriod').textContent='7 ngày + toàn bộ';renderHeatmap();}

/* ── BUDGET ── */
function renderBudget(){const now=new Date();const m=now.getMonth(),y=now.getFullYear();const mTx=txData.filter(t=>{const d=new Date(t.date);return d.getMonth()===m&&d.getFullYear()===y&&t.type==='chi';});$('budgetList').innerHTML=catsChi.map(c=>{const spent=mTx.filter(t=>t.cat===c.name).reduce((s,t)=>s+t.amount,0);const limit=budgets[c.name]||0;const pct=limit>0?Math.min(Math.round(spent/limit*100),100):0;const col=pct>90?'#D85A30':pct>70?'#BA7517':'#1D9E75';return `<div class="budget-item"><span>${c.emoji} ${c.name}</span><div class="budget-right"><span style="font-size:11px;color:var(--text2)">Chi: <b style="color:${col}">${fmt(spent)}</b></span><div class="budget-input-wrap"><input type="number" placeholder="Giới hạn..." value="${limit||''}" step="10000" onchange="budgets['${c.name}']=parseFloat(this.value)||0;saveBudgets();renderBudget()"/></div><span class="budget-pct" style="color:${col}">${limit>0?pct+'%':'-'}</span><div class="budget-bar-wrap"><div class="budget-bar" style="width:${pct}%;background:${col}"></div></div></div></div>`;}).join('');}

/* ── INVEST ── */
const CALC_ASSETS={
  gold:[
    {name:'Vàng SJC (lượng)',unit:'lượng',isGold:true,priceUnit:'lượng'},
    {name:'Vàng SJC (chỉ)',unit:'chỉ',isGold:true,priceUnit:'chỉ'},
    {name:'Vàng Mi Hồng 9999',unit:'chỉ',isGold:true,priceUnit:'chỉ'},
    {name:'Vàng nhẫn SJC 9999',unit:'chỉ',isGold:true,priceUnit:'chỉ'},
    {name:'Vàng PNJ 9999',unit:'chỉ',isGold:true,priceUnit:'chỉ'},
    {name:'Vàng DOJI 9999',unit:'chỉ',isGold:true,priceUnit:'chỉ'},
    {name:'Vàng 24K (lượng)',unit:'lượng',isGold:true,priceUnit:'lượng'},
    {name:'Vàng 18K trang sức',unit:'chỉ',isGold:true,priceUnit:'chỉ'},
  ],
  crypto:[
    {name:'Bitcoin (BTC)',unit:'BTC'},
    {name:'Ethereum (ETH)',unit:'ETH'},
    {name:'Solana (SOL)',unit:'SOL'},
    {name:'XRP',unit:'XRP'},
    {name:'BNB',unit:'BNB'},
    {name:'Cardano (ADA)',unit:'ADA'},
    {name:'Dogecoin (DOGE)',unit:'DOGE'},
    {name:'Chainlink (LINK)',unit:'LINK'},
    {name:'Avalanche (AVAX)',unit:'AVAX'},
    {name:'Sui (SUI)',unit:'SUI'},
  ],
  stock:[
    {name:'FPT — Công nghệ',unit:'cổ phiếu'},
    {name:'VCB — Vietcombank',unit:'cổ phiếu'},
    {name:'TCB — Techcombank',unit:'cổ phiếu'},
    {name:'HPG — Hòa Phát',unit:'cổ phiếu'},
    {name:'MWG — Thế Giới Di Động',unit:'cổ phiếu'},
    {name:'VNM — Vinamilk',unit:'cổ phiếu'},
    {name:'SSI — Chứng khoán SSI',unit:'cổ phiếu'},
    {name:'MBB — MB Bank',unit:'cổ phiếu'},
    {name:'CTG — VietinBank',unit:'cổ phiếu'},
    {name:'VIC — Vingroup',unit:'cổ phiếu'},
  ],
  custom:[]
};

function onCalcCatChange(){
  const cat=$('calcCat').value;
  const sel=$('calcAsset');
  const customWrap=$('calcCustomWrap');
  if(cat==='custom'){
    sel.innerHTML='<option value="__custom">✏️ Tự nhập bên dưới</option>';
    customWrap.style.display='block';
    $('calcUnit').value='đơn vị';
  } else {
    customWrap.style.display='none';
    sel.innerHTML=CALC_ASSETS[cat].map((a,i)=>`<option value="${i}">${a.name}</option>`).join('');
    onCalcAssetChange();
  }
  calcBuy();
}
function onCalcAssetChange(){
  const cat=$('calcCat').value;
  if(cat==='custom')return;
  const idx=parseInt($('calcAsset').value);
  const asset=CALC_ASSETS[cat][idx];
  if(asset)$('calcUnit').value=asset.unit;
  calcBuy();
}
function getCalcAssetInfo(){
  const cat=$('calcCat').value;
  if(cat==='custom'){
    const name=$('calcCustomName').value.trim()||'tài sản';
    const isGold=/v[aà]ng|gold|sjc|pnj|doji|mi\s*h[oồ]ng|nh[aẫ]n/i.test(name);
    return{name,unit:'đơn vị',isGold,priceUnit:''};
  }
  const idx=parseInt($('calcAsset').value);
  return CALC_ASSETS[cat][idx]||{name:'tài sản',unit:'đơn vị'};
}

function calcBuy(){
  const money=smartAmount($('calcMoney').value);const price=smartAmount($('calcPrice').value);
  const asset=getCalcAssetInfo();
  const el=$('calcResult');
  if(!money||!price){el.style.display='none';return;}
  el.style.display='block';
  const qty=money/price;
  let displayName=asset.name;let unit=asset.unit||'đơn vị';
  let displayQty=qty,fullInt=Math.floor(qty),remain=money-(fullInt*price),detail='';

  if(asset.isGold){
    const isLuongPrice=asset.priceUnit==='lượng'||price>=50000000;
    if(isLuongPrice){
      // Giá 1 lượng
      unit='lượng';displayQty=qty;fullInt=Math.floor(qty);
      const extraChi=(qty-fullInt)*10;remain=money-(fullInt*price);
      if(fullInt>=1&&extraChi>=0.05){
        detail=`= ${fullInt} lượng + ${extraChi.toFixed(1)} chỉ`;
      } else if(fullInt>=1){
        detail=`= ${fullInt} lượng chẵn`;
      } else {
        const chiQty=qty*10;unit='chỉ';displayQty=chiQty;fullInt=Math.floor(chiQty);remain=money-(fullInt*(price/10));
        detail=`(chưa đủ 1 lượng → quy ${chiQty.toFixed(2)} chỉ)`;
      }
    } else {
      // Giá 1 chỉ
      unit='chỉ';displayQty=qty;fullInt=Math.floor(qty);remain=money-(fullInt*price);
      const luong=Math.floor(fullInt/10);const chiDu=fullInt%10;
      if(luong>=1)detail=`= ${luong} lượng${chiDu>0?' '+chiDu+' chỉ':''}`;
    }
  }
  const qtyStr=displayQty>=100?Math.round(displayQty).toLocaleString('vi-VN'):displayQty<0.01?displayQty.toFixed(4):displayQty.toFixed(2);
  const fullStr=fullInt.toLocaleString('vi-VN');
  el.innerHTML=`
    <div class="calc-big">${qtyStr} ${unit} ${displayName}</div>
    <div class="calc-sub">
      ${fmt(money)} ÷ ${fmt(price)}/${unit} = ${displayQty.toFixed(4)} ${unit}<br>
      Mua nguyên <b>${fullStr} ${unit}</b> → dư <b>${fmt(remain||0)}</b>
      ${detail?'<br><span style="color:var(--amber)">'+detail+'</span>':''}
    </div>`;
}

// Crypto ID mapping for CoinGecko
const CRYPTO_IDS={
  'Bitcoin (BTC)':'bitcoin','Ethereum (ETH)':'ethereum','Solana (SOL)':'solana',
  'XRP':'ripple','BNB':'binancecoin','Cardano (ADA)':'cardano',
  'Dogecoin (DOGE)':'dogecoin','Chainlink (LINK)':'chainlink',
  'Avalanche (AVAX)':'avalanche-2','Sui (SUI)':'sui'
};
// Stock symbol extraction
const STOCK_SYMS={'FPT — Công nghệ':'FPT','VCB — Vietcombank':'VCB','TCB — Techcombank':'TCB','HPG — Hòa Phát':'HPG','MWG — Thế Giới Di Động':'MWG','VNM — Vinamilk':'VNM','SSI — Chứng khoán SSI':'SSI','MBB — MB Bank':'MBB','CTG — VietinBank':'CTG','VIC — Vingroup':'VIC'};
// Nhãn thân thiện cho mã vàng vang.today (để khớp tên tài sản)
const GOLD_LABELS={SJL1L10:'SJC vàng miếng',SJ9999:'SJC nhẫn 9999',DOHCML:'DOJI HCM',DOSJL:'DOJI SJC',PQHN24NTT:'PNJ 24K',PQ24NTT:'PNJ 24K',BT9999NTT:'Bảo Tín 9999',NMHCM:'Nhẫn Mi Hồng',XAUUSD:'Vàng thế giới'};

// Cache for fetched prices
let priceCache={gold:null,crypto:null,goldTime:0,cryptoTime:0};

function showGoldList(){
  if(!priceCache.gold||!priceCache.gold.length){showToast('Chưa có data',false);return;}
  const list=priceCache.gold.map(g=>`${g.name||g.type}: Mua ${fmt(g.buy||g.pb||0)} / Bán ${fmt(g.sell||g.ps||0)}`).join('\n');
  alert('Tất cả giá vàng từ API:\n\n'+list);
}

async function fetchLivePrice(){
  const cat=$('calcCat').value;
  const asset=getCalcAssetInfo();
  const status=$('priceStatus');
  const btn=$('fetchPriceBtn');

  if(cat==='custom'){showToast('Tự nhập không hỗ trợ lấy giá auto',false);return;}

  btn.textContent='⏳ Đang lấy...';status.textContent='';

  try{
    if(cat==='gold'){
      const now=Date.now();
      let data=priceCache.gold;
      if(!data||now-priceCache.goldTime>300000){
        // Lấy giá vàng trực tiếp (vang.today có CORS) — không cần backend
        const v=await fetchVangPrices();
        const arr=vtPrices(v)||[];
        data=arr.map(d=>({name:GOLD_LABELS[d.type_code]||d.name||d.type_code,type:d.type_code,buy:d.buy,sell:d.sell}));
        priceCache.gold=data;priceCache.goldTime=now;
      }
      if(!Array.isArray(data)||!data.length){
        status.textContent='⚠ API trả về rỗng — thử lại sau';btn.textContent='⚡ Lấy giá realtime';return;
      }
      // Build search keywords from asset name
      const assetName=asset.name.toLowerCase();
      const keywords=[];
      if(assetName.includes('sjc'))keywords.push('sjc');
      if(assetName.includes('mi hồng')||assetName.includes('mi hong'))keywords.push('mi h');
      if(assetName.includes('pnj'))keywords.push('pnj');
      if(assetName.includes('doji'))keywords.push('doji');
      if(assetName.includes('nhẫn')||assetName.includes('nhan'))keywords.push('nhẫn','nhan','ring');
      if(assetName.includes('18k'))keywords.push('18k');
      if(assetName.includes('trang sức'))keywords.push('trang');
      // Unit hint
      const wantLuong=assetName.includes('lượng');
      const wantChi=assetName.includes('chỉ')||asset.unit==='chỉ';

      let matched=null;let bestScore=0;
      for(const g of data){
        const n=((g.name||g.type||'')+'').toLowerCase();
        let score=0;
        for(const kw of keywords){if(n.includes(kw))score+=10;}
        // Unit matching bonus
        if(wantLuong&&(n.includes('lượng')||n.includes('miếng')||n.includes('1l')))score+=5;
        if(wantChi&&(n.includes('chỉ')||n.includes('1c')))score+=5;
        if(!wantLuong&&!wantChi)score+=1;// no preference = slight bonus
        if(score>bestScore){bestScore=score;matched=g;}
      }
      // If no keyword matched, fallback to first item with 'sjc' or first item
      if(!matched||bestScore===0){
        matched=data.find(g=>((g.name||'')+'').toLowerCase().includes('sjc'))||data[0];
      }
      if(matched){
        const sell=matched.sell||matched.ps||0;const buyP=matched.buy||matched.pb||0;
        $('calcPrice').value=sell/1000;
        smartPreview($('calcPrice'),'calcPP');
        status.innerHTML=`✓ <b>${matched.name||'Vàng'}</b>: Mua ${fmt(buyP)} / Bán ${fmt(sell)} — <span style="color:var(--text3)">${new Date().toLocaleTimeString('vi-VN')}</span> <span style="font-size:9px;cursor:pointer;text-decoration:underline;" onclick="showGoldList()">xem tất cả</span>`;
        calcBuy();playSuccess();
      } else {
        status.textContent='⚠ Không tìm thấy — API có '+data.length+' loại vàng';
      }
    }
    else if(cat==='crypto'){
      const now=Date.now();
      let data=priceCache.crypto;
      if(!data||now-priceCache.cryptoTime>60000){
        // CoinGecko hỗ trợ CORS → gọi trực tiếp, không cần backend
        const ids=Object.values(CRYPTO_IDS).join(',');
        const r=await fetchJson('https://api.coingecko.com/api/v3/simple/price?ids='+ids+'&vs_currencies=vnd');
        if(!r||typeof r!=='object')throw new Error('Lỗi API CoinGecko');
        data=r;priceCache.crypto=data;priceCache.cryptoTime=now;
      }
      const cgId=CRYPTO_IDS[asset.name];
      if(cgId&&data[cgId]){
        const priceVnd=data[cgId].vnd;
        $('calcPrice').value=priceVnd/1000;
        smartPreview($('calcPrice'),'calcPP');
        status.innerHTML=`✓ ${asset.name}: <b>${fmt(priceVnd)}</b> — <span style="color:var(--text3)">CoinGecko ${new Date().toLocaleTimeString('vi-VN')}</span>`;
        calcBuy();playSuccess();
      } else {
        status.textContent='⚠ Không tìm thấy giá '+asset.name;
      }
    }
    else if(cat==='stock'){
      const sym=STOCK_SYMS[asset.name]||asset.name.split(' ')[0];
      // Giá cổ phiếu VN trực tiếp từ VNDirect (có CORS). c = giá đóng cửa theo nghìn đồng
      const to=Math.floor(Date.now()/1000),from=to-20*86400;
      const r=await fetchJson('https://dchart-api.vndirect.com.vn/dchart/history?symbol='+encodeURIComponent(sym)+'&resolution=D&from='+from+'&to='+to);
      const closes=r&&Array.isArray(r.c)?r.c:null;
      const last=closes&&closes.length?closes[closes.length-1]:0;
      const priceVnd=last?Math.round(last*1000):0; // VNDirect: nghìn đồng → đồng
      if(priceVnd){
        $('calcPrice').value=priceVnd/1000;
        smartPreview($('calcPrice'),'calcPP');
        status.innerHTML=`✓ ${sym}: <b>${fmt(priceVnd)}</b>/cp — <span style="color:var(--text3)">${new Date().toLocaleTimeString('vi-VN')}</span>`;
        calcBuy();playSuccess();
      } else {
        status.textContent='⚠ Không lấy được giá '+sym;
      }
    }
  }catch(e){
    status.textContent='✗ '+e.message;showToast('Lấy giá lỗi: '+e.message,false);
  }
  btn.textContent='⚡ Lấy giá realtime';
}

function addInvestment(){
  const type=$('invType').value,name=$('invName').value.trim(),qty=parseFloat($('invQty').value),buyPrice=smartAmount($('invBuyPrice').value),curPrice=smartAmount($('invCurPrice').value);
  if(!name||!qty||!buyPrice){showToast('Điền đầy đủ',false);return;}
  const inv={id:Date.now(),type,name,qty,buyPrice,curPrice:curPrice||buyPrice,boughtAt:new Date().toISOString()};
  investments.push(inv);saveInv();$('invName').value='';$('invQty').value='';$('invBuyPrice').value='';$('invCurPrice').value='';$('invBP').textContent='';$('invCP').textContent='';
  renderInvest();updateAll();playSuccess();showToast('Đã thêm: '+name);cloudAddInv(inv);
}
function deleteInv(id){investments=investments.filter(i=>i.id!==id);saveInv();renderInvest();updateAll();cloudDeleteInv(id);}
function updateInvPrice(id,raw){const i=investments.find(x=>x.id===id);if(i){i.curPrice=smartAmount(raw);saveInv();renderInvest();updateAll();cloudUpdateInv({id,curPrice:i.curPrice});}}

// Thời điểm mua: khoản mới có boughtAt; khoản cũ suy từ id (id = Date.now() lúc thêm)
function invBoughtDate(i){
  if(i.boughtAt)return new Date(i.boughtAt);
  const n=Number(i.id);
  return (isFinite(n)&&n>1e12)?new Date(n):null;   // id kiểu epoch-ms hợp lệ
}
// Nhãn lời/lỗ rõ ràng cho từng khoản & tổng danh mục
function pnlLabel(pnl,pct){
  if(pnl>0)return `🟢 LỜI +${fmt(pnl)} (+${pct}%)`;
  if(pnl<0)return `🔴 LỖ −${fmt(pnl)} (−${Math.abs(pct).toFixed(1)}%)`;
  return `⚖️ HÒA VỐN (0%)`;
}
function renderInvest(){
  const totalInvested=investments.reduce((s,i)=>s+i.buyPrice*i.qty,0);const totalCurrent=investments.reduce((s,i)=>s+i.curPrice*i.qty,0);const totalPnL=totalCurrent-totalInvested;const pnlPct=totalInvested>0?((totalPnL/totalInvested)*100).toFixed(1):0;
  $('invMetrics').innerHTML=`<div class="metric"><div class="label">Tổng vốn</div><div class="val val-white">${fmt(totalInvested)}</div></div><div class="metric"><div class="label">Hiện tại</div><div class="val val-blue">${fmt(totalCurrent)}</div></div><div class="metric"><div class="label">Lãi/Lỗ</div><div class="val ${totalPnL>=0?'val-green':'val-red'}">${totalPnL>=0?'+':''}${fmt(totalPnL)}</div><div class="sub-val">${totalPnL>0?'🟢 Đang lời':totalPnL<0?'🔴 Đang lỗ':'⚖️ Hòa vốn'} · ${pnlPct>0?'+':''}${pnlPct}%</div></div>`;
  const typeEmoji={crypto:'🪙',stock:'📈',gold:'🥇',other:'📦'};const typeName={crypto:'Crypto',stock:'Cổ phiếu',gold:'Vàng',other:'Khác'};
  $('invGrid').innerHTML=investments.map(i=>{const cost=i.buyPrice*i.qty,cur=i.curPrice*i.qty,pnl=cur-cost;const pct=cost>0?((pnl/cost)*100).toFixed(1):0;
    const bd=invBoughtDate(i);
    const boughtStr=bd?bd.toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'})+' '+bd.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'}):'—';
    return `<div class="inv-card"><div class="inv-top"><div><div class="inv-name">${typeEmoji[i.type]} ${i.name}</div><div class="inv-type">${typeName[i.type]}</div></div><span class="inv-del" onclick="deleteInv(${i.id})">✕</span></div><div class="inv-row"><span>🕐 Mua lúc</span><b style="font-weight:500;color:var(--text2);">${boughtStr}</b></div><div class="inv-row"><span>SL</span><b>${i.qty}</b></div><div class="inv-row"><span>Giá mua</span><b>${fmt(i.buyPrice)}</b></div><div class="inv-row"><span>Giá hiện tại</span><b><input type="number" value="${i.curPrice/1000}" step="any" style="background:var(--bg3);border:.5px solid var(--border2);border-radius:4px;color:var(--text);font-size:11px;padding:2px 6px;width:90px;text-align:right;outline:none;" onchange="updateInvPrice(${i.id},this.value)"/><span style="font-size:9px;color:var(--text3)">×1000</span></b></div><div class="inv-row"><span>Vốn</span><b>${fmt(cost)}</b></div><div class="inv-pnl ${pnl>=0?'val-green':'val-red'}">${pnlLabel(pnl,pct)}</div></div>`;}).join('')||'<div class="empty">Chưa có khoản đầu tư</div>';
}

/* ── SETTINGS ── */
function renderThemeRow(){const el=$('themeRow');if(!el)return;el.innerHTML=THEMES.map(t=>`<button class="theme-btn ${t.id===theme?'active':''}" onclick="setTheme('${t.id}')"><span class="theme-dot" style="background:linear-gradient(135deg,${t.bg} 0 50%,${t.ac} 50% 100%)"></span>${t.name}</button>`).join('');}
function cycleTheme(){const i=THEMES.findIndex(t=>t.id===theme);const next=THEMES[(i+1)%THEMES.length];setTheme(next.id);showToast('Giao diện: '+next.name);playClick();}
function renderSettings(){
  renderThemeRow();$('soundToggle').className='toggle'+(soundOn?' on':'');
  try{fbUpdateSettingsUI();}catch(e){}
  ['chi','thu'].forEach(type=>{
    const list=getCats(type);
    $(type==='chi'?'catListChi':'catListThu').innerHTML=list.map(c=>`<div class="cat-row"><div style="width:12px;height:12px;border-radius:50%;background:${c.color};flex-shrink:0;"></div><input class="cat-emoji-input" value="${c.emoji}" maxlength="2" onchange="setCatEmoji('${type}','${c.name}',this.value)"/><input class="cat-name-input" value="${c.name}" onblur="renameCat('${type}','${c.name}',this.value)" onkeydown="if(event.key==='Enter')this.blur()"/><span style="font-size:10px;color:var(--text3)">${txData.filter(t=>t.cat===c.name).length}</span><span class="cat-del-btn" onclick="deleteCat('${type}','${c.name}')">✕</span></div>`).join('');
    const cpId=type==='chi'?'colorPickerChi':'colorPickerThu';const curColor=type==='chi'?newColorChi:newColorThu;
    $(cpId).innerHTML=PALETTE.map(c=>`<div class="color-swatch ${c===curColor?'selected':''}" style="background:${c}" onclick="${type==='chi'?'newColorChi':'newColorThu'}='${c}';renderSettings()"></div>`).join('');
    const ipId=type==='chi'?'iconPickerChi':'iconPickerThu';const curIcon=type==='chi'?newIconChi:newIconThu;
    $(ipId).innerHTML=ICONS.map(ic=>`<div class="icon-opt ${ic===curIcon?'sel':''}" onclick="${type==='chi'?'newIconChi':'newIconThu'}='${ic}';renderSettings()">${ic}</div>`).join('');
  });
  if(syncUrl)$('syncUrl').value=syncUrl;
  updateSyncUI(syncConnected, syncConnected?'Đã lưu URL':'Chưa kết nối');
}

/* ── EXPORT/IMPORT ── */
function exportCSV(){if(!txData.length){showToast('Không có',false);return;}const rows=[['Ngày','Giờ','Loại','Danh mục','Mô tả','Số tiền']];txData.forEach(t=>{const d=new Date(t.date);rows.push([d.toLocaleDateString('vi-VN'),d.toLocaleTimeString('vi-VN'),t.type==='thu'?'Thu':'Chi',t.cat,t.note,t.amount]);});const csv=rows.map(r=>r.map(v=>`"${v}"`).join(',')).join('\n');const a=document.createElement('a');a.href='data:text/csv;charset=utf-8,\uFEFF'+encodeURIComponent(csv);a.download='finance.csv';a.click();showToast('Xuất CSV');}
function exportJSON(){const d={txData,catsChi,catsThu,budgets,investments,accounts,opening,installments,monthlyFees,salary:salaryData,exportedAt:new Date().toISOString()};const a=document.createElement('a');a.href='data:application/json,'+encodeURIComponent(JSON.stringify(d,null,2));a.download='finance_backup.json';a.click();showToast('Backup xong');}
function importJSON(e){const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=ev=>{try{const d=JSON.parse(ev.target.result);if(!confirm('Ghi đè?'))return;if(d.txData){txData=d.txData;save();}if(d.catsChi){catsChi=d.catsChi;saveCatsChi();}if(d.catsThu){catsThu=d.catsThu;saveCatsThu();}if(d.budgets){budgets=d.budgets;saveBudgets();}if(d.investments){investments=d.investments;saveInv();}if(d.accounts){accounts=d.accounts;saveAccounts();}if(d.installments){installments=d.installments;saveInstallments();}if(d.monthlyFees){monthlyFees=d.monthlyFees;saveMonthlyFees();}if(d.salary!==undefined){salaryData=d.salary||null;saveSalaryData();}if(d.opening!==undefined){opening=d.opening;localStorage.setItem('fin_opening',opening);$('openingBal').value=opening||'';}rebuildSelects();updateAll();showToast('Import: '+txData.length+' GD');cloudPushAll();}catch(err){showToast('File lỗi',false);}};r.readAsText(file);e.target.value='';}


/* ── CLOUD SYNC (Pure JSONP) ── */
let _jid=0;
let _userDirty=localStorage.getItem('fin_dirty')==='1';
let _autoPulling=false;
function setDirty(){_userDirty=true;localStorage.setItem('fin_dirty','1');}
function clearDirty(){_userDirty=false;localStorage.removeItem('fin_dirty');}
function jsonp(url,timeout=20000){return new Promise((resolve,reject)=>{const cb='_fc'+(++_jid)+'_'+Date.now();const s=document.createElement('script');let done=false;window[cb]=function(d){done=true;delete window[cb];s.remove();resolve(d);};s.src=url+(url.includes('?')?'&':'?')+'callback='+cb;s.onerror=function(){if(!done){delete window[cb];s.remove();reject(new Error('Script error'));}};document.head.appendChild(s);setTimeout(()=>{if(!done){delete window[cb];s.remove();reject(new Error('Timeout'));}},timeout);});}
function cloudSend(action,data){return jsonp(syncUrl+'?action='+action+'&payload='+encodeURIComponent(JSON.stringify(data)));}
async function cloudConnect(){syncUrl=$('syncUrl').value.trim().replace(/\/+$/,'');if(!syncUrl){showToast('Nhập URL',false);return;}localStorage.setItem('fin_sync_url',syncUrl);showToast('Đang kết nối...');updateSyncUI(false,'Đang kết nối...');try{const r=await jsonp(syncUrl+'?action=ping');if(r&&r.ok){syncConnected=true;updateSyncUI(true,'Đã kết nối ✓');showToast('OK! Auto-pushing...');playSuccess();await cloudPushAll();if(monthMoneyData)cloudSaveMonthMoney(monthMoneyData);if(installments.length)cloudSaveInstallments();}else{syncConnected=false;updateSyncUI(false,'Lỗi');showToast('Thất bại',false);}}catch(e){syncConnected=false;const isScript=/script error/i.test(e.message||'');const msg=isScript?'Không tải được script. Trên iPhone: Cài đặt → Safari → TẮT "Ngăn theo dõi trên nhiều trang web" + tắt trình chặn QC, rồi thử lại.':e.message;updateSyncUI(false,isScript?'Bị chặn (xem hướng dẫn)':e.message);showToast(msg,false);if(isScript)alert('KẾT NỐI BỊ CHẶN TRÊN ĐIỆN THOẠI\n\nThẻ script gọi sang Google bị Safari chặn. Cách sửa trên iPhone:\n\n1) Cài đặt → Safari → TẮT "Ngăn theo dõi trên nhiều trang web" (Prevent Cross-Site Tracking).\n2) Tắt mọi trình chặn quảng cáo/nội dung (Content Blocker).\n3) Nếu bật iCloud Private Relay → tạm tắt.\n4) Mở bằng Safari (không phải Chrome/trình duyệt trong app Facebook…).\n\nKiểm tra nhanh: mở link này trong Safari, phải thấy {"ok":true}:\n'+syncUrl+'?action=ping');}}
function cloudDisconnect(){syncUrl='';syncConnected=false;localStorage.removeItem('fin_sync_url');$('syncUrl').value='';updateSyncUI(false,'Chưa kết nối');showToast('Đã ngắt');}
async function cloudPull(isAuto,silent){if(fbActive)return;if(!syncUrl){if(!silent)showToast('Chưa kết nối',false);return;}if(isAuto&&_userDirty){updateSyncUI(true,'Skip auto-pull (có thay đổi)');return;}if(!isAuto&&!silent)showToast('Pull...');updateSyncUI(true,'Pull...');try{const r=await jsonp(syncUrl+'?action=getAll');if(!r||!r.ok){if(!isAuto)showToast('Pull lỗi',false);return;}if(isAuto&&_userDirty){updateSyncUI(true,'Skip (có thay đổi mới)');return;}let merged=false;if(r.transactions){const localMap={};txData.forEach(t=>{if(t.budgetType)localMap[t.id]=t.budgetType;});const cloudBtMap=r.budgetTypeMap||{};txData=r.transactions;txData.forEach(t=>{if(!t.budgetType){if(cloudBtMap[t.id]){t.budgetType=cloudBtMap[t.id];merged=true;}else if(localMap[t.id]){t.budgetType=localMap[t.id];merged=true;}}});localStorage.setItem('fin_tx',JSON.stringify(txData));}if(r.investments){investments=r.investments;saveInv();}if(r.catsChi){catsChi=r.catsChi;localStorage.setItem('fin_cats_chi',JSON.stringify(catsChi));}if(r.catsThu){catsThu=r.catsThu;localStorage.setItem('fin_cats_thu',JSON.stringify(catsThu));}if(r.budgets){budgets=r.budgets;localStorage.setItem('fin_budgets',JSON.stringify(budgets));}if(r.opening!==undefined){opening=r.opening;localStorage.setItem('fin_opening',opening);$('openingBal').value=opening||'';}let _mmRepair=false;if(r.weekBudget!==undefined){let sv=r.weekBudget;if(typeof sv==='string'){try{sv=JSON.parse(sv);}catch(_e){sv=null;}}const sT=sv&&sv.createdAt?new Date(sv.createdAt).getTime():0;const lT=monthMoneyData&&monthMoneyData.createdAt?new Date(monthMoneyData.createdAt).getTime():0;if(sv&&sv.deleted){if(sT>=lT){monthMoneyData=null;localStorage.removeItem('fin_month_money');}else if(monthMoneyData){_mmRepair=true;}}else if(sv&&sv.total!==undefined&&sv.total!==null){if(sT>=lT){monthMoneyData=sv;localStorage.setItem('fin_month_money',JSON.stringify(monthMoneyData));}else{_mmRepair=true;}}else{if(monthMoneyData)_mmRepair=true;/* server trống → GIỮ local, tự đẩy lại lên */}}let _instRepair=false;if(r.installments!==undefined){const sT=r.installmentsTs?new Date(r.installmentsTs).getTime():0;const lT=installmentsTs?new Date(installmentsTs).getTime():0;if(Array.isArray(r.installments)&&sT>=lT){installments=r.installments;installmentsTs=r.installmentsTs||installmentsTs;localStorage.setItem('fin_installments',JSON.stringify(installments));if(r.installmentsTs)localStorage.setItem('fin_installments_ts',r.installmentsTs);}else if(lT>sT&&installments.length){_instRepair=true;}}if(r.monthlyFees!==undefined&&Array.isArray(r.monthlyFees)){monthlyFees=r.monthlyFees;localStorage.setItem('fin_monthly_fees',JSON.stringify(monthlyFees));}if(r.accounts){accounts=r.accounts;localStorage.setItem('fin_accounts',JSON.stringify(accounts));}rebuildSelects();updateAll();if($('page-tragop')&&$('page-tragop').classList.contains('active'))renderTragop();if(!silent){showToast('Pull: '+txData.length+' GD');playSuccess();}updateSyncUI(true,'Synced '+new Date().toLocaleTimeString('vi-VN'));if(_mmRepair){setTimeout(()=>cloudSaveMonthMoney(monthMoneyData),500);}if(_instRepair){setTimeout(()=>cloudSaveInstallments(),700);}if(merged){setTimeout(()=>cloudPushAll(),1000);}}catch(e){if(!isAuto&&!silent)showToast('Pull: '+e.message,false);}}
async function cloudPushAll(){if(fbActive)return;if(!syncUrl){showToast('Chưa kết nối',false);return;}showToast('Push...');updateSyncUI(true,'Push...');try{
const btMap={};txData.forEach(t=>{if(t.budgetType)btMap[t.id]=t.budgetType;});
const payload=JSON.stringify({opening,catsChi,catsThu,budgets,theme,soundOn,allTx:txData,allInv:investments,installments:installments,installmentsTs:installmentsTs,monthlyFees:monthlyFees,budgetTypeMap:btMap,accounts:accounts});
const form=new FormData();form.append('action','pushAll');form.append('payload',payload);
await fetch(syncUrl,{method:'POST',body:form,mode:'no-cors',redirect:'follow'});
showToast('Push OK!');playSuccess();updateSyncUI(true,'Pushed '+new Date().toLocaleTimeString('vi-VN'));clearDirty();
}catch(e){showToast('Push: '+e.message,false);}}
async function cloudAddTx(tx){if(fbActive||!syncUrl||!syncConnected)return;try{const r=await cloudSend('addTx',tx);if(r&&r.ok){clearDirty();updateSyncUI(true,'↑ '+new Date().toLocaleTimeString('vi-VN'));}else updateSyncUI(true,'⚠ Lỗi');}catch(e){updateSyncUI(true,'⚠ Lỗi');}}
function cloudDeleteTx(id){if(fbActive||!syncUrl||!syncConnected)return;jsonp(syncUrl+'?action=deleteTx&id='+id).then(r=>{if(r&&r.ok)clearDirty();}).catch(()=>{});}
function cloudAddInv(inv){if(fbActive||!syncUrl||!syncConnected)return;cloudSend('addInvestment',inv).catch(()=>{});}
function cloudDeleteInv(id){if(fbActive||!syncUrl||!syncConnected)return;jsonp(syncUrl+'?action=deleteInvestment&id='+id).catch(()=>{});}
function cloudUpdateInv(data){if(fbActive||!syncUrl||!syncConnected)return;cloudSend('updateInvestment',data).catch(()=>{});}
let _settleTimer=null;
function cloudSaveSettings(){if(fbActive||!syncUrl||!syncConnected)return;const btMap={};txData.forEach(t=>{if(t.budgetType)btMap[t.id]=t.budgetType;});const form=new FormData();form.append('action','saveSettings');form.append('payload',JSON.stringify({opening,catsChi,catsThu,budgets,theme,soundOn,installments:installments,installmentsTs:installmentsTs,monthlyFees:monthlyFees,budgetTypeMap:btMap,accounts:accounts}));setDirty();fetch(syncUrl,{method:'POST',body:form,mode:'no-cors'}).catch(()=>{});if(_settleTimer)clearTimeout(_settleTimer);_settleTimer=setTimeout(clearDirty,3500);/* no-cors can't confirm; release the pull-guard shortly after */}
function updateSyncUI(connected,label){const dot=$('syncStatus');const lbl=$('syncLabel');if(dot)dot.style.background=connected?'var(--green)':'var(--text3)';if(lbl)lbl.textContent=label;}

/* ── INIT ── */
function init(){
  document.body.setAttribute('data-theme',theme);$('openingBal').value=opening||'';
  const now=new Date();$('dashDate').textContent=now.toLocaleDateString('vi-VN',{weekday:'long',year:'numeric',month:'long',day:'numeric'});$('sidebarDate').textContent=now.toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'});
  rebuildSelects();onCalcCatChange();updateAll();
  // Firebase nạp kiểu defer → có thể chưa sẵn sàng lúc init() chạy.
  // Chờ tối đa ~8s cho SDK; có thì bật real-time, không thì chạy offline/Apps Script.
  (function waitFB(n){
    if(typeof firebase!=='undefined'){fbConfigured()?fbInit():bootSync();return;}
    if(n>160){bootSync();return;}
    setTimeout(function(){waitFB(n+1);},50);
  })(0);
  // QUAN TRỌNG: hiện app NGAY bằng dữ liệu đã lưu trong máy — KHÔNG bắt người dùng
  // chờ Firebase kết nối/đồng bộ. Firebase về thì tự cập nhật số liệu real-time (chạy nền).
  setTimeout(function(){hideSplash();},1000);
}

/* ── SPLASH ── */
function splash(msg){const m=$('splashMsg');if(m&&msg)m.textContent=msg;}
function hideSplash(){const s=$('appSplash');if(!s)return;s.style.opacity='0';setTimeout(()=>{if(s&&s.parentNode)s.parentNode.removeChild(s);},450);}
function delay(ms){return new Promise(r=>setTimeout(r,ms));}

/* ── BOOT: load full data BEFORE revealing the UI, then go live ── */
async function bootSync(){
  if(syncUrl&&syncConnected){
    _autoPulling=true;
    try{
      if(_userDirty){
        // Local edits pending → push (confirmed) first so we don't lose them
        splash('Đồng bộ thay đổi…');updateSyncUI(true,'Push pending...');
        await cloudPushAll();
      }
      splash('Đang tải dữ liệu…');updateSyncUI(true,'Đang tải...');
      // Chờ tải xong nhưng KHÔNG chặn UI quá 2.5s → web luôn hiện dưới 3 giây.
      // Nếu mạng chậm, dữ liệu vẫn tự áp vào nền ngay khi về (re-render tại chỗ).
      await Promise.race([cloudPull(true,true).catch(()=>{}),delay(2500)]);
    }catch(e){console.warn('boot',e);}
    _autoPulling=false;
  }
  hideSplash();
  startLivePolling();
}

/* ── LIVE POLLING: keep data fresh across devices without manual refresh ── */
let _pollTimer=null,_liveBound=false;
function _pollNow(){
  if(fbActive||!syncUrl||!syncConnected)return;
  if(document.hidden)return;                 // tab not visible
  if(_userDirty||_autoPulling)return;        // local change in flight
  const ae=document.activeElement,tag=ae&&ae.tagName;
  if(tag==='INPUT'||tag==='SELECT'||tag==='TEXTAREA')return; // user is typing
  cloudPull(true,true).catch(()=>{});
}
function startLivePolling(){
  if(_pollTimer)clearInterval(_pollTimer);
  // Firebase real-time đã đẩy cập nhật <1s → không cần poll 6s (chỉ dùng cho Google Sheets cũ)
  if(fbActive)return;
  _pollTimer=setInterval(_pollNow,6000); // 6s khi đang mở & hiển thị → cập nhật gần như tức thì
  if(!_liveBound){
    _liveBound=true;
    // Lấy data ngay khi quay lại app / có mạng lại (đổi máy là thấy liền)
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)_pollNow();});
    window.addEventListener('focus',_pollNow);
    window.addEventListener('pageshow',_pollNow);   // iOS bfcache khi mở lại PWA
    window.addEventListener('online',_pollNow);
  }
}
let monthMoneyData=JSON.parse(localStorage.getItem('fin_month_money')||'null');
// Lương hằng tháng (cố định) — dùng để dự phóng tài sản cuối năm. {amount, createdAt}
let salaryData=JSON.parse(localStorage.getItem('fin_salary')||'null');
// Migration từ ngân sách tuần cũ
if(!monthMoneyData){
  const _old=JSON.parse(localStorage.getItem('fin_week_budget')||'null');
  if(_old&&_old.total){monthMoneyData={total:_old.total,createdAt:_old.createdAt||new Date().toISOString()};localStorage.setItem('fin_month_money',JSON.stringify(monthMoneyData));}
}

function getTotalAssets(){
  const invPnL=investments.reduce((s,i)=>(i.curPrice-i.buyPrice)*i.qty+s,0);
  const accTotal=totalAccounts();
  // 1 vòng lặp cho toàn bộ thu/chi (thay 2 lần filter+reduce trên cả txData)
  let net=0;
  for(const t of txData){if(t.type==='thu')net+=t.amount;else if(t.type==='chi')net-=t.amount;}
  return opening+net+invPnL+accTotal;
}

// Chi thường đã tiêu KỂ TỪ lúc đặt tiền dùng trong tháng
function getMonthMoneySpent(){
  if(!monthMoneyData)return 0;
  const start=monthMoneyData.createdAt?new Date(monthMoneyData.createdAt).getTime():0;
  return txData.filter(t=>{
    if(t.type!=='chi'||t.budgetType==='extra')return false;
    return start===0||t.id>=start;
  }).reduce((s,t)=>s+t.amount,0);
}

// Tiền dùng trong tháng còn lại = số đã đặt − chi thường (từ lúc đặt)
function getMonthMoneyRemaining(){
  if(!monthMoneyData)return null;
  return monthMoneyData.total-getMonthMoneySpent();
}

// Tiết kiệm = Tổng tài sản − Tiền dùng trong tháng còn lại
// - Chi thường: trừ tiền dùng tháng → tiết kiệm KHÔNG ĐỔI
// - Chi ngoài: trừ thẳng tổng tài sản → tiết kiệm GIẢM
// - Chi thường lố (còn lại âm): phần lố trừ vào tiết kiệm
function getSavings(){
  if(!monthMoneyData)return 0;
  const remaining=getMonthMoneyRemaining();
  return getTotalAssets()-Math.max(remaining,0);
}
let installments=JSON.parse(localStorage.getItem('fin_installments')||'[]');
let installmentsTs=localStorage.getItem('fin_installments_ts')||'';
// Trả góp cũ (trước v9) chưa có timestamp → gán mốc thời gian để được seed lên cloud
if(installments.length&&!installmentsTs){installmentsTs=new Date().toISOString();localStorage.setItem('fin_installments_ts',installmentsTs);}
// Phí cố định hàng tháng (điện nước, internet, gym…) — đồng bộ kèm settings
let monthlyFees=JSON.parse(localStorage.getItem('fin_monthly_fees')||'[]');

/* ════════════════════════════════════════════
   FIREBASE REALTIME SYNC
   - Khởi động tức thì từ localStorage; Firebase đẩy cập nhật real-time (<1s).
   - Dữ liệu riêng tư ở /users/{uid}; đăng nhập email/mật khẩu.
   - Khi Firebase bật → Apps Script tự tắt (fbActive=true).
════════════════════════════════════════════ */
var fbActive=false;
const FIREBASE_CONFIG={apiKey:"AIzaSyDTGFDXo390dH3sIZMBmw4J6E6XtBYuTY8",authDomain:"finance-fb03b.firebaseapp.com",databaseURL:"https://finance-fb03b-default-rtdb.asia-southeast1.firebasedatabase.app",projectId:"finance-fb03b",storageBucket:"finance-fb03b.firebasestorage.app",messagingSenderId:"724966318747",appId:"1:724966318747:web:4426dc76d0ec7780a21c3e",measurementId:"G-P6QS10PJ35"};
const FB={auth:null,db:null,ref:null,uid:null,_pushSig:null,_applying:false,_seeded:false,_saveTimer:null,_shown:false,_lastSynced:null};

function fbConfigured(){return typeof firebase!=='undefined'&&FIREBASE_CONFIG&&!!FIREBASE_CONFIG.databaseURL;}

function fbInit(){
  if(!fbConfigured())return;
  try{
    firebase.initializeApp(FIREBASE_CONFIG);
    FB.auth=firebase.auth();
    FB.db=firebase.database();
    fbActive=true;
    try{FB.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);}catch(e){}
    FB.auth.onAuthStateChanged(function(u){
      if(u){FB.uid=u.uid;FB._shown=true;hideLogin();fbAttach();}
      else{FB.uid=null;fbDetach();showLogin();}
      fbUpdateSettingsUI();
    });
  }catch(e){console.warn('fb init',e);fbActive=false;bootSync();}
}

function fbAttach(){
  if(!FB.uid||!FB.db)return;
  FB.ref=FB.db.ref('users/'+FB.uid);
  FB.ref.on('value',function(snap){
    const val=snap.val();
    if(val==null){ // cloud trống → seed bằng dữ liệu hiện có của máy này
      if(!FB._seeded){FB._seeded=true;fbSaveAll(true);}
      hideSplash();return;
    }
    FB._seeded=true;
    fbApply(val);
  });
}
function fbDetach(){if(FB.ref){FB.ref.off();FB.ref=null;}FB._seeded=false;}

// Chữ ký nội dung (độc lập thứ tự key) để bỏ qua "echo" do chính mình ghi
function fbSig(d){
  const t=Object.keys(d.transactions||{}).map(function(k){var x=d.transactions[k];return x.id+':'+x.type+':'+x.amount+':'+x.cat+':'+x.note+':'+x.date+':'+(x.budgetType||'');}).sort().join('|');
  const i=Object.keys(d.investments||{}).map(function(k){var x=d.investments[k];return x.id+':'+x.curPrice+':'+x.buyPrice+':'+x.qty+':'+x.name+':'+x.type;}).sort().join('|');
  const a=Object.keys(d.accounts||{}).map(function(k){var x=d.accounts[k];return x.id+':'+x.balance+':'+x.name+':'+x.type;}).sort().join('|');
  const s=typeof d.settings==='string'?d.settings:JSON.stringify(d.settings||{});
  return t+'#'+i+'#'+a+'#'+s;
}
// Chuỗi hoá ổn định (sắp key) → so sánh không phụ thuộc thứ tự key (Firebase trả khác thứ tự local)
function stableStr(o){if(o===null||typeof o!=='object')return JSON.stringify(o);if(Array.isArray(o))return '['+o.map(stableStr).join(',')+']';return '{'+Object.keys(o).sort().map(function(k){return JSON.stringify(k)+':'+stableStr(o[k]);}).join(',')+'}';}
// Cây dữ liệu hiện tại của máy (dạng object keyed-by-id) để diff/ghi từng nhánh
function fbTree(){
  const txObj={};txData.forEach(function(t){if(t&&t.id!=null)txObj[String(t.id)]=t;});
  const invObj={};investments.forEach(function(i){if(i&&i.id!=null)invObj[String(i.id)]=i;});
  const accObj={};accounts.forEach(function(a){if(a&&a.id!=null)accObj[String(a.id)]=a;});
  const settingsObj={opening:opening,catsChi:catsChi,catsThu:catsThu,budgets:budgets,monthMoney:monthMoneyData||null,salary:salaryData||null,installments:installments,monthlyFees:monthlyFees};
  return {transactions:txObj,investments:invObj,accounts:accObj,settings:JSON.stringify(settingsObj)};
}
// Hợp nhất theo từng-mục: bắt đầu từ server, GIỮ mục mới thêm cục bộ (chưa kịp đẩy),
// GIỮ mục đã SỬA cục bộ (chưa kịp đẩy) khi server chưa đổi mục đó, BỎ mục đã xoá cục bộ.
// Nhờ vậy đổi máy / sửa-thêm-xoá KHÁC nhau không mất dữ liệu — kể cả khi snapshot server
// về đúng lúc bản sửa cục bộ chưa kịp push (vd: thêm 35k rồi sửa ngay thành 40k).
function fbMergeColl(localArr,serverObj,lastObj){
  const out={};const sv=serverObj||{},last=lastObj||{};
  Object.keys(sv).forEach(function(id){out[id]=sv[id];});
  const localById={};localArr.forEach(function(x){if(x&&x.id!=null)localById[String(x.id)]=x;});
  localArr.forEach(function(x){
    if(!x||x.id==null)return;
    var id=String(x.id);
    if(!(id in out)&&!(id in last)){out[id]=x;return;}                       // thêm cục bộ chưa có trên server
    // SỬA cục bộ chưa đẩy: server CHƯA đổi mục này kể từ lần sync trước (out===last)
    // nhưng local đã khác baseline → đây là sửa pending → giữ bản local (sẽ tự push lại để hội tụ).
    // Nếu server CŨNG đổi (out!==last) → xung đột thật → ưu tiên server (last-write-wins).
    if((id in out)&&(id in last)&&stableStr(out[id])===stableStr(last[id])&&stableStr(x)!==stableStr(last[id])){
      out[id]=x;
    }
  });
  Object.keys(last).forEach(function(id){if(!(id in localById)&&(id in out))delete out[id];});               // xoá cục bộ chưa propagate
  return Object.keys(out).map(function(k){return out[k];});
}
// Diff 2 cây → object multi-path cho FB.ref.update() (chỉ ghi nhánh thay đổi/xoá)
function fbDiff(prev,cur){
  const up={};
  ['transactions','investments','accounts'].forEach(function(coll){
    const p=prev[coll]||{},c=cur[coll]||{};
    Object.keys(c).forEach(function(id){if(stableStr(c[id])!==stableStr(p[id]))up[coll+'/'+id]=c[id];});
    Object.keys(p).forEach(function(id){if(!(id in c))up[coll+'/'+id]=null;});
  });
  if(prev.settings!==cur.settings)up['settings']=cur.settings;
  return up;
}

function fbApply(val){
  const sig=fbSig({transactions:val.transactions,investments:val.investments,accounts:val.accounts,settings:val.settings});
  const serverTree={transactions:val.transactions||{},investments:val.investments||{},accounts:val.accounts||{},settings:(typeof val.settings==='string'?val.settings:JSON.stringify(val.settings||{}))};
  if(sig===FB._pushSig){FB._lastSynced=serverTree;hideSplash();return;} // chính mình vừa ghi → chỉ cập nhật mốc đồng bộ
  FB._applying=true;
  try{
    const last=FB._lastSynced||{};
    // Hợp nhất theo từng-mục (không ghi đè cả cây) → an toàn khi 2 máy sửa mục khác nhau
    txData=fbMergeColl(txData,val.transactions,last.transactions).sort(function(a,b){return (a.id||0)-(b.id||0);});
    investments=fbMergeColl(investments,val.investments,last.investments);
    accounts=fbMergeColl(accounts,val.accounts,last.accounts);
    // tx/inv/acc luôn ghi lại (đã hợp nhất từng-mục)
    localStorage.setItem('fin_tx',JSON.stringify(txData));
    localStorage.setItem('fin_inv',JSON.stringify(investments));
    localStorage.setItem('fin_accounts',JSON.stringify(accounts));
    // SETTINGS là 1 blob (không merge từng-field) → cũng theo nguyên tắc baseline:
    // nếu server CHƯA đổi settings kể từ lần sync trước (server===baseline) mà local đã đổi
    // (chưa kịp push) thì GIỮ settings local — tránh nuốt mất tiền-dùng/danh mục/ngân sách…
    // (bản local sẽ tự đẩy lên ở fbDiff cuối hàm để hội tụ).
    const lastSetStr=(last&&typeof last.settings==='string')?last.settings:'';
    const keepLocalSettings=lastSetStr!==''&&serverTree.settings===lastSetStr&&fbTree().settings!==lastSetStr;
    if(!keepLocalSettings){
      let s={};try{s=val.settings?(typeof val.settings==='string'?JSON.parse(val.settings):val.settings):{};}catch(e){s={};}
      opening=s.opening||0;if($('openingBal'))$('openingBal').value=opening||'';
      if(s.catsChi)catsChi=s.catsChi;
      if(s.catsThu)catsThu=s.catsThu;
      budgets=s.budgets||{};
      monthMoneyData=s.monthMoney||null;
      salaryData=s.salary||null;
      installments=s.installments||[];
      monthlyFees=s.monthlyFees||[];
      if(salaryData)localStorage.setItem('fin_salary',JSON.stringify(salaryData));else localStorage.removeItem('fin_salary');
      localStorage.setItem('fin_monthly_fees',JSON.stringify(monthlyFees));
      localStorage.setItem('fin_cats_chi',JSON.stringify(catsChi));
      localStorage.setItem('fin_cats_thu',JSON.stringify(catsThu));
      localStorage.setItem('fin_budgets',JSON.stringify(budgets));
      if(monthMoneyData)localStorage.setItem('fin_month_money',JSON.stringify(monthMoneyData));else localStorage.removeItem('fin_month_money');
      localStorage.setItem('fin_installments',JSON.stringify(installments));
    }
    FB._lastSynced=serverTree; // mốc = sự thật trên server (các mục pending cục bộ sẽ được đẩy ở lần save kế)
    FB._pushSig=sig;
  }catch(e){console.warn('fb apply',e);}
  FB._applying=false;
  try{rebuildSelects();updateAll();}catch(e){}
  const ap=document.querySelector('.page.active');
  if(ap){const id=ap.id.replace('page-','');const map={tragop:renderTragop,history:renderHistory,invest:renderInvest,accounts:renderAccounts,stats:renderStats,budget:renderBudget,settings:renderSettings};try{(map[id]||function(){})();}catch(e){}}
  hideSplash();
  // Có mục pending cục bộ chưa có trên server? → đẩy ngay để hội tụ
  try{if(Object.keys(fbDiff(serverTree,fbTree())).length)fbSaveAll();}catch(e){}
}

function fbSaveAll(immediate){
  if(!fbActive||!FB.uid||FB._applying||!FB.ref)return;
  clearTimeout(FB._saveTimer);
  const run=function(){
    if(!FB.ref)return;
    const cur=fbTree();
    FB._pushSig=fbSig(cur);
    const prev=FB._lastSynced;
    FB._lastSynced=cur; // optimistic — nếu lỗi sẽ reset để full-sync lại
    const onErr=function(e){console.warn('fb save',e);FB._lastSynced=null;};
    if(!prev){FB.ref.set(cur).catch(onErr);return;}            // lần đầu / seed → ghi nguyên cây
    const up=fbDiff(prev,cur);
    if(!Object.keys(up).length)return;                          // không có gì đổi
    FB.ref.update(up).catch(onErr);                             // CHỈ ghi nhánh thay đổi → không đè dữ liệu máy khác
  };
  if(immediate)run();else FB._saveTimer=setTimeout(run,300);
}

/* ── LOGIN UI ── */
function showLogin(){FB._shown=true;const el=$('fbLogin');if(el)el.style.display='flex';hideSplash();}
function hideLogin(){const el=$('fbLogin');if(el)el.style.display='none';}
let fbAuthMode='login';
function setAuthMode(m){
  fbAuthMode=m;const signup=(m==='signup');
  document.querySelectorAll('#fbSeg button').forEach(b=>b.classList.toggle('on',b.dataset.mode===m));
  $('fbName').style.display=signup?'':'none';
  $('fbGoBtn').textContent=signup?'Tạo tài khoản':'Đăng nhập';
  $('fbSub').textContent=signup?'Tạo tài khoản mới — dữ liệu riêng tư, đồng bộ mọi thiết bị':'Đăng nhập để đồng bộ real-time giữa các thiết bị';
  $('fbPass').placeholder=signup?'Mật khẩu (≥ 6 ký tự)':'Mật khẩu';
  $('fbPass').setAttribute('autocomplete',signup?'new-password':'current-password');
  $('fbForgot').style.display=signup?'none':'';
  $('fbLoginErr').textContent='';
}
function fbSubmitAuth(e){if(e&&e.preventDefault)e.preventDefault();if(fbAuthMode==='signup')fbDoSignup();else fbDoLogin();}
function fbDoLogin(e){if(e&&e.preventDefault)e.preventDefault();if(!FB.auth)return;const em=($('fbEmail').value||'').trim(),pw=$('fbPass').value||'';if(!em||!pw){$('fbLoginErr').textContent='Nhập email & mật khẩu';return;}$('fbLoginErr').textContent='Đang đăng nhập…';FB.auth.signInWithEmailAndPassword(em,pw).then(function(){$('fbLoginErr').textContent='';$('fbPass').value='';}).catch(function(err){$('fbLoginErr').textContent=fbErrMsg(err);});}
function fbDoSignup(){
  if(!FB.auth)return;
  const em=($('fbEmail').value||'').trim(),pw=$('fbPass').value||'',nm=($('fbName').value||'').trim();
  if(!em||!pw){$('fbLoginErr').textContent='Nhập email & mật khẩu';return;}
  if(pw.length<6){$('fbLoginErr').textContent='Mật khẩu cần ít nhất 6 ký tự';return;}
  $('fbLoginErr').textContent='Đang tạo tài khoản…';
  FB.auth.createUserWithEmailAndPassword(em,pw).then(function(cred){
    $('fbLoginErr').textContent='';$('fbPass').value='';
    try{if(nm&&cred.user)cred.user.updateProfile({displayName:nm});}catch(_){}
    try{if(cred.user&&cred.user.sendEmailVerification)cred.user.sendEmailVerification();}catch(_){}
    showToast('Tạo tài khoản thành công! Đã gửi email xác minh — kiểm tra hộp thư nhé.');
  }).catch(function(err){$('fbLoginErr').textContent=fbErrMsg(err);});
}
function fbForgotPassword(){
  if(!FB.auth)return;
  const em=($('fbEmail').value||'').trim();
  if(!em){$('fbLoginErr').textContent='Nhập email rồi bấm “Quên mật khẩu?” để nhận link đặt lại';return;}
  $('fbLoginErr').textContent='Đang gửi…';
  FB.auth.sendPasswordResetEmail(em).then(function(){$('fbLoginErr').textContent='';showToast('Đã gửi email đặt lại mật khẩu tới '+em);}).catch(function(err){$('fbLoginErr').textContent=fbErrMsg(err);});
}
function fbSkip(){hideLogin();showToast('Dùng offline — dữ liệu chỉ lưu trên máy này',false);}
function fbLogout(){if(FB.auth)FB.auth.signOut();fbDetach();showToast('Đã đăng xuất');showLogin();fbUpdateSettingsUI();}
function fbErrMsg(err){const c=(err&&err.code)||'';if(/email-already-in-use/.test(c))return'Email này đã được đăng ký — hãy đăng nhập';if(/weak-password/.test(c))return'Mật khẩu quá yếu (cần ≥ 6 ký tự)';if(/operation-not-allowed/.test(c))return'Chưa bật đăng ký Email/Password trong Firebase Console';if(/wrong-password|invalid-credential|invalid-login/.test(c))return'Sai email hoặc mật khẩu';if(/user-not-found/.test(c))return'Tài khoản không tồn tại';if(/too-many-requests/.test(c))return'Thử lại sau ít phút';if(/network/.test(c))return'Lỗi mạng — kiểm tra kết nối';if(/invalid-email/.test(c))return'Email không hợp lệ';return(err&&err.message)||'Có lỗi xảy ra';}
function fbUpdateSettingsUI(){const el=$('fbStatus');if(!el)return;if(!fbActive){el.innerHTML='<div style="font-size:11px;color:var(--text3);">Firebase chưa sẵn sàng (kiểm tra mạng / cấu hình).</div>';return;}if(FB.uid){const em=(FB.auth&&FB.auth.currentUser&&FB.auth.currentUser.email)||'';el.innerHTML='<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;"><span style="width:8px;height:8px;border-radius:50%;background:var(--green);box-shadow:0 0 8px rgba(29,158,117,.5);flex-shrink:0;"></span><span style="font-size:11px;color:var(--text2);flex:1;min-width:120px;">Đã đăng nhập: <b style="color:var(--text)">'+em+'</b><br>Đồng bộ real-time đang bật ✓</span><button class="btn btn-red" onclick="fbLogout()">Đăng xuất</button></div>';}else{el.innerHTML='<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;"><span style="font-size:11px;color:var(--text2);flex:1;">Chưa đăng nhập.</span><button class="btn btn-accent" onclick="showLogin()">Đăng nhập</button></div>';}}

/* ════════════════════════════════════════════
   SỬA GIAO DỊCH (tap vào 1 giao dịch để chỉnh)
════════════════════════════════════════════ */
let _editId=null,_editType='chi',_editBudget='normal';
function findTx(id){return txData.find(x=>String(x.id)===String(id));}
function setEditType(ty){_editType=ty;[...document.querySelectorAll('#editTypeSeg button')].forEach(b=>b.classList.toggle('on',b.dataset.v===ty));$('editBudgetRow').style.display=ty==='chi'?'':'none';renderEditCats();}
function setEditBudget(v){_editBudget=v;[...document.querySelectorAll('#editBudgetSeg button')].forEach(b=>b.classList.toggle('on',b.dataset.v===v));}
function renderEditCats(keep){
  const list=_editType==='thu'?catsThu:catsChi;const sel=keep!=null?keep:$('editCat').value;
  let html=list.map(c=>`<option value="${c.name}"${c.name===sel?' selected':''}>${c.emoji} ${c.name}</option>`).join('');
  if(sel&&!list.some(c=>c.name===sel))html+=`<option value="${sel}" selected>${sel} (đã xoá)</option>`;
  $('editCat').innerHTML=html;
}
function openEditTx(id){
  const t=findTx(id);if(!t)return;
  _editId=t.id;_editType=t.type;_editBudget=t.budgetType==='extra'?'extra':'normal';
  setEditType(t.type);setEditBudget(_editBudget);renderEditCats(t.cat);
  $('editAmt').value=t.amount/1000;$('editNote').value=t.note||'';
  $('editOverlay').classList.add('show');
}
function closeEditTx(){$('editOverlay').classList.remove('show');_editId=null;}
function saveEditTx(){
  const t=findTx(_editId);if(!t){closeEditTx();return;}
  const amt=smartAmount($('editAmt').value);
  if(!amt||amt<=0){showToast('Nhập số tiền hợp lệ',false);return;}
  t.type=_editType;t.cat=$('editCat').value;t.amount=amt;t.note=$('editNote').value.trim()||t.cat;
  if(_editType==='chi')t.budgetType=_editBudget;else delete t.budgetType;
  save();updateAll();
  if($('page-history').classList.contains('active'))renderHistory();
  if(!fbActive&&syncConnected)cloudPushAll(); // Apps Script: đẩy lại toàn bộ (Firebase đã tự sync qua save())
  closeEditTx();playSuccess();showToast('Đã cập nhật giao dịch ✓');
}
function deleteEditTx(){if(_editId==null)return;const id=_editId;closeEditTx();deleteTx(id);}

/* ════════════════════════════════════════════
   PULL-TO-REFRESH (kéo xuống ở đầu trang để làm mới)
════════════════════════════════════════════ */
(function(){
  let startY=0,pulling=false,ready=false;const THRESH=68;
  const el=()=>$('ptr');
  const modalOpen=()=>document.querySelector('.calc-overlay.show');
  document.addEventListener('touchstart',e=>{
    if(window.scrollY>0||e.touches.length!==1||modalOpen())return;
    startY=e.touches[0].clientY;pulling=true;ready=false;
  },{passive:true});
  document.addEventListener('touchmove',e=>{
    if(!pulling)return;
    const dy=e.touches[0].clientY-startY;
    if(dy<=0||window.scrollY>0){pulling=false;const p=el();if(p){p.style.transform='';p.style.opacity='';}return;}
    const pull=Math.min(dy*0.5,76);const p=el();
    if(p){p.style.transform='translateY('+pull+'px)';p.style.opacity=Math.min(1,pull/THRESH);p.classList.toggle('ready',pull>=THRESH);}
    if(pull>=THRESH&&!ready){ready=true;hapticTap();}else if(pull<THRESH){ready=false;}
    if($('ptrMsg'))$('ptrMsg').textContent=ready?'Thả ra để làm mới':'Kéo để làm mới';
  },{passive:true});
  document.addEventListener('touchend',()=>{
    if(!pulling)return;pulling=false;const p=el();
    if(ready)doPullRefresh();else if(p){p.style.transform='';p.style.opacity='';p.classList.remove('ready');}
  },{passive:true});
})();
function doPullRefresh(){
  const p=$('ptr');if(p){p.style.transform='translateY(56px)';p.style.opacity='1';p.classList.add('spinning');p.classList.remove('ready');}
  if($('ptrMsg'))$('ptrMsg').textContent='Đang làm mới…';
  const done=function(msg){const q=$('ptr');if(q){q.classList.remove('spinning');q.style.transform='';q.style.opacity='';}if(msg)showToast(msg);};
  try{
    if(fbActive&&FB.ref){FB.ref.once('value').then(s=>{const v=s.val();if(v)fbApply(v);updateAll();done('Đã làm mới ✓');}).catch(()=>done('Lỗi làm mới'));}
    else if(syncConnected){cloudPull(false,true).then(()=>done('Đã làm mới ✓')).catch(()=>done('Lỗi làm mới'));}
    else{updateAll();setTimeout(()=>done('Đã làm mới ✓'),350);}
  }catch(e){done('Lỗi làm mới');}
}

/* ════════════════════════════════════════════
   ONBOARDING: Thêm vào Màn hình chính (PWA)
════════════════════════════════════════════ */
let _deferredPrompt=null;
function isStandalone(){return window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;}
function isiOS(){return /iphone|ipad|ipod/i.test(navigator.userAgent);}
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();_deferredPrompt=e;maybeShowInstall(false);});
function maybeShowInstall(iosOnly){
  if(isStandalone())return;                                   // đã cài → không hiện
  if(localStorage.getItem('fin_install_dismissed')==='1')return;
  const b=$('installBanner');if(!b)return;
  if(_deferredPrompt){ // Android/Chrome: có nút cài thật
    $('installText').innerHTML='Cài <b>Finance</b> như một app để chạy nhanh & toàn màn hình.';
    $('installGo').style.display='';
  }else if(isiOS()){   // iOS Safari: chỉ hướng dẫn (không có API cài)
    $('installText').innerHTML='Thêm <b>Finance</b> vào Màn hình chính để có haptic, thanh trạng thái trong suốt & mở toàn màn hình: bấm nút <b>Chia sẻ</b> ⬆️ rồi chọn <b>“Thêm vào MH chính”</b>.';
    $('installGo').style.display='none';
  }else{return;}
  b.style.display='block';
}
function dismissInstall(){localStorage.setItem('fin_install_dismissed','1');const b=$('installBanner');if(b)b.style.display='none';hapticTap();}
function doInstall(){
  if(_deferredPrompt){_deferredPrompt.prompt();_deferredPrompt.userChoice.finally(()=>{_deferredPrompt=null;dismissInstall();});}
  else{dismissInstall();}
}
// Hiện gợi ý cài đặt sau khi app đã vào, không chen vào lúc đang tải
setTimeout(()=>{try{maybeShowInstall(true);}catch(e){}},3500);

/* ════════════════════════════════════════════
   LIQUID GLASS NAV — pill trượt + kéo-thả (iOS 26 style)
════════════════════════════════════════════ */
function gnItems(){const n=$('glassNav');return n?[].slice.call(n.querySelectorAll('.gn-item')):[];}
// Đặt pill dưới 1 item (animated trừ khi đang kéo)
function gnPlacePill(item,instant){
  const nav=$('glassNav'),pill=$('gnPill');if(!nav||!pill||!item)return;
  const nr=nav.getBoundingClientRect(),ir=item.getBoundingClientRect();
  if(!ir.width)return;
  if(instant)pill.classList.add('dragging');
  pill.style.width=ir.width+'px';
  pill.style.transform='translateX('+(ir.left-nr.left)+'px)';
  if(instant){void pill.offsetWidth;pill.classList.remove('dragging');}
}
// Đồng bộ pill về item đang active (gọi sau showPage / resize / load)
function gnSync(instant){
  const items=gnItems();if(!items.length)return;
  const active=$('glassNav').querySelector('.gn-item.active')||items[0];
  // chờ layout sẵn sàng nếu nav vừa hiện
  requestAnimationFrame(()=>gnPlacePill(active,instant));
}
// Kéo-thả: pill bám theo ngón tay, item gần nhất sáng lên, thả → snap + chuyển trang
(function(){
  const nav=$('glassNav');if(!nav)return;
  let dragging=false,moved=false,startX=0,curIdx=-1;
  function nearestIdx(clientX){
    const items=gnItems();let best=0,bd=1e9;
    items.forEach((it,i)=>{const r=it.getBoundingClientRect();const c=r.left+r.width/2;const d=Math.abs(clientX-c);if(d<bd){bd=d;best=i;}});
    return best;
  }
  function highlight(i){const items=gnItems();items.forEach((it,k)=>it.classList.toggle('active',k===i));}
  function followPill(clientX){
    const items=gnItems();if(!items.length)return;
    const nr=nav.getBoundingClientRect(),pill=$('gnPill');
    const w=items[0].getBoundingClientRect().width;
    let x=clientX-nr.left-w/2;
    const pad=6,maxX=nr.width-pad-w;
    x=Math.max(pad,Math.min(maxX,x));
    pill.style.width=w+'px';pill.style.transform='translateX('+x+'px)';
  }
  function down(e){
    dragging=true;moved=false;startX=e.clientX;
    $('gnPill').classList.add('dragging');
    curIdx=nearestIdx(e.clientX);highlight(curIdx);
    try{nav.setPointerCapture(e.pointerId);}catch(_){}
  }
  function move(e){
    if(!dragging)return;
    if(Math.abs(e.clientX-startX)>3)moved=true;
    const i=nearestIdx(e.clientX);
    if(i!==curIdx){curIdx=i;highlight(i);hapticTap();}
    followPill(e.clientX); // pill bám ngón tay → cảm giác "liquid"
  }
  function up(e){
    if(!dragging)return;dragging=false;
    const pill=$('gnPill');pill.classList.remove('dragging');
    const items=gnItems();const i=nearestIdx((e&&e.clientX!=null)?e.clientX:startX);
    const page=items[i]&&items[i].dataset.page;
    gnPlacePill(items[i]); // snap mượt về item đích
    if(page)showPage(page);
  }
  nav.addEventListener('pointerdown',down);
  nav.addEventListener('pointermove',move);
  nav.addEventListener('pointerup',up);
  nav.addEventListener('pointercancel',()=>{dragging=false;$('gnPill').classList.remove('dragging');gnSync();});
})();
// Định vị pill khi load + khi xoay/đổi kích thước
window.addEventListener('resize',()=>gnSync(true));
window.addEventListener('orientationchange',()=>setTimeout(()=>gnSync(true),250));
setTimeout(()=>gnSync(true),300); // sau khi nav hiện & font/emoji đo xong

init();

/* ────────────────────────────────────────────
   TIỀN DÙNG TRONG THÁNG
──────────────────────────────────────────── */

// Lưu lên cloud CÓ XÁC NHẬN (JSONP trả response) + retry, fallback saveSettings cho script cũ
async function cloudSaveMonthMoney(data){
  if(fbActive||!syncUrl||!syncConnected)return false;
  const payload=data||{deleted:true,createdAt:new Date().toISOString()};
  for(let i=0;i<2;i++){
    try{
      const r=await cloudSend('saveMonthMoney',payload);
      if(r&&r.ok){clearDirty();updateSyncUI(true,'💵 Synced '+new Date().toLocaleTimeString('vi-VN'));return true;}
    }catch(e){/* retry */}
  }
  // Script cũ chưa có action saveMonthMoney → fallback POST saveSettings
  cloudSaveSettings();
  return false;
}

async function saveMonthMoney(){
  const raw=parseFloat($('monthMoneyInput').value)||0;
  if(!raw){showToast('Nhập số tiền!',false);return;}
  const total=smartAmount(raw);
  monthMoneyData={total:total,createdAt:new Date().toISOString()};
  localStorage.setItem('fin_month_money',JSON.stringify(monthMoneyData));
  fbSaveAll();
  $('monthMoneyInput').value='';
  updateAll();
  showToast('Đang lưu lên cloud...');
  const ok=await cloudSaveMonthMoney(monthMoneyData);
  showToast(ok?'Đã lưu & sync cloud ✓':'Đã lưu local · cloud sẽ tự sync lại');
  if(ok)playSuccess();
}

function editMonthMoney(){
  if(!monthMoneyData){showToast('Chưa có dữ liệu, nhập mới bên dưới',false);return;}
  const setup=$('monthMoneySetup');
  setup.style.display='';
  const remaining=getMonthMoneyRemaining();
  $('monthMoneyInput').value=Math.round(remaining/1000);
  smartPreview($('monthMoneyInput'),'monthMoneyPreview');
  $('monthMoneyInput').focus();
  $('monthMoneyInput').select();
}

async function resetMonthMoney(){
  if(!monthMoneyData){showToast('Chưa có dữ liệu',false);return;}
  if(!confirm('Xóa tiền dùng trong tháng?'))return;
  monthMoneyData=null;
  localStorage.removeItem('fin_month_money');
  localStorage.removeItem('fin_week_budget');
  fbSaveAll();
  $('monthMoneyInput').value='';
  const p=$('monthMoneyPreview');if(p)p.textContent='';
  updateAll();
  const ok=await cloudSaveMonthMoney(null); // tombstone {deleted:true} → các thiết bị khác cũng xóa
  showToast(ok?'Đã xóa & sync ✓':'Đã xóa local');
}

function renderMonthMoney(){
  const res=$('monthMoneyResult');
  const setup=$('monthMoneySetup');
  if(!res)return;

  if(!monthMoneyData){
    if(setup)setup.style.display='';
    res.innerHTML='<div style="font-size:11px;color:var(--text3);padding:8px 0;">Nhập số tiền được dùng trong tháng. Chi thường sẽ trừ vào đây · chi ngoài trừ thẳng tổng tài sản & tiết kiệm.</div>';
    return;
  }

  if(setup)setup.style.display='none';

  const total=monthMoneyData.total;
  const spent=getMonthMoneySpent();
  const remaining=total-spent;
  const now=new Date();
  // Chi ngoài tháng hiện tại (chỉ để tham khảo)
  const monthChiExtra=txData.filter(t=>{
    if(t.type!=='chi'||t.budgetType!=='extra')return false;
    const d=new Date(t.date);
    return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();
  }).reduce((s,t)=>s+t.amount,0);

  const remColor=remaining>=0?'#1d9e75':'#d85a30';
  const pct=total>0?Math.max(0,Math.min(100,Math.round(remaining/total*100))):0;
  const setDate=monthMoneyData.createdAt?new Date(monthMoneyData.createdAt):null;
  const setStr=setDate?setDate.toLocaleDateString('vi-VN')+' '+setDate.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'}):'';

  let html=`<div class="week-budget-result" style="margin-bottom:10px;">
    <div class="week-metric">
      <div class="week-metric-val" style="color:${remColor};font-size:19px;">${remaining>=0?'':'−'}${fmt(Math.abs(remaining))}</div>
      <div class="week-metric-lbl">Còn được dùng</div>
    </div>
    <div class="week-metric">
      <div class="week-metric-val" style="font-size:15px;color:var(--text3);">${fmt(spent)}</div>
      <div class="week-metric-lbl">Đã chi thường</div>
    </div>
    ${monthChiExtra>0?`<div class="week-metric">
      <div class="week-metric-val" style="font-size:15px;color:var(--amber);">${fmt(monthChiExtra)}</div>
      <div class="week-metric-lbl">Chi ngoài tháng này ⚡</div>
    </div>`:''}
  </div>`;

  html+=`<div style="background:var(--bg3);border-radius:6px;height:6px;overflow:hidden;margin-bottom:8px;">
    <div style="height:6px;border-radius:6px;width:${pct}%;background:${remColor};transition:width .5s cubic-bezier(.22,1,.36,1);"></div>
  </div>`;

  html+=`<div style="font-size:9px;color:var(--text3);">Đặt: ${fmt(total)} · ${setStr} · còn ${pct}%${remaining<0?' · <span style="color:#d85a30">lố '+fmt(Math.abs(remaining))+' đang trừ tiết kiệm</span>':''}</div>`;

  res.innerHTML=html;
}

/* ────────────────────────────────────────────
   TRẢ GÓP / INSTALLMENT TRACKER
──────────────────────────────────────────── */
function saveInstallments(){
  installmentsTs=new Date().toISOString();
  localStorage.setItem('fin_installments',JSON.stringify(installments));
  localStorage.setItem('fin_installments_ts',installmentsTs);
  setDirty();
  cloudSaveInstallments();
  fbSaveAll();
}
// Lưu trả góp lên cloud CÓ XÁC NHẬN (JSONP) + timestamp last-write-wins
async function cloudSaveInstallments(){
  if(fbActive||!syncUrl||!syncConnected)return false;
  const payload={items:installments,ts:installmentsTs};
  for(let i=0;i<2;i++){
    try{
      const r=await cloudSend('saveInstallments',payload);
      if(r&&r.ok){clearDirty();updateSyncUI(true,'💰 Synced '+new Date().toLocaleTimeString('vi-VN'));return true;}
    }catch(e){/* retry */}
  }
  // Script cũ chưa có action saveInstallments → fallback POST saveSettings
  cloudSaveSettings();
  return false;
}

/* ── Chế độ thêm trả góp: 'equal' (chia đều) | 'custom' (tự nhập từng tháng) ── */
let tgMode='equal';
function setTgMode(m){
  tgMode=m;const custom=(m==='custom');
  document.querySelectorAll('#tgModeSeg .chi-type-btn').forEach(b=>b.classList.toggle('active',b.dataset.mode===m));
  if($('tgTotalField'))$('tgTotalField').style.display=custom?'none':'';
  if($('tgPerField'))$('tgPerField').style.display=custom?'none':'';
  if($('tgCustomWrap'))$('tgCustomWrap').style.display=custom?'':'none';
  if(custom)renderTgCustomInputs();
  calcTgMonthly();
}
// Vẽ N ô nhập tiền (1 ô / tháng), giữ lại giá trị đã gõ khi đổi số tháng
function renderTgCustomInputs(){
  if(tgMode!=='custom')return;const wrap=$('tgCustomWrap');if(!wrap)return;
  const months=parseInt($('tgMonths').value)||0;
  if(months<1||months>360){wrap.innerHTML='<div style="font-size:11px;color:var(--text3);">Nhập "Số tháng" trước để nhập tiền từng tháng.</div>';return;}
  const old={};wrap.querySelectorAll('.tg-cm-input').forEach(i=>old[i.dataset.idx]=i.value);
  let html='<div style="font-size:11px;color:var(--text2);margin-bottom:6px;">Tiền mỗi tháng (đơn vị nghìn — 200 = 200.000₫):</div><div class="tg-cm-grid">';
  for(let i=0;i<months;i++)html+=`<div class="tg-cm-cell"><span class="tg-cm-lbl">Tháng ${i+1}</span><input type="number" class="tg-cm-input" data-idx="${i}" inputmode="numeric" placeholder="0" value="${old[i]||''}" oninput="calcTgMonthly()"></div>`;
  html+='</div>';wrap.innerHTML=html;
}
function readCustomInputs(scopeId){
  const arr=[];let sum=0;
  document.querySelectorAll('#'+scopeId+' .tg-cm-input').forEach(i=>{const v=smartAmount(parseFloat(i.value)||0);arr.push(v);sum+=v;});
  return {arr,sum};
}
function calcTgMonthly(){
  const prev = $('tgCalcPreview');
  if(!prev) return;
  const months = parseInt($('tgMonths')&&$('tgMonths').value)||0;
  if(tgMode==='custom'){
    const {arr,sum}=readCustomInputs('tgCustomWrap');
    const filled=arr.filter(v=>v>0).length;
    prev.textContent = months>0 ? `→ Tổng ${months} tháng = ${fmtVN(sum)} · đã nhập ${filled}/${months} tháng` : '';
    return;
  }
  const total = smartAmount(parseFloat($('tgTotal')&&$('tgTotal').value)||0);
  if(total>0 && months>0){
    const per = total/months;
    const perField = $('tgPerMonth');
    if(perField && (!perField.value || parseFloat(perField.value)===0)){
      perField.value = Math.round(per/1000);
      smartPreview(perField,'tgPerP');
    }
    prev.textContent = `→ Mỗi tháng: ${fmtVN(Math.round(per))} · Tổng ${months} tháng = ${fmtVN(total)}`;
  } else {
    prev.textContent = '';
  }
}

function addInstallment(){
  const name = ($('tgName').value||'').trim();
  const months = parseInt($('tgMonths').value)||0;
  const startDate = $('tgStartDate').value || new Date().toISOString().slice(0,10);
  if(!name){showToast('Nhập tên khoản vay!',false);return;}
  if(!months){showToast('Nhập số tháng!',false);return;}
  let inst;
  if(tgMode==='custom'){
    const {arr,sum}=readCustomInputs('tgCustomWrap');
    if(arr.length!==months||sum<=0){showToast('Nhập tiền cho các tháng!',false);return;}
    inst={id:Date.now(),name,total:sum,months,perMonth:Math.round(sum/months),customAmounts:arr,startDate,paidMonths:new Array(months).fill(false)};
  } else {
    const total = smartAmount(parseFloat($('tgTotal').value)||0);
    const perMonth = smartAmount(parseFloat($('tgPerMonth').value)||0);
    if(!total){showToast('Nhập tổng tiền!',false);return;}
    inst={id:Date.now(),name,total,months,perMonth:perMonth||Math.round(total/months),startDate,paidMonths:new Array(months).fill(false)};
  }
  installments.push(inst);
  saveInstallments();
  $('tgName').value=''; $('tgTotal').value=''; $('tgMonths').value='';
  $('tgPerMonth').value=''; $('tgCalcPreview').textContent='';
  if($('tgCustomWrap'))$('tgCustomWrap').innerHTML='';
  setTgMode('equal');
  renderTragop();
  showToast('Đã thêm khoản trả góp!');
}
/* Helpers tính tiền cho cả 2 chế độ (chia đều / tự nhập) */
function instAmtForMonth(inst,i){return (inst.customAmounts&&inst.customAmounts.length)?(inst.customAmounts[i]||0):(inst.perMonth||0);}
function instPaidAmount(inst){const paid=inst.paidMonths||[];let s=0;for(let i=0;i<inst.months;i++)if(paid[i])s+=instAmtForMonth(inst,i);return s;}
function instMonthlyDue(inst){const paid=inst.paidMonths||[];const i=paid.findIndex(p=>!p);return i<0?0:instAmtForMonth(inst,i);}

/* ── SỬA KHOẢN TRẢ GÓP ── */
let _tgEditId=null, etgMode='equal';
function openEditInstallment(id){
  const inst=installments.find(x=>String(x.id)===String(id));if(!inst)return;
  _tgEditId=inst.id;
  $('etgName').value=inst.name||'';
  $('etgStart').value=inst.startDate||new Date().toISOString().slice(0,10);
  $('etgMonths').value=inst.months||'';
  const custom=!!(inst.customAmounts&&inst.customAmounts.length);
  setEtgMode(custom?'custom':'equal');
  $('etgTotal').value=Math.round((inst.total||0)/1000);
  if(custom)renderEtgCustom(inst.customAmounts);
  $('tgEditOverlay').classList.add('show');
}
function setEtgMode(m){
  etgMode=m;const custom=(m==='custom');
  document.querySelectorAll('#etgModeSeg .chi-type-btn').forEach(b=>b.classList.toggle('active',b.dataset.mode===m));
  $('etgTotalField').style.display=custom?'none':'';
  $('etgCustomWrap').style.display=custom?'':'none';
  if(custom)renderEtgCustom();
}
function renderEtgCustom(preset){
  if(etgMode!=='custom')return;const wrap=$('etgCustomWrap');if(!wrap)return;
  const months=parseInt($('etgMonths').value)||0;
  if(months<1||months>360){wrap.innerHTML='<div style="font-size:11px;color:var(--text3);">Nhập số tháng.</div>';return;}
  const old={};wrap.querySelectorAll('.tg-cm-input').forEach(i=>old[i.dataset.idx]=i.value);
  let html='<div style="font-size:11px;color:var(--text2);margin:2px 0 6px;">Tiền mỗi tháng (nghìn — 200 = 200.000₫):</div><div class="tg-cm-grid">';
  for(let i=0;i<months;i++){
    const val = (preset&&preset[i]!=null) ? Math.round(preset[i]/1000) : (old[i]!=null?old[i]:'');
    html+=`<div class="tg-cm-cell"><span class="tg-cm-lbl">Tháng ${i+1}</span><input type="number" class="tg-cm-input" data-idx="${i}" inputmode="numeric" placeholder="0" value="${val}"></div>`;
  }
  html+='</div>';wrap.innerHTML=html;
}
function closeTgEdit(){$('tgEditOverlay').classList.remove('show');_tgEditId=null;}
function saveTgEdit(){
  const inst=installments.find(x=>String(x.id)===String(_tgEditId));if(!inst){closeTgEdit();return;}
  const name=($('etgName').value||'').trim();
  const months=parseInt($('etgMonths').value)||0;
  const startDate=$('etgStart').value||inst.startDate;
  if(!name){showToast('Nhập tên',false);return;}
  if(!months||months<1){showToast('Nhập số tháng',false);return;}
  const oldPaid=inst.paidMonths||[];
  const paidMonths=new Array(months).fill(false).map((_,i)=>!!oldPaid[i]); // giữ trạng thái đã trả, cắt/đệm theo số tháng mới
  if(etgMode==='custom'){
    const {arr,sum}=readCustomInputs('etgCustomWrap');
    while(arr.length<months)arr.push(0); arr.length=months;
    if(sum<=0){showToast('Nhập tiền các tháng',false);return;}
    inst.customAmounts=arr; inst.total=sum; inst.perMonth=Math.round(sum/months);
  } else {
    const total=smartAmount(parseFloat($('etgTotal').value)||0);
    if(!total){showToast('Nhập tổng tiền',false);return;}
    delete inst.customAmounts; inst.total=total; inst.perMonth=Math.round(total/months);
  }
  inst.name=name; inst.startDate=startDate; inst.months=months; inst.paidMonths=paidMonths;
  saveInstallments(); renderTragop(); closeTgEdit(); playSuccess(); showToast('Đã cập nhật khoản trả góp ✓');
}
function deleteEditInstallment(){if(_tgEditId==null)return;const id=_tgEditId;closeTgEdit();deleteInstallment(id);}

function toggleInstallmentMonth(id, idx){
  const inst = installments.find(i=>i.id===id);
  if(!inst) return;
  inst.paidMonths[idx] = !inst.paidMonths[idx];
  saveInstallments();
  renderTragop();
  playClick();
}

function deleteInstallment(id){
  if(!confirm('Xóa khoản trả góp này?')) return;
  installments = installments.filter(i=>i.id!==id);
  saveInstallments();
  renderTragop();
}

/* ── PHÍ CỐ ĐỊNH HÀNG THÁNG ── */
function saveMonthlyFees(){
  localStorage.setItem('fin_monthly_fees',JSON.stringify(monthlyFees));
  setDirty();
  // Phí cố định nằm trong settings → đồng bộ qua Firebase / Google Sheets
  fbSaveAll();
  cloudSaveSettings();
}

function addMonthlyFee(){
  const name = ($('mfName').value||'').trim();
  const amount = smartAmount(parseFloat($('mfAmount').value)||0);
  if(!name){showToast('Nhập tên phí!',false);return;}
  if(!amount){showToast('Nhập số tiền!',false);return;}
  monthlyFees.push({id:Date.now(),name,amount});
  saveMonthlyFees();
  $('mfName').value=''; $('mfAmount').value='';
  if($('mfAmountP'))$('mfAmountP').textContent='';
  renderMonthlyFees();
  renderTgSummary();
  showToast('Đã thêm phí hàng tháng!');
}

function deleteMonthlyFee(id){
  const f=monthlyFees.find(x=>String(x.id)===String(id));if(!f)return;
  if(!confirm('Xoá phí "'+f.name+'"?'))return;
  monthlyFees = monthlyFees.filter(x=>String(x.id)!==String(id));
  saveMonthlyFees();
  renderMonthlyFees();
  renderTgSummary();
  playClick();
}
/* ── SỬA PHÍ CỐ ĐỊNH ── */
let _mfEditId=null;
function openEditMonthlyFee(id){
  const f=monthlyFees.find(x=>String(x.id)===String(id));if(!f)return;
  _mfEditId=f.id;$('emfName').value=f.name||'';$('emfAmount').value=Math.round((f.amount||0)/1000);
  $('mfEditOverlay').classList.add('show');
}
function closeMfEdit(){$('mfEditOverlay').classList.remove('show');_mfEditId=null;}
function saveMfEdit(){
  const f=monthlyFees.find(x=>String(x.id)===String(_mfEditId));if(!f){closeMfEdit();return;}
  const name=($('emfName').value||'').trim();const amount=smartAmount(parseFloat($('emfAmount').value)||0);
  if(!name){showToast('Nhập tên phí',false);return;}
  if(!amount){showToast('Nhập số tiền',false);return;}
  f.name=name;f.amount=amount;saveMonthlyFees();renderMonthlyFees();renderTgSummary();closeMfEdit();playSuccess();showToast('Đã cập nhật phí ✓');
}
function deleteEditMonthlyFee(){if(_mfEditId==null)return;const id=_mfEditId;closeMfEdit();deleteMonthlyFee(id);}

// Số tiền 1 khoản phải trả trong 1 tháng dương lịch cụ thể (ym = year*12 + month, month 0-11).
// Quy ước: kỳ ĐẦU tính vào ĐÚNG tháng bắt đầu (index 0 = tháng của startDate).
function instDueForYM(inst, ym){
  const s=new Date(inst.startDate);
  const i=ym-(s.getFullYear()*12+s.getMonth());
  return (i>=0 && i<inst.months) ? instAmtForMonth(inst,i) : 0;
}
// Tổng trả góp phải trả trong THÁNG HIỆN TẠI (theo lịch + ngày bắt đầu).
// Đổi ngày bắt đầu → tháng đến hạn đổi theo → tổng cập nhật ngay.
function getMonthlyInstallmentTotal(){
  const now=new Date(), curYM=now.getFullYear()*12+now.getMonth();
  return installments.reduce((sum,inst)=>sum+instDueForYM(inst,curYM),0);
}
function getMonthlyFeesTotal(){
  return monthlyFees.reduce((sum,f)=>sum+(f.amount||0),0);
}

/* ════════════════════════════════════════════
   DỰ PHÓNG TÀI SẢN CUỐI NĂM
   projected = tiết kiệm hiện tại
             + lương × (số tháng còn lại tới hết tháng 12)
             − chi phải trả mỗi tháng (trả góp theo lịch + phí cố định)
   Số tháng còn lại: tính TỪ THÁNG HIỆN TẠI đến hết tháng 12 (kể cả tháng này).
   VD tháng 7 → 6 tháng: 7,8,9,10,11,12. Chi trả góp lấy đúng theo lịch từng
   tháng nên khoản nào kết thúc giữa năm sẽ tự hết, số liệu sát thực tế.
   "Đã nhận lương tháng này" (salaryData.receivedYM === tháng hiện tại):
   lương tháng này ĐÃ nằm trong tài khoản/tiết kiệm → KHÔNG cộng nữa, tránh
   đếm trùng. Qua tháng mới receivedYM lệch tháng → checkbox tự bỏ chọn.
════════════════════════════════════════════ */
function getEndOfYearProjection(){
  const now=new Date();
  const curY=now.getFullYear(), curM=now.getMonth();
  const curYM=curY*12+curM;
  const savings=getSavings();
  const salary=salaryData?(salaryData.amount||0):0;
  const received=!!(salaryData&&salaryData.receivedYM===curYM);
  // NGUỒN DUY NHẤT: dùng đúng "Lịch phải trả các tháng tới" của tab Trả Góp
  // → số phải trả từng tháng ở đây luôn TRÙNG KHỚP với tab Trả Góp, không tự tính lại.
  const sched=getUpcomingSchedule();
  const fees=sched.fees;
  const rowMap={}; sched.rows.forEach(r=>{rowMap[r.ym]=r;});
  const months=[];
  for(let m=curM;m<=11;m++){
    const ym=curY*12+m;
    const r=rowMap[ym];
    const inst=r?r.inst:0;
    const expense=r?r.total:fees;   // ngoài phạm vi lịch trả góp → chỉ còn phí cố định
    const sal=(m===curM&&received)?0:salary;  // lương tháng này đã nhận → không cộng nữa
    months.push({m,ym,inst,fees,expense,sal});
  }
  const n=months.length;
  const totalSalary=months.reduce((s,x)=>s+x.sal,0);
  const totalExpense=months.reduce((s,x)=>s+x.expense,0);
  const projected=savings+totalSalary-totalExpense;
  return {year:curY,curM,curYM,n,savings,salary,fees,totalSalary,totalExpense,projected,months,received};
}

/* Đánh dấu "tháng này đã nhận lương" → không cộng lương tháng hiện tại vào dự phóng
   (lương đã nằm trong tài khoản/tiết kiệm rồi, cộng nữa là đếm trùng). */
function toggleSalaryReceived(checked){
  if(!salaryData){showToast('Chưa nhập lương',false);return;}
  const now=new Date();
  salaryData.receivedYM=checked?(now.getFullYear()*12+now.getMonth()):null;
  saveSalaryData();
  updateAll();
  playClick();
  showToast(checked?'Đã nhận lương tháng này ✓ (không cộng trùng)':'Bỏ đánh dấu nhận lương');
}

/* ── LƯƠNG HẰNG THÁNG (persist + sync qua settings) ── */
function saveSalaryData(){
  if(salaryData)localStorage.setItem('fin_salary',JSON.stringify(salaryData));
  else localStorage.removeItem('fin_salary');
  setDirty();fbSaveAll();cloudSaveSettings();
}
function saveSalary(){
  const raw=parseFloat($('salaryInput').value)||0;
  if(!raw){showToast('Nhập số tiền lương!',false);return;}
  // Giữ cờ "đã nhận lương tháng này" khi chỉ sửa số tiền lương
  salaryData={amount:smartAmount(raw),createdAt:new Date().toISOString(),receivedYM:(salaryData&&salaryData.receivedYM)||null};
  saveSalaryData();
  $('salaryInput').value='';
  const p=$('salaryPreview');if(p)p.textContent='';
  updateAll();
  playSuccess();showToast('Đã lưu lương & dự phóng ✓');
}
function editSalary(){
  if(!salaryData){showToast('Chưa có lương, nhập mới bên dưới',false);return;}
  const setup=$('salarySetup');
  if(setup)setup.style.display='';
  $('salaryInput').value=Math.round((salaryData.amount||0)/1000);
  smartPreview($('salaryInput'),'salaryPreview');
  $('salaryInput').focus();$('salaryInput').select();
}
function resetSalary(){
  if(!salaryData){showToast('Chưa có lương',false);return;}
  if(!confirm('Xóa lương hằng tháng?'))return;
  salaryData=null;
  saveSalaryData();
  $('salaryInput').value='';
  const p=$('salaryPreview');if(p)p.textContent='';
  updateAll();
  showToast('Đã xóa lương');
}
function renderSalaryProjection(){
  const res=$('salaryResult'), setup=$('salarySetup');
  if(!res)return;
  const p=getEndOfYearProjection();
  const monShort=m=>'Th'+(m+1);
  if(!salaryData){
    if(setup)setup.style.display='';
    res.innerHTML=`<div style="font-size:11px;color:var(--text3);padding:8px 0;line-height:1.65;">
      Nhập <b>lương hằng tháng</b> (chỉ nhập 1 lần vì cố định) để xem bạn sẽ tích lũy được bao nhiêu vào <b>cuối năm ${p.year}</b>.<br>
      Công thức: <b style="color:var(--text2)">Tiết kiệm hiện tại + Lương × số tháng còn lại − Tiền phải trả mỗi tháng (trả góp + phí cố định)</b>.
    </div>`;
    return;
  }
  if(setup)setup.style.display='none';
  const projColor=p.projected>=0?'#1d9e75':'#d85a30';
  const rangeTxt=p.n>0?`${monShort(p.curM)} → Th12/${p.year} · ${p.n} tháng`:`Năm ${p.year} đã gần kết thúc`;
  const totalSurplus=p.totalSalary-p.totalExpense;
  const cpt=v=>{const a=Math.abs(v);const s=a>=1e6?(a/1e6).toLocaleString('vi-VN',{maximumFractionDigits:2})+'tr':Math.round(a/1000)+'k';return (v<0?'−':'')+s;};
  // Bảng từng tháng: Lương − Phải trả = Dư (khớp "Lịch phải trả" bên tab Trả Góp)
  let perMonthHtml='';
  if(p.n>0){
    const items=p.months.map(x=>{
      const isReceived=(x.m===p.curM&&p.received);
      const surplus=x.sal-x.expense;
      const sc=surplus>=0?'#1d9e75':'#d85a30';
      const tip=`Th${x.m+1}/${p.year}: `+(isReceived?`lương đã nhận (đã nằm trong tiết kiệm, không cộng nữa)`:`lương ${fmtVN(x.sal)}`)+` − phải trả ${fmtVN(x.expense)} = ${surplus<0?'−':''}${fmtVN(Math.abs(surplus))}`+(x.inst>0?` (trả góp ${fmtVN(x.inst)}${x.fees>0?' + phí '+fmtVN(x.fees):''})`:(x.fees>0?' (chỉ phí cố định)':' (không phải trả)'));
      return `<div class="tg-fc-item wide${x.m===p.curM?' now':''}" title="${tip}">
        <span class="tg-fc-month">Th${x.m+1}${isReceived?' ✓':''}<br><span class="tg-fc-yr">'${String(p.year).slice(-2)}</span></span>
        <span class="tg-fc-line"><span class="tg-fc-k">Trả</span><span class="tg-fc-amt" style="color:#d85a30;">${cpt(x.expense)}</span></span>
        <span class="tg-fc-line"><span class="tg-fc-k">Dư</span><span class="tg-fc-amt" style="color:${sc};">${surplus<0?'−':'+'}${cpt(Math.abs(surplus))}</span></span>
      </div>`;
    }).join('');
    perMonthHtml=`<div class="tg-forecast" style="margin-top:12px;">
      <div class="tg-forecast-title">🗓 Từng tháng: phải Trả & còn Dư (lương ${fmt(p.salary)}) — kéo ngang</div>
      <div class="tg-forecast-row">${items}</div>
      <div class="tg-fc-note">Dòng <strong style="color:#d85a30;">Trả</strong> khớp đúng “Lịch phải trả” bên tab <strong>Trả Góp</strong> · <strong style="color:#1d9e75;">Dư</strong> = lương − phải trả. Tổng để dành ${p.n} tháng: <strong style="color:${totalSurplus>=0?'#1d9e75':'#d85a30'}">${totalSurplus<0?'−':'+'}${fmt(Math.abs(totalSurplus))}</strong>.</div>
    </div>`;
  }
  const salMonths=p.received?(p.n-1):p.n;   // số tháng lương thực cộng vào dự phóng
  res.innerHTML=`
    <div style="text-align:center;padding:6px 0 12px;">
      <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;">Dự kiến có vào cuối năm ${p.year}</div>
      <div style="font-size:28px;font-weight:800;letter-spacing:-.5px;color:${projColor};text-shadow:0 0 14px ${projColor}33;">${p.projected<0?'−':''}${fmt(p.projected)}</div>
      <div style="font-size:10.5px;color:var(--text3);margin-top:3px;">${rangeTxt}</div>
    </div>
    <label style="display:flex;align-items:center;justify-content:center;gap:7px;font-size:11.5px;color:var(--text2);cursor:pointer;margin-bottom:12px;user-select:none;">
      <input type="checkbox" ${p.received?'checked':''} onchange="toggleSalaryReceived(this.checked)" style="width:15px;height:15px;accent-color:#1d9e75;cursor:pointer;">
      Tháng ${p.curM+1} này <b>đã nhận lương</b>${p.received?' <span style="color:#1d9e75;">✓ không cộng trùng</span>':' (đánh dấu để không cộng trùng)'}
    </label>
    <div class="week-budget-result">
      <div class="week-metric">
        <div class="week-metric-val" style="color:var(--text2);font-size:15px;">${p.savings<0?'−':''}${fmt(p.savings)}</div>
        <div class="week-metric-lbl">🐷 Tiết kiệm hiện tại</div>
      </div>
      <div class="week-metric">
        <div class="week-metric-val" style="color:#1d9e75;font-size:15px;">+${fmt(p.totalSalary)}</div>
        <div class="week-metric-lbl">💵 Lương ${salMonths} tháng${p.received?` (Th${p.curM+1} đã nhận)`:''}<br>(${fmt(p.salary)}/tháng)</div>
      </div>
      <div class="week-metric">
        <div class="week-metric-val" style="color:#d85a30;font-size:15px;">−${fmt(p.totalExpense)}</div>
        <div class="week-metric-lbl">💳 Phải trả ${p.n} tháng<br>(trả góp + phí cố định)</div>
      </div>
    </div>
    ${perMonthHtml}`;
}

function renderMonthlyFees(){
  const el = $('mfList');
  if(!el) return;
  if(!monthlyFees.length){
    el.innerHTML = '<div style="font-size:11px;color:var(--text3);padding:6px 0;">Chưa có phí cố định nào.</div>';
    return;
  }
  el.innerHTML = monthlyFees.map(f=>`
    <div class="mf-row">
      <span class="mf-name">${f.name}</span>
      <span class="mf-amt">${fmt(f.amount)}<span style="color:var(--text3);font-weight:400;">/tháng</span></span>
      <button class="tg-edit" onclick="openEditMonthlyFee(${f.id})" title="Sửa phí">✏️</button>
      <button class="tg-delete" onclick="deleteMonthlyFee(${f.id})" title="Xóa phí">🗑</button>
    </div>`).join('');
}

// Lịch phải trả các tháng tới: gộp số tiền từng khoản trả góp theo đúng tháng dương lịch
// (kể cả "tự nhập từng tháng") + phí cố định hằng tháng. Trả về từ tháng hiện tại → tháng cuối.
function getUpcomingSchedule(){
  const fees=getMonthlyFeesTotal();
  const map={}; let maxYM=-1;
  const now=new Date(); const curYM=now.getFullYear()*12+now.getMonth();
  installments.forEach(inst=>{
    const s=new Date(inst.startDate);
    const baseYM=s.getFullYear()*12+s.getMonth();
    for(let i=0;i<inst.months;i++){
      const ym=baseYM+i;
      if(ym<curYM) continue;                 // chỉ lấy tháng hiện tại trở đi
      map[ym]=(map[ym]||0)+instAmtForMonth(inst,i);
      if(ym>maxYM) maxYM=ym;
    }
  });
  const rows=[];
  if(maxYM>=curYM){
    for(let ym=curYM; ym<=maxYM; ym++){
      const inst=map[ym]||0, total=inst+fees;
      if(total>0) rows.push({ym,inst,fees,total});
    }
  }
  return {rows,fees,maxYM,curYM};
}

function renderTgSummary(){
  const el = $('tgSummary');
  if(!el) return;
  const tg = getMonthlyInstallmentTotal();
  const fees = getMonthlyFeesTotal();
  const total = tg + fees;
  const cpt=v=>v>=1e6?fmtTr(v):Math.round(v/1000)+'k';   // gọn cho ô lịch
  const sched=getUpcomingSchedule();
  // Vẫn hiện thẻ nếu tháng này chưa tới hạn (tổng=0) nhưng có khoản sẽ trả ở các tháng tới
  if(total<=0 && !sched.rows.length){ el.innerHTML=''; return; }
  let fcHtml='';
  if(sched.rows.length){
    const items=sched.rows.map(r=>{
      const y=Math.floor(r.ym/12), m=r.ym%12, isNow=(r.ym===sched.curYM);
      const tip=`Tháng ${m+1}/${y}: ${fmtVN(r.total)}`+(r.inst>0?` (trả góp ${fmtVN(r.inst)}${fees>0?' + phí '+fmtVN(fees):''})`:(fees>0?' (chỉ phí cố định)':''));
      return `<div class="tg-fc-item${isNow?' now':''}" title="${tip}">
        <span class="tg-fc-month">Th${m+1}<br><span class="tg-fc-yr">'${String(y).slice(-2)}</span></span>
        <span class="tg-fc-amt">${cpt(r.total)}</span>
      </div>`;
    }).join('');
    let tail='';
    if(fees>0){ const ny=Math.floor((sched.maxYM+1)/12), nm=(sched.maxYM+1)%12;
      tail=`<div class="tg-fc-note">Từ Th${nm+1}/'${String(ny).slice(-2)} trở đi: chỉ còn phí cố định <strong>${fmt(fees)}</strong>/tháng</div>`; }
    fcHtml=`<div class="tg-forecast">
      <div class="tg-forecast-title">📆 Lịch phải trả các tháng tới — kéo ngang để xem</div>
      <div class="tg-forecast-row">${items}</div>
      ${tail}
    </div>`;
  }
  el.innerHTML = `<div class="card tg-summary">
    <div class="tg-summary-title">📅 Tổng phải trả tháng này</div>
    <div class="tg-summary-total">${fmt(total)}</div>
    <div class="tg-summary-break">
      <div><span class="dot blue"></span>Trả góp: <strong>${fmt(tg)}</strong></div>
      <div><span class="dot orange"></span>Phí cố định: <strong>${fmt(fees)}</strong></div>
    </div>
    ${fcHtml}
  </div>`;
}

function renderTragop(){
  renderMonthlyFees();
  renderTgSummary();
  const list = $('tgList');
  if(!list) return;
  if(!installments.length){
    list.innerHTML = '<div class="empty" style="padding:40px 0;">Chưa có khoản trả góp nào. Thêm khoản vay đầu tiên ở trên!</div>';
    return;
  }
  const now = new Date();
  list.innerHTML = installments.map(inst=>{
    const isCustom = !!(inst.customAmounts&&inst.customAmounts.length);
    const paidCount = inst.paidMonths.filter(Boolean).length;
    const remaining = inst.months - paidCount;
    const paidAmount = instPaidAmount(inst);
    const remainAmount = inst.total - paidAmount;
    const pct = Math.round((paidCount/inst.months)*100);
    
    // Tính ngày còn lại
    const start = new Date(inst.startDate);
    // Tháng hiện tại trong lộ trình
    const elapsedMonths = Math.floor((now - start) / (1000*60*60*24*30.44));
    
    // Tính end date
    const endDate = new Date(start);
    endDate.setMonth(endDate.getMonth() + inst.months);
    const diffMs = endDate - now;
    const diffDays = Math.max(0, Math.ceil(diffMs / (1000*60*60*24)));
    const diffMonths = Math.max(0, Math.floor(diffDays/30));
    const diffYears = Math.floor(diffMonths/12);
    const remMonthsMod = diffMonths % 12;
    let timeLeft = '';
    if(remaining <= 0) timeLeft = '<span style="color:#1d9e75;font-weight:700;">✅ Đã trả xong!</span>';
    else if(diffYears>0) timeLeft = `<strong>${diffYears} năm ${remMonthsMod} tháng</strong> (${diffDays} ngày) · đến <strong>${endDate.toLocaleDateString('vi-VN')}</strong>`;
    else timeLeft = `<strong>${remaining} tháng</strong> (${diffDays} ngày) · đến <strong>${endDate.toLocaleDateString('vi-VN')}</strong>`;
    
    // Month chips
    const chipsHtml = inst.paidMonths.map((paid,idx)=>{
      const chipDate = new Date(start);
      chipDate.setMonth(chipDate.getMonth()+idx);
      const mon = chipDate.toLocaleDateString('vi-VN',{month:'short'});
      const yr = chipDate.getFullYear().toString().slice(2);
      const isCurrent = chipDate.getMonth()===now.getMonth()&&chipDate.getFullYear()===now.getFullYear();
      const amtK = Math.round(instAmtForMonth(inst,idx)/1000);
      return `<div class="tg-month-chip${paid?' paid':''}${isCurrent?' current-m':''}"
        onclick="toggleInstallmentMonth(${inst.id},${idx})"
        title="${paid?'Đã trả - nhấn để bỏ đánh dấu':'Chưa trả - nhấn để đánh dấu đã trả'}">
        <span class="chip-num" style="font-size:11px;font-weight:700;">${idx+1}</span>
        <span class="chip-label">${mon}<br>${yr}</span>
        ${isCustom?`<span class="chip-amt">${amtK}k</span>`:''}
      </div>`;
    }).join('');
    
    return `<div class="tg-card">
      <div class="tg-header">
        <div>
          <div class="tg-name">${inst.name}</div>
          <div class="tg-meta">Bắt đầu: ${new Date(inst.startDate).toLocaleDateString('vi-VN')} · ${inst.months} tháng · ${isCustom?'tự nhập từng tháng':fmtVN(inst.perMonth)+'/tháng'}</div>
        </div>
        <div style="display:flex;gap:2px;flex-shrink:0;">
          <button class="tg-edit" onclick="openEditInstallment(${inst.id})" title="Sửa">✏️</button>
          <button class="tg-delete" onclick="deleteInstallment(${inst.id})" title="Xoá">🗑</button>
        </div>
      </div>
      
      <div class="tg-progress-bar-wrap">
        <div class="tg-progress-bar" style="width:${pct}%"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text3);margin-bottom:12px;">
        <span>${paidCount}/${inst.months} tháng đã trả (${pct}%)</span>
        <span>${remaining} tháng còn lại</span>
      </div>
      
      <div class="tg-stats">
        <div class="tg-stat">
          <div class="tg-stat-val green">${fmt(paidAmount)}</div>
          <div class="tg-stat-lbl">Đã trả</div>
        </div>
        <div class="tg-stat">
          <div class="tg-stat-val red">${fmt(remainAmount)}</div>
          <div class="tg-stat-lbl">Còn lại</div>
        </div>
        <div class="tg-stat">
          <div class="tg-stat-val gold">${fmt(inst.total)}</div>
          <div class="tg-stat-lbl">Tổng khoản vay</div>
        </div>
      </div>
      
      <div class="tg-months-title">Lộ trình trả góp — nhấn vào tháng để đánh dấu đã trả</div>
      <div class="tg-months-grid">${chipsHtml}</div>
      
      <div class="tg-remaining-info">
        ⏱ Thời gian còn lại: ${timeLeft}<br>
        💰 Còn phải trả: <span class="highlight">${fmtVN(remainAmount)}</span> trong <strong>${remaining} tháng</strong>
        ${remaining>0?(isCustom?` · tháng tới <strong>${fmtVN(instMonthlyDue(inst))}</strong>`:` · mỗi tháng <strong>${fmtVN(inst.perMonth)}</strong>`):''}
      </div>
    </div>`;
  }).join('');
}

// Helper format
function fmtVN(n){
  if(!n&&n!==0) return '0₫';
  return new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0}).format(n);
}

/* ══════════════════════════════════════════
   APPLE GLASS ANIMATIONS
══════════════════════════════════════════ */

// ── NO TILT — Apple style: clean hover only ──
function initTilt(){/* disabled — glass style */}

// ── COUNTING ANIMATION ──
function animateCount(el,target,duration=800){
  if(!el||!target)return;
  // Đang có animation dở trên phần tử này → HỦY và trả về chuỗi gốc trước đã.
  // Không hủy thì lần chạy mới chụp giá-trị-giữa-chừng làm "gốc" → số đóng băng sai
  // (lỗi thấy được khi bấm qua tab khác rồi quay lại nhanh).
  if(el._acRaf){cancelAnimationFrame(el._acRaf);el._acRaf=null;if(el._acText!=null)el.textContent=el._acText;}
  const text=el.textContent;
  el._acText=text;
  // Tách CỤM SỐ (kèm dấu chấm nhóm) ra khỏi chuỗi đã format, ví dụ:
  //   "₫20.000.000" → số "20.000.000", tiền tố "₫", hậu tố ""
  //   "−₫1.234"     → số "1.234", tiền tố "−₫" (giữ nguyên dấu âm)
  const m=text.match(/[\d.]*\d/);
  if(!m)return;
  const numStr=m[0];
  const num=parseInt(numStr.replace(/\./g,''),10)||0;
  if(num===0)return;
  const pre=text.slice(0,m.index), post=text.slice(m.index+numStr.length);

  const start=performance.now();
  const startVal=0;
  function easeOutExpo(t){return t===1?1:1-Math.pow(2,-10*t);}

  function tick(now){
    const progress=Math.min((now-start)/duration,1);
    const eased=easeOutExpo(progress);
    const current=Math.round(startVal+(num-startVal)*eased);
    el.textContent=pre+current.toLocaleString('vi-VN')+post;
    if(progress<1) el._acRaf=requestAnimationFrame(tick);
    else{
      el._acRaf=null;
      el.textContent=text; // khôi phục chuỗi gốc chính xác
      el.classList.add('counting');
      setTimeout(()=>el.classList.remove('counting'),300);
    }
  }
  el._acRaf=requestAnimationFrame(tick);
}

function runCountingAnimations(){
  // CHỈ animate ô số trên TRANG ĐANG MỞ — animate cả tab ẩn vừa vô ích vừa
  // gây chồng chéo animation khi quay lại tab (nguồn gốc lỗi sai số).
  document.querySelectorAll('.page.active .metric .val').forEach((el,i)=>{
    setTimeout(()=>animateCount(el,true,900+i*100),100+i*80);
  });
}

// ── RIPPLE EFFECT ──
function initRipple(){
  document.addEventListener('click',e=>{
    const btn=e.target.closest('.btn,.btn-full,.chi-type-btn,.quick-chip');
    if(!btn)return;
    
    const rect=btn.getBoundingClientRect();
    const ripple=document.createElement('span');
    ripple.className='ripple';
    const size=Math.max(rect.width,rect.height);
    ripple.style.width=ripple.style.height=size+'px';
    ripple.style.left=(e.clientX-rect.left-size/2)+'px';
    ripple.style.top=(e.clientY-rect.top-size/2)+'px';
    btn.appendChild(ripple);
    setTimeout(()=>ripple.remove(),700);
  });
}

// ── SMOOTH PAGE TRANSITION (Apple style) ──
const _origShowPage=showPage;
showPage=function(p){
  const currentPage=document.querySelector('.page.active');
  if(currentPage){
    const currentId=currentPage.id.replace('page-','');
    if(currentId===p)return;
    
    currentPage.style.transition='opacity .2s ease';
    currentPage.style.opacity='0';
    
    setTimeout(()=>{
      currentPage.style.transition='';
      currentPage.style.opacity='';
      _origShowPage(p);
      setTimeout(()=>runCountingAnimations(),50);
    },200);
  }else{
    _origShowPage(p);
    setTimeout(()=>runCountingAnimations(),50);
  }
};

// ── PARALLAX disabled (Apple glass = clean, no parallax) ──
function initParallax(){}

// ── SCROLL REVEAL ──
function initScrollReveal(){
  const observer=new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.style.animationPlayState='running';
        entry.target.classList.add('revealed');
      }
    });
  },{threshold:0.1});
  
  document.querySelectorAll('.card,.metric,.inv-card,.acc-card,.tg-card').forEach(el=>{
    observer.observe(el);
  });
}

// ── INIT ALL ANIMATIONS ──
document.addEventListener('DOMContentLoaded',()=>{
  setTimeout(()=>{
    initTilt();
    initRipple();
    initParallax();
    initScrollReveal();
    runCountingAnimations();
  },300);
});

// updateAll: KHÔNG chạy lại runCountingAnimations ở đây.
// animMetrics() bên trong updateAll đã animate từng số từ giá-trị-cũ → giá-trị-mới.
// Nếu còn gọi runCountingAnimations (đếm từ 0) 100ms sau mỗi updateAll thì 2 hệ
// animation cùng ghi vào 1 ô số → hiện sai một khoảng rồi vài giây sau mới đúng.
// (runCountingAnimations vẫn chạy khi mở trang / chuyển tab — hiệu ứng vào trang.)


/* ═══════════════════════════════════════════
   SCI-FI ENERGY BACKGROUND
═══════════════════════════════════════════ */
(function(){
  const canvas=document.getElementById('scifiBg');
  if(!canvas)return;
  const ctx=canvas.getContext('2d');
  let w,h,t=0,raf=null,last=0;
  const MOBILE=window.innerWidth<768;
  const FRAME=1000/30;                 // giới hạn ~30fps → giảm ~1/2 CPU (nền chậm nên mắt không thấy khác)
  const N_ORBS=MOBILE?4:6, N_PARTS=MOBILE?18:40, N_STREAKS=MOBILE?3:5; // nhẹ hơn trên điện thoại

  function resize(){
    w=canvas.width=window.innerWidth;
    h=canvas.height=window.innerHeight;
  }
  resize();
  window.addEventListener('resize',resize);

  // Energy orbs
  const orbs=[];
  for(let i=0;i<N_ORBS;i++){
    orbs.push({
      x:Math.random(),y:Math.random(),
      r:Math.random()*180+120,
      vx:(Math.random()-.5)*.0004,
      vy:(Math.random()-.5)*.0003,
      hue:[200,260,180,290,210,170][i],
      phase:Math.random()*Math.PI*2
    });
  }
  
  // Energy particles
  const particles=[];
  for(let i=0;i<N_PARTS;i++){
    particles.push({
      x:Math.random(),y:Math.random(),
      size:Math.random()*1.8+.4,
      speed:Math.random()*.0006+.0002,
      hue:Math.random()>.5?210:265,
      phase:Math.random()*Math.PI*2,
      drift:(Math.random()-.5)*.0003
    });
  }
  
  // Light streaks (energy lines)
  const streaks=[];
  for(let i=0;i<N_STREAKS;i++){
    streaks.push({
      y:Math.random(),
      speed:Math.random()*.002+.001,
      len:Math.random()*.25+.15,
      hue:Math.random()>.5?200:270,
      progress:Math.random()
    });
  }

  // ── Sprite glow vẽ sẵn 1 LẦN (MDN: pre-render to offscreen canvas) ──
  // Thay vì createRadialGradient + fillRect cho TỪNG orb/hạt MỖI frame
  // (40 hạt × 30fps ≈ 1200 gradient/giây → tốn CPU & sinh rác GC). Giờ chỉ drawImage.
  function radialSprite(d,stops){
    const c=document.createElement('canvas');c.width=c.height=d;
    const g=c.getContext('2d'),r=d/2;
    const grad=g.createRadialGradient(r,r,0,r,r,r);
    stops.forEach(s=>grad.addColorStop(s[0],s[1]));
    g.fillStyle=grad;g.fillRect(0,0,d,d);return c;
  }
  // Hạt: tâm đặc → mép trong suốt; độ mờ tổng chỉnh bằng globalAlpha lúc vẽ
  const glowSprites={};
  [210,265].forEach(hue=>{glowSprites[hue]=radialSprite(64,[[0,'hsla('+hue+',90%,60%,1)'],[1,'hsla('+hue+',90%,60%,0)']]);});
  // Orb nebula: giữ nguyên dải alpha gốc .10/.04/0
  const orbSprites={};
  [200,260,180,290,210,170].forEach(hue=>{orbSprites[hue]=radialSprite(256,[[0,'hsla('+hue+',80%,55%,.10)'],[.5,'hsla('+hue+',75%,45%,.04)'],[1,'hsla('+hue+',70%,40%,0)']]);});

  function draw(){
    t+=.008;
    ctx.clearRect(0,0,w,h);
    
    // ── Energy orbs (nebula glow) ──
    orbs.forEach(o=>{
      o.x+=o.vx;o.y+=o.vy;o.phase+=.005;
      if(o.x<-.2)o.x=1.2;if(o.x>1.2)o.x=-.2;
      if(o.y<-.2)o.y=1.2;if(o.y>1.2)o.y=-.2;
      
      const pulse=Math.sin(o.phase)*.25+.75;
      const R=o.r*pulse, sp=orbSprites[o.hue]||orbSprites[200];
      // drawImage sprite tại tâm orb thay vì tô gradient toàn màn hình (giảm overdraw)
      ctx.drawImage(sp, Math.floor(o.x*w-R), Math.floor(o.y*h-R), R*2, R*2);
    });
    
    // ── Cyber grid (subtle perspective) ──
    const gridAlpha=.035;
    const horizon=h*.5;
    ctx.strokeStyle='hsla(210,70%,55%,'+gridAlpha+')';
    ctx.lineWidth=.5;
    const gridShift=(t*18)%40;
    for(let y=horizon;y<h+40;y+=40){
      const yy=y+gridShift;
      if(yy>h)continue;
      ctx.beginPath();
      ctx.moveTo(0,yy);
      ctx.lineTo(w,yy);
      ctx.stroke();
    }
    for(let x=0;x<=w;x+=60){
      ctx.beginPath();
      ctx.moveTo(x,horizon);
      ctx.lineTo(x,h);
      ctx.stroke();
    }
    
    // ── Energy particles (floating up) ──
    particles.forEach(p=>{
      p.y-=p.speed;
      p.x+=Math.sin(t*2+p.phase)*p.drift;
      if(p.y<-.02){p.y=1.02;p.x=Math.random();}
      
      const a=(.25+Math.sin(t*3+p.phase)*.15);
      ctx.beginPath();
      ctx.arc(p.x*w,p.y*h,p.size,0,Math.PI*2);
      ctx.fillStyle='hsla('+p.hue+',90%,65%,'+a+')';
      ctx.fill();
      
      // Glow — sprite vẽ sẵn (không tạo gradient mỗi frame); globalAlpha thay cho alpha-stop
      const gr=p.size*5, sp=glowSprites[p.hue]||glowSprites[210];
      ctx.globalAlpha=a*.3;
      ctx.drawImage(sp, Math.floor(p.x*w-gr), Math.floor(p.y*h-gr), gr*2, gr*2);
      ctx.globalAlpha=1;
    });
    
    // ── Light streaks (energy beams flying horizontally) ──
    streaks.forEach(s=>{
      s.progress+=s.speed;
      if(s.progress>1.3){s.progress=-.3;s.y=Math.random();}
      
      const x1=s.progress*w;
      const x2=x1-s.len*w;
      const grad=ctx.createLinearGradient(x2,0,x1,0);
      grad.addColorStop(0,'hsla('+s.hue+',90%,60%,0)');
      grad.addColorStop(.8,'hsla('+s.hue+',90%,65%,.25)');
      grad.addColorStop(1,'hsla('+s.hue+',95%,75%,.5)');
      ctx.strokeStyle=grad;
      ctx.lineWidth=1.2;
      ctx.beginPath();
      ctx.moveTo(x2,s.y*h);
      ctx.lineTo(x1,s.y*h);
      ctx.stroke();
      
      // Head glow
      ctx.beginPath();
      ctx.arc(x1,s.y*h,2,0,Math.PI*2);
      ctx.fillStyle='hsla('+s.hue+',95%,80%,.6)';
      ctx.fill();
    });
  }
  function frame(now){
    raf=requestAnimationFrame(frame);
    if((now||0)-last<FRAME)return;     // throttle ~30fps
    last=now||0;
    draw();
  }
  function start(){ if(!raf)raf=requestAnimationFrame(frame); }
  function stop(){ if(raf){cancelAnimationFrame(raf);raf=null;} }
  // Tạm dừng hẳn khi tab/app bị ẩn → không hao CPU & pin lúc không nhìn tới
  document.addEventListener('visibilitychange',function(){ if(document.hidden)stop(); else{last=0;start();} });
  start();
})();


/* ────────────────────────────────────────────
   CALCULATOR POPUP (Ctrl+K)
──────────────────────────────────────────── */
let _calcExpr='';
let _calcJustEq=false;

function toggleCalc(){const o=$('calcOverlay');if(o.classList.contains('show'))closeCalc();else openCalc();}
function openCalc(){
  playClick();
  // Cập nhật Tổng tài sản + Tiết kiệm
  const assets=getTotalAssets();
  const savings=getSavings();
  const av=$('calcAssetsVal'),sv=$('calcSavingsVal');
  if(av){av.textContent=fmt(assets);av.style.color=assets>=0?'var(--text)':'#d85a30';$('calcAssets').dataset.v=Math.round(assets);}
  if(sv){sv.textContent=(savings>=0?'':'−')+fmt(Math.abs(savings));sv.style.color=savings>=0?'#1d9e75':'#d85a30';$('calcSavings').dataset.v=Math.round(savings);}
  $('calcOverlay').classList.add('show');
  calcRender();
}
function calcInsertVal(v){
  if(v===undefined||v==='')return;
  playClick();
  if(_calcJustEq){_calcExpr='';_calcJustEq=false;}
  // Nếu đang kết thúc bằng số → thay bằng toán tử nối? Không: chỉ chèn khi hợp lệ
  if(_calcExpr&&/[0-9.)]$/.test(_calcExpr))return showToast('Thêm phép tính (+−×÷) trước đã',false);
  _calcExpr+=String(v);
  calcRender();
}
function closeCalc(){$('calcOverlay').classList.remove('show');}

function calcSanitize(s){return s.replace(/[^0-9+\-*/.%()]/g,'');}

function calcEval(expr){
  const s=calcSanitize(expr);
  if(!s)return null;
  // % = chia 100 (vd 50% → 0.5)
  const conv=s.replace(/(\d+\.?\d*)%/g,'($1/100)');
  if(/[+\-*/.(]$/.test(conv))return null;
  try{
    const v=Function('"use strict";return('+conv+')')();
    if(typeof v!=='number'||!isFinite(v))return null;
    return v;
  }catch(e){return null;}
}

function calcFmtNum(v){
  if(v===null||v===undefined)return '';
  const r=Math.round(v*100)/100;
  return r.toLocaleString('vi-VN',{maximumFractionDigits:2});
}

function calcRender(final){
  const exprEl=$('calcExpr'),outEl=$('calcOut');
  const disp=_calcExpr.replace(/\*/g,'×').replace(/\//g,'÷').replace(/-/g,'−');
  if(final!==undefined&&final!==null){
    exprEl.textContent=disp+' =';
    outEl.textContent=calcFmtNum(final);
    outEl.className='calc-out';
    return;
  }
  exprEl.textContent='';
  if(!_calcExpr){outEl.textContent='0';outEl.className='calc-out';return;}
  outEl.textContent=disp;
  outEl.className='calc-out';
  const preview=calcEval(_calcExpr);
  if(preview!==null&&!/^[0-9.]+$/.test(_calcExpr)){
    exprEl.textContent=disp;
    outEl.textContent='= '+calcFmtNum(preview);
    outEl.className='calc-out preview';
  }
}

function calcKey(k){
  playClick();
  if(k==='C'){_calcExpr='';_calcJustEq=false;calcRender();return;}
  if(k==='back'){_calcExpr=_calcExpr.slice(0,-1);_calcJustEq=false;calcRender();return;}
  if(k==='='){
    const v=calcEval(_calcExpr);
    if(v===null){showToast('Biểu thức không hợp lệ',false);return;}
    calcRender(v);
    _calcExpr=String(Math.round(v*100)/100);
    _calcJustEq=true;
    return;
  }
  // Sau khi =, gõ số mới thì bắt đầu lại; gõ phép tính thì nối tiếp
  if(_calcJustEq){
    if(/[0-9.]/.test(k)&&k!=='000')_calcExpr='';
    _calcJustEq=false;
  }
  if(k==='000'){if(!_calcExpr||/[+\-*/(%]$/.test(_calcExpr))return;_calcExpr+='000';calcRender();return;}
  // Tránh 2 toán tử liền nhau
  if(/[+*/%]/.test(k)&&(/[+\-*/.%]$/.test(_calcExpr)||!_calcExpr))return;
  if(k==='-'&&/[+\-.%]$/.test(_calcExpr))return;
  if(k==='.'){const seg=_calcExpr.split(/[+\-*/%()]/).pop();if(seg.includes('.'))return;}
  _calcExpr+=k;
  calcRender();
}

document.addEventListener('keydown',e=>{
  // Ctrl/Cmd+K: bật tắt máy tính ở mọi nơi
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();toggleCalc();return;}
  const open=$('calcOverlay').classList.contains('show');
  if(!open)return;
  // Khi máy tính mở: bắt phím
  if(e.key==='Escape'){e.preventDefault();closeCalc();return;}
  const tag=(document.activeElement&&document.activeElement.tagName)||'';
  if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT')return;
  if(/^[0-9]$/.test(e.key)){e.preventDefault();calcKey(e.key);return;}
  if(['+','-','*','/','%','.','(',')'].includes(e.key)){e.preventDefault();if(e.key==='('||e.key===')'){_calcExpr+=e.key;calcRender();}else calcKey(e.key);return;}
  if(e.key==='Enter'||e.key==='='){e.preventDefault();calcKey('=');return;}
  if(e.key==='Backspace'){e.preventDefault();calcKey('back');return;}
  if(e.key.toLowerCase()==='c'&&!e.ctrlKey&&!e.metaKey){e.preventDefault();calcKey('C');return;}
});


/* ────────────────────────────────────────────
   GOLD DASHBOARD — vàng thế giới + trong nước + lịch sự kiện
   Nguồn: api.gold-api.com (XAU realtime, CORS, free)
          vang.today/api/prices (SJC/PNJ/DOJI + lịch sử 30d, CORS, free)
          open.er-api.com (tỷ giá USD/VND, free)
──────────────────────────────────────────── */
const LUONG_PER_OZ = 37.5/31.1034768; // 1 lượng = 37.5g, 1 troy oz = 31.1035g
let _goldInited=false, _goldTimer=null, _usdVnd=0, _xauUsd=0;
let _goldChartObj=null, _goldChartMode='world';

// Fetch JSON với timeout
async function fetchJson(url,timeout=9000){
  const ctl=new AbortController();const t=setTimeout(()=>ctl.abort(),timeout);
  try{const r=await fetch(url,{signal:ctl.signal});clearTimeout(t);if(!r.ok)throw 0;return await r.json();}
  catch(e){clearTimeout(t);return null;}
}
async function fetchText(url,timeout=9000){
  const ctl=new AbortController();const t=setTimeout(()=>ctl.abort(),timeout);
  try{const r=await fetch(url,{signal:ctl.signal});clearTimeout(t);if(!r.ok)throw 0;return await r.text();}
  catch(e){clearTimeout(t);return null;}
}
// vang.today bị chặn CORS trực tiếp → thử direct rồi qua 2 proxy
function proxyUrls(url){
  return [url,
    'https://api.allorigins.win/raw?url='+encodeURIComponent(url),
    'https://corsproxy.io/?url='+encodeURIComponent(url)];
}
async function fetchJsonMulti(url){
  for(const u of proxyUrls(url)){
    const r=await fetchJson(u);
    if(r)return r;
  }
  return null;
}
// Bắn song song tất cả proxy, lấy kết quả ĐẦU TIÊN thành công (nhanh hơn nhiều)
function fetchJsonRace(url,timeout=8000){
  const urls=proxyUrls(url);
  return new Promise(resolve=>{
    let pending=urls.length,settled=false;
    urls.forEach(u=>{
      fetchJson(u,timeout).then(r=>{
        if(settled)return;
        if(r){settled=true;resolve(r);}
        else if(--pending===0){settled=true;resolve(null);}
      });
    });
  });
}
let _goldHist={world:null,sjc:null};
// Gộp lịch sử theo NGÀY (giây→ngày), dữ liệu sau ghi đè trước cùng ngày
function mergeHistByDay(){
  const map={};
  for(let a=0;a<arguments.length;a++){
    (arguments[a]||[]).forEach(p=>{
      if(!p)return;const val=p.sell||p.buy;if(!val)return;
      const d=new Date((p.update_time||0)*1000);
      const dayKey=Math.floor(new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime()/1000);
      map[dayKey]={update_time:dayKey,sell:val,buy:p.buy||val};
    });
  }
  return Object.values(map).sort((x,y)=>x.update_time-y.update_time);
}
// Mỗi ngày lưu 1 điểm giá SJC cục bộ → biểu đồ SJC luôn có dữ liệu kể cả khi nguồn ngoài lỗi
function appendLocalSjcHistory(domestic){
  if(!domestic)return;
  const sjc=domestic.find(d=>d.type_code==='SJL1L10');
  if(!sjc||!sjc.sell)return;
  let h=[];try{h=JSON.parse(localStorage.getItem('fin_sjc_hist')||'[]');}catch(e){}
  const now=new Date();
  const key=Math.floor(new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime()/1000);
  h=h.filter(p=>p&&p.update_time!==key);
  h.push({update_time:key,sell:sjc.sell,buy:sjc.buy});
  h=h.slice(-180);
  localStorage.setItem('fin_sjc_hist',JSON.stringify(h));
}
function localSjcHistory(){try{return JSON.parse(localStorage.getItem('fin_sjc_hist')||'[]');}catch(e){return [];}}
// vang.today ĐỔI ĐỊNH DẠNG: prices là OBJECT theo mã (không còn mảng "data").
// Chuyển về mảng [{type_code,name,buy,sell,change_buy,change_sell}]
function vtPrices(resp){
  if(!resp||!resp.success||!resp.prices||typeof resp.prices!=='object')return null;
  const out=[];
  for(const code in resp.prices){const p=resp.prices[code];if(!p)continue;out.push({type_code:code,name:p.name,buy:p.buy,sell:p.sell,change_buy:p.change_buy,change_sell:p.change_sell});}
  return out.length?out:null;
}
// Lịch sử vang.today: history:[{date, prices:{CODE:{buy,sell,...}}}] → [{update_time,sell,buy}]
function vtHistory(resp,code){
  if(!resp||!resp.success||!Array.isArray(resp.history))return null;
  const out=[];
  resp.history.forEach(h=>{
    const p=h.prices&&h.prices[code];if(!p)return;
    const val=p.sell||p.buy;if(!val)return;
    const t=Math.floor(new Date(h.date+'T00:00:00').getTime()/1000);
    if(!t)return;
    out.push({update_time:t,sell:val,buy:p.buy||val});
  });
  return out.length?out:null;
}
// Lấy giá vàng trong nước: ưu tiên gọi thẳng (vang.today có CORS), proxy chỉ là dự phòng
async function fetchVangPrices(qs){
  const url='https://www.vang.today/api/prices'+(qs||'');
  let r=await fetchJson(url);
  if(r&&r.success)return r;
  return await fetchJsonRace(url); // dự phòng qua proxy
}

function initGoldPage(){
  if(!_goldInited){_goldInited=true;loadGold();}
  if(_goldTimer)clearInterval(_goldTimer);
  _goldTimer=setInterval(()=>{if($('page-gold').classList.contains('active'))loadGold();},5*60*1000);
  renderGoldEvents();
}

async function loadGold(manual){
  if(manual)showToast('Đang tải giá vàng...');
  $('goldUpdated').textContent='Đang tải...';
  // Hiện ngay dữ liệu đã cache (nếu có) để không bị trống lúc chờ mạng
  let cache=null;try{cache=JSON.parse(localStorage.getItem('fin_gold_cache')||'null');}catch(e){}
  if(cache){
    if(cache.usdVnd)_usdVnd=cache.usdVnd;
    if(cache.xauUsd)_xauUsd=cache.xauUsd;
    renderGoldPrices(cache.domestic||null);
  }
  // Tải SONG SONG: tỷ giá + vàng thế giới + giá trong nước (race proxy)
  const [rate,world,vResp]=await Promise.all([
    fetchJson('https://open.er-api.com/v6/latest/USD'),
    fetchJson('https://api.gold-api.com/price/XAU'),
    fetchVangPrices()
  ]);
  if(rate&&rate.rates&&rate.rates.VND)_usdVnd=rate.rates.VND;
  if(!_usdVnd)_usdVnd=(cache&&cache.usdVnd)||26500;
  if(world&&world.price)_xauUsd=world.price;
  let domestic=vtPrices(vResp);
  if(!_xauUsd&&domestic){const w=domestic.find(d=>d.type_code==='XAUUSD');if(w)_xauUsd=w.sell||w.buy;}
  if(!domestic){
    const sjc=await scrapeSjc();
    if(sjc)domestic=[{type_code:'SJL1L10',buy:sjc.buy,sell:sjc.sell,change_buy:0,change_sell:0,_src:'sjc.com.vn'}];
  }
  if(!domestic&&cache&&cache.domestic)domestic=cache.domestic; // cuối cùng: dùng cache
  renderGoldPrices(domestic);
  if(domestic){
    localStorage.setItem('fin_gold_cache',JSON.stringify({domestic,usdVnd:_usdVnd,xauUsd:_xauUsd,ts:Date.now()}));
    appendLocalSjcHistory(domestic);
  }
  loadGoldHistory();
}

// Fallback: bóc giá SJC 1L trực tiếp từ sjc.com.vn (qua proxy)
async function scrapeSjc(){
  for(const u of proxyUrls('https://sjc.com.vn/giavang/textContent.php')){
    if(!u.startsWith('http'))continue;
    const html=await fetchText(u);
    if(!html)continue;
    // Tìm dòng chứa "SJC 1L" rồi lấy 2 số đầu tiên sau đó
    const m=html.replace(/\s+/g,' ').match(/SJC 1L[\s\S]{0,120}?(\d[\d.,]{5,})[\s\S]{0,60}?(\d[\d.,]{5,})/i);
    if(m){
      let buy=parseInt(m[1].replace(/[.,]/g,''),10);
      let sell=parseInt(m[2].replace(/[.,]/g,''),10);
      if(buy<1e6)buy*=1000; if(sell<1e6)sell*=1000; // đơn vị ngàn đồng → đồng
      if(buy>1e7&&sell>1e7)return {buy,sell};
    }
  }
  return null;
}

function fmtTr(v){ // hiển thị triệu đồng gọn: 120,5tr
  return (v/1e6).toLocaleString('vi-VN',{maximumFractionDigits:1})+'tr';
}

function renderGoldPrices(domestic){
  const worldVndLuong=_xauUsd?_xauUsd*_usdVnd*LUONG_PER_OZ:0;
  $('gWorldUsd').textContent=_xauUsd?'$'+_xauUsd.toLocaleString('en-US',{maximumFractionDigits:1}):'Lỗi tải';
  $('gWorldVnd').textContent=worldVndLuong?fmt(Math.round(worldVndLuong)):'—';
  $('gUsdVnd').textContent='Tỷ giá: '+_usdVnd.toLocaleString('vi-VN')+' ₫/USD';

  let sjc=null;
  if(domestic){
    sjc=domestic.find(d=>d.type_code==='SJL1L10');
    const rows=[
      ['SJL1L10','SJC vàng miếng'],['SJ9999','SJC nhẫn 9999'],
      ['DOHCML','DOJI HCM'],['PQHN24NTT','PNJ 24K'],['BT9999NTT','Bảo Tín 9999']
    ];
    let html='<table style="width:100%;border-collapse:collapse;">';
    html+='<tr style="color:var(--text3);font-size:9px;text-align:right;"><td style="text-align:left;padding:4px 0;">LOẠI</td><td>MUA VÀO</td><td>BÁN RA</td><td>Δ</td></tr>';
    let shown=0;
    rows.forEach(([code,label])=>{
      const d=domestic.find(x=>x.type_code===code);
      if(!d||!d.sell)return;
      shown++;
      const ch=d.change_sell||0;
      const chColor=ch>0?'#1d9e75':ch<0?'#d85a30':'var(--text3)';
      const chTxt=ch?((ch>0?'+':'')+(ch/1000).toLocaleString('vi-VN')+'k'):'—';
      html+=`<tr style="border-top:.5px solid var(--border);font-family:'JetBrains Mono',monospace;text-align:right;">
        <td style="text-align:left;padding:7px 0;font-family:inherit;color:var(--text2);">${label}</td>
        <td style="color:var(--text2);">${fmt(d.buy)}</td>
        <td style="color:var(--text);font-weight:700;">${fmt(d.sell)}</td>
        <td style="color:${chColor};font-size:10px;">${chTxt}</td></tr>`;
    });
    html+='</table>';
    $('gDomesticTable').innerHTML=shown?html:'<span style="color:var(--amber)">Nguồn vang.today tạm lỗi — thử Làm mới sau ít phút</span>';
  }else{
    $('gDomesticTable').innerHTML='<span style="color:var(--amber)">Không tải được giá trong nước (vang.today) — kiểm tra mạng rồi nhấn Làm mới</span>';
  }

  if(sjc&&sjc.sell){
    $('gSjcSell').textContent=fmt(sjc.sell);
    $('gSjcBuy').textContent='Mua vào: '+fmt(sjc.buy);
    if(worldVndLuong){
      const prem=sjc.sell-worldVndLuong;
      $('gPremium').textContent=(prem>=0?'+':'−')+fmt(Math.abs(Math.round(prem)));
      $('gPremium').style.color=prem>5e6?'#d85a30':prem>2e6?'var(--amber)':'#1d9e75';
      $('gPremiumPct').textContent='= '+((prem/worldVndLuong)*100).toFixed(1)+'% so với thế giới';
    }
  }else{
    $('gSjcSell').textContent='—';$('gPremium').textContent='—';
  }
  $('goldUpdated').textContent='Cập nhật '+new Date().toLocaleTimeString('vi-VN')+' · tự làm mới mỗi 5 phút';
}

async function loadGoldHistory(){
  // Bắn 2 nguồn lịch sử SONG SONG
  const klP=fetchJson('https://api.binance.com/api/v3/klines?symbol=PAXGUSDT&interval=1d&limit=30');
  const sjcP=fetchVangPrices('?type=SJL1L10&days=30');
  // 1) Thế giới: Binance PAXG/USDT (CORS chuẩn, nhanh) → vẽ NGAY khi có
  const kl=await klP;
  if(Array.isArray(kl)&&kl.length){
    _goldHist.world=kl.map(k=>({update_time:Math.floor(k[0]/1000),sell:parseFloat(k[4])}));
  }else{
    const w=await fetchVangPrices('?type=XAUUSD&days=30');
    _goldHist.world=vtHistory(w,'XAUUSD')||_goldHist.world;
  }
  drawGoldChart(); // biểu đồ thế giới hiện ngay, không chờ SJC
  // 2) SJC: gộp lịch sử từ vang.today + lịch sử cục bộ (luôn có dữ liệu)
  const s=await sjcP;
  const remote=vtHistory(s,'SJL1L10')||[];
  const merged=mergeHistByDay(localSjcHistory(),remote);
  _goldHist.sjc=merged.length?merged:null;
  drawGoldChart();
}

function switchGoldChart(mode){playClick();_goldChartMode=mode;drawGoldChart();}

function drawGoldChart(){
  const isW=_goldChartMode==='world';
  $('gcBtnWorld').style.borderColor=isW?'var(--accent)':'var(--border)';
  $('gcBtnWorld').style.color=isW?'var(--accent)':'var(--text2)';
  $('gcBtnSjc').style.borderColor=!isW?'var(--accent)':'var(--border)';
  $('gcBtnSjc').style.color=!isW?'var(--accent)':'var(--text2)';
  const hist=isW?_goldHist.world:_goldHist.sjc;
  const ctx=$('goldChart');if(!ctx)return;
  if(_goldChartObj){_goldChartObj.destroy();_goldChartObj=null;}
  const wrap=ctx.parentElement;
  let note=wrap.querySelector('.gchart-note');
  if(!hist||!hist.length){
    if(!note){note=document.createElement('div');note.className='gchart-note';note.style.cssText='display:flex;align-items:center;justify-content:center;height:100%;font-size:11px;color:var(--text3);';wrap.appendChild(note);}
    note.textContent=isW?'Không tải được dữ liệu biểu đồ thế giới — nhấn Làm mới':'Đang thu thập dữ liệu SJC — biểu đồ sẽ đầy dần mỗi ngày bạn mở app (nguồn vang.today tạm lỗi)';
    ctx.style.display='none';
    return;
  }
  if(note)note.remove();
  ctx.style.display='';
  const pts=hist.slice().sort((a,b)=>(a.update_time||0)-(b.update_time||0));
  const labels=pts.map(p=>new Date((p.update_time||0)*1000).toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit'}));
  const vals=pts.map(p=>p.sell||p.buy||0);
  const up=vals[vals.length-1]>=vals[0];
  const col=up?'#1d9e75':'#d85a30';
  _goldChartObj=new Chart(ctx,{type:'line',data:{labels,datasets:[{
    data:vals,borderColor:col,borderWidth:2,pointRadius:0,tension:.3,fill:true,
    backgroundColor:(c)=>{const g=c.chart.ctx.createLinearGradient(0,0,0,220);g.addColorStop(0,col+'33');g.addColorStop(1,col+'00');return g;}
  }]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>isW?('$'+c.parsed.y.toLocaleString('en-US')):fmt(c.parsed.y)}}},
  scales:{x:{ticks:{color:'#8a8578',font:{size:8},maxTicksLimit:8},grid:{display:false}},
  y:{ticks:{color:'#8a8578',font:{size:8},callback:v=>isW?('$'+v.toLocaleString('en-US')):fmtTr(v)},grid:{color:'rgba(138,133,120,.08)'}}}}});
}

/* ── LỊCH SỰ KIỆN (giờ UTC, render giờ VN) ──
   FOMC 2026: lịch chính thức Fed (statement 14:00 ET ngày 2)
   CPI: lịch BLS (8:30 ET) — 3 kỳ tới đã xác nhận, sau đó dự kiến
   NFP: thứ Sáu đầu tháng 8:30 ET (dự kiến)                       */
const GOLD_EVENTS=[
  {t:'2026-01-28T19:00:00Z',type:'FOMC',name:'Fed quyết định lãi suất',sep:false},
  {t:'2026-03-18T18:00:00Z',type:'FOMC',name:'Fed quyết định lãi suất + Dot Plot',sep:true},
  {t:'2026-04-29T18:00:00Z',type:'FOMC',name:'Fed quyết định lãi suất',sep:false},
  {t:'2026-06-17T18:00:00Z',type:'FOMC',name:'Fed quyết định lãi suất + Dot Plot',sep:true},
  {t:'2026-07-29T18:00:00Z',type:'FOMC',name:'Fed quyết định lãi suất',sep:false},
  {t:'2026-09-16T18:00:00Z',type:'FOMC',name:'Fed quyết định lãi suất + Dot Plot',sep:true},
  {t:'2026-10-28T18:00:00Z',type:'FOMC',name:'Fed quyết định lãi suất',sep:false},
  {t:'2026-12-09T19:00:00Z',type:'FOMC',name:'Fed quyết định lãi suất + Dot Plot',sep:true},
  {t:'2026-06-10T12:30:00Z',type:'CPI',name:'CPI Mỹ tháng 5'},
  {t:'2026-07-14T12:30:00Z',type:'CPI',name:'CPI Mỹ tháng 6'},
  {t:'2026-08-12T12:30:00Z',type:'CPI',name:'CPI Mỹ tháng 7'},
  {t:'2026-09-11T12:30:00Z',type:'CPI',name:'CPI Mỹ tháng 8',est:true},
  {t:'2026-10-13T12:30:00Z',type:'CPI',name:'CPI Mỹ tháng 9',est:true},
  {t:'2026-11-12T13:30:00Z',type:'CPI',name:'CPI Mỹ tháng 10',est:true},
  {t:'2026-12-10T13:30:00Z',type:'CPI',name:'CPI Mỹ tháng 11',est:true},
];
// NFP: thứ Sáu đầu tiên mỗi tháng, 8:30 ET
function nfpEvents(){
  const out=[];const now=new Date();
  for(let m=0;m<14;m++){
    const d=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()+m,1));
    while(d.getUTCDay()!==5)d.setUTCDate(d.getUTCDate()+1);
    // 8:30 ET: EDT (T3–T10)=12:30Z, EST=13:30Z (xấp xỉ theo tháng)
    const mo=d.getUTCMonth()+1;const h=(mo>=4&&mo<=10)?12:13;
    d.setUTCHours(h,30,0,0);
    out.push({t:d.toISOString(),type:'NFP',name:'Bảng lương phi nông nghiệp Mỹ',est:true});
  }
  return out;
}

function renderGoldEvents(){
  const el=$('gEventList');if(!el)return;
  const now=Date.now();
  const evs=GOLD_EVENTS.concat(nfpEvents())
    .map(e=>({...e,ts:new Date(e.t).getTime()}))
    .filter(e=>e.ts>now-2*3600*1000)
    .sort((a,b)=>a.ts-b.ts)
    .slice(0,10);
  const colors={FOMC:'#d85a30',CPI:'#E8B44A',NFP:'#4A9EF5'};
  el.innerHTML=evs.map(e=>{
    const d=new Date(e.ts);
    const days=Math.floor((e.ts-now)/86400000);
    const hrs=Math.floor(((e.ts-now)%86400000)/3600000);
    const cd=e.ts<now?'<span style="color:#d85a30;font-weight:700;">ĐANG DIỄN RA</span>':
      days>0?`còn <b>${days} ngày</b>`:`còn <b>${hrs} giờ</b> ⚡`;
    const soon=days<=3&&e.ts>now;
    return `<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-top:.5px solid var(--border);${soon?'background:linear-gradient(90deg,rgba(216,90,48,.06),transparent);border-radius:6px;padding-left:6px;':''}">
      <span style="background:${colors[e.type]}22;color:${colors[e.type]};border:.5px solid ${colors[e.type]}55;border-radius:6px;font-size:9px;font-weight:700;padding:3px 8px;flex-shrink:0;letter-spacing:.5px;">${e.type}</span>
      <div style="flex:1;min-width:0;">
        <div style="font-size:11px;color:var(--text);">${e.name}${e.sep?' <span style="color:var(--amber);font-size:9px;">★ quan trọng</span>':''}${e.est?' <span style="color:var(--text3);font-size:8px;">(dự kiến)</span>':''}</div>
        <div style="font-size:9px;color:var(--text3);font-family:'JetBrains Mono',monospace;">${d.toLocaleDateString('vi-VN',{weekday:'short',day:'2-digit',month:'2-digit'})} · ${d.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})} VN</div>
      </div>
      <div style="font-size:10px;color:var(--text2);flex-shrink:0;">${cd}</div>
    </div>`;
  }).join('');
}


/* ────────────────────────────────────────────
   HIGHLIGHT LIÊN KẾT: hover form nhập → sáng các ô bị tác động
──────────────────────────────────────────── */
const HL_MAPS={
  normal:['assets','mm'],                        // chi thường: tài sản↓, tiền dùng tháng↓ (tiết kiệm KHÔNG đổi)
  extra:['assets','savings','eoy','salary'],     // chi ngoài: tài sản↓, tiết kiệm↓, dự phóng cuối năm↓ (card + panel)
  thu:['assets','savings','eoy','salary']        // thu nhập: tài sản↑, tiết kiệm↑, dự phóng cuối năm↑ (card + panel)
};
const HL_COLORS={normal:'#E8B44A',extra:'#d85a30',thu:'#1d9e75'};

function hlOn(kind){
  const keys=HL_MAPS[kind];if(!keys)return;
  const col=HL_COLORS[kind];
  const targets=[...document.querySelectorAll('#dashMetrics .metric')];
  targets.forEach(el=>{
    const hit=keys.includes(el.dataset.m);
    el.style.setProperty('--hl',col);
    el.classList.toggle('hl-glow',hit);
    el.classList.toggle('hl-dim',!hit);
  });
  // Các card khác (tiền dùng tháng, panel dự phóng cuối năm) — sáng/mờ theo key
  [['mm','monthMoneyCard'],['salary','salaryCard']].forEach(([key,id])=>{
    const el=$(id);if(!el)return;
    const hit=keys.includes(key);
    el.style.setProperty('--hl',col);
    el.classList.toggle('hl-glow',hit);
    el.classList.toggle('hl-dim',!hit);
  });
}
function hlOff(){
  document.querySelectorAll('.hl-glow,.hl-dim').forEach(el=>{el.classList.remove('hl-glow','hl-dim');});
}

(function initHoverLinks(){
  const thuCard=$('thuFormCard'),chiCard=$('chiFormCard');
  if(thuCard){
    thuCard.addEventListener('mouseenter',()=>{_hlHoverKind='thu';_hlRefresh();});
    thuCard.addEventListener('mouseleave',()=>{_hlHoverKind=null;_hlRefresh();});
    // Focus giữ vệt sáng ổn định khi đang nhập (mobile: chạm vào ô → focus, không cần hover)
    thuCard.addEventListener('focusin',()=>{_hlFocusCard='thu';_hlRefresh();});
    thuCard.addEventListener('focusout',e=>{if(!thuCard.contains(e.relatedTarget)){_hlFocusCard=null;_hlRefresh();}});
  }
  if(chiCard){
    chiCard.addEventListener('mouseenter',()=>{_hlHoverKind=chiType||'normal';_hlRefresh();});
    chiCard.addEventListener('mouseleave',()=>{_hlHoverKind=null;_hlRefresh();});
    chiCard.addEventListener('focusin',()=>{_hlFocusCard='chi';_hlRefresh();});
    chiCard.addEventListener('focusout',e=>{if(!chiCard.contains(e.relatedTarget)){_hlFocusCard=null;_hlRefresh();}});
    // Nút chi thường / chi ngoài: preview mapping riêng khi hover từng nút (desktop)
    chiCard.querySelectorAll('.chi-type-btn').forEach(btn=>{
      btn.addEventListener('mouseenter',e=>{e.stopPropagation();_hlHoverKind=btn.dataset.val;_hlRefresh();});
      btn.addEventListener('mouseleave',()=>{_hlHoverKind=chiType||'normal';_hlRefresh();});
    });
  }
})();


/* ────────────────────────────────────────────
   COUNT-UP ANIMATION cho metrics
──────────────────────────────────────────── */
function animMetrics(cur){
  // state gắn vào function — hoisted cùng function, không dính TDZ
  const S=animMetrics._s||(animMetrics._s={prev:null,frames:{}});
  const F={
    assets:v=>fmt(v),
    eoy:v=>(v<0?'−':'')+fmt(v),
    savings:v=>(v>=0?'':'−')+fmt(Math.abs(v))
  };
  if(S.prev){
    Object.keys(cur).forEach(k=>{
      if(S.prev[k]===cur[k])return;
      const card=document.querySelector(`#dashMetrics .metric[data-m="${k}"]`);
      if(!card)return;
      const el=card.querySelector('.val');
      card.classList.remove('pulse');void card.offsetWidth;card.classList.add('pulse');
      if(S.frames[k])cancelAnimationFrame(S.frames[k]);
      const from=S.prev[k],to=cur[k],t0=performance.now(),dur=650;
      const step=now=>{
        const p=Math.min(1,(now-t0)/dur);
        const e=1-Math.pow(1-p,3);
        el.textContent=F[k](Math.round(from+(to-from)*e));
        if(p<1)S.frames[k]=requestAnimationFrame(step);
      };
      S.frames[k]=requestAnimationFrame(step);
    });
  }
  S.prev={...cur};
}

/* ────────────────────────────────────────────
   PRIVACY MODE (👁 / phím H)
──────────────────────────────────────────── */
let privacyOn=localStorage.getItem('fin_privacy')==='1';
const _EYE_OPEN='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>';
const _EYE_OFF='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
function applyPrivacy(){
  document.body.classList.toggle('privacy',privacyOn);
  const b=$('privacyBtn');if(b)b.textContent=privacyOn?'🙈':'👁';
  const f=$('privacyFab');if(f){f.innerHTML=privacyOn?_EYE_OFF:_EYE_OPEN;f.classList.toggle('fab-on',privacyOn);}
}
function togglePrivacy(){
  playClick();
  privacyOn=!privacyOn;
  localStorage.setItem('fin_privacy',privacyOn?'1':'0');
  applyPrivacy();
  showToast(privacyOn?'Đã ẩn số tiền 🙈':'Đã hiện số tiền');
}
applyPrivacy();
document.addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();
  if((k!=='h'&&k!=='t')||e.ctrlKey||e.metaKey||e.altKey)return;
  const tag=(document.activeElement&&document.activeElement.tagName)||'';
  if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT')return;
  if($('calcOverlay').classList.contains('show'))return;
  if(k==='h')togglePrivacy();
  else if(k==='t')cycleTheme();
});

/* ────────────────────────────────────────────
   INSIGHTS tự động (local, không API)
──────────────────────────────────────────── */
function renderInsights(mTx){
  const bar=$('insightBar');if(!bar)return;
  const out=[];
  const now=new Date();
  const day=now.getDate();
  // 1) So sánh chi cùng kỳ tháng trước (chi thường + ngoài, đến ngày hiện tại)
  const prev=new Date(now.getFullYear(),now.getMonth()-1,1);
  const prevKey=prev.getFullYear()+'-'+String(prev.getMonth()+1).padStart(2,'0');
  const chiNow=mTx.filter(t=>t.type==='chi').reduce((s,t)=>s+t.amount,0);
  const chiPrevSame=txData.filter(t=>{
    if(t.type!=='chi')return false;
    const d=new Date(t.date);
    return t.date.slice(0,7)===prevKey&&d.getDate()<=day;
  }).reduce((s,t)=>s+t.amount,0);
  if(chiPrevSame>0&&chiNow>0){
    const pct=Math.round((chiNow-chiPrevSame)/chiPrevSame*100);
    if(pct<=-5)out.push(`📉 Chi tiêu <b>thấp hơn ${Math.abs(pct)}%</b> so với cùng kỳ tháng trước — tốt lắm!`);
    else if(pct>=5)out.push(`📈 Chi tiêu <b>cao hơn ${pct}%</b> so với cùng kỳ tháng trước`);
    else out.push(`⚖️ Chi tiêu ngang cùng kỳ tháng trước (±${Math.abs(pct)}%)`);
  }
  // 2) Danh mục tăng mạnh nhất vs tháng trước (theo ngày)
  if(chiPrevSame>0){
    let worst=null;
    catsChi.forEach(c=>{
      const a=mTx.filter(t=>t.type==='chi'&&t.cat===c.name).reduce((s,t)=>s+t.amount,0);
      const b=txData.filter(t=>{if(t.type!=='chi'||t.cat!==c.name)return false;const d=new Date(t.date);return t.date.slice(0,7)===prevKey&&d.getDate()<=day;}).reduce((s,t)=>s+t.amount,0);
      if(b>200000&&a>b*1.3){const pct=Math.round((a-b)/b*100);if(!worst||pct>worst.pct)worst={name:c.emoji+' '+c.name,pct};}
    });
    if(worst)out.push(`🔍 <b>${worst.name}</b> tăng ${worst.pct}% so với tháng trước`);
  }
  // 3) Chuỗi ngày không chi ngoài
  let streak=0;
  for(let i=0;i<60;i++){
    const d=new Date();d.setDate(d.getDate()-i);
    const key=d.toISOString().slice(0,10);
    const hasExtra=txData.some(t=>t.type==='chi'&&t.budgetType==='extra'&&t.date.slice(0,10)===key);
    if(hasExtra)break;
    streak++;
  }
  if(streak>=3)out.push(`🔥 <b>${streak} ngày</b> liên tiếp không chi ngoài`);
  // 4) Ngày chi nhiều nhất tháng
  if(mTx.some(t=>t.type==='chi')){
    const byDay={};
    mTx.filter(t=>t.type==='chi').forEach(t=>{const k=t.date.slice(0,10);byDay[k]=(byDay[k]||0)+t.amount;});
    const top=Object.entries(byDay).sort((a,b)=>b[1]-a[1])[0];
    if(top&&Object.keys(byDay).length>=5){
      const d=new Date(top[0]+'T00:00');
      out.push(`💸 Chi nhiều nhất: <b>${d.getDate()}/${d.getMonth()+1}</b> (${fmt(top[1])})`);
    }
  }
  if(!out.length){bar.style.display='none';return;}
  bar.style.display='';
  bar.innerHTML=out.slice(0,3).map((s,i)=>`<div class="insight-chip" style="animation-delay:${i*0.08}s">${s}</div>`).join('');
}

/* ────────────────────────────────────────────
   HEATMAP CHI TIÊU (18 tuần, kiểu GitHub)
──────────────────────────────────────────── */
function renderHeatmap(){
  const wrap=$('hmWrap');if(!wrap)return;
  const WEEKS=18;
  // Gom chi theo ngày
  const byDay={};
  txData.filter(t=>t.type==='chi').forEach(t=>{const k=t.date.slice(0,10);byDay[k]=(byDay[k]||0)+t.amount;});
  // Mốc màu theo phân vị của các ngày có chi
  const vals=Object.values(byDay).sort((a,b)=>a-b);
  const q=p=>vals.length?vals[Math.min(vals.length-1,Math.floor(vals.length*p))]:0;
  const t1=q(.25),t2=q(.5),t3=q(.8);
  const colOf=v=>!v?'var(--bg3)':v<=t1?'rgba(232,180,74,.25)':v<=t2?'rgba(232,180,74,.55)':v<=t3?'rgba(216,90,48,.75)':'#d85a30';
  // Bắt đầu từ thứ 2 của tuần (WEEKS-1) tuần trước
  const today=new Date();today.setHours(0,0,0,0);
  const start=new Date(today);
  start.setDate(start.getDate()-start.getDay()+1-(WEEKS-1)*7); // thứ 2
  if(start>today)start.setDate(start.getDate()-7);
  let html='<div class="hm-days"><span>T2</span><span></span><span>T4</span><span></span><span>T6</span><span></span><span>CN</span></div><div class="hm-grid">';
  const d=new Date(start);
  let lastMonth=-1;
  for(let w=0;w<WEEKS;w++){
    let mLabel='';
    if(d.getMonth()!==lastMonth){lastMonth=d.getMonth();mLabel='T'+(d.getMonth()+1);}
    html+=`<div class="hm-col"><div class="hm-month">${mLabel}</div>`;
    for(let i=0;i<7;i++){
      if(d>today){html+='<div class="hm-cell" style="opacity:.25"></div>';}
      else{
        const k=d.toISOString().slice(0,10);
        const v=byDay[k]||0;
        html+=`<div class="hm-cell" style="background:${colOf(v)}" title="${d.getDate()}/${d.getMonth()+1}: ${v?fmt(v):'không chi'}"></div>`;
      }
      d.setDate(d.getDate()+1);
    }
    html+='</div>';
  }
  html+='</div>';
  wrap.innerHTML=html;
}

/* ────────────────────────────────────────────
   FOMC COUNTDOWN CHIP (trang Thống kê)
──────────────────────────────────────────── */
function renderFomcChip(){
  const chip=$('fomcChip');if(!chip||typeof GOLD_EVENTS==='undefined')return;
  const now=Date.now();
  const next=GOLD_EVENTS.filter(e=>e.type==='FOMC'&&new Date(e.t).getTime()>now)
    .sort((a,b)=>new Date(a.t)-new Date(b.t))[0];
  if(!next){chip.style.display='none';return;}
  const ts=new Date(next.t).getTime();
  const days=Math.floor((ts-now)/86400000);
  const hrs=Math.floor(((ts-now)%86400000)/3600000);
  chip.innerHTML='🥇 FOMC '+(days>0?`còn ${days}d`:`còn ${hrs}h ⚡`)+(next.sep?' ★':'');
  chip.style.display='';
  if(days<=3)chip.style.borderColor='rgba(216,90,48,.6)';
}


renderFomcChip();setInterval(renderFomcChip,3600*1000);

/* ── PWA: service worker + lưu trữ bền (chống iOS xoá dữ liệu) ── */
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('./sw.js').then(reg=>{
      // Phát hiện bản mới đã cài → báo nhẹ (HTML vốn đã network-first nên nội dung luôn mới)
      reg.addEventListener('updatefound',()=>{
        const nw=reg.installing;if(!nw)return;
        nw.addEventListener('statechange',()=>{
          if(nw.state==='installed'&&navigator.serviceWorker.controller){
            try{showToast('Đã cập nhật bản mới ✓');}catch(e){}
          }
        });
      });
    }).catch(()=>{});
  });
}
// Xin trình duyệt giữ dữ liệu lâu dài (giảm rủi ro bị dọn dẹp). Dữ liệu vẫn được sao lưu trên cloud.
if(navigator.storage&&navigator.storage.persist){navigator.storage.persist().catch(()=>{});}
