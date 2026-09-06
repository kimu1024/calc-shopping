"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";

type Point = { x: number; y: number };

export default function Handwriting({ numbers, subtract }: { numbers: number[]; subtract: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Point[][]>([]);
  const active = useRef<number | null>(null);
  const [count, setCount] = useState(0);
  const [confirmClear, setConfirmClear] = useState(false);
  const [showHint, setShowHint] = useState(false);

  function redraw() {
    const el = canvas.current;
    if (!el) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, el.width, el.height);
    ctx.strokeStyle = "#43334e";
    ctx.fillStyle = "#43334e";
    ctx.lineWidth = el.width / 130;
    ctx.lineCap = ctx.lineJoin = "round";
    for (const stroke of strokes.current) {
      if (!stroke.length) continue;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x * el.width, stroke[0].y * el.height);
      for (const p of stroke.slice(1)) ctx.lineTo(p.x * el.width, p.y * el.height);
      ctx.stroke();
      if (stroke.length === 1) {
        ctx.beginPath();
        ctx.arc(stroke[0].x * el.width, stroke[0].y * el.height, ctx.lineWidth / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  useEffect(() => {
    const el = canvas.current!;
    const observer = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      el.width = Math.round(rect.width * window.devicePixelRatio);
      el.height = Math.round(rect.height * window.devicePixelRatio);
      redraw();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function point(event: PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height };
  }

  function end(event: PointerEvent<HTMLCanvasElement>) {
    if (active.current !== event.pointerId) return;
    active.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setCount(strokes.current.length);
  }

  return <section className="handwriting free-memo" aria-label="自由に書けるメモ欄">
    <div className="memo-heading"><b>メモ欄</b><button className="hint-toggle" aria-expanded={showHint} aria-controls="column-hint" onClick={() => setShowHint(value => !value)}>{showHint ? "ヒントを とじる" : "💡 ヒント"}</button></div>
    <div className="writing-toolbar">
      <button disabled={!count} onClick={() => { strokes.current.pop(); setCount(strokes.current.length); redraw(); }}>ひとつ もどす</button>
      <button disabled={!count} onClick={() => setConfirmClear(true)}>ぜんぶ けす</button>
    </div>
    {confirmClear && <div className="writing-confirm">メモを ぜんぶ けす？ <button onClick={() => { strokes.current = []; setCount(0); redraw(); setConfirmClear(false); }}>けす</button><button onClick={() => setConfirmClear(false)}>やめる</button></div>}
    <div className="memo-and-hint">
    <div className="writing-paper">
      <canvas ref={canvas} aria-label="指やペンで自由に書くメモ欄。答えは数字キーで入力してください。"
        onPointerDown={event => { if (active.current !== null || event.button !== 0) return; active.current = event.pointerId; event.currentTarget.setPointerCapture(event.pointerId); strokes.current.push([point(event)]); setConfirmClear(false); redraw(); }}
        onPointerMove={event => { if (active.current !== event.pointerId) return; strokes.current[strokes.current.length - 1].push(point(event)); redraw(); }}
        onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end} />
    </div>
    {showHint && <aside id="column-hint" className="column-hint" aria-label="筆算の立式ヒント">
      <p>くらいを そろえてみよう</p>
      <div className="writing-guide">
        <div className="writing-places"><span>千</span><span>百</span><span>十</span><span>一</span></div>
        <div className="writing-carry" />
        {numbers.map((n, i) => <div className="writing-number" key={i}><b>{i === numbers.length - 1 ? subtract ? "−" : "+" : ""}</b>{String(n).padStart(4, " ").split("").map((d, j) => <span key={j}>{d}</span>)}</div>)}
        <div className="writing-line" />
      </div>
    </aside>}
    </div>
    <p>指やペンで かけるよ。スクロールは メモの外で。</p>
  </section>;
}
