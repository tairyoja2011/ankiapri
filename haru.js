const READ_URL = "新しいスプレッドシートの公開CSVのURL";
const WRITE_URL = "新しいGASのURL";

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
    const chara = document.getElementById('chara-pop');
    const charas = ['🐱', '🐶', '🐰', '🦁', '🐼', '🐨'];
    
    if (inputVal === currentAns) {
        correctCount++;
        chara.textContent = charas[Math.floor(Math.random() * charas.length)];
        chara.style.display = 'block';
        chara.className = 'animate__animated animate__bounceInUp';
        
        // シートに記録送信
        sendToSheet(`${document.getElementById('q-text').textContent}${currentAns}`, "完璧");
        
        setTimeout(() => {
            chara.style.display = 'none';
            nextQuestion();
        }, 1000);
    } else {
        alert("おしい！");
        inputVal = "";
        document.getElementById('math-display').textContent = "";
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
