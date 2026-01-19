const flashcards = [
    { q: "Apple", a: "りんご" },
    { q: "Library", a: "図書館" },
    { q: "Success", a: "成功" }
];

let currentIndex = 0;

const questionEl = document.getElementById("question");
const answerEl = document.getElementById("answer");

function flipCard() {
    // 答えの表示・非表示を切り替える
    if (answerEl.style.display === "none") {
        answerEl.style.display = "block";
    } else {
        answerEl.style.display = "none";
    }
}

function nextCard() {
    // 次の問題へ（最後の次は最初に戻る）
    currentIndex = (currentIndex + 1) % flashcards.length;
    questionEl.textContent = flashcards[currentIndex].q;
    answerEl.textContent = flashcards[currentIndex].a;
    answerEl.style.display = "none"; // 答えは隠しておく
}

// 最初の問題を表示
nextCard();