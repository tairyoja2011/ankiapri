// --- 設定エリア ---
const READ_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQiBU73LGsFHvtGPvST1fPIxvetpofBMFpKeQTLHBZN0wtMPOQKJnTbzjTcCNTew5fiVwXoVL1dlPQB/pub?gid=0&single=true&output=csv";
const WRITE_URL = "https://script.google.com/macros/s/AKfycbzxEnfw0-oIgZ_cPZriklw73B49bhDq8zXXRUT5qEu6mQwHbyeS3Q-EYjmNeULDdYCl/exec";

let allCards = [];
let queue = [];
let currentCard = null;

const questionEl = document.getElementById("question");
const answerContainer = document.getElementById("answer-container");
const answerEdit = document.getElementById("answer-edit");
const statsArea = document.getElementById("statsArea");
const showAnswerBtn = document.getElementById("showAnswerBtn");
const evalContainer = document.getElementById("evalContainer");
const saveStatusEl = document.getElementById("saveStatus");

// --- 画面切り替え ---
function changeView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    const target = document.getElementById(viewId);
    if (target) target.style.display = 'block';
}

function showSubMenu(bookName) {
    document.getElementById('selected-book-title').textContent = bookName;
    changeView('view-submenu');
}

async function startStudyMode(filterType) {
    changeView('view-study');
    if (allCards.length === 0) await loadData();
    prepareQueue(filterType);
    if (queue.length === 0) {
        alert("該当する問題がありません。");
        changeView('view-submenu');
        return;
    }
    showNextCard();
}

async function startListMode() {
    changeView('view-list');
    if (allCards.length === 0) await loadData();
    renderList();
}

// --- データ処理 ---
async function loadData() {
    try {
        saveStatusEl.textContent = "データ同期中...";
        const response = await fetch(READ_URL);
        const csvText = await response.text();
        const rows = csvText.split(/\r?\n/).slice(1); 
        allCards = rows.filter(row => row.trim() !== "").map(row => {
            const cols = row.split(',');
            return { 
                q: cols[0]?.trim() || "", 
                a: cols[1]?.trim() || "", 
                status: cols[2]?.trim() || "未着手",
                bad: Number(cols[3]) || 0,
                good: Number(cols[4]) || 0,
                perfect: Number(cols[5]) || 0,
                total: Number(cols[6]) || 0
            };
        });
        saveStatusEl.textContent = "";
    } catch (error) { saveStatusEl.textContent = "読み込み失敗"; }
}

function prepareQueue(filterType) {
    const localPerfectList = JSON.parse(localStorage.getItem('perfectCards') || "[]");
    if (filterType === 'bad') {
        queue = allCards.filter(card => card.bad > 0);
    } else if (filterType === 'good-perfect') {
        queue = allCards.filter(card => card.good > 0 || card.perfect > 0 || localPerfectList.includes(card.q));
    } else {
        queue = allCards.filter(card => card.status !== "完璧" && !localPerfectList.includes(card.q));
    }
    shuffleArray(queue);
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// --- 回答モード ---
function updateStatsDisplay(card) {
    document.getElementById("statStatus").textContent = card.status;
    document.getElementById("statTotal").textContent = card.total;
    document.getElementById("statBad").textContent = card.bad;
    document.getElementById("statGood").textContent = card.good;
    document.getElementById("statPerfect").textContent = card.perfect;
}

function showNextCard() {
    if (queue.length === 0) {
        questionEl.textContent = "全問完了！ 🎉";
        answerContainer.style.display = "none";
        statsArea.style.display = "none";
        showAnswerBtn.style.display = "none";
        evalContainer.style.display = "none";
        return;
    }
    currentCard = queue.shift();
    questionEl.textContent = currentCard.q;
    answerEdit.value = currentCard.a;
    updateStatsDisplay(currentCard);
    answerContainer.style.display = "none";
    statsArea.style.display = "grid";
    showAnswerBtn.style.display = "block";
    evalContainer.style.display = "none";
}

function flipCard() {
    answerContainer.style.display = "block";
    showAnswerBtn.style.display = "none";
    evalContainer.style.display = "flex";
}

// 回答修正
async function updateCurrentCardContent() {
    const newAnswer = answerEdit.value;
    if (newAnswer === currentCard.a) return;
    if (!confirm("スプレッドシートの答えを更新しますか？")) return;
    saveStatusEl.textContent = "更新中...";
    try {
        await fetch(WRITE_URL, {
            method: "POST", mode: "no-cors",
            body: JSON.stringify({ action: "update_content", word: currentCard.q, new_answer: newAnswer })
        });
        currentCard.a = newAnswer;
        saveStatusEl.textContent = "更新完了";
        setTimeout(() => saveStatusEl.textContent = "", 1500);
    } catch (e) { saveStatusEl.textContent = "更新失敗"; }
}

function handleEval(rating) {
    currentCard.status = rating;
    currentCard.total += 1;
    if (rating === 'ダメ') currentCard.bad += 1;
    if (rating === 'オッケー') currentCard.good += 1;
    if (rating === '完璧') currentCard.perfect += 1;
    updateStatsDisplay(currentCard);
    saveToSheet(currentCard.q, rating); 
    if (rating === 'ダメ') queue.splice(1, 0, currentCard);
    else if (rating === 'オッケー') queue.push(currentCard);
    showNextCard();
}

async function saveToSheet(word, rating) {
    if (rating === '完璧') {
        const list = JSON.parse(localStorage.getItem('perfectCards') || "[]");
        list.push(word);
        localStorage.setItem('perfectCards', JSON.stringify(list));
    }
    try {
        await fetch(WRITE_URL, { method: "POST", mode: "no-cors",
            body: JSON.stringify({ word: word, status: rating })
        });
    } catch (e) { console.error(e); }
}

// --- 一覧表示 (No.付/詳細統計) ---
function renderList() {
    const container = document.getElementById('list-container');
    const total = allCards.length;
    document.getElementById('list-title').textContent = `単語一覧 (${total})`;
    container.innerHTML = allCards.map((card, idx) => `
        <div class="list-item" style="border-left: 5px solid ${card.status==='完璧'?'#2ed573':'#007aff'};">
            <div style="display:flex; justify-content:space-between; font-size:11px; color:#aaa; margin-bottom:5px;">
                <span>No. ${idx + 1} / ${total}</span>
                <span style="background:#eee; padding:2px 6px; border-radius:5px;">${card.status}</span>
            </div>
            <div style="font-weight:bold; color:#333; font-size:17px; margin-bottom:5px;">${card.q}</div>
            <div style="color:#ff4757; font-size:15px; margin-bottom:10px;">${card.a}</div>
            <div style="display:flex; gap:12px; font-size:11px; color:#666; border-top:1px dotted #eee; padding-top:8px;">
                <span style="color:#ff4757;">✖ ${card.bad}</span>
                <span style="color:#ffa502;">OK ${card.good}</span>
                <span style="color:#2ed573;">★ ${card.perfect}</span>
                <span style="margin-left:auto; color:#999;">計 ${card.total}回</span>
            </div>
        </div>
    `).join('');
}

async function resetAllStats() {
    if (!confirm("履歴をすべてリセットしますか？")) return;
    saveStatusEl.textContent = "リセット中...";
    localStorage.removeItem('perfectCards');
    try {
        await fetch(WRITE_URL, { method: "POST", mode: "no-cors",
            body: JSON.stringify({ action: "reset_all" })
        });
        location.reload();
    } catch (e) { alert("失敗"); }
}
