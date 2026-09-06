import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const source = readFileSync(new URL('../app/shopper-model.ts', import.meta.url), 'utf8');
const exports = {};
new Function('require', 'exports', ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText)(createRequire(import.meta.url), exports);
const { COINS, createShopping, valueOf, cartTotal, shopReducer: reduce, coinChange } = exports;
const answer = (s, value) => reduce(s, { type: 'answer', value: String(value) });
const fresh = () => reduce(answer(createShopping(() => 0), 216), { type: 'checkWallet' });
const checkout = s => reduce(answer(reduce(s, { type: 'checkout' }), cartTotal(s)), { type: 'checkTotal' });
const pay = s => reduce(answer(s, valueOf(s.tender)), { type: 'pay' });
const add = (s, index, delta = 1) => reduce(s, { type: 'quantity', index, delta });
const coin = (s, index, delta = 1) => reduce(s, { type: 'coin', index, delta });

test('wallet and product constraints hold across random games and boundary samples', () => {
  for (let i = 0; i < 3000; i++) {
    const s = createShopping(i === 0 ? () => 0 : i === 1 ? () => 0.999999 : Math.random);
    assert.ok(valueOf(s.wallet) > 200 && valueOf(s.wallet) <= 1000);
    assert.equal(s.wallet.length, COINS.length);
    assert.ok(s.wallet.every(n => Number.isInteger(n) && n >= 0));
    assert.equal(s.products.length, 6);
    assert.ok(s.products.every(p => Number.isInteger(p.price) && p.price >= 30 && p.price <= 240));
    assert.ok(s.wallet[5] >= 1 && s.wallet[5] <= 4);
    assert.ok(s.products.some(p => p.price <= valueOf(s.wallet)));
  }
});
test('empty basket stays in store and total quantity never exceeds four', () => {
  let s = fresh();
  assert.equal(reduce(s, { type: 'checkout' }).stage, 'shelf');
  s = add(s, 0, -1); assert.equal(s.cart[0], 0);
  for (let i = 0; i < 15; i++) s = add(s, 0);
  assert.equal(s.cart[0], 4);
  assert.equal(add(s, 1).cart[1], 0);
  assert.ok(cartTotal(s) <= 999);
});
test('over budget fails and retry preserves wallet and basket', () => {
  const s = add(add(fresh(), 5), 5);
  const failed = checkout(s);
  assert.equal(failed.stage, 'failed');
  assert.deepEqual(failed.wallet, s.wallet);
  const retry = reduce(failed, { type: 'back' });
  assert.equal(retry.stage, 'shelf');
  assert.deepEqual(retry.cart, s.cart);
  assert.equal(checkout(add(retry, 5, -1)).stage, 'pay');
});
test('payment only uses owned coins and rejects insufficient tender', () => {
  let s = checkout(add(fresh(), 4));
  assert.equal(coin(s, 0).tender[0], 0); // No 500 yen coin in this wallet.
  assert.equal(reduce(s, { type: 'pay' }).stage, 'pay');
  for (let i = 0; i < 10; i++) s = coin(s, 1);
  assert.equal(s.tender[1], s.wallet[1]);
  s = reduce(s, { type: 'clearCoins' });
  assert.equal(valueOf(s.tender), 0);
});
test('full shopping journey calculates change and remaining balance without double settlement', () => {
  let s = add(add(add(fresh(), 0), 0), 1); // 30 + 30 + 60.
  assert.equal(cartTotal(s), 120);
  s = checkout(s);
  s = coin(coin(s, 1), 1); // 200 yen.
  s = pay(s);
  assert.equal(s.stage, 'change');
  assert.equal(reduce(s, { type: 'check' }).stage, 'change');
  s = reduce(s, { type: 'answer', value: '70' });
  assert.equal(reduce(s, { type: 'check' }).stage, 'change');
  s = reduce(s, { type: 'answer', value: '80' });
  s = reduce(s, { type: 'check' });
  assert.equal(s.stage, 'success');
  assert.equal(valueOf(s.wallet) - cartTotal(s), 96);
  assert.equal(reduce(s, { type: 'check' }), s);
});
test('exact payment needs an explicit zero answer', () => {
  let s = checkout(add(fresh(), 4));
  s = pay(coin(s, 1));
  assert.equal(reduce(s, { type: 'check' }).stage, 'change');
  s = reduce(s, { type: 'answer', value: '0' });
  assert.equal(reduce(s, { type: 'check' }).stage, 'success');
});
test('all possible change amounts can be returned with supported coins', () => {
  for (let amount = 0; amount <= 1000; amount++) assert.equal(valueOf(coinChange(amount)), amount);
});

test('one-yen coins can be selected and used in change', () => {
  let s = fresh();
  s = { ...s, products: s.products.map((p, i) => i === 0 ? { ...p, price: 99 } : p) };
  s = checkout(add(s, 0));
  s = coin(coin(s, 1), 5); // 100 yen + 1 yen.
  assert.equal(valueOf(s.tender), 101);
  assert.equal(coin(s, 5).tender[5], 1); // Cannot spend more than owned.
  s = pay(s);
  s = reduce(answer(s, 2), { type: 'check' });
  assert.equal(s.stage, 'success');
  assert.equal(coinChange(2)[5], 2);
});
test('cart cannot change after payment and numeric answers are sanitized', () => {
  let s = checkout(add(fresh(), 4));
  assert.equal(add(s, 0), s);
  s = pay(coin(s, 1));
  assert.equal(coin(s, 1), s);
  assert.equal(reduce(s, { type: 'answer', value: 'a12b345' }).answer, '123');
});

test('wallet, basket and tender require correct answers before proceeding', () => {
  let s = createShopping(() => 0);
  assert.equal(s.stage, 'wallet');
  assert.equal(reduce(s, { type: 'checkWallet' }).stage, 'wallet');
  assert.equal(reduce(answer(s, 210), { type: 'checkWallet' }).stage, 'wallet');
  s = fresh();
  s = reduce(add(s, 4), { type: 'checkout' });
  assert.equal(s.stage, 'total');
  assert.equal(reduce(s, { type: 'checkTotal' }).stage, 'total');
  assert.equal(reduce(answer(s, 90), { type: 'checkTotal' }).stage, 'total');
  s = reduce(answer(s, 100), { type: 'checkTotal' });
  s = coin(s, 1);
  assert.equal(reduce(s, { type: 'pay' }).stage, 'pay');
  assert.equal(reduce(answer(s, 200), { type: 'pay' }).stage, 'pay');
  s = answer(s, 100);
  assert.equal(coin(s, 1).answer, '');
  assert.equal(pay(s).stage, 'change');
});

// Render actual components to catch answers leaking through visible text or ARIA labels.
function loadComponent(file, dependencies = {}) {
  const result = {};
  const compiled = ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const require = createRequire(import.meta.url);
  new Function('require', 'exports', compiled)(name => dependencies[name] ?? require(name), result);
  return result;
}
const handwriting = loadComponent('../app/Handwriting.tsx');
const { ShoppingSession } = loadComponent('../app/ShopperGame.tsx', { './Handwriting': handwriting, './shopper-model': exports });
const render = state => renderToStaticMarkup(React.createElement(ShoppingSession, { initial: state, onRestart() {} }));
test('unanswered totals are absent from rendered HTML', () => {
  const wallet = render(createShopping(() => 0));
  assert.doesNotMatch(wallet, /216/);
  const total = render(reduce(add(add(fresh(), 0), 0), { type: 'checkout' }));
  assert.doesNotMatch(total, /60円/);
  assert.match(total, /30円/);
  const tender = render(coin(coin(checkout(add(fresh(), 4)), 1), 1));
  assert.doesNotMatch(tender, /200円/);
  assert.match(tender, /100円/); // Already-solved basket total may remain visible.
});
