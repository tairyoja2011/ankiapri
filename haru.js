const READ_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQQ0eL0bQlxdzjjo1ISq6o2fYxr7qzHPtf6LCVCwf9IYCM5n5OK8LvWHISzRUCHomgYp4rNOHHWEskp/pubhtml";
const WRITE_URL = "https://script.google.com/macros/s/AKfycbyXDQFcgBazg4oX5b2h41ZGeYgD3hY7_NJzYjDHyRosUncAVZN9SEP_TUaCl0Aj1Hyf/exec";

let currentUser = "";
let currentType = ""; // "+" "-" "*" "/" "mix"
let questionCount = 0;
let correctCount = 0;
let currentAns = "";
let inputVal = "";

// 1. モード選択へ
function showModes(user) {
    currentUser = user;
    document.getElementById('view-top').style.display = 'none';
    document.getElementById('view-modes').style.display = 'block';
    document.getElementById('mode-title').textContent = `${user}くん、どのけいさんにする？`;
}

// 2. 算数スタート
function startMath(type) {
    currentType = type;
    questionCount = 0;
    correctCount = 0;
    document.getElementById('view-modes').style.display = 'none';
    document.getElementById('view-study').style.display = 'block';
    nextQuestion();
}

// 3. 問題作成
function nextQuestion() {
    questionCount++;
    if (questionCount > 10) {
        showFinalResult();
        return;
    }
    inputVal = "";
    document.getElementById('math-display').textContent = "";
    document.getElementById('progress').textContent = `だい ${questionCount} / 10 もん`;
    
    // 演算子の決定
    let op = currentType;
    if (op === 'mix') {
        const ops = ['+', '-', '*', '/'];
        op = ops[Math.floor(Math.random() * ops.length)];
    }

    let a, b;
    if (op === '+') {
        a = Math.floor(Math.random() * 9) + 1;
        b = Math.floor(Math.random() * 9) + 1;
        currentAns = (a + b).toString();
    } else if (op === '-') {
        a = Math.floor(Math.random() * 9) + 10;
        b = Math.floor(Math.random() * 9) + 1;
        currentAns = (a - b).toString();
    } else if (op === '*') {
        a = Math.floor(Math.random() * 9) + 1;
        b = Math.floor(Math.random() * 9) + 1;
        currentAns = (a * b).toString();
    } else if (op === '/') {
        b = Math.floor(Math.random() * 8) + 2; // 2~9
        currentAns = (Math.floor(Math.random() * 8) + 1).toString(); // 1~9
        a = parseInt(currentAns) * b;
    }

    document.getElementById('q-text').textContent = `${a} ${op.replace('*','×').replace('/','÷')} ${b} = `;
}

// 4. テンキー入力
function pressKey(k) {
    if (k === 'C') inputVal = "";
    else if (inputVal.length < 3) inputVal += k;
    document.getElementById('math-display').textContent = inputVal;
}

// 5. 答え合わせ & キャラクター
function checkAns() {
    const layer = document.getElementById('feedback-layer');
    const msg = document.getElementById('feedback-msg');
    const ansDisp = document.getElementById('feedback-ans');
    
    if (inputVal === currentAns) {
        // 正解のとき
        correctCount++;
        msg.textContent = "せいかい！";
        msg.className = "animate__animated animate__zoomIn";
        ansDisp.textContent = "";
        layer.style.display = "block";
        
        setTimeout(() => {
            layer.style.display = "none";
            nextQuestion();
        }, 1200);
    } else {
        // 間違えたとき
        msg.textContent = "ざんねん！";
        msg.className = "animate__animated animate__headShake";
        ansDisp.textContent = "こたえは " + currentAns;
        layer.style.display = "block";
        
        // 不正解の場合は「次へ」ボタンを出すか、3秒待ってから次へ
        setTimeout(() => {
            layer.style.display = "none";
            nextQuestion();
        }, 3000);
    }
}

// 6. 最終結果（ド派手演出）
function showFinalResult() {
    const screen = document.getElementById('result-screen');
    const msg = document.getElementById('pass-msg');
    const score = document.getElementById('score-msg');
    const charaL = document.getElementById('chara-large');
    
    screen.style.display = 'flex';
    score.textContent = `10もん中、 ${correctCount}もん 正解！`;
    
    if (correctCount >= 8) {
        msg.textContent = "合格！！";
        msg.style.color = "#ff4757";
        msg.className = "pass-text animate__animated animate__jackInTheBox animate__infinite";
        charaL.textContent = "🎊🥇🎉";
    } else {
        msg.textContent = "おしい！";
        msg.style.color = "#54a0ff";
        msg.className = "pass-text animate__animated animate__fadeIn";
        charaL.textContent = "🐥";
    }
}

function sendToSheet(word, status) {
    const sheetName = currentUser + "算数";
    fetch(WRITE_URL, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify({
            action: "bulk_update",
            sheetName: sheetName,
            updates: [{ word: word, status: status }]
        })
    });
}
// 結果を保存する関数
function saveFinalScore(score) {
    fetch(WRITE_URL, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify({
            action: "record_result",
            sheetName: currentUser + currentSubject,
            score: score
        })
    });
}

// 履歴を表示する関数
async function showHistory() {
    const res = await fetch(READ_URL); // 各シートのCSV
    const csv = await res.text();
    const rows = csv.split(/\r?\n/);
    
    // "(結果履歴)" の行を探す
    const historyRow = rows.find(r => r.startsWith("(結果履歴)"));
    const container = document.getElementById('history-list');
    container.innerHTML = "";

    if (historyRow) {
        const historyData = historyRow.split(',').slice(7); // H列以降を取得
        historyData.filter(d => d.trim()).reverse().forEach(item => {
            const div = document.createElement('div');
            div.className = "history-item";
            div.textContent = item;
            container.appendChild(div);
        });
    } else {
        container.textContent = "まだ きろくが ありません。";
    }
    changeView('view-history');
}
