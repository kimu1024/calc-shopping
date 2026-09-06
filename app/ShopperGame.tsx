"use client";

import { useEffect, useReducer, useRef, useState } from 'react';
import Handwriting from './Handwriting';
import { COINS, MAX_ITEMS, cartTotal, coinChange, createShopping, shopReducer, valueOf } from './shopper-model';
import type { ShopState } from './shopper-model';

function CoinStack({ value, count }: { value: number; count: number }) {
  return <span className="shop-coin-stack" aria-label={`${value}円が${count}枚`}>
    {Array.from({ length: count }, (_, i) => <span key={i} className={`coin coin-${value}`} aria-hidden="true"><span>{value}</span></span>)}
    {!count && <span className="empty-coin">—</span>}
  </span>;
}

export default function ShopperGame() {
  const [initial, setInitial] = useState<ShopState | null>(null);
  const [session, setSession] = useState(0);
  useEffect(() => setInitial(createShopping()), []);
  if (!initial) return <main className="loading">おさいふを じゅんびしているよ… 👛</main>;
  return <ShoppingSession key={session} initial={initial} onRestart={() => { setInitial(createShopping()); setSession(n => n + 1); }} />;
}

export function ShoppingSession({ initial, onRestart }: { initial: ShopState; onRestart: () => void }) {
  const [state, dispatch] = useReducer(shopReducer, initial);
  const heading = useRef<HTMLHeadingElement>(null);
  const total = cartTotal(state);
  const budget = valueOf(state.wallet);
  const paid = valueOf(state.tender);
  const change = paid - total;
  const count = state.cart.reduce((a, b) => a + b, 0);
  const steps = ['wallet', 'shelf', 'total', 'pay', 'change', 'success'];
  const stageIndex = steps.indexOf(state.stage === 'failed' ? 'total' : state.stage);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); heading.current?.scrollIntoView({ block: 'start' }); }, [state.stage]);
  const title = state.stage === 'wallet' ? 'おさいふに 何円あるかな？' : state.stage === 'total' ? 'かごの中は ぜんぶで 何円？' : state.stage === 'shelf' ? 'なにを 買おうかな？' : state.stage === 'failed' ? 'あれれ、お金が たりないよ！' : state.stage === 'pay' ? '何円 出す？' : state.stage === 'change' ? 'おつりは いくら？' : 'おかいもの 大せいこう！';
  const answerBox = (label: string, submit: 'checkWallet' | 'checkTotal' | 'pay' | 'check', button: string) => <AmountAnswer label={label} answer={state.answer} onChange={value => dispatch({ type: 'answer', value })} onSubmit={() => dispatch({ type: submit })} button={button} />;
  const walletPicture = <div className="wallet-coins">{COINS.map((coin, i) => <div key={coin}><CoinStack value={coin} count={state.wallet[i]} /><small>{coin}円</small></div>)}</div>;
  const receipt = <div className="shop-receipt"><h3>🧾 おかいもの レシート</h3>{state.products.map((p, i) => state.cart[i] > 0 && <div key={p.name}><span>{p.emoji} {p.name} {state.cart[i]}こ</span><b>{p.price * state.cart[i]}円</b></div>)}<div className="receipt-total"><span>ぜんぶで</span><b>{total}円</b></div></div>;
  return <main className="shopper-game">
    <nav className="shopping-steps" aria-label="おかいものの進みぐあい">{['おさいふ', 'えらぶ', '合計', 'はらう', 'おつり', 'できた！'].map((label, i) => <span key={label} aria-current={(i === stageIndex) ? 'step' : undefined}>{i + 1} {label}</span>)}</nav>
    <h1 ref={heading} tabIndex={-1}>{title}</h1>
    {state.stage === 'wallet' && <>
      <div className="shop-greeting">👛 おでかけの じゅんび！ 硬貨を かぞえて、使えるお金を しらべよう。</div>
      <section className="shop-wallet learning-wallet"><h2>わたしの おさいふ</h2>{walletPicture}</section>
      <div className="shop-change-desk">{answerBox('おさいふの お金', 'checkWallet', 'たしかめて おみせへ →')}<Handwriting numbers={[]} subtract={false} showHints={false} /></div>
    </>}
    {state.stage === 'total' && <>
      <div className="shop-greeting">🐰 これを 買うんだね！ ぜんぶで 何円に なるかな？</div>
      <div className="unit-price-list" aria-label="かごの中の商品を1こずつ表示">{state.products.flatMap((p, i) => Array.from({ length: state.cart[i] }, (_, n) => <article key={p.name + n}><span>{p.emoji}</span><b>{p.name}</b><strong>{p.price}円</strong></article>))}</div>
      <div className="shop-change-desk">{answerBox('商品の 合計', 'checkTotal', '合計を たしかめる →')}<Handwriting numbers={[]} subtract={false} showHints={false} /></div>
      <button className="secondary-button" onClick={() => dispatch({ type: 'back' })}>← かごを 見なおす</button>
    </>}
    {state.stage === 'shelf' && <>
      <div className="shop-greeting">🐰 いらっしゃい！ おさいふの お金で 買えるものを えらんでね。かごには 4こまで 入るよ。</div>
      <div className="shopping-layout">
        <section className="shop-shelves" aria-label="売っている商品">{state.products.map((p, i) => <article className={`shelf-product ${state.cart[i] ? 'in-basket' : ''}`} key={p.name}>
          <span className="shelf-emoji" aria-hidden="true">{p.emoji}</span><h2>{p.name}</h2><p><b>{p.price}</b> 円</p>
          <div className="quantity-control"><button aria-label={`${p.name}を1こへらす`} disabled={!state.cart[i]} onClick={() => dispatch({ type: 'quantity', index: i, delta: -1 })}>−</button><output aria-label={`${p.name}の個数`}>{state.cart[i]}<small>こ</small></output><button aria-label={`${p.name}を1こふやす`} disabled={count >= MAX_ITEMS} onClick={() => dispatch({ type: 'quantity', index: i, delta: 1 })}>＋</button></div>
        </article>)}</section>
        <aside className="shop-wallet"><h2>👛 わたしの おさいふ</h2><p className="wallet-total">ぜんぶで <b>{budget}</b> 円</p><div className="wallet-coins">{COINS.map((coin, i) => <div key={coin}><CoinStack value={coin} count={state.wallet[i]} /><small>{coin}円</small></div>)}</div><p>かごの中の ねだんを<br />メモで たしても いいよ！</p><details className="shopping-memo"><summary>✍️ メモを ひらく</summary><Handwriting numbers={state.products.flatMap((p, i) => Array(state.cart[i]).fill(p.price))} subtract={false} showHints={false} /></details></aside>
      </div>
      <div className="checkout-dock"><span>🧺 <b>{count}</b> / {MAX_ITEMS}こ</span><button className="primary-button" onClick={() => dispatch({ type: 'checkout' })}>レジに 行く →</button></div>
    </>}
    {state.stage === 'failed' && <div className="shopping-result failure"><span className="result-emoji">🐰💦</span><p>今回は おかいもの しっぱい！<br />このままだと 買えないよ。かごを 見なおそう。</p>{receipt}<p>おさいふは <b>{budget}円</b>。合計のほうが 大きいね。</p><button className="primary-button" onClick={() => dispatch({ type: 'back' })}>かごを 見なおす →</button><small>お金は へっていないよ。何度でも やりなおせるよ！</small></div>}
    {state.stage === 'pay' && <>
      <div className="shop-greeting">🐰 ぜんぶで {total}円です！ 出す硬貨の「＋」を おしてね。</div>
      <div className="payment-layout">{receipt}<section className="payment-wallet"><h2>👛 おさいふから 出そう</h2><div className="tender-coins">{COINS.map((coin, i) => <div className="tender-column" key={coin}><CoinStack value={coin} count={state.wallet[i] - state.tender[i]} /><span>{coin}円</span><div className="quantity-control"><button aria-label={`${coin}円を1枚もどす`} disabled={!state.tender[i]} onClick={() => dispatch({ type: 'coin', index: i, delta: -1 })}>−</button><output>{state.tender[i]}</output><button aria-label={`${coin}円を1枚出す`} disabled={state.tender[i] === state.wallet[i]} onClick={() => dispatch({ type: 'coin', index: i, delta: 1 })}>＋</button></div><small>出す枚数</small></div>)}</div>
      <div className="payment-tray"><b>トレーの お金を かぞえよう</b><div className="tray-coins">{state.tender.some(Boolean) ? COINS.map((coin, i) => state.tender[i] > 0 && <CoinStack key={coin} value={coin} count={state.tender[i]} />) : <span>ここに お金を 出してね</span>}</div></div>
      <button className="secondary-button" onClick={() => dispatch({ type: 'clearCoins' })}>お金を ぜんぶ もどす</button>{answerBox('出すお金は 何円？', 'pay', 'たしかめて はらう →')}</section></div>
      <button className="secondary-button" onClick={() => dispatch({ type: 'back' })}>← かごを 見なおす</button>
    </>}
    {state.stage === 'change' && <>
      <div className="shop-greeting">🐰 {paid}円 おあずかりします！ おつりを かぞえてみよう。</div>
      <div className="change-context"><span>おかいもの <b>{total}円</b></span><span>出したお金 <b>{paid}円</b></span></div>
      <div className="shop-change-desk">{answerBox('もらう おつり', 'check', 'おつりを たしかめる →')}<Handwriting numbers={[paid, total]} subtract /></div>
    </>}
    {state.stage === 'success' && <div className="shopping-result success"><span className="result-emoji">🛍️✨</span><p>すきなものを 買えたね！<br />{change === 0 ? 'ぴったり はらえて おつりは 0円！' : `おつりの ${change}円も ばっちり！`}</p><div className="purchase-parade">{state.products.map((p, i) => state.cart[i] > 0 && <span key={p.name}>{p.emoji}<small>×{state.cart[i]}</small></span>)}</div>{receipt}<div className="success-change"><b>もらった おつり：{change}円</b><div className="tray-coins">{COINS.map((coin, i) => coinChange(change)[i] > 0 && <CoinStack key={coin} value={coin} count={coinChange(change)[i]} />)}</div></div><p>おさいふに のこった お金は <b>{budget - total}円</b></p><div className="shopping-badge">🏅 おかいもの名人</div><button className="primary-button" onClick={onRestart}>あたらしい おさいふで あそぶ →</button></div>}
    <div className="shop-feedback" role="status" aria-live="polite">{state.message}</div>
  </main>;
}

function AmountAnswer({ label, answer, onChange, onSubmit, button }: { label: string; answer: string; onChange: (value: string) => void; onSubmit: () => void; button: string }) {
  return <section className="shop-answer"><label htmlFor="shop-amount-answer">{label}</label>
    <div className="shop-answer-input"><input id="shop-amount-answer" inputMode="numeric" pattern="[0-9]*" autoComplete="off" maxLength={3} value={answer} onChange={e => onChange(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onSubmit(); } }} /><b>円</b></div>
    <div className="keypad">{[1,2,3,4,5,6,7,8,9].map(n => <button key={n} onClick={() => onChange(answer + n)}>{n}</button>)}<button onClick={() => onChange('')}>C</button><button onClick={() => onChange(answer + '0')}>0</button><button aria-label="1もじけす" onClick={() => onChange(answer.slice(0, -1))}>⌫</button></div>
    <button className="primary-button" onClick={onSubmit}>{button}</button>
  </section>;
}
