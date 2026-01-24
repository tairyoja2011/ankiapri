const READ_URL = "あなたのスプレッドシートCSVのURL";
const WRITE_URL = "あなたのGAS公開URL";

let allCards = [];
let currentMode = ""; // "math" or "kanji" or "it"
let mathQ = { q: "", a: "" };

function changeView(id) {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    document.getElementById(id).style.display = 'block';
}

// --- 算数モード (自動生成) ---
function startMathMode() {
    currentMode = "math";
    changeView('view-study');
    document.getElementById('math-input-area').style.display = 'block';
    document.getElementById('study-buttons').style.display = 'none';
    nextMathQuestion();
}

function nextMathQuestion() {
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    mathQ.q = `${a} + ${b} = `;
    mathQ.a = (a + b).toString();
    
    document.getElementById('question').textContent = mathQ.q;
    document.getElementById('math-answer').value = "";
    document.getElementById('math-answer').focus();
}

function checkMathAnswer() {
    const userAns = document.getElementById('math-answer').value;
    if (userAns === mathQ.a) {
        alert("✨ すごい！ せいかい！ ✨");
        nextMathQuestion();
    } else {
        alert("ざんねん！ もういちど！");
    }
}

// --- 漢字・暗記モード (既存の仕組みを継承) ---
async function showSubMenu(type) {
    currentMode = type;
    // ここでスプレッドシートからデータをロード（前回のscript.jsのloadDataを流用）
    // シートを分ける場合はREAD_URLを切り替えるか、GAS側で調整が必要です
    alert(type + "モードを準備します（データロード処理をここに記載）");
    
    // 既存のstartStudyMode(type)と同様の処理を呼び出し
}

// ※ 以前のscript.jsのloadData, handleEvalなどの関数をここにコピーして統合します。
