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
                bad: cols[3]?.trim() || "0",
                good: cols[4]?.trim() || "0",
                perfect: cols[5]?.trim() || "0",
                total: cols[6]?.trim() || "0"
            };
        }).filter(card => card.status !== "完璧" && !localPerfectList.includes(card.q));

        queue = [...flashcards];
        shuffleArray(queue);
        showNextCard();
    } catch (error) {
        questionEl.textContent = "読み込み失敗";
    }
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
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
    
    // 画面にテキストと統計をセット
    questionEl.textContent = currentCard.q;
    answerEl.textContent = currentCard.a;
    document.getElementById("statStatus").textContent = currentCard.status;
    document.getElementById("statTotal").textContent = currentCard.total;
    document.getElementById("statBad").textContent = currentCard.bad;
    document.getElementById("statGood").textContent = currentCard.good;
    document.getElementById("statPerfect").textContent = currentCard.perfect;

    answerEl.style.display = "none";
    statsArea.style.display = "none";
    showAnswerBtn.style.display = "block";
    evalContainer.style.display = "none";
}

function flipCard() {
    answerEl.style.display = "block";
    statsArea.style.display = "grid"; // 統計を表示
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
    } catch (e) {
        saveStatusEl.textContent = "保存失敗";
    }
}

function handleEval(rating) {
    saveToSheet(currentCard.q, rating); 
    if (rating === 'ダメ') queue.splice(1, 0, currentCard);
    else if (rating === 'オッケー') queue.push(currentCard);
    showNextCard();
}

loadData();

