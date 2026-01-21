const READ_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQiBU73LGsFHvtGPvST1fPIxvetpofBMFpKeQTLHBZN0wtMPOQKJnTbzjTcCNTew5fiVwXoVL1dlPQB/pub?gid=0&single=true&output=csv";
const WRITE_URL = "https://script.google.com/macros/s/AKfycbzxEnfw0-oIgZ_cPZriklw73B49bhDq8zXXRUT5qEu6mQwHbyeS3Q-EYjmNeULDdYCl/exec";

let allCards = [];
let queue = [];
let currentCard = null;
let isInputMode = false;

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
        return {
            q: c[0]?.trim(), a: c[1]?.trim(), status: c[2]?.trim() || "未回答",
            bad: Number(c[3])||0, good: Number(c[4])||0, perfect: Number(c[5])||0, total: Number(c[6])||0
        };
    });
}

function prepareQueue(type) {
    const localPerfect = JSON.parse(localStorage.getItem('perfectCards') || "[]");
    if (type === 'bad') {
        queue = allCards.filter(c => c.bad > 0 || c.status === "未回答" || c.status === "未着手" || c.status === "");
    } else if (type === 'good-perfect') {
        queue = allCards.filter(c => c.good > 0 || c.perfect > 0 || localPerfect.includes(c.q));
    } else {
        queue = allCards.filter(c => c.status !== "完璧" && !localPerfect.includes(c.q));
    }
    queue.sort(() => Math.random() - 0.5);
}

async function startStudyMode(type) {
    isInputMode = false;
    await loadData();
    prepareQueue(type);
    if (queue.length === 0) return alert("対象がありません");
    changeView('view-study');
    showNext();
}

async function startInputMode() {
    isInputMode = true;
    await loadData();
    prepareQueue('all');
    if (queue.length === 0) return alert("対象がありません");
    changeView('view-study');
    showNext();
}

function showNext() {
    if (queue.length === 0) {
        document.getElementById("question").textContent = "全問終了！";
        document.getElementById("evalContainer").style.display = "none";
        document.getElementById("showAnswerBtn").style.display = "none";
        return;
    }
    currentCard = queue.shift();
    document.getElementById("question").textContent = currentCard.q;
    document.getElementById("answer-edit").value = currentCard.a;
    
    // 統計更新
    document.getElementById("statTotal").textContent = currentCard.total;
    document.getElementById("statBad").textContent = currentCard.bad;
    document.getElementById("statGood").textContent = currentCard.good;
    document.getElementById("statPerfect").textContent = currentCard.perfect;

    // 表示リセット
    document.getElementById("user-input-area").style.display = isInputMode ? "block" : "none";
    document.getElementById("user-answer-input").value = "";
    document.getElementById("answer-container").style.display = "none";
    document.getElementById("comparison-area").style.display = "none";
    document.getElementById("showAnswerBtn").style.display = "block";
    document.getElementById("evalContainer").style.display = "none";
}

function flipCard() {
    if (isInputMode) {
        const inputVal = document.getElementById("user-answer-input").value.trim();
        const displayVal = inputVal === "" ? "(未入力)" : inputVal;
        document.getElementById("current-user-ans").textContent = displayVal;
        
        const key = "last_ans_" + currentCard.q;
        const lastVal = localStorage.getItem(key) || "(記録なし)";
        document.getElementById("last-user-ans").textContent = lastVal;
        
        // 空欄でなければ次回の比較用に保存
        if (inputVal !== "") localStorage.setItem(key, inputVal);
        document.getElementById("comparison-area").style.display = "block";
    }
    document.getElementById("answer-container").style.display = "block";
    document.getElementById("showAnswerBtn").style.display = "none";
    document.getElementById("evalContainer").style.display = "flex";
}

async function handleEval(rating) {
    fetch(WRITE_URL, { method: "POST", mode: "no-cors", body: JSON.stringify({ word: currentCard.q, status: rating }) });
    if (rating === 'ダメ') queue.splice(1, 0, currentCard);
    showNext();
}

async function updateCurrentCardContent() {
    const newA = document.getElementById("answer-edit").value;
    if(!confirm("内容を更新しますか？")) return;
    const btn = document.querySelector(".update-btn");
    btn.textContent = "保存中...";
    await fetch(WRITE_URL, { method: "POST", mode: "no-cors", body: JSON.stringify({ action: "update_content", word: currentCard.q, new_answer: newA }) });
    currentCard.a = newA;
    btn.textContent = "保存完了";
    setTimeout(()=> btn.textContent="内容を修正して保存", 2000);
}

async function startListMode() {
    await loadData();
    changeView('view-list');
    const container = document.getElementById('list-container');
    container.innerHTML = allCards.map((c, i) => `
        <div class="list-item">
            <div style="font-size:11px; color:#aaa; margin-bottom:5px;">No. ${i+1}</div>
            <div style="font-weight:bold; font-size:16px;">${c.q}</div>
            <div style="color:#ff4757; font-size:14px; margin-top:4px;">${c.a}</div>
            <div class="list-stats">
                <span>✖: ${c.bad}</span> <span>OK: ${c.good}</span> <span>★: ${c.perfect}</span> <span>計: ${c.total}</span>
            </div>
        </div>
    `).join('');
}
