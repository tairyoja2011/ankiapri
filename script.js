// --- 設定エリア ---
//スプレッドシートのWeb公開(CSV)URL
const READ_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQiBU73LGsFHvtGPvST1fPIxvetpofBMFpKeQTLHBZN0wtMPOQKJnTbzjTcCNTew5fiVwXoVL1dlPQB/pub?gid=0&single=true&output=csv";
//"先ほどコピーしたGASのウェブアプリURL";
const WRITE_URL = "https://script.google.com/macros/s/AKfycbzxEnfw0-oIgZ_cPZriklw73B49bhDq8zXXRUT5qEu6mQwHbyeS3Q-EYjmNeULDdYCl/exec";

let queue = [];
let currentCard = null;

// HTML要素の取得
const questionEl = document.getElementById("question");
const answerEl = document.getElementById("answer");
const showAnswerBtn = document.getElementById("showAnswerBtn");
const evalContainer = document.getElementById("evalContainer");
const saveStatusEl = document.getElementById("saveStatus");

// 起動時にデータを読み込む
async function loadData() {
    try {
        saveStatusEl.textContent = "データを同期中...";
        const response = await fetch(READ_URL);
        const csvText = await response.text();
        
        // CSVを1行ずつ分割（改行コードのゆらぎに対応）
        const rows = csvText.split(/\r?\n/).slice(1); 
        
        // iPhone内に一時保存されている「完璧リスト」を読み込む（タイムラグ対策）
        const localPerfectList = JSON.parse(localStorage.getItem('perfectCards') || "[]");

        const flashcards = rows.filter(row => row.trim() !== "").map(row => {
            const columns = row.split(',');
            return { 
                q: columns[0] ? columns[0].trim() : "", 
                a: columns[1] ? columns[1].trim() : "", 
                status: columns[2] ? columns[2].trim() : "" 
            };
        }).filter(card => {
            // スプレッドシート上で「完璧」か、iPhone内に「完璧」として保存されているものは除外
            return card.status !== "完璧" && !localPerfectList.includes(card.q);
        });

        queue = [...flashcards];
        shuffleArray(queue);
        showNextCard();
        saveStatusEl.textContent = "";
    } catch (error) {
        questionEl.textContent = "読み込み失敗";
        console.error("Error:", error);
    }
}

// 配列をランダムに入れ替える
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// 次のカードを表示する
function showNextCard() {
    if (queue.length === 0) {
        questionEl.textContent = "未完了なし！ 🎉";
        answerEl.textContent = "すべて完璧になりました。";
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

// 答えを表示する
function flipCard() {
    answerEl.style.display = "block";
    showAnswerBtn.style.display = "none";
    evalContainer.style.display = "flex";
}

// スプレッドシート（GAS）へ評価を送信
async function saveToSheet(word, rating) {
    saveStatusEl.textContent = "保存中...";
    
    // 「完璧」評価ならiPhone内にも即時保存（タイムラグ対策）
    if (rating === '完璧') {
        const localPerfectList = JSON.parse(localStorage.getItem('perfectCards') || "[]");
        localPerfectList.push(word);
        localStorage.setItem('perfectCards', JSON.stringify(localPerfectList));
    }

    try {
        await fetch(WRITE_URL, {
            method: "POST",
            mode: "no-cors", // セキュリティによるエラーを回避
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ word: word, status: rating })
        });
        saveStatusEl.textContent = "保存完了";
        setTimeout(() => saveStatusEl.textContent = "", 1500);
    } catch (e) {
        saveStatusEl.textContent = "保存エラー";
        console.error(e);
    }
}

// 評価ボタンが押された時の処理
function handleEval(rating) {
    saveToSheet(currentCard.q, rating); 

    if (rating === 'ダメ') {
        queue.splice(1, 0, currentCard); // 2枚後に再出題
    } else if (rating === 'オッケー') {
        queue.push(currentCard); // 最後尾に再出題
    } 
    // 「完璧」の場合はqueueに戻さない
    showNextCard();
}

// 起動
loadData();
