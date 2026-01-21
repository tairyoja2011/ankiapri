// --- 設定エリア ---
//スプレッドシートのWeb公開(CSV)URL
const READ_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQiBU73LGsFHvtGPvST1fPIxvetpofBMFpKeQTLHBZN0wtMPOQKJnTbzjTcCNTew5fiVwXoVL1dlPQB/pub?gid=0&single=true&output=csv";
//"先ほどコピーしたGASのウェブアプリURL";
const WRITE_URL = "https://script.google.com/macros/s/AKfycbzxEnfw0-oIgZ_cPZriklw73B49bhDq8zXXRUT5qEu6mQwHbyeS3Q-EYjmNeULDdYCl/exec";

let queue = [];
let currentCard = null;

const questionEl = document.getElementById("question");
const answerEl = document.getElementById("answer");
const statsArea = document.getElementById("statsArea");
const showAnswerBtn = document.getElementById("showAnswerBtn");
const evalContainer = document.getElementById("evalContainer");
const saveStatusEl = document.getElementById("saveStatus");

async function loadData() {
    try {
        const response = await fetch(READ_URL);
        const csvText = await response.text();
        const rows = csvText.split(/\r?\n/).slice(1); 
        const localPerfectList = JSON.parse(localStorage.getItem('perfectCards') || "[]");

        const flashcards = rows.filter(row => row.trim() !== "").map(row => {
            const cols = row.split(',');
            return { 
                q: cols[0]?.trim() || "", 
                a: cols[1]?.trim() || "", 
                status: cols[2]?.trim() || "未着手",
                // 文字列ではなく数値(Number)として保持する
                bad: Number(cols[3]) || 0,
                good: Number(cols[4]) || 0,
                perfect: Number(cols[5]) || 0,
                total: Number(cols[6]) || 0
            };
        }).filter(card => card.status !== "完璧" && !localPerfectList.includes(card.q));

        queue = [...flashcards];
        shuffleArray(queue);
        showNextCard();
    } catch (error) { questionEl.textContent = "読み込み失敗"; }
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// 画面の統計表示を更新する専用の関数
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
    
    // 現在保持している数値を表示
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

async function saveToSheet(word, rating) {
    saveStatusEl.textContent = "保存中...";
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
        saveStatusEl.textContent = "保存完了";
        setTimeout(() => saveStatusEl.textContent = "", 1500);
    } catch (e) { saveStatusEl.textContent = "保存失敗"; }
}

function handleEval(rating) {
    // --- 画面上の数値を即座にカウントアップする ---
    currentCard.status = rating;
    currentCard.total += 1;
    if (rating === 'ダメ') currentCard.bad += 1;
    if (rating === 'オッケー') currentCard.good += 1;
    if (rating === '完璧') currentCard.perfect += 1;

    // 数値が増えた状態で画面を更新（一瞬見える可能性があるため）
    updateStatsDisplay(currentCard);

    // スプレッドシートへの送信（バックグラウンド）
    saveToSheet(currentCard.q, rating); 

    // 出題順の調整
    if (rating === 'ダメ') {
        queue.splice(1, 0, currentCard); // 次の次の位置へ
    } else if (rating === 'オッケー') {
        queue.push(currentCard); // 最後尾へ
    }
    
    showNextCard();
}

async function resetAllStats() {
    if (!confirm("すべての学習履歴をリセットしますか？")) return;
    saveStatusEl.textContent = "リセット中...";
    localStorage.removeItem('perfectCards');
    try {
        await fetch(WRITE_URL, {
            method: "POST",
            mode: "no-cors",
            body: JSON.stringify({ action: "reset_all" })
        });
        saveStatusEl.textContent = "リセット完了！再起動します...";
        setTimeout(() => location.reload(), 2000);
    } catch (e) { saveStatusEl.textContent = "リセット失敗"; }
}

loadData();
