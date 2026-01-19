// script.js

// 1. スプレッドシートから公開したCSVのURLをここに貼り付ける
const csvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQiBU73LGsFHvtGPvST1fPIxvetpofBMFpKeQTLHBZN0wtMPOQKJnTbzjTcCNTew5fiVwXoVL1dlPQB/pubhtml";

let flashcards = [];
let currentIndex = 0;

async function loadSpreadsheet() {
    try {
        // スプレッドシートのデータを取得
        const response = await fetch(csvUrl);
        const text = await response.text();
        
        // CSV文字列を解析して配列にする
        const rows = text.split('\n').slice(1);
        flashcards = rows
            .filter(row => row.trim() !== "")
            .map(row => {
                const [q, a] = row.split(',');
                return { q: q.trim(), a: a.trim() };
            });

        // 読み込み完了後にシャッフル（おまけ機能）
        shuffleCards();
        showNextCard();
    } catch (error) {
        console.error("データの読み込みに失敗しました:", error);
    }
}

// 配列をバラバラにする（ランダム出題用）
function shuffleCards() {
    flashcards.sort(() => Math.random() - 0.5);
}

// ...あとの showNextCard() や flipCard() は前回と同じでOK
loadSpreadsheet();

