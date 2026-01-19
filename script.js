// 【重要】スプレッドシートの「Webに公開」で取得したCSVのURLをここに貼り付けてください
const SPREADSHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQiBU73LGsFHvtGPvST1fPIxvetpofBMFpKeQTLHBZN0wtMPOQKJnTbzjTcCNTew5fiVwXoVL1dlPQB/pub?gid=0&single=true&output=csv";

let flashcards = [];
let currentIndex = 0;

const questionEl = document.getElementById("question");
const answerEl = document.getElementById("answer");

// スプレッドシートからデータを取得
async function loadData() {
    try {
        const response = await fetch(SPREADSHEET_CSV_URL);
        const csvText = await response.text();
        
        // CSVを1行ずつ分割
        const rows = csvText.split(/\r?\n/).slice(1); 
        
        flashcards = rows
            .filter(row => row.trim() !== "")
            .map(row => {
                // カンマで分割（簡易版）
                const columns = row.split(',');
                return { q: columns[0], a: columns[1] };
            });

        // 読み込み完了後にシャッフル
        shuffleCards();
        showCard();
    } catch (error) {
        questionEl.textContent = "読み込み失敗";
        console.error("Error:", error);
    }
}

function shuffleCards() {
    for (let i = flashcards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [flashcards[i], flashcards[j]] = [flashcards[j], flashcards[i]];
    }
}

function showCard() {
    if (flashcards.length > 0) {
        questionEl.textContent = flashcards[currentIndex].q;
        answerEl.textContent = flashcards[currentIndex].a;
        answerEl.style.display = "none";
    }
}

function flipCard() {
    if (answerEl.style.display === "none") {
        answerEl.style.display = "block";
    } else {
        answerEl.style.display = "none";
    }
}

function nextCard() {
    if (flashcards.length === 0) return;
    currentIndex = (currentIndex + 1) % flashcards.length;
    showCard();
}

// 起動時にデータを読み込む
loadData();
