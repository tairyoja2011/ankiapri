const READ_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQiBU73LGsFHvtGPvST1fPIxvetpofBMFpKeQTLHBZN0wtMPOQKJnTbzjTcCNTew5fiVwXoVL1dlPQB/pub?gid=0&single=true&output=csv";
const WRITE_URL = "https://script.google.com/macros/s/AKfycbzxEnfw0-oIgZ_cPZriklw73B49bhDq8zXXRUT5qEu6mQwHbyeS3Q-EYjmNeULDdYCl/exec";

let allCards = [];
let queue = [];
let currentCard = null;
let isInputMode = false;

// 画面遷移
function changeView(id) {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    document.getElementById(id).style.display = 'block';
    window.scrollTo(0,0);
}

// サブメニュー表示
function showSubMenu(title) {
    isInputMode = false;
    document.getElementById('selected-book-title').textContent = title;
    changeView('view-submenu');
}

// データ読み込み
async function loadData() {
    const res = await fetch(READ_URL);
    const csv = await res.text();
    const rows = csv.split(/\r?\n/).slice(1);
    allCards = rows.filter(r => r.trim()).map(r => {
        const c = r.split(',');
        return { 
            q: c[0]?.trim(), a: c[1]?.trim(), status: c[2]?.trim() || "未着手", 
            bad: Number(c[3])||0, good: Number(c[4])||0, perfect: Number(c[5])||0, total: Number(c[6])||0 
        };
    });
}

// 共通リセット処理（中止時や次へ進む際に編集モードを解除）
function resetDisplayState() {
    document.getElementById("edit-mode-area").style.display = "none";
    document.getElementById("answer-display").style.display = "block";
    document.getElementById("answer-container").style.display = "none";
    document.getElementById("comparison-area").style.display = "none";
    document.getElementById("edit-toggle-btn").style.display = "block";
}

// 各モード開始
async function startStudyMode(type) {
    isInputMode = false;
    resetDisplayState();
    await loadData();
    if (type === 'bad') queue = allCards.filter(c => c.bad > 0 || c.status === "未着手" || c.status === "");
    else if (type === 'good-perfect') queue = allCards.filter(c => c.good > 0 || c.perfect > 0);
    else queue = allCards.filter(c => c.status !== "完璧");
    queue.sort(() => Math.random() - 0.5);
    if (queue.length === 0) return alert("対象がありません");
    changeView('view-study'); showNext();
}

async function startInputMode() {
    isInputMode = true;
    resetDisplayState();
    await loadData();
    queue = [...allCards].sort(() => Math.random() - 0.5);
    if (queue.length === 0) return alert("対象がありません");
    changeView('view-study'); showNext();
}

function showNext() {
    if (queue.length === 0) {
        document.getElementById("question").textContent = "全問終了！";
        document.getElementById("evalContainer").style.display = "none";
        document.getElementById("showAnswerBtn").style.display = "none";
        document.getElementById("answer-container").style.display = "none";
        return;
    }
    resetDisplayState();
    currentCard = queue.shift();
    document.getElementById("question").textContent = currentCard.q;
    document.getElementById("answer-display").innerText = currentCard.a;
    document.getElementById("answer-edit").value = currentCard.a;
    
    document.getElementById("statTotal").textContent = currentCard.total;
    document.getElementById("statBad").textContent = currentCard.bad;
    document.getElementById("statGood").textContent = currentCard.good;
    document.getElementById("statPerfect").textContent = currentCard.perfect;

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
        document.getElementById("last-user-ans").innerText = localStorage.getItem(key) || "(記録なし)";
        if (inputVal !== "") localStorage.setItem(key, inputVal);
        document.getElementById("comparison-area").style.display = "block";
        document.getElementById("edit-toggle-btn").style.display = "none";
    } else {
        document.getElementById("edit-toggle-btn").style.display = "block";
    }
    document.getElementById("answer-container").style.display = "block";
    document.getElementById("showAnswerBtn").style.display = "none";
    document.getElementById("evalContainer").style.display = "flex";
}

function toggleEditMode() {
    document.getElementById("edit-mode-area").style.display = "block";
    document.getElementById("answer-display").style.display = "none";
    document.getElementById("edit-toggle-btn").style.display = "none";
}

async function updateCurrentCardContent() {
    const newA = document.getElementById("answer-edit").value;
    if(!confirm("内容を更新しますか？")) return;
    fetch(WRITE_URL, { method: "POST", mode: "no-cors", body: JSON.stringify({ action: "update_content", word: currentCard.q, new_answer: newA }) });
    currentCard.a = newA;
    document.getElementById("answer-display").innerText = newA;
    document.getElementById("edit-mode-area").style.display = "none";
    document.getElementById("answer-display").style.display = "block";
    document.getElementById("edit-toggle-btn").style.display = "block";
}

async function addNewCard() {
    const q = document.getElementById("new-q").value.trim();
    const a = document.getElementById("new-a").value.trim();
    if(!q || !a) return alert("入力してください");
    await fetch(WRITE_URL, { method: "POST", mode: "no-cors", body: JSON.stringify({ action: "add_new", word: q, answer: a }) });
    alert("追加しました！");
    document.getElementById("new-q").value = "";
    document.getElementById("new-a").value = "";
    changeView('view-submenu');
}

async function handleEval(rating) {
    fetch(WRITE_URL, { method: "POST", mode: "no-cors", body: JSON.stringify({ word: currentCard.q, status: rating }) });
    if (rating === 'ダメ') queue.splice(1, 0, currentCard);
    showNext();
}

async function startListMode() {
    await loadData();
    changeView('view-list');
    const container = document.getElementById('list-container');
    container.innerHTML = allCards.map((c, i) => `
        <div class="list-item">
            <div style="font-size:10px; color:#aaa;">No. ${i+1}</div>
            <div class="list-q">${c.q}</div>
            <div class="list-a">${c.a}</div>
            <div class="list-stats-row">
                <span>✖: ${c.bad}</span> <span>OK: ${c.good}</span> <span>★: ${c.perfect}</span> <span style="margin-left:auto;">計: ${c.total}回</span>
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
