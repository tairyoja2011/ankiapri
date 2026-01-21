// --- 設定エリア ---
const READ_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQiBU73LGsFHvtGPvST1fPIxvetpofBMFpKeQTLHBZN0wtMPOQKJnTbzjTcCNTew5fiVwXoVL1dlPQB/pub?gid=0&single=true&output=csv";
const WRITE_URL = "https://script.google.com/macros/s/AKfycbzxEnfw0-oIgZ_cPZriklw73B49bhDq8zXXRUT5qEu6mQwHbyeS3Q-EYjmNeULDdYCl/exec";

let allCards = []; // 全単語データ保持用
let queue = [];
let currentCard = null;

// HTML要素
const questionEl = document.getElementById("question");
const answerEl = document.getElementById("answer");
const statsArea = document.getElementById("statsArea");
const showAnswerBtn = document.getElementById("showAnswerBtn");
const evalContainer = document.getElementById("evalContainer");
const saveStatusEl = document.getElementById("saveStatus");

// --- 1. 画面切り替え管理 ---
function changeView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    document.getElementById(viewId).style.display = 'block';
}

function showSubMenu(bookName) {
    document.getElementById('selected-book-title').textContent = bookName;
    changeView('view-submenu');
}

// 回答モード開始ボタン
async function startStudyMode() {
    changeView('view-study');
    if (allCards.length === 0) await loadData(); // データがなければ読み込む
    prepareQueue(); // 出題用リスト作成
    showNextCard();
}

// 一覧モード開始ボタン
async function startListMode() {
    changeView('view-list');
    if (allCards.length === 0) await loadData();
    renderList();
}

// --- 2. データ読み込み（共通） ---
async function loadData() {
    try {
        saveStatusEl.textContent = "データ取得中...";
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
    } catch (error) {
        saveStatusEl.textContent = "読み込み失敗";
    }
}

// 出題用キューの準備（完璧除外）
function prepareQueue() {
    const localPerfectList = JSON.parse(localStorage.getItem('perfectCards') || "[]");
    queue = allCards.filter(card => 
        card.status !== "完璧" && !localPerfectList.includes(card.q)
    );
    shuffleArray(queue);
}

// --- 3. 回答モードのロジック（今まで通り） ---
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

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
        answerEl.textContent = "";
        statsArea.style.display = "none";
        showAnswerBtn.style.display = "none";
        evalContainer.style.display = "none";
        return;
    }
    currentCard = queue.shift();
    questionEl.textContent = currentCard.q;
    answerEl.textContent = currentCard.a;
    updateStatsDisplay(currentCard);
    answerEl.style.display = "none";
    statsArea.style.display = "grid";
    showAnswerBtn.style.display = "block";
    evalContainer.style.display = "none";
}

function flipCard() {
    answerEl.style.display = "block";
    showAnswerBtn.style.display = "none";
    evalContainer.style.display = "flex";
}

function handleEval(rating) {
    currentCard.status = rating;
    currentCard.total += 1;
    if (rating === 'ダメ') currentCard.bad += 1;
    if (rating === 'オッケー') currentCard.good += 1;
    if (rating === '完璧') currentCard.perfect += 1;

    updateStatsDisplay(currentCard);
    saveToSheet(currentCard.q, rating); 

    if (rating === 'ダメ') {
        queue.splice(1, 0, currentCard);
    } else if (rating === 'オッケー') {
        queue.push(currentCard);
    }
    showNextCard();
}

async function saveToSheet(word, rating) {
    if (rating === '完璧') {
        const list = JSON.parse(localStorage.getItem('perfectCards') || "[]");
        list.push(word);
        localStorage.setItem('perfectCards', JSON.stringify(list));
    }
    try {
        await fetch(WRITE_URL, {
            method: "POST",
            mode: "no-cors",
            body: JSON.stringify({ word: word, status: rating })
        });
    } catch (e) { console.error(e); }
}

// --- 4. 一覧モードのロジック（新規作成） ---
function renderList() {
    const container = document.getElementById('list-container');
    container.innerHTML = allCards.map(card => `
        <div style="background:white; margin:10px 0; padding:15px; border-radius:15px; text-align:left; box-shadow:0 4px 12px rgba(0,0,0,0.05);">
            <div style="font-weight:bold; color:#333; font-size:16px;">${card.q}</div>
            <div style="color:#ff4757; font-size:15px; margin-top:5px;">${card.a}</div>
            <div style="display:flex; justify-content:space-between; margin-top:10px; font-size:11px; color:#888; border-top:1px solid #eee; padding-top:5px;">
                <span>状態: ${card.status}</span>
                <span>計: ${card.total}回 (ダメ:${card.bad})</span>
            </div>
        </div>
    `).join('');
}

// 起動時はトップを表示（読み込みは各モード開始時まで待機）
changeView('view-top');
