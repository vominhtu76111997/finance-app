// ============================================================
// FINANCE TRACKER — Google Apps Script v9
// ============================================================
// THAY ĐỔI TỪ V8:
// - FIX sync nhiều thiết bị: weekBudget (tiền dùng tháng) & installments
//   (trả góp) giờ LUÔN dùng last-write-wins theo timestamp ở MỌI đường ghi
//   (saveSettings / pushAll / action xác nhận) → không còn cảnh dữ liệu cũ
//   từ máy mở sau đè lên dữ liệu mới.
// - Thêm action GET "saveInstallments" (JSONP CÓ PHẢN HỒI) + cột thời gian
//   installments_ts. getAll trả thêm installmentsTs để client so sánh.
// - weekBudget khi đi qua saveSettings/pushAll được kiểm tra createdAt
//   (storeWeekBudgetGuarded), bỏ qua chuỗi "null" để không xóa nhầm.
//
// THAY ĐỔI TỪ V7:
// - Thêm action GET "saveMonthMoney": lưu tiền dùng trong tháng
//   qua JSONP CÓ PHẢN HỒI XÁC NHẬN (fix lỗi mất dữ liệu do POST
//   no-cors rớt âm thầm). Hỗ trợ tombstone {deleted:true} để xóa
//   đồng bộ trên mọi thiết bị.
// - LockService cho mọi thao tác ghi (chống race khi 2 thiết bị
//   cùng ghi).
// - Chuẩn hóa Date → ISO string khi đọc (tránh sheet tự đổi kiểu).
// - Giữ nguyên 100% cấu trúc sheet v7: Transactions 7 cột,
//   Investments 6 cột, Settings key/value. Tự tạo + tự migrate.
//
// CÁCH UPDATE (GIỮ NGUYÊN URL):
// 1. Mở Google Sheets → Extensions → Apps Script
// 2. Xóa toàn bộ code cũ → paste code này → Save (Ctrl+S)
// 3. Deploy → Manage deployments → nút ✏️ (Edit) →
//    Version: "New version" → Deploy
//    (KHÔNG tạo deployment mới — URL giữ nguyên)
// ============================================================

const TX_SHEET = 'Transactions';
const INV_SHEET = 'Investments';
const SET_SHEET = 'Settings';
const TX_HEADERS = ['id', 'type', 'note', 'cat', 'amount', 'date', 'budgetType'];
const INV_HEADERS = ['id', 'type', 'name', 'qty', 'buyPrice', 'curPrice'];

// ───────── SHEET HELPERS ─────────
function ss() { return SpreadsheetApp.getActiveSpreadsheet(); }

function getSheet(name, headers) {
  let sh = ss().getSheetByName(name);
  if (!sh) {
    sh = ss().insertSheet(name);
    sh.appendRow(headers);
    return sh;
  }
  // Migrate: bổ sung cột thiếu (vd budgetType từ bản cũ)
  const lastCol = sh.getLastColumn();
  const cur = lastCol > 0 ? sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String) : [];
  if (cur.length < headers.length) {
    for (let i = cur.length; i < headers.length; i++) {
      sh.getRange(1, i + 1).setValue(headers[i]);
    }
  }
  return sh;
}

function txSheet() { return getSheet(TX_SHEET, TX_HEADERS); }
function invSheet() { return getSheet(INV_SHEET, INV_HEADERS); }
function setSheet() { return getSheet(SET_SHEET, ['key', 'value']); }

// ───────── SETTINGS KEY/VALUE ─────────
function setSetting(key, value) {
  const sh = setSheet();
  const data = sh.getDataRange().getValues();
  const str = (typeof value === 'string') ? value : JSON.stringify(value);
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === key) {
      sh.getRange(i + 1, 2).setValue(str);
      return;
    }
  }
  sh.appendRow([key, str]);
}

function getSetting(key) {
  const sh = setSheet();
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === key) return data[i][1];
  }
  return null;
}

function parseSetting(key, fallback) {
  const raw = getSetting(key);
  if (raw === null || raw === '' || raw === 'null' || raw === undefined) return fallback;
  try { return JSON.parse(raw); } catch (e) { return raw; }
}

// ───────── NORMALIZE ─────────
function toISO(v) {
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

function rowsToTx(values) {
  const out = [];
  for (let i = 1; i < values.length; i++) {
    const r = values[i];
    if (r[0] === '' || r[0] === null) continue;
    const tx = {
      id: Number(r[0]),
      type: String(r[1]),
      note: String(r[2]),
      cat: String(r[3]),
      amount: Number(r[4]),
      date: toISO(r[5])
    };
    if (r[6]) tx.budgetType = String(r[6]);
    out.push(tx);
  }
  return out;
}

function rowsToInv(values) {
  const out = [];
  for (let i = 1; i < values.length; i++) {
    const r = values[i];
    if (r[0] === '' || r[0] === null) continue;
    out.push({
      id: Number(r[0]),
      type: String(r[1]),
      name: String(r[2]),
      qty: Number(r[3]),
      buyPrice: Number(r[4]),
      curPrice: Number(r[5])
    });
  }
  return out;
}

// ───────── CORE ACTIONS ─────────
function getAllData() {
  const txs = rowsToTx(txSheet().getDataRange().getValues());
  const invs = rowsToInv(invSheet().getDataRange().getValues());
  return {
    ok: true,
    transactions: txs,
    investments: invs,
    opening: Number(getSetting('opening')) || 0,
    catsChi: parseSetting('catsChi', null),
    catsThu: parseSetting('catsThu', null),
    budgets: parseSetting('budgets', null),
    weekBudget: parseSetting('weekBudget', null),
    installments: parseSetting('installments', null),
    installmentsTs: getSetting('installments_ts'),
    budgetTypeMap: parseSetting('budgetTypeMap', null),
    accounts: parseSetting('accounts', null)
  };
}

// V9: ghi weekBudget có kiểm tra thời gian (createdAt) — không cho dữ liệu cũ đè mới
function storeWeekBudgetGuarded(val) {
  if (val === undefined || val === null) return; // xóa đi qua action saveMonthMoney, không qua đây
  var obj = val;
  if (typeof obj === 'string') {
    if (obj === 'null') return; // bỏ qua "null" từ saveSettings để tránh xóa nhầm
    try { obj = JSON.parse(obj); } catch (e) { return; }
  }
  if (!obj || typeof obj !== 'object') return;
  var cur = parseSetting('weekBudget', null);
  var curT = cur && cur.createdAt ? new Date(cur.createdAt).getTime() : 0;
  var newT = obj.createdAt ? new Date(obj.createdAt).getTime() : 0;
  if (newT >= curT) setSetting('weekBudget', obj);
}

// V9: ghi installments có kiểm tra thời gian — last-write-wins giữa nhiều thiết bị
function setInstallmentsGuarded(items, tsIso) {
  if (items === undefined || items === null) return;
  var curTs = getSetting('installments_ts');
  var curT = curTs ? new Date(curTs).getTime() : 0;
  var newT = tsIso ? new Date(tsIso).getTime() : Date.now();
  if (newT >= curT) {
    setSetting('installments', items);
    setSetting('installments_ts', tsIso || new Date().toISOString());
    return true;
  }
  return false;
}

// V9: lưu trả góp — CÓ XÁC NHẬN (JSONP). payload: {items:[...], ts:'ISO'}
function saveInstallmentsAction(payload) {
  if (!payload || typeof payload !== 'object') return { ok: false, error: 'bad payload' };
  var stored = setInstallmentsGuarded(payload.items, payload.ts);
  return { ok: true, stored: stored };
}

function addTransaction(tx) {
  txSheet().appendRow([tx.id, tx.type, tx.note, tx.cat, tx.amount, tx.date, tx.budgetType || '']);
  return { ok: true, id: tx.id };
}

function deleteTransaction(id) {
  const sh = txSheet();
  const data = sh.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0]) === String(id)) { sh.deleteRow(i + 1); return { ok: true }; }
  }
  return { ok: true, notFound: true };
}

function addInvestment(inv) {
  invSheet().appendRow([inv.id, inv.type, inv.name, inv.qty, inv.buyPrice, inv.curPrice]);
  return { ok: true, id: inv.id };
}

function updateInvestment(d) {
  const sh = invSheet();
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(d.id)) {
      if (d.curPrice !== undefined) sh.getRange(i + 1, 6).setValue(d.curPrice);
      return { ok: true };
    }
  }
  return { ok: false, error: 'not found' };
}

function deleteInvestment(id) {
  const sh = invSheet();
  const data = sh.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0]) === String(id)) { sh.deleteRow(i + 1); return { ok: true }; }
  }
  return { ok: true, notFound: true };
}

// V8: Lưu tiền dùng trong tháng — CÓ XÁC NHẬN
// payload: {total, createdAt} hoặc tombstone {deleted:true, createdAt}
function saveMonthMoney(payload) {
  if (!payload || typeof payload !== 'object') return { ok: false, error: 'bad payload' };
  // Chống ghi đè dữ liệu mới hơn bằng dữ liệu cũ (multi-device)
  const cur = parseSetting('weekBudget', null);
  const curT = cur && cur.createdAt ? new Date(cur.createdAt).getTime() : 0;
  const newT = payload.createdAt ? new Date(payload.createdAt).getTime() : Date.now();
  if (newT >= curT) setSetting('weekBudget', payload);
  return { ok: true, stored: newT >= curT };
}

function saveSettingsData(p) {
  if (p.opening !== undefined) setSetting('opening', String(p.opening));
  if (p.catsChi !== undefined) setSetting('catsChi', p.catsChi);
  if (p.catsThu !== undefined) setSetting('catsThu', p.catsThu);
  if (p.budgets !== undefined) setSetting('budgets', p.budgets);
  if (p.theme !== undefined) setSetting('theme', String(p.theme));
  if (p.soundOn !== undefined) setSetting('soundOn', String(p.soundOn));
  if (p.weekBudget !== undefined) storeWeekBudgetGuarded(p.weekBudget);
  if (p.installments !== undefined) setInstallmentsGuarded(p.installments, p.installmentsTs);
  if (p.budgetTypeMap !== undefined) setSetting('budgetTypeMap', p.budgetTypeMap);
  if (p.accounts !== undefined) setSetting('accounts', p.accounts);
  return { ok: true };
}

function pushAllData(p) {
  // Ghi đè toàn bộ transactions
  if (p.allTx !== undefined) {
    const sh = txSheet();
    const n = sh.getLastRow();
    if (n > 1) sh.deleteRows(2, n - 1);
    if (p.allTx.length) {
      const rows = p.allTx.map(function (t) {
        return [t.id, t.type, t.note, t.cat, t.amount, t.date, t.budgetType || ''];
      });
      sh.getRange(2, 1, rows.length, 7).setValues(rows);
    }
  }
  // Ghi đè toàn bộ investments
  if (p.allInv !== undefined) {
    const sh = invSheet();
    const n = sh.getLastRow();
    if (n > 1) sh.deleteRows(2, n - 1);
    if (p.allInv.length) {
      const rows = p.allInv.map(function (i) {
        return [i.id, i.type, i.name, i.qty, i.buyPrice, i.curPrice];
      });
      sh.getRange(2, 1, rows.length, 6).setValues(rows);
    }
  }
  saveSettingsData(p);
  return { ok: true, tx: (p.allTx || []).length, inv: (p.allInv || []).length };
}

// ───────── HTTP HANDLERS ─────────
function jsonOut(obj, callback) {
  const json = JSON.stringify(obj);
  if (callback) {
    return ContentService.createTextOutput(callback + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function withLock(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  const action = p.action || '';
  const cb = p.callback || '';
  try {
    let result;
    switch (action) {
      case 'ping':
        result = { ok: true, version: 9 };
        break;
      case 'getAll':
        result = getAllData();
        break;
      case 'addTx':
        result = withLock(function () { return addTransaction(JSON.parse(p.payload)); });
        break;
      case 'deleteTx':
        result = withLock(function () { return deleteTransaction(p.id); });
        break;
      case 'addInvestment':
        result = withLock(function () { return addInvestment(JSON.parse(p.payload)); });
        break;
      case 'updateInvestment':
        result = withLock(function () { return updateInvestment(JSON.parse(p.payload)); });
        break;
      case 'deleteInvestment':
        result = withLock(function () { return deleteInvestment(p.id); });
        break;
      case 'saveMonthMoney':
        result = withLock(function () { return saveMonthMoney(JSON.parse(p.payload)); });
        break;
      case 'saveInstallments':
        result = withLock(function () { return saveInstallmentsAction(JSON.parse(p.payload)); });
        break;
      default:
        result = { ok: false, error: 'unknown action: ' + action };
    }
    return jsonOut(result, cb);
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) }, cb);
  }
}

function doPost(e) {
  try {
    const p = (e && e.parameter) || {};
    const action = p.action || '';
    const payload = JSON.parse(p.payload || '{}');
    let result;
    if (action === 'pushAll') {
      result = withLock(function () { return pushAllData(payload); });
    } else if (action === 'saveSettings') {
      result = withLock(function () { return saveSettingsData(payload); });
    } else {
      result = { ok: false, error: 'unknown action: ' + action };
    }
    return jsonOut(result, null);
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) }, null);
  }
}

// Chạy hàm này 1 lần trong editor để cấp quyền + tạo sheet
function testSetup() {
  txSheet(); invSheet(); setSheet();
  Logger.log('OK — sheets ready. getAll: ' + JSON.stringify(getAllData()).slice(0, 200));
}
