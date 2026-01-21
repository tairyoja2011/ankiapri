const READ_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQiBU73LGsFHvtGPvST1fPIxvetpofBMFpKeQTLHBZN0wtMPOQKJnTbzjTcCNTew5fiVwXoVL1dlPQB/pub?gid=0&single=true&output=csv";
const WRITE_URL = "https://script.google.com/macros/s/AKfycbzxEnfw0-oIgZ_cPZriklw73B49bhDq8zXXRUT5qEu6mQwHbyeS3Q-EYjmNeULDdYCl/exec";

const READ_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQiBU73LGsFHvtGPvST1fPIxvetpofBMFpKeQTLHBZN0wtMPOQKJnTbzjTcCNTew5fiVwXoVL1dlPQB/pub?gid=0&single=true&output=csv";
const WRITE_URL = "YOUR_GAS_WEBAPP_URL"; // GASのURLを入れてください

let allCards = [];
let queue = [];
let currentCard = null;
let isInputMode = false;
let pendingUpdates = []; // 統計更新を一時保持

function changeView(id) {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    document.getElementById(id).style.display = 'block';
    window.scrollTo(0,0);
}

function showSubMenu(title) {
    isInputMode = false;
    document.getElementById('selected-book-title').textContent = title;
    changeView('view-submenu');
}

async function loadData() {
    const res = await fetch(READ_URL);
    const csv = await res.text();
    const rows = csv.split(/\r?\n/).slice(1);
    allCards = rows.filter(r => r.trim()).map(r => {
        const c = r.split(',');
        return { q: c[0]?.trim(), a: c[1]?.trim(), status: c[2]?.trim() || "未着手", bad: Number(c[3])||0, good: Number(c[4])||0, perfect: Number(c[5])||0, total: Number(c[6])||0 };
    });
}

function resetDisplayState() {
    document.getElementById("edit-mode-area").style.display = "none";
    document.getElementById("answer-display").style.display = "block";
    document.getElementById("answer-container").style.display = "none";
    document.getElementById("comparison-area").style.display = "none";
    document.getElementById("edit-toggle-btn").style.display = "block";
}

async function startStudyMode(type) {
    isInputMode = false;
    resetDisplayState();
    await loadData();
    if (type === 'bad') queue = allCards.filter(c => c.bad > 0 || c.status === "未着手");
    else if (type === 'good-perfect') queue = allCards.filter(c => c.good > 0 || c.perfect > 0);
    else queue = allCards.filter(c => c.status !== "完璧");
    queue.sort(() => Math.random() - 0.5);
    changeView('view-study'); showNext();
}

async function startInputMode() {
    isInputMode = true;
    resetDisplayState();
    await loadData();
    queue = [...allCards].sort(() => Math.random() - 0.5);
    changeView('view-study'); showNext();
}

function showNext() {
    if (queue.length === 0) {
        document.getElementById("question").textContent = "終了！更新ボタンを押して保存してください";
        document.getElementById("evalContainer").style.display = "none";
        document.getElementById("showAnswerBtn").style.display = "none";
        return;
    }
    resetDisplayState();
    currentCard = queue.shift();
    document.getElementById("question").textContent = currentCard.q;
    document.getElementById("answer-display").innerText = currentCard.a;
    document.getElementById("answer-edit").value = currentCard.a;
    document.getElementById("user-input-area").style.display = isInputMode ? "block" : "none";
    document.getElementById("user-answer-input").value = "";
    document.getElementById("showAnswerBtn").style.display = "block";
    document.getElementById("evalContainer").style.display = "none";
}

function flipCard() {
    if (isInputMode) {
        const inputVal = document.getElementById("user-answer-input").value.trim();
        document.getElementById("current-user-ans").innerText = inputVal || "(未入力)";
        const key = "last_ans_" + currentCard.q;
        document.getElementById("last-user-ans").innerText = localStorage.getItem(key) || "(なし)";
        if (inputVal !== "") localStorage.setItem(key, inputVal);
        document.getElementById("comparison-area").style.display = "block";
        document.getElementById("edit-toggle-btn").style.display = "none";
    }
    document.getElementById("answer-container").style.display = "block";
    document.getElementById("showAnswerBtn").style.display = "none";
    document.getElementById("evalContainer").style.display = "flex";
}

function handleEval(rating) {
    // ローカル保持
    pendingUpdates.push({
        word: currentCard.q,
        status: rating,
        user_ans: isInputMode ? document.getElementById("user-answer-input").value.trim() : ""
    });
    updateSyncBadge();
    if (rating === 'ダメ') queue.splice(1, 0, currentCard);
    showNext();
}

function updateSyncBadge() {
    const badge = document.getElementById("pending-count");
    if (pendingUpdates.length > 0) {
        badge.textContent = pendingUpdates.length;
        badge.style.display = "inline";
    } else {
        badge.style.display = "none";
    }
}

async function syncData() {
    if (pendingUpdates.length === 0) return alert("更新データなし");
    const btn = document.getElementById("sync-btn-study");
    btn.textContent = "更新中...";
    await fetch(WRITE_URL, { method: "POST", mode: "no-cors", body: JSON.stringify({ action: "bulk_update", updates: pendingUpdates }) });
    pendingUpdates = [];
    updateSyncBadge();
    btn.textContent = "更新";
    alert("同期完了！");
}

function stopStudy() {
    if (pendingUpdates.length > 0 && !confirm("未送信のデータがありますが中止しますか？")) return;
    changeView('view-submenu');
}

async function updateCurrentCardContent() {
    const newA = document.getElementById("answer-edit").value;
    if(!confirm("即座にスプレッドシートを更新しますか？")) return;
    await fetch(WRITE_URL, { method: "POST", mode: "no-cors", body: JSON.stringify({ action: "update_content", word: currentCard.q, new_answer: newA }) });
    currentCard.a = newA;
    document.getElementById("answer-display").innerText = newA;
    resetDisplayState();
}

async function addNewCard() {
    const q = document.getElementById("new-q").value;
    const a = document.getElementById("new-a").value;
    await fetch(WRITE_URL, { method: "POST", mode: "no-cors", body: JSON.stringify({ action: "add_new", word: q, answer: a }) });
    alert("追加完了");
    changeView('view-submenu');
}

function toggleEditMode() {
    document.getElementById("edit-mode-area").style.display = "block";
    document.getElementById("answer-display").style.display = "none";
    document.getElementById("edit-toggle-btn").style.display = "none";
}

async function startListMode() {
    await loadData();
    changeView('view-list');
    const container = document.getElementById('list-container');
    container.innerHTML = allCards.map(c => `
        <div class="list-item">
            <div class="list-q">${c.q}</div>
            <div class="list-a">${c.a}</div>
            <div style="margin-top:10px;">
                <span class="stat-badge badge-bad">✖ ${c.bad}</span>
                <span class="stat-badge badge-good">OK ${c.good}</span>
                <span class="stat-badge badge-perfect">★ ${c.perfect}</span>
            </div>
        </div>
    `).join('');
}

async function resetAllStats() {
    if (prompt("リセットするには「reset」と入力してください") !== "reset") return;
    await fetch(WRITE_URL, { method: "POST", mode: "no-cors", body: JSON.stringify({ action: "reset_all_stats" }) });
    alert("リセット完了しました");
    location.reload();
}


