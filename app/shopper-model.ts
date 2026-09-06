export const COINS = [500, 100, 50, 10, 5, 1] as const;
// Four items at most keeps every possible sum within three digits (240 * 4).
export const MAX_ITEMS = 4;
export type ShopProduct = { name: string; emoji: string; price: number };
export type ShopState = {
  wallet: number[]; products: ShopProduct[]; cart: number[]; tender: number[];
  stage: 'wallet' | 'shelf' | 'total' | 'failed' | 'pay' | 'change' | 'success';
  answer: string; message: string;
};
export const valueOf = (counts: number[]) => COINS.reduce((sum, coin, i) => sum + coin * counts[i], 0);
export const cartTotal = (state: ShopState) => state.products.reduce((sum, product, i) => sum + product.price * state.cart[i], 0);
export function coinChange(amount: number) {
  return COINS.map(coin => { const count = Math.floor(amount / coin); amount %= coin; return count; });
}
export function createShopping(random = Math.random): ShopState {
  const integer = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));
  const catalog: Array<[string, string, number, number]> = [
    ['キャンディ', '🍬', 30, 65], ['クッキー', '🍪', 60, 120],
    ['りんご', '🍎', 80, 150], ['パン', '🥐', 90, 180],
    ['いちごミルク', '🥛', 100, 180], ['ハンカチ', '🌼', 150, 240],
  ];
  return {
    wallet: [integer(0, 1), integer(2, 3), integer(0, 2), integer(1, 4), integer(1, 4), integer(1, 4)],
    products: catalog.map(([name, emoji, min, max]) => ({ name, emoji, price: integer(min, max) })),
    cart: catalog.map(() => 0), tender: COINS.map(() => 0), stage: 'wallet', answer: '', message: '',
  };
}
export type ShopAction =
  | { type: 'quantity' | 'coin'; index: number; delta: number }
  | { type: 'checkout' | 'back' | 'pay' | 'check' | 'clearCoins' | 'checkWallet' | 'checkTotal' }
  | { type: 'answer'; value: string };
export function shopReducer(state: ShopState, action: ShopAction): ShopState {
  const total = cartTotal(state);
  switch (action.type) {
    case 'checkWallet':
      if (state.stage !== 'wallet') return state;
      if (!state.answer) return { ...state, message: 'おさいふに 何円あるか 入れてね。' };
      if (Number(state.answer) !== valueOf(state.wallet)) return { ...state, message: 'もういちど！ 同じ硬貨を まとめて かぞえてみよう。' };
      return { ...state, stage: 'shelf', answer: '', message: 'せいかい！ おさいふを もって おかいものへ！' };
    case 'quantity': {
      if (state.stage !== 'shelf' || !Number.isInteger(action.index) || !state.products[action.index] || ![1, -1].includes(action.delta)) return state;
      if (action.delta > 0 && state.cart.reduce((a, b) => a + b, 0) >= MAX_ITEMS) return state;
      const cart = [...state.cart]; cart[action.index] = Math.max(0, Math.min(MAX_ITEMS, cart[action.index] + action.delta));
      return { ...state, cart, message: '' };
    }
    case 'checkout':
      if (state.stage !== 'shelf') return state;
      if (!total) return { ...state, message: 'すきなものを かごに 入れてね！' };
      return { ...state, stage: 'total', answer: '', message: '', tender: COINS.map(() => 0) };
    case 'checkTotal':
      if (state.stage !== 'total') return state;
      if (!state.answer) return { ...state, message: 'かごの中は ぜんぶで 何円かな？' };
      if (Number(state.answer) !== total) return { ...state, message: 'おしい！ 商品を 1こずつ たしてみよう。同じものも わすれずにね。' };
      return { ...state, stage: total > valueOf(state.wallet) ? 'failed' : 'pay', answer: '', message: '' };
    case 'back':
      if (!['total', 'failed', 'pay'].includes(state.stage)) return state;
      return { ...state, stage: 'shelf', answer: '', message: '', tender: COINS.map(() => 0) };
    case 'coin': {
      if (state.stage !== 'pay' || !Number.isInteger(action.index) || action.index < 0 || action.index >= COINS.length || ![1, -1].includes(action.delta)) return state;
      const tender = [...state.tender]; tender[action.index] = Math.max(0, Math.min(state.wallet[action.index], tender[action.index] + action.delta));
      return { ...state, tender, answer: '', message: '' };
    }
    case 'clearCoins': return state.stage === 'pay' ? { ...state, tender: COINS.map(() => 0), answer: '', message: '' } : state;
    case 'pay':
      if (state.stage !== 'pay') return state;
      if (!state.answer || Number(state.answer) !== valueOf(state.tender)) return { ...state, message: 'トレーに 出した硬貨は ぜんぶで 何円かな？ かぞえて 入れてね。' };
      if (valueOf(state.tender) < total) return { ...state, message: 'まだ お金が たりないよ。もう少し 出せるかな？' };
      return { ...state, stage: 'change', answer: '', message: '' };
    case 'answer': return ['wallet', 'total', 'pay', 'change'].includes(state.stage) ? { ...state, answer: action.value.replace(/\D/g, '').slice(0, 3), message: '' } : state;
    case 'check':
      if (state.stage !== 'change') return state;
      if (!state.answer) return { ...state, message: 'こたえを 入れてね。おつりが なければ 0円だよ。' };
      if (Number(state.answer) !== valueOf(state.tender) - total) return { ...state, message: 'おしい！ 出したお金と レシートを もういちど 見てみよう。' };
      return { ...state, stage: 'success', message: '' };
  }
}
