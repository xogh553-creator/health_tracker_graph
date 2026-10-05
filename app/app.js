// ==================== 알림 · 확인 창 ====================
// 브라우저 기본 alert/confirm 은 설치된 앱이나 일부 환경에서 뜨지 않을 수 있어 앱 안의 창으로 대신한다.
const dialogQueue = [];
let dialogActive = null;
function showDialog(message, isConfirm) {
    return new Promise(resolve => { dialogQueue.push({message: String(message), isConfirm, resolve}); nextDialog(); });
}
function nextDialog() {
    if(dialogActive || !dialogQueue.length) return;
    dialogActive = dialogQueue.shift();
    document.getElementById('dialogMessage').textContent = dialogActive.message;
    const ok = document.getElementById('dialogOk'), cancel = document.getElementById('dialogCancel');
    ok.textContent = t('dialog.ok');
    cancel.textContent = t('dialog.cancel');
    cancel.hidden = !dialogActive.isConfirm;
    document.getElementById('dialogOverlay').hidden = false;
    ok.focus();
}
function closeDialog(result) {
    if(!dialogActive) return;
    const done = dialogActive;
    dialogActive = null;
    document.getElementById('dialogOverlay').hidden = true;
    done.resolve(result);
    nextDialog();
}
document.getElementById('dialogOk').addEventListener('click', () => closeDialog(true));
document.getElementById('dialogCancel').addEventListener('click', () => closeDialog(false));
window.alert = message => showDialog(message, false);
const uiConfirm = message => showDialog(message, true);

const THEME_KEY = 'bloodRecordTheme';
let currentTheme = 'light';
function applyTheme(theme) {
    currentTheme = theme === 'dark' ? 'dark' : 'light';
    document.body.classList.toggle('dark-mode', currentTheme === 'dark');
    try { localStorage.setItem(THEME_KEY, currentTheme); } catch(error) {}
    const label = document.getElementById('themeModeText');
    if(label) label.textContent = t(currentTheme === 'dark' ? 'theme.dark' : 'theme.light');
    if(typeof Chart !== "undefined") Chart.defaults.color = currentTheme === 'dark' ? '#cbd5e1' : '#6b7280';
    if(typeof updateChart === 'function') updateChart();
}
function toggleTheme() { applyTheme(currentTheme === 'dark' ? 'light' : 'dark'); }
try { currentTheme = localStorage.getItem(THEME_KEY) || 'light'; } catch(error) {}
if (typeof Chart !== "undefined") Chart.defaults.font.family = "-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Segoe UI', Roboto, 'Noto Sans KR', 'Malgun Gothic', system-ui, sans-serif";
if (typeof Chart !== "undefined") Chart.defaults.color = currentTheme === 'dark' ? '#cbd5e1' : "#6b7280";

// 카테고리별 추천 항목 (categoryEn / nameEn / unitEn 은 영어 화면용)
// 참고 범위(min/max)는 공개 자료에서 직접 확인한 항목에만 넣고, 나머지는 null 로 비워 둔다. (2026-10-05 확인)
//  - 보건복지부 고시 「건강검진 실시기준」 별표 4 별첨 검사항목별 판정기준(정상A):
//    AST, ALT, Creatinine, eGFR, Glucose Fasting, T-Chol/Total Cholesterol, LDL-C, HDL-C, TG
//  - 미국 NHLBI "Blood Tests": WBC, PLT   /   미국 NIDDK "The A1C Test & Diabetes": HbA1c
//  - 성별에 따라 기준이 다른 항목(RBC, Hb, Hct, γ-GTP 등)은 넣지 않는다.
const RECOMMENDED_DB = [
    { category: "CBC (일반혈액검사)", categoryEn: "CBC (Complete Blood Count)", items: [
        { name: "WBC", min: 4.5, max: 10, unit: "x10³/µL" },
        { name: "RBC", min: null, max: null, unit: "x10⁶/µL" },
        { name: "Hb / HGB", min: null, max: null, unit: "g/dL" },
        { name: "Hct / HCT", min: null, max: null, unit: "%" },
        { name: "PLT", min: 140, max: 450, unit: "x10³/µL" },
        { name: "MCV", min: null, max: null, unit: "fL" },
        { name: "MCH", min: null, max: null, unit: "pg" },
        { name: "MCHC", min: null, max: null, unit: "g/dL" },
        { name: "RDW", min: null, max: null, unit: "%" }
    ]},
    { category: "백혈구 분획", categoryEn: "WBC Differential", items: [
        { name: "NEUT#", min: null, max: null, unit: "x10³/µL" },
        { name: "Neutrophil", min: null, max: null, unit: "%" },
        { name: "Lymphocyte", min: null, max: null, unit: "%" },
        { name: "Monocyte", min: null, max: null, unit: "%" },
        { name: "Eosinophil", min: null, max: null, unit: "%" },
        { name: "Basophil", min: null, max: null, unit: "%" }
    ]},
    { category: "간기능 (Liver Profile)", categoryEn: "Liver Profile", items: [
        { name: "AST", min: null, max: 40, unit: "U/L" },
        { name: "ALT", min: null, max: 35, unit: "U/L" },
        { name: "ALP", min: null, max: null, unit: "U/L" },
        { name: "LDH", min: null, max: null, unit: "U/L" },
        { name: "γ-GTP", min: null, max: null, unit: "U/L" },
        { name: "T-Bil", min: null, max: null, unit: "mg/dl" },
        { name: "D-Bil", min: null, max: null, unit: "mg/dl" },
        { name: "I-Bil", min: null, max: null, unit: "mg/dl" },
        { name: "T-Prot", min: null, max: null, unit: "gm/dl" },
        { name: "Albumin", min: null, max: null, unit: "gm/dl" }
    ]},
    { category: "신장기능 및 요산", categoryEn: "Kidney Function & Uric Acid", items: [
        { name: "Creatinine", min: null, max: 1.5, unit: "mg/dL" },
        { name: "BUN", min: null, max: null, unit: "mg/dL" },
        { name: "eGFR", min: 60, max: null, unit: "mL/min/1.73m²" },
        { name: "Uric Acid", min: null, max: null, unit: "mg/dl" }
    ]},
    { category: "혈당 (Glucose)", categoryEn: "Glucose", items: [
        { name: "Glucose Fasting", min: null, max: 100, unit: "mg/dl" },
        { name: "Glucose", min: null, max: null, unit: "mg/dL" },
        { name: "HbA1c", min: null, max: 5.7, unit: "%" }
    ]},
    { category: "전해질", categoryEn: "Electrolytes", items: [
        { name: "Na", min: null, max: null, unit: "mmol/L" },
        { name: "K", min: null, max: null, unit: "mEq/L" },
        { name: "Cl", min: null, max: null, unit: "mEq/l" },
        { name: "Ca", min: null, max: null, unit: "mg/dl" },
        { name: "P", min: null, max: null, unit: "mg/dl" },
        { name: "Ca*P충족률", nameEn: "Ca × P product", min: null, max: null, unit: "" },
        { name: "Mg", min: null, max: null, unit: "mg/dl" }
    ]},
    { category: "지질", categoryEn: "Lipids", items: [
        { name: "T-Chol", min: null, max: 200, unit: "mg/dl" },
        { name: "Total Cholesterol", min: null, max: 200, unit: "mg/dL" },
        { name: "LDL-C", min: null, max: 130, unit: "mg/dL" },
        { name: "HDL-C", min: 60, max: null, unit: "mg/dL" },
        { name: "TG", min: null, max: 150, unit: "mg/dL" }
    ]},
    { category: "췌장기능", categoryEn: "Pancreas", items: [
        { name: "Amylase", min: null, max: null, unit: "IU/L" },
        { name: "Lipase", min: null, max: null, unit: "U/L" }
    ]},
    { category: "염증", categoryEn: "Inflammation", items: [
        { name: "CRP 정량", nameEn: "CRP (quantitative)", min: null, max: null, unit: "mg/dl" },
        { name: "CRP", min: null, max: null, unit: "mg/dL" },
        { name: "ESR", min: null, max: null, unit: "mm/hr" },
        { name: "Procalcitonin", min: null, max: null, unit: "ng/mL" }
    ]},
    { category: "근육/조직", categoryEn: "Muscle / Tissue", items: [
        { name: "CK / CPK", min: null, max: null, unit: "U/L" }
    ]},
    { category: "종양표지자", categoryEn: "Tumor Markers", items: [
        { name: "CA-15-3", min: null, max: null, unit: "U/mL" },
        { name: "CEA", min: null, max: null, unit: "ng/mL" },
        { name: "CA 19-9", min: null, max: null, unit: "U/mL" },
        { name: "CA-125", min: null, max: null, unit: "U/mL" },
        { name: "AFP", min: null, max: null, unit: "ng/mL" },
        { name: "PSA", min: null, max: null, unit: "ng/mL" }
    ]},
    { category: "갑상선", categoryEn: "Thyroid", items: [
        { name: "TSH", min: null, max: null, unit: "µIU/mL" },
        { name: "Free T4", min: null, max: null, unit: "ng/dL" },
        { name: "T3", min: null, max: null, unit: "ng/dL" }
    ]},
    { category: "철분/빈혈", categoryEn: "Iron / Anemia", items: [
        { name: "Ferritin", min: null, max: null, unit: "ng/mL" },
        { name: "Iron", min: null, max: null, unit: "µg/dL" },
        { name: "TIBC", min: null, max: null, unit: "µg/dL" }
    ]},
    { category: "비타민", categoryEn: "Vitamins", items: [
        { name: "Vitamin D (25-OH)", min: null, max: null, unit: "ng/mL" },
        { name: "Vitamin B12", min: null, max: null, unit: "pg/mL" },
        { name: "Folate", min: null, max: null, unit: "ng/mL" }
    ]},
    { category: "응고", categoryEn: "Coagulation", items: [
        { name: "PT", min: null, max: null, unit: "초", unitEn: "sec" },
        { name: "PT %", min: null, max: null, unit: "%" },
        { name: "PT INR", min: null, max: null, unit: "" },
        { name: "aPTT", min: null, max: null, unit: "초", unitEn: "sec" },
        { name: "Fibrinogen", min: null, max: null, unit: "mg/dL" },
        { name: "D-dimer", min: null, max: null, unit: "µg/mL" }
    ]}
];

const STORAGE_KEY = 'bloodAppState.v1';
let userItems = [], bloodData = [], storageError = false;
let currentChart = null, currentPeriod = '7d', loadedDate = null, currentTab = 1;
// 지난 기록은 처음에 5건, '더 보기'를 누를 때마다 20건씩 더 보여준다
const HISTORY_PREVIEW = 5, HISTORY_STEP = 20, openRecCategories = new Set();
let historyLimit = HISTORY_PREVIEW;

const recName = rec => currentLang === 'en' && rec.nameEn ? rec.nameEn : rec.name;
const recUnit = rec => currentLang === 'en' && rec.unitEn !== undefined ? rec.unitEn : rec.unit;
const recExists = rec => userItems.some(item => item.name === rec.name || (rec.nameEn && item.name === rec.nameEn));

function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function localDate(date = new Date()) {
    return date.getFullYear() + '-' + String(date.getMonth()+1).padStart(2,'0') + '-' + String(date.getDate()).padStart(2,'0');
}
function validDate(value) {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
}

// 구버전 및 현재버전 데이터 정규화 로직 유지
function normalizeBackup(data) {
    if (!data || !Array.isArray(data.bloodData)) throw Error(t('err.recordsFormat'));
    let items;
    if (Array.isArray(data.userItems)) items = data.userItems.map(i => ({...i}));
    else {
        if (!Array.isArray(data.customItems) || !data.referenceRanges || typeof data.referenceRanges !== 'object') throw Error(t('err.noItemsInBackup'));
        let fallbackNames = [];
        RECOMMENDED_DB.forEach(c => c.items.forEach(i => fallbackNames.push(i.name)));
        items = [...fallbackNames, ...data.customItems].map((name,index) => {
            const range = data.referenceRanges[index] || {};
            return {id:'legacy_'+index, name, unit:range.unit || '', min:range.min ?? null, max:range.max ?? null};
        });
    }
    const oldIds=new Set(), idMap=new Map();
    items=items.map((item,index)=>{
        if (!item || typeof item.id !== 'string' || !item.id || oldIds.has(item.id) || typeof item.name !== 'string' || !item.name.trim() || typeof item.unit !== 'string') throw Error(t('err.itemInvalid'));
        oldIds.add(item.id);
        for (const key of ['min','max']) {
            item[key] = item[key] ?? null;
            if(item[key] !== null && (typeof item[key] !== 'number' || !Number.isFinite(item[key]))) throw Error(t('err.rangeInvalid'));
        }
        if(item.min!==null && item.max!==null && item.min>item.max) throw Error(t('err.minOverMax'));
        const oldId=Array.isArray(data.userItems)?item.id:String(index);
        const id=/^[a-zA-Z0-9_-]+$/.test(item.id) ? item.id : generateId();
        idMap.set(oldId,id);
        return {id,name:item.name,unit:item.unit,min:item.min,max:item.max};
    });
    const dates=new Set();
    const records=data.bloodData.map(record=>{
        if(!record || !validDate(record.date) || dates.has(record.date) || !record.values || typeof record.values!=='object' || Array.isArray(record.values) || (record.memo!==undefined && typeof record.memo!=='string')) throw Error(t('err.recordInvalid'));
        dates.add(record.date);
        const values={};
        for(const [key,value] of Object.entries(record.values)) {
            if(typeof value!=='number' || !Number.isFinite(value) || value<0) throw Error(t('err.valueInvalid'));
            if(idMap.has(key)) Object.defineProperty(values,idMap.get(key),{value,enumerable:true,writable:true,configurable:true});
        }
        return {date:record.date,memo:record.memo || '',values};
    }).sort((a,b)=>a.date.localeCompare(b.date));
    return {userItems:items,bloodData:records};
}
function commitState(items, records) {
    if(storageError) { alert(t('alert.storageBlocked')); return false; }
    try {
        const next=normalizeBackup({userItems:items,bloodData:records});
        localStorage.setItem(STORAGE_KEY,JSON.stringify(next));
        userItems=next.userItems; bloodData=next.bloodData;
        try { localStorage.setItem(CHANGE_KEY, String(Date.now())); } catch(error) {}
        renderHistory();
        updateBackupUI();
        // 기록이 생기면 브라우저가 저장 공간을 임의로 비우지 않도록 요청
        if(next.bloodData.length && navigator.storage?.persist) navigator.storage.persist().catch(() => {});
        return true;
    } catch(error) { alert(t('alert.saveFail')+error.message); return false; }
}
try {
    const saved=localStorage.getItem(STORAGE_KEY);
    const existingItems=localStorage.getItem('userItems');
    const existingRecords=localStorage.getItem('bloodData');
    const initial=saved ? JSON.parse(saved) : existingItems!==null
        ? {userItems:JSON.parse(existingItems),bloodData:JSON.parse(existingRecords || '[]')}
        : existingRecords!==null ? {bloodData:JSON.parse(existingRecords),customItems:JSON.parse(localStorage.getItem('customItems') || '[]'),referenceRanges:JSON.parse(localStorage.getItem('referenceRanges') || '{}')}
        : {userItems:[],bloodData:[]};
    const normalized=normalizeBackup(initial);
    userItems=normalized.userItems; bloodData=normalized.bloodData;
} catch(error) { storageError=true; setTimeout(()=>alert(t('alert.readFail')+error.message),0); }

function generateId() {
    return globalThis.crypto?.randomUUID?.() || 'item_' + Date.now() + '_' + Math.random().toString(36).slice(2);
}

// 추천 항목 추가 (카테고리 순번, 항목 순번)
function addRecommendedItem(categoryIndex, itemIndex) {
    const rec = RECOMMENDED_DB[categoryIndex]?.items[itemIndex];
    if(rec && !recExists(rec)) {
        if(commitState([...userItems,{id:generateId(), name: recName(rec), min: rec.min, max: rec.max, unit: recUnit(rec)}], bloodData)) {
            renderUI();
        }
    }
}

function addCustomItemField() {
    if(commitState([...userItems,{id:generateId(),name:t('item.new'),min:null,max:null,unit:''}],bloodData)) renderUI();
}

async function removeUserItem(id) {
    if(!await uiConfirm(t('confirm.removeItem'))) return;
    const records=bloodData.map(record=>{const values={...record.values};delete values[id];return {...record,values};});
    if(commitState(userItems.filter(item=>item.id!==id),records)) {renderUI();updateChart();}
}

function saveItemsToLocal() { return commitState(userItems,bloodData); }

function renderUI(preserveSettings = true) {
    const previousValues = new Map(), previousSettings = new Map();
    userItems.forEach(item => {
        const input=document.getElementById(`input_${item.id}`);
        if(input) previousValues.set(item.id,input.value);
        if(preserveSettings) for(const key of ["name","unit","min","max"]) {
            const el=document.getElementById(`${key}_${item.id}`);
            if(el) previousSettings.set(`${key}_${item.id}`,el.value);
        }
    });
    const selectedBefore=document.getElementById("chartSelector").value;
    const dateInput = document.getElementById('recordDate');
    if(!dateInput.value) dateInput.value = localDate();

    const inputContainer = document.getElementById('inputFields');
    const chartSelector = document.getElementById('chartSelector');
    const settingsContainer = document.getElementById('settingsFields');
    const recContainer = document.getElementById('recommendedChips');

    inputContainer.innerHTML = '';
    chartSelector.innerHTML = '';
    settingsContainer.innerHTML = '';
    recContainer.innerHTML = '';

    // 빈 상태 처리
    if (userItems.length === 0) {
        document.getElementById('emptyStateTab1').classList.remove('hidden');
        document.getElementById('contentTab1').classList.add('hidden');
        document.getElementById('emptyStateTab2').classList.remove('hidden');
        document.getElementById('contentTab2').classList.add('hidden');
        settingsContainer.innerHTML = `<div class="text-xs text-center text-gray-400 py-4">${t('my.empty')}</div>`;
    } else {
        document.getElementById('emptyStateTab1').classList.add('hidden');
        document.getElementById('contentTab1').classList.remove('hidden');
        document.getElementById('emptyStateTab2').classList.add('hidden');
        document.getElementById('contentTab2').classList.remove('hidden');
    }

    // 분류별 추천 항목 (접어 두고, 누르면 펼침)
    let recHtml = '';
    RECOMMENDED_DB.forEach((cat, categoryIndex) => {
        let chipsHtml = '', count = 0;
        cat.items.forEach((rec, itemIndex) => {
            if (recExists(rec)) return;
            count++;
            chipsHtml += `<button onclick="addRecommendedItem(${categoryIndex}, ${itemIndex})" class="bg-blue-50 border border-blue-100 text-blue-700 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-blue-100 transition active:scale-95 whitespace-nowrap">+ ${escapeHTML(recName(rec))}</button>`;
        });
        if(!count) return;
        recHtml += `
            <details class="rec-cat" ${openRecCategories.has(categoryIndex) ? 'open' : ''} ontoggle="this.open ? openRecCategories.add(${categoryIndex}) : openRecCategories.delete(${categoryIndex})">
                <summary>
                    <span class="rec-name">${escapeHTML(currentLang === 'en' ? cat.categoryEn : cat.category)}</span>
                    <span class="rec-count">${count}</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"></path></svg>
                </summary>
                <div class="rec-chips">${chipsHtml}</div>
            </details>
        `;
    });
    recContainer.innerHTML = recHtml || `<div class="text-xs text-center bg-gray-50 py-3 rounded-lg text-gray-400">${t('rec.allAdded')}</div>`;
    renderHistory();

    // 설정 및 입력, 차트 셀렉터 렌더링
    userItems.forEach((item) => {
        const unitText = item.unit ? ` <span class="font-normal text-gray-400">(${escapeHTML(item.unit)})</span>` : '';

        inputContainer.innerHTML += `
            <div>
                <label class="block text-[11px] font-bold text-gray-800 truncate mb-1.5 pl-1">${escapeHTML(item.name)}${unitText}</label>
                <input type="number" step="0.01" id="input_${item.id}" class="block w-full py-2.5 px-3 rounded-xl border border-gray-200 text-sm bg-gray-50/50 focus:border-gray-400 transition placeholder-gray-300 m-0 font-bold text-gray-800" placeholder="0.00">
            </div>
        `;

        chartSelector.innerHTML += `<option value="${item.id}">${escapeHTML(item.name)}</option>`;

        settingsContainer.innerHTML += `
            <div class="flex items-center space-x-1.5 mb-2 bg-gray-50/50 p-1 rounded-xl border border-gray-100">
                <input type="text" id="name_${item.id}" value="${escapeHTML(item.name)}" class="flex-1 w-20 py-2 px-2 rounded-lg border-none text-xs bg-transparent focus:ring-1 focus:ring-gray-300 transition text-gray-700 m-0 font-bold">
                <input type="text" id="unit_${item.id}" value="${escapeHTML(item.unit || '')}" placeholder="${t('col.unit')}" class="w-12 py-2 px-1 rounded-lg border border-gray-200 text-xs text-center bg-white focus:border-gray-400 text-gray-600 m-0">
                <input type="number" step="0.01" id="min_${item.id}" value="${item.min !== null ? item.min : ''}" placeholder="${t('col.min')}" class="w-12 py-2 px-1 rounded-lg border border-gray-200 text-xs text-center bg-white focus:border-gray-400 text-gray-600 m-0">
                <input type="number" step="0.01" id="max_${item.id}" value="${item.max !== null ? item.max : ''}" placeholder="${t('col.max')}" class="w-12 py-2 px-1 rounded-lg border border-gray-200 text-xs text-center bg-white focus:border-gray-400 text-gray-600 m-0">
                <button onclick="removeUserItem('${item.id}')" class="text-gray-300 hover:text-red-500 p-1.5 font-bold text-xs bg-white rounded-lg border border-gray-100 shadow-sm w-7">✕</button>
            </div>
        `;
    });
    previousValues.forEach((value,id)=>{const el=document.getElementById('input_'+id);if(el)el.value=value;});
    previousSettings.forEach((value,id)=>{const el=document.getElementById(id);if(el)el.value=value;});
    if(userItems.some(i=>i.id===selectedBefore)) chartSelector.value=selectedBefore;
}

function saveSettings() {
    if(!userItems.length) return alert(t('alert.noItems'));
    const items=userItems.map(item=>{
        const get=key=>document.getElementById(key+'_'+item.id).value;
        return {...item,name:get('name').trim() || t('item.noName'),unit:get('unit').trim(),min:get('min')===''?null:Number(get('min')),max:get('max')===''?null:Number(get('max'))};
    });
    if(commitState(items,bloodData)) {renderUI(false);updateChart();alert(t('alert.settingsSaved'));}
}

// ==================== 백업 알림 ====================
// 마지막 백업 뒤 30일이 지났고 그 사이 기록이 바뀌었으면 기록 탭 위에 알린다. '나중에'를 누르면 7일 동안 쉰다.
const BACKUP_KEY = 'bloodRecordLastBackup', CHANGE_KEY = 'bloodRecordLastChange', SNOOZE_KEY = 'bloodRecordBackupSnooze';
const BACKUP_REMIND_DAYS = 30, BACKUP_SNOOZE_DAYS = 7, BACKUP_FIRST_REMIND_RECORDS = 3, DAY_MS = 86400000;
function readTime(key) {
    try { const value = Number(localStorage.getItem(key)); return Number.isFinite(value) && value > 0 ? value : null; }
    catch(error) { return null; }
}
function markBackupDone() {
    try { localStorage.setItem(BACKUP_KEY, String(Date.now())); localStorage.removeItem(SNOOZE_KEY); } catch(error) {}
    updateBackupUI();
}
function snoozeBackup() {
    try { localStorage.setItem(SNOOZE_KEY, String(Date.now())); } catch(error) {}
    updateBackupUI();
}
function updateBackupUI() {
    const last = readTime(BACKUP_KEY), changed = readTime(CHANGE_KEY), snoozed = readTime(SNOOZE_KEY), now = Date.now();
    document.getElementById('lastBackupText').textContent = last
        ? t('backup.last', {date: localDate(new Date(last)).replaceAll('-', '.')})
        : t('backup.never');
    let message = '';
    if(!last) {
        if(bloodData.length >= BACKUP_FIRST_REMIND_RECORDS) message = t('backup.remindNever');
    } else if(bloodData.length) {
        const days = Math.floor((now - last) / DAY_MS);
        if(days >= BACKUP_REMIND_DAYS && changed && changed > last) message = t('backup.remindOld', {days});
    }
    if(snoozed && now - snoozed < BACKUP_SNOOZE_DAYS * DAY_MS) message = '';
    document.getElementById('backupBanner').hidden = !message;
    document.getElementById('backupBannerText').textContent = message;
}

// ==================== 앱 공유 ====================
// 공유되는 주소는 앱이 아니라 소개 페이지 (받는 사람이 설명을 먼저 보도록)
function shareUrl() { return new URL(currentLang === 'en' ? '../en/' : '../', location.href).href; }
function shareApp() {
    document.getElementById('shareUrlText').textContent = shareUrl();
    document.getElementById('shareOverlay').hidden = false;
}
function closeShareSheet() { document.getElementById('shareOverlay').hidden = true; }
async function copyShareUrl(message) {
    try { await navigator.clipboard.writeText(shareUrl()); alert(message || t('share.copied')); }
    catch(error) { alert(shareUrl()); }
}
async function shareTo(target) {
    const url = encodeURIComponent(shareUrl()), text = encodeURIComponent(t('appName') + ' - ' + t('share.text'));
    const links = {
        line: `https://social-plugins.line.me/lineit/share?url=${url}`,
        x: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`
    };
    if(links[target]) { window.open(links[target], '_blank', 'noopener'); return; }
    // 카카오톡: 휴대폰의 공유 창을 열어 카카오톡을 고르게 한다. 공유 창이 없으면 주소를 복사해 준다.
    if(navigator.share) {
        try { await navigator.share({title: t('appName'), text: t('share.text'), url: shareUrl()}); return; }
        catch(error) { if(error?.name === 'AbortError') return; }
    }
    copyShareUrl(t('share.kakaoCopied'));
}

// 기록 하나를 입력 칸에 채운다 (record 가 없으면 칸을 비운다)
function fillRecord(record) {
    document.getElementById('recordMemo').value = record?.memo || '';
    userItems.forEach(item => {
        const el = document.getElementById(`input_${item.id}`);
        if(el) el.value = record && record.values[item.id] !== undefined ? record.values[item.id] : '';
    });
}

function loadRecordForDate() {
    const dateStr = document.getElementById('recordDate').value;
    if(!dateStr) return alert(t('alert.pickDate'));

    const found = bloodData.find(d => d.date === dateStr);
    loadedDate = found ? dateStr : null;
    fillRecord(found);
    renderHistory();
    alert(found ? t('alert.loaded', {date: dateStr}) : t('alert.noRecordForDate'));
}

// ==================== 지난 기록 목록 ====================
function renderHistory() {
    const section = document.getElementById('historySection');
    const records = [...bloodData].sort((a,b) => b.date.localeCompare(a.date));
    section.hidden = records.length === 0;
    const shown = records.slice(0, historyLimit);
    document.getElementById('historyList').innerHTML = shown.map(record => {
        const count = userItems.filter(item => record.values[item.id] !== undefined).length;
        return `
            <button type="button" class="history-row${record.date === loadedDate ? ' selected' : ''}" onclick="loadFromHistory('${record.date}')">
                <span class="history-date">${record.date.replaceAll('-', '.')}</span>
                <span class="history-meta">${t('history.count', {n: count})}${record.memo ? ' · ' + escapeHTML(record.memo) : ''}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"></path></svg>
            </button>`;
    }).join('');
    const left = records.length - shown.length;
    const more = document.getElementById('historyMore'), less = document.getElementById('historyLess');
    more.hidden = left <= 0;
    more.textContent = t('history.more', {n: Math.min(HISTORY_STEP, left), left});
    less.hidden = shown.length <= HISTORY_PREVIEW;
}
function showMoreHistory() { historyLimit += HISTORY_STEP; renderHistory(); }
function collapseHistory() { historyLimit = HISTORY_PREVIEW; renderHistory(); }
function loadFromHistory(dateStr) {
    const found = bloodData.find(d => d.date === dateStr);
    if(!found) return;
    document.getElementById('recordDate').value = dateStr;
    loadedDate = dateStr;
    fillRecord(found);
    renderHistory();
    document.querySelector('main').scrollTo({top: 0, behavior: 'smooth'});
}

async function deleteRecordForDate() {
    const dateStr = document.getElementById('recordDate').value;
    if(!dateStr) return alert(t('alert.pickDate'));

    const exists = bloodData.some(d => d.date === dateStr);
    if(!exists) return alert(t('alert.nothingToDelete'));

    if(await uiConfirm(t('confirm.deleteRecord', {date: dateStr}))) {
        if(!commitState(userItems,bloodData.filter(d=>d.date!==dateStr))) return;
        loadedDate=null;
        alert(t('alert.deleted'));

        document.getElementById('recordMemo').value = '';
        userItems.forEach(item => {
            const el = document.getElementById(`input_${item.id}`);
            if(el) el.value = '';
        });
        updateChart();
    }
}

function switchTab(tabIndex) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.getElementById(`tab${tabIndex}`).classList.add('active');

    currentTab = tabIndex;
    document.getElementById('headerTitle').innerText = t('title.' + tabIndex);

    [1,2,3,4].forEach(id => {
        const btn = document.getElementById(`btnTab${id}`);
        const span = btn.querySelector('span');
        if(id === tabIndex) {
            btn.classList.remove('text-gray-400');
            btn.classList.add('text-gray-900');
            span.classList.remove('font-medium');
            span.classList.add('font-semibold');
        } else {
            btn.classList.remove('text-gray-900');
            btn.classList.add('text-gray-400');
            span.classList.remove('font-semibold');
            span.classList.add('font-medium');
        }
    });

    if(tabIndex === 2) updateChart();
    document.querySelector('main').scrollTo(0,0);
}

async function saveData() {
    const dateStr=document.getElementById('recordDate').value;
    if(!validDate(dateStr)) return alert(t('alert.pickDate'));
    const record={date:dateStr,memo:document.getElementById('recordMemo').value.trim(),values:{}};
    for(const item of userItems) {
        const el=document.getElementById('input_'+item.id), value=el.value;
        if(el.validity?.badInput) return alert(t('alert.badNumber'));
        if(value!=='') {const n=Number(value);if(!Number.isFinite(n)||n<0)return alert(t('alert.negative'));record.values[item.id]=n;}
    }
    if(!Object.keys(record.values).length)return alert(t('alert.noValues'));
    const previous=bloodData.find(r=>r.date===dateStr);
    if(previous && loadedDate!==dateStr) {
        // 같은 날짜에 기록이 이미 있으면 덮어쓰지 않고, 기존 기록을 먼저 불러오게 한다
        if(!await uiConfirm(t('confirm.loadFirst', {date: dateStr})))return;
        userItems.forEach(item=>{
            const el=document.getElementById('input_'+item.id);
            if(el.value==='' && previous.values[item.id]!==undefined) el.value=previous.values[item.id];
        });
        const memoEl=document.getElementById('recordMemo');
        if(!memoEl.value.trim()) memoEl.value=previous.memo || '';
        loadedDate=dateStr;
        renderHistory();
        return alert(t('alert.loadedMerge'));
    }
    if(previous && Object.keys(previous.values).some(id=>record.values[id]===undefined) && !await uiConfirm(t('confirm.replace')))return;
    if(!commitState(userItems,[...bloodData.filter(r=>r.date!==dateStr),record]))return;
    loadedDate=null;
    renderHistory();
    userItems.forEach(item=>document.getElementById('input_'+item.id).value='');
    document.getElementById('recordMemo').value='';
    switchTab(2);
}

async function deleteAllData() {
    if(!storageError && !userItems.length && !bloodData.length) return alert(t('alert.noData'));
    if(!await uiConfirm(t('confirm.deleteAll1')))return;
    if(!await uiConfirm(t('confirm.deleteAll2')))return;
    if(commitState([],[])) {
        try {for(const key of ['bloodData','userItems','customItems','referenceRanges'])localStorage.removeItem(key);}catch(error){}
        await alert(t('alert.allDeleted'));location.reload();
    }
}

function setPeriod(period) {
    currentPeriod = period;
    ['7d', '1m', '6m', '1y', 'custom'].forEach(p => {
        const btn = document.getElementById(`period_${p}`);
        if(p === period) {
            btn.className = "py-1.5 text-[11px] font-bold rounded-lg transition bg-white shadow-sm text-gray-800";
        } else {
            btn.className = "py-1.5 text-[11px] font-bold rounded-lg transition text-gray-500";
        }
    });

    const customArea = document.getElementById('customDateArea');
    if(period === 'custom') {
        customArea.classList.remove('hidden');
    } else {
        customArea.classList.add('hidden');
    }
    updateChart();
}

function updateTrendSummary(currentItem, filteredHistory) {
    const summaryEl = document.getElementById('trendSummary');

    if(filteredHistory.length === 0) {
        summaryEl.innerHTML = `<div class="text-xs text-gray-500">${t('trend.noneInPeriod')}</div>`;
        return;
    }

    const current = filteredHistory[filteredHistory.length - 1];
    const currentVal = current.values[currentItem.id];
    const date = current.date.substring(5);

    let trendHtml = `<span class="text-gray-300 text-xs ml-2 font-light">-</span>`;

    if(filteredHistory.length >= 2) {
        const previousVal = filteredHistory[filteredHistory.length - 2].values[currentItem.id];
        const diff = (currentVal - previousVal).toFixed(2);

        if(diff > 0) {
            trendHtml = `<div class="trend-chip">▲ ${diff}</div>`;
        } else if (diff < 0) {
            trendHtml = `<div class="trend-chip">▼ ${Math.abs(diff)}</div>`;
        } else {
            trendHtml = `<div class="trend-chip">${t('trend.same')}</div>`;
        }
    }

    summaryEl.innerHTML = `
        <div class="flex flex-col">
            <span class="text-[10px] text-gray-400 font-medium mb-0.5">${t('trend.latest', {date: date.replace('-','/')})}</span>
            <div class="flex items-end">
                <span class="text-2xl font-bold text-gray-800 leading-none">${currentVal}</span>
                <span class="text-xs text-gray-400 ml-1 mb-0.5">${escapeHTML(currentItem.unit || '')}</span>
            </div>
        </div>
        <div>${trendHtml}</div>
    `;
}

function updateChart() {
    const selector = document.getElementById('chartSelector');
    if(!selector.value) {if(currentChart){currentChart.destroy();currentChart=null;}return;}
    if(typeof Chart==='undefined') {document.getElementById('trendSummary').textContent=t('chart.loadFail');return;}

    const selectedItemId = selector.value;
    const currentItem = userItems.find(item => item.id === selectedItemId);
    if(!currentItem) return;

    let filteredHistory = bloodData.filter(d => Number.isFinite(d.values[selectedItemId])).sort((a,b)=>a.date.localeCompare(b.date));

    if (filteredHistory.length > 0) {
        if (currentPeriod !== 'custom') {
            const latestRecordDateStr = filteredHistory[filteredHistory.length - 1].date;
            const baseDate = new Date(latestRecordDateStr+'T00:00:00Z');
            const startDate = new Date(baseDate);
            if(currentPeriod==='7d')startDate.setUTCDate(baseDate.getUTCDate()-7);
            else {
                const months=currentPeriod==='1m'?1:currentPeriod==='6m'?6:12;
                const day=baseDate.getUTCDate();
                startDate.setUTCDate(1);startDate.setUTCMonth(startDate.getUTCMonth()-months);
                const last=new Date(Date.UTC(startDate.getUTCFullYear(),startDate.getUTCMonth()+1,0)).getUTCDate();
                startDate.setUTCDate(Math.min(day,last));
            }
            const startDateStr=startDate.toISOString().slice(0,10);
            filteredHistory = filteredHistory.filter(d => d.date >= startDateStr);
        } else {
            const startInput = document.getElementById('startDate').value;
            const endInput = document.getElementById('endDate').value;
            if(startInput) filteredHistory = filteredHistory.filter(d => d.date >= startInput);
            if(endInput) filteredHistory = filteredHistory.filter(d => d.date <= endInput);
        }
    }

    updateTrendSummary(currentItem, filteredHistory);

    const chartLabels = [];
    const chartData = [];
    const pointColors = [];
    const pointBorderColors = [];
    const pointStyles = [];
    const pointRadii = [];
    const pointMemos = [];

    filteredHistory.forEach(record => {
        chartLabels.push(record.date.substring(5).replace('-','/')); 
        const val = record.values[selectedItemId];
        chartData.push(val);
        pointMemos.push(record.memo || '');

        if(record.memo) {
            pointStyles.push('circle'); 
            pointRadii.push(10);        
            pointColors.push('rgb(250, 204, 21)'); 
            pointBorderColors.push('#fff'); 
        } else {
            pointStyles.push('circle');
            pointRadii.push(5);
            pointColors.push('rgb(59, 130, 246)'); 
            pointBorderColors.push('#fff');
        }
    });

    const emptyStateEl = document.getElementById('chartEmptyState');
    if (chartData.length === 0) {
        emptyStateEl.classList.remove('hidden');
    } else {
        emptyStateEl.classList.add('hidden');
    }

    if(currentChart) currentChart.destroy();

    const annotationConfig = {};
    const hasMin = currentItem.min !== null && currentItem.min !== undefined && currentItem.min !== "";
    const hasMax = currentItem.max !== null && currentItem.max !== undefined && currentItem.max !== "";

    if (hasMin || hasMax) {
        annotationConfig.box1 = {
            type: 'box',
            yMin: hasMin ? parseFloat(currentItem.min) : undefined,
            yMax: hasMax ? parseFloat(currentItem.max) : undefined,
            backgroundColor: 'rgba(16, 185, 129, 0.08)', 
            borderColor: 'rgba(16, 185, 129, 0.2)',     
            borderWidth: 1,
            drawTime: 'beforeDatasetsDraw'
        };
    }

    // 혈액 수치는 음수가 없으므로, 여백 때문에 축이 0 아래로 내려갈 상황이면 0에서 시작하게 한다
    const axisValues = [...chartData, ...(hasMin ? [parseFloat(currentItem.min)] : []), ...(hasMax ? [parseFloat(currentItem.max)] : [])].filter(Number.isFinite);
    const axisLow = Math.min(...axisValues), axisHigh = Math.max(...axisValues);
    const clampAtZero = axisValues.length > 0 && axisLow - (axisHigh - axisLow) * 0.25 <= 0;

    const ctx = document.getElementById('myChart').getContext('2d');
    currentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartLabels,
            datasets: [{
                label: currentItem.name,
                data: chartData,
                borderColor: 'rgb(229, 231, 235)',
                borderWidth: 2,
                pointBackgroundColor: pointColors,
                pointBorderColor: pointBorderColors,
                pointBorderWidth: 2,
                pointStyle: pointStyles,
                pointRadius: pointRadii,
                pointHoverRadius: 14,
                pointHitRadius: 30,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            layout: { padding: { top: 15, bottom: 15, left: 10, right: 10 } },
            interaction: { mode: 'nearest', intersect: true }, 
            plugins: {
                legend: { display: false },
                annotation: { annotations: annotationConfig },
                tooltip: { 
                    backgroundColor: currentTheme === 'dark' ? 'rgba(31,41,55,0.97)' : 'rgba(255,255,255,0.95)',
                    titleColor: currentTheme === 'dark' ? '#cbd5e1' : '#6b7280',
                    bodyColor: currentTheme === 'dark' ? '#f9fafb' : '#111827',
                    borderColor: currentTheme === 'dark' ? 'rgba(148,163,184,0.25)' : 'rgba(0,0,0,0.05)',
                    borderWidth: 1,
                    titleFont: { size: 11 },
                    bodyFont: { size: 14, weight: 'bold' },
                    padding: 12,
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    displayColors: false,
                    callbacks: {
                        label: function(context) { return `${context.parsed.y} ${currentItem.unit || ''}`; },
                        afterLabel: function(context) {
                            const memo = pointMemos[context.dataIndex];
                            return memo ? `\n${t('memo.prefix')}${memo}` : '';
                        }
                    }
                }
            },
            scales: {
                y: {
                    grace: '20%',
                    ...(clampAtZero && { min: 0 }),
                    ...(hasMin && !isNaN(parseFloat(currentItem.min)) && { suggestedMin: parseFloat(currentItem.min) * 0.8 }),
                    ...(hasMax && !isNaN(parseFloat(currentItem.max)) && { suggestedMax: parseFloat(currentItem.max) * 1.2 }),
                    grid: { color: currentTheme === 'dark' ? 'rgba(148,163,184,0.14)' : 'rgba(0,0,0,0.03)' },
                    border: { display: false }
                },
                x: {
                    offset: true,
                    grid: { display: false },
                    border: { display: false }
                }
            }
        }
    });
}

document.getElementById('recordDate').addEventListener('change',()=>{loadedDate=null;renderHistory();});

function exportData() {
    if(storageError)return alert(t('alert.exportBlocked'));
    if(!userItems.length && !bloodData.length)return alert(t('alert.noBackupData'));
    try {
        const dataStr = JSON.stringify({ bloodData, userItems });
        const fileName = t('backup.fileName', {date: localDate()});
        if (window.AndroidBackup && typeof window.AndroidBackup.save === 'function') {
            window.AndroidBackup.save(dataStr, fileName);
            markBackupDone();
            return;
        }
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url; 
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(()=>URL.revokeObjectURL(url),10000);

        markBackupDone();
        alert(t('alert.exported'));
    } catch (error) {
        alert(t('alert.exportFail'));
    }
}

function importData(event) {
    const input=event.target,file=input.files[0];
    if(!file)return;
    input.value='';
    const readerObj=new FileReader();
    readerObj.onerror=()=>alert(t('alert.fileReadFail'));
    readerObj.onload=async function(e) {
        try {
            let parsed;
            try { parsed=JSON.parse(e.target.result); } catch(parseError) { throw Error(t('err.notBackupFile')); }
            const data=normalizeBackup(parsed);
            if(!await uiConfirm(t('confirm.restore', {records: data.bloodData.length, items: data.userItems.length})))return;
            if(commitState(data.userItems,data.bloodData)) {markBackupDone();await alert(t('alert.restored'));location.reload();}
        } catch(error) {alert(t('alert.restoreFail')+error.message);}
    };
    readerObj.readAsText(file);
}

// ==================== 언어 전환 ====================
function applyLang() {
    applyStaticI18n();
    for (const lang of ['ko', 'en']) {
        document.getElementById('lang_' + lang).className = lang === currentLang
            ? "lang-btn-active px-3 py-1.5 text-[11px] font-bold rounded-lg transition bg-white shadow-sm text-gray-800"
            : "px-3 py-1.5 text-[11px] font-bold rounded-lg transition text-gray-500";
    }
    document.getElementById('headerTitle').innerText = t('title.' + currentTab);
    document.getElementById('themeModeText').textContent = t(currentTheme === 'dark' ? 'theme.dark' : 'theme.light');
    renderUI();
    updateChart();
    updateInstallUI();
    updateBackupUI();
}
function setLang(lang) {
    if(!I18N[lang] || lang === currentLang) return;
    currentLang = lang;
    try { localStorage.setItem(LANG_KEY, lang); } catch(error) {}
    applyLang();
}

// ==================== 앱 설치 (PWA) ====================
let deferredInstallPrompt = null;
function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}
function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
function isAndroid() { return /Android/i.test(navigator.userAgent); }
// 카카오톡·네이버 등 다른 앱 안에서 열린 화면에서는 설치가 되지 않는다
const IN_APP_BROWSER = /KAKAOTALK|NAVER|Instagram|FBAN|FBAV|FB_IAB|Line\//i;
function inIOSSafari() {
    const ua = navigator.userAgent;
    return isIOS() && /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|Whale/i.test(ua) && !IN_APP_BROWSER.test(ua);
}
function inAndroidInstallBrowser() {
    const ua = navigator.userAgent;
    return isAndroid() && !IN_APP_BROWSER.test(ua) && !/; wv\)/.test(ua)
        && (/SamsungBrowser/i.test(ua) || (/Chrome/i.test(ua) && !/EdgA|OPR|Whale|Firefox/i.test(ua)));
}
function appUrl() { return location.origin + location.pathname; }
function openInBrowser(target) {
    if(target === 'safari') {
        if(!isIOS()) return alert(t('install.iosOnly'));
        location.href = 'x-safari-' + appUrl();
        return;
    }
    if(!isAndroid()) return alert(t('install.androidOnly'));
    const appPackage = target === 'samsung' ? 'com.sec.android.app.sbrowser' : 'com.android.chrome';
    location.href = `intent://${location.host}${location.pathname}#Intent;scheme=${location.protocol.replace(':', '')};package=${appPackage};end`;
}
async function copyAppLink() {
    try { await navigator.clipboard.writeText(appUrl()); alert(t('install.copied')); }
    catch(error) { alert(appUrl()); }
}
function updateInstallUI() {
    document.getElementById('openIn_ios').hidden = inIOSSafari();
    document.getElementById('openHere_ios').hidden = !inIOSSafari();
    document.getElementById('openIn_android').hidden = inAndroidInstallBrowser();
    document.getElementById('openHere_android').hidden = !inAndroidInstallBrowser();
    // 설치한 앱으로 열었을 때는 '설치됨'으로 표시하고, 설치 방법은 계속 볼 수 있게 둔다
    document.getElementById('installArea').classList.toggle('hidden', !!window.AndroidBackup);
    document.getElementById('installedTag').hidden = !isStandalone();
    document.getElementById('installDesc').textContent = t(isStandalone() ? 'install.installedDesc' : 'install.desc');
    document.getElementById('installNowBox').hidden = !deferredInstallPrompt;
    document.getElementById('installManualBox').hidden = !!deferredInstallPrompt;
}
function selectInstallDevice(device) {
    for (const name of ['ios', 'android']) {
        document.getElementById('deviceCard_' + name).classList.toggle('selected', name === device);
        document.getElementById('installPanel_' + name).hidden = name !== device;
    }
}
function openInstallScreen() {
    selectInstallDevice(isIOS() ? 'ios' : 'android');
    updateInstallUI();
    const screen = document.getElementById('installScreen');
    screen.hidden = false;
    screen.scrollTop = 0;
    // 휴대폰의 뒤로가기 버튼으로도 닫히도록 기록을 하나 쌓아둔다
    history.pushState({installScreen: true}, '');
}
function closeInstallScreen() {
    if(history.state?.installScreen) history.back();
    else document.getElementById('installScreen').hidden = true;
}
window.addEventListener('popstate', () => { document.getElementById('installScreen').hidden = true; });
async function installApp() {
    if(!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    updateInstallUI();
    if(choice?.outcome === 'accepted') closeInstallScreen();
}
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); deferredInstallPrompt = event; updateInstallUI(); });
window.addEventListener('appinstalled', () => { deferredInstallPrompt = null; updateInstallUI(); });
window.matchMedia('(display-mode: standalone)').addEventListener?.('change', updateInstallUI);

// 오프라인에서도 열리도록 서비스 워커 등록
if('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
}

applyStaticI18n();
if(currentTheme === 'dark') document.body.classList.add('dark-mode');

// ==================== 처음 실행 안내 ====================
// 안내 문구가 바뀌어 다시 확인받아야 하면 숫자를 올린다
const NOTICE_KEY = 'bloodRecordNoticeAck', NOTICE_VERSION = '1';
function openNotice() {
    const overlay = document.getElementById('noticeOverlay');
    overlay.hidden = false;
    overlay.scrollTop = 0;
}
function acceptNotice() {
    try { localStorage.setItem(NOTICE_KEY, NOTICE_VERSION); } catch(error) {}
    document.getElementById('noticeOverlay').hidden = true;
}
try { if(localStorage.getItem(NOTICE_KEY) !== NOTICE_VERSION) openNotice(); } catch(error) { openNotice(); }

// 앱 실행 화면: 1.5초 보여준 뒤 사라짐
setTimeout(() => {
    const splash = document.getElementById('splash');
    splash.classList.add('splash-hide');
    setTimeout(() => splash.remove(), 400);
}, 1500);

window.onload = () => { applyTheme(currentTheme); applyLang(); switchTab(1); };
