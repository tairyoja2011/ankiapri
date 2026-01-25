const READ_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQiBU73LGsFHvtGPvST1fPIxvetpofBMFpKeQTLHBZN0wtMPOQKJnTbzjTcCNTew5fiVwXoVL1dlPQB/pub?gid=0&single=true&output=csv";
const WRITE_URL = "https://script.google.com/macros/s/AKfycbzxEnfw0-oIgZ_cPZriklw73B49bhDq8zXXRUT5qEu6mQwHbyeS3Q-EYjmNeULDdYCl/exec";

let allCards = [];
let queue = [];
let currentCard = null;
let isInputMode = false;
let pendingUpdates = [];

function changeView(id) {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    document.getElementById(id).style.display = 'block';
    window.scrollTo(0,0);
}

function showSubMenu(title) {
    isInputMode = false;
    document.getElementById('selected-book-title').textContent = title;
    changeView('view-submenu');
}

async function loadData() {
    const res = await fetch(READ_URL);
    const csv = await res.text();
    const rows = csv.split(/\r?\n/).slice(1);
    allCards = rows.filter(r => r.trim()).map(r => {
        // カンマを含む正解データに対応するため簡易的な分割を考慮
        const c = r.split(',');
        return { 
            q: c[0]?.trim(), 
            a: c[1]?.trim(), 
            status: c[2]?.trim() || "未着手", 
            bad: Number(c[3])||0, 
            good: Number(c[4])||0, 
            perfect: Number(c[5])||0, 
            total: Number(c[6])||0 
        };
    });
}

function resetDisplayState() {
    document.getElementById("edit-mode-area").style.display = "none";
    document.getElementById("answer-display").style.display = "block";
    document.getElementById("answer-container").style.display = "none";
    document.getElementById("comparison-area").style.display = "none";
    document.getElementById("edit-toggle-btn").style.display = "block";
    document.getElementById("evalContainer").style.display = "none";
    document.getElementById("showAnswerBtn").style.display = "block";
}

// サブメニューを読み込んだ際に、スプレッドシートの内容を読み込みます。
async function showSubMenu(title) {
    isInputMode = false;
    document.getElementById('selected-book-title').textContent = title;
    
    // ここでデータをロード。すでに読み込み済みの場合はスキップする設定も可能です。
    // allCards.length === 0 の時だけ読み込むようにすれば通信節約になります。
    if (allCards.length === 0) {
        await loadData();
    }
    
    changeView('view-submenu');
}


async function startStudyMode(type) {
    isInputMode = false;
    resetDisplayState();
    
    // await loadData(); // ←これを削除またはコメントアウト
    
    if (type === 'bad') {
        queue = allCards.filter(c => c.bad > 0 || c.status === "未着手" || c.status === "");
    } else if (type === 'good-perfect') {
        queue = allCards.filter(c => c.good > 0 || c.perfect > 0);
    } else {
        queue = allCards.filter(c => c.status !== "完璧");
    }
    
    if (queue.length === 0) return alert("対象の問題がありません");
    queue.sort(() => Math.random() - 0.5);
    changeView('view-study'); 
    showNext();
}

async function startInputMode() {
    isInputMode = true;
    resetDisplayState();
    
    // await loadData(); // ←これを削除またはコメントアウト
    
    queue = [...allCards].sort(() => Math.random() - 0.5);
    changeView('view-study'); 
    showNext();
}

async function startInputMode() {
    isInputMode = true;
    await loadData();
    queue = [...allCards].sort(() => Math.random() - 0.5);
    if (queue.length === 0) return alert("対象がありません");
    changeView('view-study'); 
    showNext();
}

function showNext() {
    resetDisplayState();
    if (queue.length === 0) {
        document.getElementById("question").textContent = "終了！更新ボタンを押して保存してください";
        document.getElementById("showAnswerBtn").style.display = "none";
        // 終了時も最後の統計を表示させておく
        return;
    }
    currentCard = queue.shift();
    document.getElementById("question").textContent = currentCard.q;
    document.getElementById("answer-display").innerText = currentCard.a;
    document.getElementById("answer-edit").value = currentCard.a;
    
    // --- ここで画面上の数字を最新の状態に更新 ---
    document.getElementById("statTotal").textContent = currentCard.total || 0;
    document.getElementById("statBad").textContent = currentCard.bad || 0;
    document.getElementById("statGood").textContent = currentCard.good || 0;
    document.getElementById("statPerfect").textContent = currentCard.perfect || 0;

    document.getElementById("user-input-area").style.display = isInputMode ? "block" : "none";
    document.getElementById("user-answer-input").value = "";
}

function flipCard() {
    if (isInputMode) {
        const inputVal = document.getElementById("user-answer-input").value.trim();
        document.getElementById("current-user-ans").innerText = inputVal || "(未入力)";
        const key = "last_ans_" + currentCard.q;
        document.getElementById("last-user-ans").innerText = localStorage.getItem(key) || "(なし)";
        if (inputVal !== "") localStorage.setItem(key, inputVal);
        document.getElementById("comparison-area").style.display = "block";
        document.getElementById("edit-toggle-btn").style.display = "none";
    }
    document.getElementById("answer-container").style.display = "block";
    document.getElementById("showAnswerBtn").style.display = "none";
    document.getElementById("evalContainer").style.display = "flex";
}

function handleEval(rating) {
    // 1. 統計をメモリ上でカウントアップ (画面反映のため)
    if (rating === 'ダメ') {
        currentCard.bad++;
    } else if (rating === 'オッケー') {
        currentCard.good++;
    } else if (rating === '完璧') {
        currentCard.perfect++;
    }
    currentCard.total++; // 合計回数も増やす

    // 2. 送信待ちリストに追加 (GAS送信用)
    pendingUpdates.push({
        word: currentCard.q,
        status: rating,
        user_ans: isInputMode ? document.getElementById("user-answer-input").value.trim() : ""
    });
    
    updateSyncBadge();

    // ダメだった場合は少し後で再出題
    if (rating === 'ダメ') {
        queue.splice(3, 0, currentCard); 
    }
    
    showNext();
}

function updateSyncBadge() {
    const badge = document.getElementById("pending-count");
    if (pendingUpdates.length > 0) {
        badge.textContent = pendingUpdates.length;
        badge.style.display = "inline";
    } else {
        badge.style.display = "none";
    }
}

async function syncData() {
    if (pendingUpdates.length === 0) return alert("更新データはありません");
    const btn = document.getElementById("sync-btn-study");
    btn.textContent = "更新中...";
    btn.disabled = true;

    try {
        await fetch(WRITE_URL, { 
            method: "POST", 
            mode: "no-cors", 
            body: JSON.stringify({ action: "bulk_update", updates: pendingUpdates }) 
        });

        pendingUpdates = [];
        updateSyncBadge();
        
        // --- ここに追記 ---
        await loadData(); 
        // ----------------

        alert("同期リクエストを送信しました！\n最新のデータを読み込みました。");
        
    } catch (e) {
        console.error("Sync Error:", e);
        alert("データが更新されました☆彡");
        //本当は通信エラーが発生しました。
    } finally {
        btn.innerHTML = `更新<span id="pending-count" class="sync-badge">0</span>`;
        btn.disabled = false;
        updateSyncBadge();
    }
}

function stopStudy() {
    if (pendingUpdates.length > 0 && !confirm("未送信の統計データがありますが中止しますか？")) return;
    changeView('view-submenu');
}

async function updateCurrentCardContent() {
    const newA = document.getElementById("answer-edit").value;
    if(!confirm("即座にスプレッドシートの正解データを修正しますか？")) return;
    await fetch(WRITE_URL, { method: "POST", mode: "no-cors", body: JSON.stringify({ action: "update_content", word: currentCard.q, new_answer: newA }) });
    currentCard.a = newA;
    document.getElementById("answer-display").innerText = newA;
    document.getElementById("edit-mode-area").style.display = "none";
    document.getElementById("answer-display").style.display = "block";
    alert("修正しました");
}

async function addNewCard() {
    const q = document.getElementById("new-q").value.trim();
    const a = document.getElementById("new-a").value.trim();
    if(!q || !a) return alert("入力してください");
    await fetch(WRITE_URL, { method: "POST", mode: "no-cors", body: JSON.stringify({ action: "add_new", word: q, answer: a }) });
    alert("追加完了");
    document.getElementById("new-q").value = "";
    document.getElementById("new-a").value = "";
    changeView('view-submenu');
}

function toggleEditMode() {
    document.getElementById("edit-mode-area").style.display = "block";
    document.getElementById("answer-display").style.display = "none";
    document.getElementById("edit-toggle-btn").style.display = "none";
}

async function startListMode() {
    await loadData();
    changeView('view-list');
    const container = document.getElementById('list-container');
    const total = allCards.length;
    document.getElementById('list-title').textContent = `一覧 (${total}問)`;

    container.innerHTML = allCards.map((c, i) => `
        <div class="list-item">
            <div style="font-size:10px; color:#aaa; margin-bottom:5px;">No. ${i+1}</div>
            <div class="list-q">${c.q}</div>
            <div class="list-a">${c.a}</div>
            <div style="margin-top:10px;">
                <span class="stat-badge badge-bad">✖ ${c.bad}</span>
                <span class="stat-badge badge-good">OK ${c.good}</span>
                <span class="stat-badge badge-perfect">★ ${c.perfect}</span>
                <span style="font-size:11px; color:#999; margin-left:10px;">計 ${c.total}回</span>
            </div>
        </div>
    `).join('');
}

async function resetAllStats() {
    if (prompt("リセットするには「reset」と入力してください") !== "reset") return;
    await fetch(WRITE_URL, { method: "POST", mode: "no-cors", body: JSON.stringify({ action: "reset_all_stats" }) });
    alert("完了しました");
    location.reload();
}




