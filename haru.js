function generateMathQuestion(type, level) {
    let a, b, op, ans;
    if (type === 'plus') {
        a = Math.floor(Math.random() * 10) + 1;
        b = Math.floor(Math.random() * 10) + 1;
        op = "+";
        ans = a + b;
    }
    // ...引き算、掛け算も同様に生成
    return { q: `${a} ${op} ${b} = ?`, a: ans.toString() };
}
