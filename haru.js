const READ_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQQ0eL0bQlxdzjjo1ISq6o2fYxr7qzHPtf6LCVCwf9IYCM5n5OK8LvWHISzRUCHomgYp4rNOHHWEskp/pubhtml";
const WRITE_URL = "https://script.google.com/macros/s/AKfycbyXDQFcgBazg4oX5b2h41ZGeYgD3hY7_NJzYjDHyRosUncAVZN9SEP_TUaCl0Aj1Hyf/exec";

let currentUser = "";
let currentSubject = "算数";
let currentType = ""; 
let questionCount = 0;
let correctCount = 0;
let currentAns = "";
let inputVal = "";

function changeView(id) {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    document.getElementById(id).style.display = 'block';
}

function showModes(user) {
    currentUser = user;
    currentSubject = "算数";
    changeView('view-modes');
    document.getElementById('mode-title').textContent = `${user}くん、どのけいさんにする？`;
}

function startMath(type) {
    currentType = type;
    questionCount = 0;
    correctCount = 0;
    changeView('view-study');
    nextQuestion();
}

function nextQuestion() {
    questionCount++;
    if (questionCount > 10) {
        showFinalResult();
        return;
    }
    inputVal = "";
    document.getElementById('math-display').textContent = "";
    document.getElementById('progress').textContent = `だい ${questionCount} / 10 もん`;
    
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
        b = Math.floor(Math.random() * 8) + 2;
        currentAns = (Math.floor(Math.random() * 8) + 1).toString();
        a = parseInt(currentAns) * b;
    }
    document.getElementById('q-text').textContent = `${a} ${op.replace('*','×').replace('/','÷')} ${b} = `;
}

function pressKey(k) {
    if (k === 'C') inputVal = "";
    else if (inputVal.length < 3) inputVal += k;
    document.getElementById('math-display').textContent = inputVal;
}

// --- 正解・不正解のアニメーション演出 ---
function checkAns() {
    const layer = document.getElementById('feedback-layer');
    const msg = document.getElementById('feedback-msg');
    const ansDisp = document.getElementById('feedback-ans');
    
    layer.style.display = "block";

    if (inputVal === currentAns) {
        correctCount++;
        msg.textContent = "せいかい！";
        msg.style.color = "#ff4757";
        msg.className = "animate__animated animate__bounceIn"; // 跳ねるアニメ
        ansDisp.style.display = "none";

        // スプレッドシートへ正解を記録
        sendToSheet(document.getElementById('q-text').textContent + currentAns, "完璧");

        setTimeout(() => {
            layer.style.display = "none";
            nextQuestion();
        }, 1200);
    } else {
        msg.textContent = "ざんねん！";
        msg.style.color = "#54a0ff";
        msg.className = "animate__animated animate__shakeX"; // 震えるアニメ
        ansDisp.textContent = "こたえは " + currentAns;
        ansDisp.style.display = "inline-block";
        
        setTimeout(() => {
            layer.style.display = "none";
            nextQuestion();
        }, 2500);
    }
}

function showFinalResult() {
    document.getElementById('result-screen').style.display = 'flex';
    document.getElementById('score-msg').textContent = `10もん中、 ${correctCount}もん 正解！`;
    
    const msg = document.getElementById('pass-msg');
    if (correctCount >= 8) {
        msg.textContent = "合格！！";
        msg.style.color = "#ff4757";
        msg.className = "pass-text animate__animated animate__jackInTheBox animate__infinite";
    } else {
        msg.textContent = "おしい！";
        msg.style.color = "#54a0ff";
        msg.className = "pass-text animate__animated animate__fadeIn";
    }
    // スプレッドシートに点数を保存
    saveFinalScore(correctCount);
}

function sendToSheet(word, status) {
    fetch(WRITE_URL, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify({
            action: "bulk_update",
            sheetName: currentUser + currentSubject,
            updates: [{ word: word, status: status }]
        })
    });
}

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

async function showHistory(user) {
    currentUser = user;
    currentSubject = "算数";
    changeView('view-history');
    document.getElementById('history-title-ui').textContent = `${user}くんの けっか`;
    
    const res = await fetch(READ_URL);
    const csv = await res.text();
    const rows = csv.split(/\r?\n/);
    const historyRow = rows.find(r => r.startsWith("(結果履歴)"));
    const container = document.getElementById('history-list');
    container.innerHTML = "";

    if (historyRow) {
        const historyData = historyRow.split(',').slice(7);
        historyData.filter(d => d.trim()).reverse().forEach(item => {
            const div = document.createElement('div');
            div.className = "history-item";
            div.textContent = item.replace(/"/g, '');
            container.appendChild(div);
        });
    } else {
        container.textContent = "まだ きろくが ありません。";
    }
}
