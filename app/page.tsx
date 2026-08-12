"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Product = { name: string; emoji: string; price: number; color: string };
type Customer = { name: string; emoji: string; message: string };
type Round = { customer: Customer; products: Product[]; payment: number; paymentPieces: number[] };
type Phase = "total" | "change";

const PRODUCTS: Product[] = [
  { name: "いちごミルク", emoji: "🥛", price: 120, color: "pink" },
  { name: "カップケーキ", emoji: "🧁", price: 180, color: "purple" },
  { name: "りんご", emoji: "🍎", price: 80, color: "red" },
  { name: "えんぴつ", emoji: "✏️", price: 60, color: "yellow" },
  { name: "ノート", emoji: "📒", price: 140, color: "blue" },
  { name: "リボン", emoji: "🎀", price: 90, color: "pink" },
  { name: "クッキー", emoji: "🍪", price: 110, color: "orange" },
  { name: "ジュース", emoji: "🧃", price: 130, color: "green" },
  { name: "シール", emoji: "🌟", price: 70, color: "yellow" },
  { name: "ハンカチ", emoji: "🌼", price: 160, color: "green" },
  { name: "キャンディ", emoji: "🍬", price: 50, color: "purple" },
  { name: "パン", emoji: "🥐", price: 100, color: "orange" },
];

const CUSTOMERS: Customer[] = [
  { name: "うさぎさん", emoji: "🐰", message: "これ、くださいな♪" },
  { name: "ねこさん", emoji: "🐱", message: "おかいものって たのしいね！" },
  { name: "くまさん", emoji: "🐻", message: "おつりも おねがいします" },
  { name: "きつねさん", emoji: "🦊", message: "じょうずな店員さんだね！" },
  { name: "パンダさん", emoji: "🐼", message: "さいごのおきゃくさまだよ" },
];

const DENOMS = [1000, 500, 100, 50, 10];

function makeRounds(): Round[] {
  const shuffled = [...PRODUCTS].sort(() => Math.random() - 0.5);
  return CUSTOMERS.map((customer, index) => {
    const count = index < 2 ? 2 : 3;
    const products = Array.from({ length: count }, (_, itemIndex) =>
      shuffled[(index * 2 + itemIndex) % shuffled.length],
    );
    const total = products.reduce((sum, item) => sum + item.price, 0);
    const paymentPieces = makePayment(total, index);
    const payment = paymentPieces.reduce((sum, piece) => sum + piece, 0);
    return { customer, products, payment, paymentPieces };
  });
}

function makePayment(total: number, customerIndex: number) {
  if (customerIndex === 0) {
    const nextHundred = Math.ceil((total + 10) / 100) * 100;
    return Array.from({ length: nextHundred / 100 }, () => 100);
  }

  const paymentStyles = [
    [500],
    [500, 100],
    [500, 100, 100],
    [1000],
  ];
  const selected = paymentStyles[customerIndex - 1] ?? [1000];
  return selected.reduce((sum, piece) => sum + piece, 0) > total ? selected : [1000];
}

function moneyPieces(amount: number) {
  let rest = amount;
  const pieces: number[] = [];
  for (const denomination of DENOMS) {
    while (rest >= denomination) {
      pieces.push(denomination);
      rest -= denomination;
    }
  }
  return pieces;
}

function playTone(kind: "good" | "next") {
  if (typeof window === "undefined") return;
  const AudioContextClass = window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const notes = kind === "good" ? [523, 659, 784] : [440, 554];
  notes.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = frequency;
    oscillator.type = "sine";
    gain.gain.setValueAtTime(0.001, context.currentTime + index * 0.09);
    gain.gain.exponentialRampToValueAtTime(0.13, context.currentTime + index * 0.09 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + index * 0.09 + 0.2);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(context.currentTime + index * 0.09);
    oscillator.stop(context.currentTime + index * 0.09 + 0.22);
  });
}

function PriceCoins({ amount }: { amount: number }) {
  return (
    <div className="price-coins" aria-label={`${amount}円ぶんの硬貨`}>
      {moneyPieces(amount).map((piece, index) => (
        <span className={`price-coin price-coin-${piece}`} key={`${piece}-${index}`}>
          <b>{piece}</b><small>円</small>
        </span>
      ))}
    </div>
  );
}

function MoneyPicture({ amount, label, pieces = moneyPieces(amount) }: { amount: number; label: string; pieces?: number[] }) {
  return (
    <div className="money-help" aria-label={`${label} ${amount}円`}>
      <div className="money-label"><span>👛</span>{label}<b>ぜんぶで {amount}円</b></div>
      <div className="money-pieces">
        {pieces.map((piece, index) =>
          piece === 1000 ? (
            <div className="bill" key={`${piece}-${index}`}><span>1000</span><small>円</small></div>
          ) : (
            <div className={`coin coin-${piece}`} key={`${piece}-${index}`}><span>{piece}</span><small>円</small></div>
          ),
        )}
      </div>
    </div>
  );
}

function ColumnHelper({ phase, round, onAnswer }: { phase: Phase; round: Round; onAnswer: (value: string) => void }) {
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [notes, setNotes] = useState(["", "", "", ""]);
  const total = round.products.reduce((sum, item) => sum + item.price, 0);
  const numbers = phase === "total" ? round.products.map((item) => item.price) : [round.payment, total];

  useEffect(() => {
    setDigits(["", "", "", ""]);
    setNotes(["", "", "", ""]);
  }, [phase, round]);

  function setDigit(index: number, value: string) {
    const next = [...digits];
    next[index] = value.replace(/\D/g, "").slice(-1);
    setDigits(next);
    const joined = next.join("").replace(/^0+/, "") || (next.some(Boolean) ? "0" : "");
    onAnswer(joined);
  }

  return (
    <div className="column-helper">
      <div className="column-title"><span>✍️</span> ひっさんメモ <small>（つかわなくてもOK）</small></div>
      <div className="place-labels"><span>千</span><span>百</span><span>十</span><span>一</span></div>
      <div className="math-grid">
        <div className="math-row note-row">
          <b>{phase === "total" ? "くり" : "かり"}</b>
          {notes.map((note, index) => (
            <input
              key={index}
              value={note}
              onChange={(event) => {
                const next = [...notes];
                next[index] = event.target.value.replace(/\D/g, "").slice(-1);
                setNotes(next);
              }}
              inputMode="numeric"
              aria-label={`${["千", "百", "十", "一"][index]}のくらいのメモ`}
              maxLength={1}
            />
          ))}
        </div>
        {numbers.map((number, rowIndex) => {
          const padded = String(number).padStart(4, " ").split("");
          return (
            <div className="math-row" key={`${number}-${rowIndex}`}>
              <b>{rowIndex === numbers.length - 1 ? (phase === "total" ? "+" : "−") : ""}</b>
              {padded.map((digit, index) => <span key={index}>{digit}</span>)}
            </div>
          );
        })}
        <div className="math-line" />
        <div className="math-row result-row">
          <b>=</b>
          {digits.map((digit, index) => (
            <input
              key={index}
              value={digit}
              onChange={(event) => setDigit(index, event.target.value)}
              inputMode="numeric"
              aria-label={`${["千", "百", "十", "一"][index]}のくらい`}
              maxLength={1}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("total");
  const [answer, setAnswer] = useState("");
  const [message, setMessage] = useState("ねだんを たしてみよう！");
  const [status, setStatus] = useState<"idle" | "good" | "try">("idle");
  const [showHelper, setShowHelper] = useState(false);
  const [score, setScore] = useState(0);
  const [muted, setMuted] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => setRounds(makeRounds()), []);

  const round = rounds[roundIndex];
  const total = useMemo(
    () => round?.products.reduce((sum, item) => sum + item.price, 0) ?? 0,
    [round],
  );
  const correctAnswer = phase === "total" ? total : (round?.payment ?? 0) - total;

  const enterDigit = useCallback((digit: string) => {
    setStatus("idle");
    setMessage(phase === "total" ? "ねだんを たしてみよう！" : "おつりは いくらかな？");
    setAnswer((current) => current.length >= 4 || (current === "0" && digit === "0") ? current : `${current}${digit}`.replace(/^0+(?=\d)/, ""));
  }, [phase]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (/^\d$/.test(event.key)) enterDigit(event.key);
      if (event.key === "Backspace") setAnswer((current) => current.slice(0, -1));
      if (event.key === "Enter") document.getElementById("check-answer")?.click();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enterDigit]);

  if (!round) return <main className="loading">おみせを じゅんびしているよ… 🌷</main>;

  function checkAnswer() {
    if (!answer) {
      setStatus("try");
      setMessage("こたえを いれてね 👆");
      return;
    }
    if (Number(answer) === correctAnswer) {
      setStatus("good");
      setScore((value) => value + 1);
      setMessage(phase === "total" ? `せいかい！ 合計は ${total}円 🌟` : `ぴったり！ おつりは ${correctAnswer}円 🎉`);
      if (!muted) playTone("good");
    } else {
      setStatus("try");
      setMessage(Number(answer) < correctAnswer ? "もうすこし 大きいよ。ゆっくり かぞえよう！" : "すこし 大きいみたい。もういちど！");
    }
  }

  function goNext() {
    if (phase === "total") {
      setPhase("change");
      setAnswer("");
      setStatus("idle");
      setMessage("おきゃくさまが お金を だしたよ。おつりは？");
      setShowHelper(false);
      if (!muted) playTone("next");
      return;
    }
    if (roundIndex === rounds.length - 1) {
      setFinished(true);
      return;
    }
    setRoundIndex((value) => value + 1);
    setPhase("total");
    setAnswer("");
    setStatus("idle");
    setMessage("つぎの おきゃくさまだよ！ ねだんを たそう");
    setShowHelper(false);
  }

  function restart() {
    setRounds(makeRounds());
    setRoundIndex(0);
    setPhase("total");
    setAnswer("");
    setMessage("ねだんを たしてみよう！");
    setStatus("idle");
    setScore(0);
    setFinished(false);
    setShowHelper(false);
  }

  if (finished) {
    return (
      <main className="finish-screen">
        <div className="finish-card">
          <div className="finish-stars">⭐ 🌟 ⭐</div>
          <div className="big-mascot">🐰</div>
          <p className="eyebrow">きょうのおみせは おしまい</p>
          <h1>スーパー店員さん！</h1>
          <p className="finish-copy">5人のおきゃくさまを<br />じょうずに おてつだいできたね</p>
          <div className="score-medal"><span>🏅</span><b>{score}</b><small> / 10 せいかい</small></div>
          <button className="primary-button" onClick={restart}>もういちど あそぶ</button>
        </div>
      </main>
    );
  }

  return (
    <main className="game-shell">
      {status === "good" && <div className="confetti" aria-hidden="true">✦　●　★　●　✦　★　●</div>}
      <header className="topbar">
        <div className="brand"><span className="brand-mark">🌷</span><div><small>たしざん・ひきざん</small><h1>おはなマート</h1></div></div>
        <div className="top-actions">
          <div className="score-chip"><span>⭐</span><b>{score}</b><small>/ 10</small></div>
          <button className="icon-button" onClick={() => setMuted((value) => !value)} aria-label={muted ? "音を出す" : "音を消す"}>{muted ? "🔇" : "🔊"}</button>
        </div>
      </header>

      <section className="progress-wrap" aria-label={`5人中${roundIndex + 1}人目`}>
        <div className="progress-label"><b>きょうのおきゃくさま</b><span>{roundIndex + 1} / 5</span></div>
        <div className="progress-track"><div style={{ width: `${((roundIndex * 2 + (phase === "change" ? 1 : 0)) / 10) * 100}%` }} /></div>
        <div className="customer-dots">
          {CUSTOMERS.map((customer, index) => <span key={customer.name} className={index < roundIndex ? "done" : index === roundIndex ? "active" : ""}>{index < roundIndex ? "✓" : customer.emoji}</span>)}
        </div>
      </section>

      <div className="game-grid">
        <section className="shop-panel">
          <div className="awning" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></div>
          <div className="customer-scene">
            <div className="customer"><span>{round.customer.emoji}</span><small>{round.customer.name}</small></div>
            <div className="speech-bubble">{phase === "total" ? round.customer.message : `${round.payment}円で おねがいします！`}</div>
          </div>

          <div className="basket-title"><span>🧺</span> かごの なか <small>こうかも かぞえてみよう！</small></div>
          <div className="product-list">
            {round.products.map((product, index) => (
              <article className={`product-card ${product.color}`} key={`${product.name}-${index}`}>
                <div className="product-emoji">{product.emoji}</div>
                <div><h2>{product.name}</h2><p><b>{product.price}</b> 円</p></div>
                <PriceCoins amount={product.price} />
              </article>
            ))}
          </div>

          {phase === "change" && <MoneyPicture amount={round.payment} pieces={round.paymentPieces} label="おきゃくさまが だしたお金" />}
          {phase === "change" && status === "good" && <MoneyPicture amount={correctAnswer} label="わたす おつり" />}
        </section>

        <section className="register-panel">
          <div className="phase-tabs" aria-label="もんだいのステップ">
            <div className={phase === "total" ? "current" : "complete"}><span>{phase === "change" ? "✓" : "1"}</span> 合計</div>
            <i />
            <div className={phase === "change" ? "current" : ""}><span>2</span> おつり</div>
          </div>

          <div className="question-block">
            <p className="eyebrow">{phase === "total" ? "レジで けいさん" : "おつりを けいさん"}</p>
            <h2>{phase === "total" ? "ぜんぶで いくら？" : "おつりは いくら？"}</h2>
            {phase === "change" && <div className="formula"><span>{round.payment}円</span><b>−</b><span>{total}円</span><b>＝</b><em>?</em></div>}
          </div>

          <div className={`answer-display ${status}`} aria-live="polite">
            <span>{answer || "?"}</span><b>円</b>
          </div>
          <div className={`message ${status}`} aria-live="polite">{status === "good" ? "◎" : status === "try" ? "△" : "💡"} {message}</div>

          {status !== "good" ? (
            <>
              <div className="keypad" aria-label="すうじキー">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => <button key={digit} onClick={() => enterDigit(String(digit))}>{digit}</button>)}
                <button className="clear-key" onClick={() => setAnswer("")}>C</button>
                <button onClick={() => enterDigit("0")}>0</button>
                <button className="delete-key" onClick={() => setAnswer((current) => current.slice(0, -1))} aria-label="1もじけす">⌫</button>
              </div>
              <button id="check-answer" className="primary-button" onClick={checkAnswer}>こたえあわせ <span>→</span></button>
            </>
          ) : (
            <button className="primary-button next-button" onClick={goNext}>{phase === "total" ? "お金を もらう" : roundIndex === rounds.length - 1 ? "けっかを みる" : "つぎの おきゃくさま"} <span>→</span></button>
          )}

          <button className="helper-toggle" onClick={() => setShowHelper((value) => !value)} aria-expanded={showHelper}><span>📝</span>{showHelper ? "ひっさんメモを とじる" : "ひっさんメモを つかう"}<b>{showHelper ? "−" : "+"}</b></button>
          {showHelper && <ColumnHelper phase={phase} round={round} onAnswer={setAnswer} />}
        </section>
      </div>
      <footer>おうちの人へ：答えを急がず、お金を指で数える時間を大切にしてください 🌱</footer>
    </main>
  );
}
