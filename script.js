//スプレッドシートのWeb公開(CSV)URL
const READ_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQiBU73LGsFHvtGPvST1fPIxvetpofBMFpKeQTLHBZN0wtMPOQKJnTbzjTcCNTew5fiVwXoVL1dlPQB/pub?gid=0&single=true&output=csv";
//"先ほどコピーしたGASのウェブアプリURL";
const WRITE_URL = "https://script.google.com/macros/s/AKfycbzxEnfw0-oIgZ_cPZriklw73B49bhDq8zXXRUT5qEu6mQwHbyeS3Q-EYjmNeULDdYCl/exec";

let queue = [];
let currentCard = null;

const questionEl = document.getElementById("question");
const answerEl = document.getElementById("answer");
const showAnswerBtn = document.getElementById("showAnswerBtn");
const evalContainer = document.getElementById("evalContainer");
const saveStatusEl = document.getElementById("saveStatus");

// 起動時にデータを読み込む
async function loadData() {
    try {
        const response = await fetch(READ_URL);
        const csvText = await response.text();
        const rows = csvText.split(/\r?\n/).slice(1); 
        
        const flashcards = rows.filter(row => row.trim() !== "").map(row => {
            const columns = row.split(',');
            // 3列目(ステータス)が「完璧」でないものだけを学習リストに入れる
            return { q: columns[0], a: columns[1], status: columns[2] || "" };
        }).filter(card => card.status !== "完璧");

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
        questionEl.textContent = "未完了なし！";
        answerEl.textContent = "全て完璧になりました。";
        answerEl.style.display = "block";
        showAnswerBtn.style.display = "none";
        evalContainer.style.display = "none";
        return;
    }
    currentCard = queue.shift();
    questionEl.textContent = currentCard.q;
    answerEl.textContent = currentCard.a;
    answerEl.style.display = "none";
    showAnswerBtn.style.display = "block";
    evalContainer.style.display = "none";
}

function flipCard() {
    answerEl.style.display = "block";
    showAnswerBtn.style.display = "none";
    evalContainer.style.display = "flex";
}

// スプレッドシートへ書き込み
async function saveToSheet(word, rating) {
    saveStatusEl.textContent = "保存中...";
    try {
        await fetch(WRITE_URL, {
            method: "POST",
            body: JSON.stringify({ word: word, status: rating })
        });
        saveStatusEl.textContent = "保存完了";
        setTimeout(() => saveStatusEl.textContent = "", 2000);
    } catch (e) {
        saveStatusEl.textContent = "保存失敗";
    }
}

function handleEval(rating) {
    saveToSheet(currentCard.q, rating); // 非同期で保存開始

    if (rating === 'ダメ') {
        queue.splice(2, 0, currentCard);
    } else if (rating === 'オッケー') {
        queue.push(currentCard);
    } 
    showNextCard();
}

loadData();

