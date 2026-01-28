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
    
    // もし中止後に allCards が空になっていたら再ロードする安全策
    if (allCards.length === 0) {
        await loadData();
    }
    
    if (type === 'bad') {
        queue = allCards.filter(c => c.bad > 0 || c.status === "未着手" || c.status === "");
    } else if (type === 'good-perfect') {
        queue = allCards.filter(c => c.good > 0 || c.perfect > 0);
    } else {
        queue = allCards.filter(c => c.status !== "完璧");
    }
    
    if (queue.length === 0) return alert("対象の問題がありません");
    
    // シャッフルして開始
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
    
    // 問題のキュー（残り）が空の場合
    if (!queue || queue.length === 0) {
        document.getElementById("question").textContent = "終了！更新ボタンを押して保存してください";
        document.getElementById("question").style.display = "block"; // 修正モードで隠れている場合があるため
        document.getElementById("showAnswerBtn").style.display = "none";
        return;
    }
    
    currentCard = queue.shift();
    
    // 修正モードから戻った時のために表示状態を確実に戻す
    document.getElementById("question").style.display = "block";
    document.getElementById("answer-display").style.display = "none"; 
    
    document.getElementById("question").textContent = currentCard.q;
    document.getElementById("answer-display").innerText = currentCard.a;
    
    // 統計の表示更新
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

    // --- ここを確実に修正 ---
    document.getElementById("answer-display").style.display = "block"; // 回答を表示
    document.getElementById("answer-container").style.display = "block"; // コンテナを表示
    document.getElementById("showAnswerBtn").style.display = "none";
    document.getElementById("evalContainer").style.display = "flex";
}


//geminiアプリを開く
function askGemini() {
    if (!currentCard) return;

    // Geminiへの指示文を作成
    const prompt = `
以下の内容について解説してください。
単語帳のデータを修正したいので、以下の2段階で回答してください。

1. 【要約版】（そのまま単語帳の「答え」欄に貼り付けられるような、短く簡潔な説明）
2. 【詳細版】（背景や関連知識を含めた、理解を深めるための詳しい解説）

問題：${currentCard.q}
現在の答え：${currentCard.a}
`.trim();

    const query = encodeURIComponent(prompt);
    // Geminiアプリ/サイトを起動
    const url = `https://gemini.google.com/app?q=${query}`;
    window.open(url, '_blank');
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
    
    // 表示をリセットしてサブメニューへ
    document.getElementById("question").textContent = "読み込み中...";
    changeView('view-submenu');
}

// 保存処理：問題文も送信するように変更
async function updateCurrentCardContent() {
    const newQ = document.getElementById("question-edit").value.trim();
    const newA = document.getElementById("answer-edit").value.trim();
    
    if(!newQ || !newA) return alert("問題と回答を入力してください");
    if(!confirm("スプレッドシートのデータを修正しますか？")) return;

    try {
        await fetch(WRITE_URL, { 
            method: "POST", 
            mode: "no-cors", 
            body: JSON.stringify({ 
                action: "update_content", 
                old_word: currentCard.q, // 検索キー
                new_word: newQ, 
                new_answer: newA 
            }) 
        });

        // メモリ上のデータ(allCards)も同期をとる
        // これをしないと「一覧」や「次の問題」で古いデータが出てしまいます
        allCards = allCards.map(c => {
            if (c.q === currentCard.q) {
                return { ...c, q: newQ, a: newA };
            }
            return c;
        });

        // 現在のカード情報を更新
        currentCard.q = newQ;
        currentCard.a = newA;
        
        // 表示を元に戻す
        document.getElementById("question").textContent = newQ;
        document.getElementById("answer-display").innerText = newA;
        
        // 編集エリアを閉じて元の表示を出す
        document.getElementById("edit-mode-area").style.display = "none";
        document.getElementById("question").style.display = "block";
        document.getElementById("answer-display").style.display = "block";
        document.getElementById("edit-toggle-btn").style.display = "block";
        document.getElementById("delete-btn").style.display = "inline"; // 削除ボタンも再表示
        
        alert("修正しました！数秒後にシートに反映されます。");
    } catch (e) {
        alert("修正の送信に失敗しました");
    }
}

async function deleteCurrentCard() {
    if (!confirm("この問題を完全に削除しますか？\n（スプレッドシートからも削除されます）")) return;

    const btn = document.getElementById("delete-btn");
    const originalText = "問題を削除する"; // 元のテキストを保持
    btn.textContent = "削除中...";
    btn.disabled = true;

    try {
        await fetch(WRITE_URL, { 
            method: "POST", 
            mode: "no-cors", 
            body: JSON.stringify({ action: "delete_card", word: currentCard.q }) 
        });

        alert("削除リクエストを送信しました。");
        
        // メモリ上のデータから削除
        allCards = allCards.filter(c => c.q !== currentCard.q);
        
        // 次の問題へ（showNextの中でボタンの表示状態はリセットされます）
        showNext();
    } catch (e) {
        console.error("Delete Error:", e);
        alert("削除に失敗しました");
    } finally {
        // 万が一 showNext が呼ばれなかった場合やエラー時のために状態を戻す
        btn.textContent = originalText;
        btn.disabled = false;
    }
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

// 修正モードに切り替える際、今の問題文もセットする
function toggleEditMode() {
    document.getElementById("edit-mode-area").style.display = "block";
    document.getElementById("answer-display").style.display = "none";
    document.getElementById("question").style.display = "none"; // 元の問題表示を隠す
    document.getElementById("edit-toggle-btn").style.display = "none";
    document.getElementById("delete-btn").style.display = "none";
    
    // textareaに今の内容をセット
    document.getElementById("question-edit").value = currentCard.q;
    document.getElementById("answer-edit").value = currentCard.a;
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










