'use client';
// 開発用：デザインボード（ランチのたね UI.dc.html）の ⓪-1〜⑤-3 を実装で並べて確認するページ。本番では無効。
import { useMemo, useState, type ReactNode } from 'react';
import { AppRoutes, type ScreenInitial } from '@/components/AppRoutes';
import { AppProvider, NavProvider, ToastProvider, type Nav } from '@/components/providers';
import { RecruitCard } from '@/components/RecruitCard';
import { createMockApi, type MockOptions } from '@/lib/api/mock';
import type { Recruit } from '@/lib/api/types';

type State = {
  id: string;
  label: string;
  optional?: boolean;
  path?: string;
  mock?: MockOptions;
  initial?: ScreenInitial;
  toast?: { msg: string; kind?: 'ok' | 'err' };
  holdBoot?: boolean;
  bootDelay?: number;
};

const REC = ['s1', 's3', 's5'];
const MULTI = ['r1', 'r2', 'r3'];
const ALL = ['r1', 'r2', 'r3', 'r4', 'r5'];
const FILLED = { url: 'https://maps.app.goo.gl/Tk7pQe2', name: 'そば処 たけ', genre: 'うどん・そば', walk: '5分以内', budget: '〜1,000円', note: '冷たい肉そばが絶品' };

const SECTIONS: { id: string; title: string; states: State[] }[] = [
  {
    id: 'live',
    title: '▶ 触れるプロトタイプ（起動から通しで）',
    states: [{ id: 'live', label: '起動 → 登録 → ホーム → …', mock: { registered: false, recruits: MULTI, liked: ['s1'], recommend: REC }, bootDelay: 1600 }],
  },
  {
    id: 's0',
    title: '⓪ ユーザー登録（初回のみ）',
    states: [
      { id: '0-1', label: '起動中', optional: true, mock: { registered: false }, holdBoot: true },
      { id: '0-2', label: '未入力', mock: { registered: false } },
      { id: '0-3', label: 'アイコン入力中', mock: { registered: false }, initial: { register: { kbOpen: true } } },
      { id: '0-4', label: '入力済み', mock: { registered: false }, initial: { register: { name: '田中', icon: '🐣' } } },
      { id: '0-5', label: 'アイコンの入力エラー', optional: true, mock: { registered: false }, initial: { register: { name: '田中', icon: '🐣🍙' } } },
      { id: '0-6', label: 'プロフィール編集（追加）', optional: true, path: '/me' },
    ],
  },
  {
    id: 's1',
    title: '① ホーム',
    states: [
      { id: '1-1', label: '通常（募集1件）', mock: { recruits: ['r1'] } },
      { id: '1-2', label: '募集が複数（3件）', mock: { recruits: MULTI, liked: ['s1'] } },
      { id: '1-3', label: '募集が4件以上（折りたたみ）', mock: { recruits: ALL } },
      { id: '1-4', label: '募集が4件以上・展開後', optional: true, mock: { recruits: ALL }, initial: { home: { expanded: true } } },
      { id: '1-5', label: '今日の募集がない', mock: { recruits: [] } },
      { id: '1-6', label: 'お店が0件', mock: { noShops: true } },
      { id: '1-7', label: '読み込み中', optional: true, mock: { hang: ['getHome'] } },
      { id: '1-8', label: '読み込みエラー', optional: true, mock: { fail: { getHome: 'once' } } },
    ],
  },
  {
    id: 's2',
    title: '② 店舗ページ',
    states: [
      { id: '2-1', label: '通常（気になる前）', path: '/shops/s3', mock: { recruits: ['r1'] } },
      { id: '2-2', label: '気になる済み', path: '/shops/s3', mock: { recruits: ['r1'], liked: ['s3'] }, toast: { msg: '「気になる」に追加しました' } },
      { id: '2-3', label: '今日の募集あり', path: '/shops/s1', mock: { recruits: ['r1'] } },
      { id: '2-4', label: '自分が登録した店', optional: true, path: '/shops/s8', mock: { recruits: ['r1'] } },
      { id: '2-5', label: '削除の確認', optional: true, path: '/shops/s8', mock: { recruits: ['r1'] }, initial: { shop: { deleteOpen: true } } },
    ],
  },
  {
    id: 's3',
    title: '③ お店を登録',
    states: [
      { id: '3-1', label: '未入力', path: '/shops/new' },
      { id: '3-2', label: '入力済み', path: '/shops/new', initial: { form: FILLED } },
      { id: '3-3', label: 'リンクの形式エラー', path: '/shops/new', initial: { form: { url: 'https://tabelog.com/tokyo/A1308/13012345/', name: 'そば処 たけ' } } },
      { id: '3-4', label: '登録済みの店', path: '/shops/new', initial: { form: { url: 'https://maps.app.goo.gl/shiokaze', name: '麺処 しおかぜ', genre: 'ラーメン' } } },
      {
        id: '3-5',
        label: '登録完了',
        path: '/shops/new',
        mock: { extraShops: [{ id: 'sx', name: 'そば処 たけ', genre: 'うどん・そば', walk: '5分以内', budget: '〜1,000円', note: '冷たい肉そばが絶品', mapUrl: FILLED.url, createdAt: '2026-09-28' }] },
        initial: { form: { ...FILLED, doneShopId: 'sx' } },
      },
      {
        id: '3-6',
        label: '登録に失敗',
        optional: true,
        path: '/shops/new',
        mock: { fail: { createShop: 'once' } },
        initial: { form: FILLED },
        toast: { msg: '通信エラーで登録できませんでした。入力内容はそのまま残っています', kind: 'err' },
      },
    ],
  },
  {
    id: 's4',
    title: '④ 今日ここ行く（募集の作成）',
    states: [
      { id: '4-1', label: '募集の作成', path: '/shops/s3/recruit', initial: { recruit: { time: '12:30' } } },
      { id: '4-2', label: '募集完了', path: '/shops/s3/recruit', initial: { recruit: { time: '12:30', place: '1階ロビー', done: true } } },
      { id: '4-3', label: '参加した（ホームで直後）', mock: { recruits: MULTI, joined: ['r1'] }, toast: { msg: '参加しました。12:15に1階ロビー集合です' } },
      {
        id: '4-4',
        label: '自分の募集の取り消し確認',
        optional: true,
        mock: { recruits: MULTI, mine: { shop: 's3', departTime: '12:30', place: '1階ロビー' } },
        initial: { home: { cancelId: 'rm' } },
      },
    ],
  },
  {
    id: 's5',
    title: '⑤ みんなの店（一覧）',
    states: [
      { id: '5-1', label: '通常', path: '/shops' },
      { id: '5-2', label: '絞り込み中', path: '/shops', initial: { list: { filter: { walk: ['5分以内'] } } } },
      { id: '5-3', label: '該当なし', path: '/shops', initial: { list: { filter: { walk: ['5分以内'], genre: ['寿司・海鮮'] } } } },
    ],
  },
];

const ME = { id: 'me', name: '田中', icon: '🐣' };

function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex h-[812px] w-[375px] flex-none flex-col overflow-hidden rounded-[36px] bg-bg shadow-[0_0_0_8px_#1C1814,0_20px_40px_rgba(42,33,27,.25)]" style={{ ['--safe-bottom' as string]: '16px' }}>
      {/* LINE側のヘッダー（アプリでは描かない。確認用の見た目だけ） */}
      <div className="flex h-11 flex-none items-center justify-between bg-white pl-[30px] pr-[22px] text-[15px] font-semibold text-[#111]">
        <span>12:05</span>
        <span className="text-[12px]">5G ▮</span>
      </div>
      <div className="flex h-11 flex-none items-center border-b border-[#E8E8E8] bg-white text-[#111]">
        <div className="w-[52px] text-center text-[18px]">✕</div>
        <div className="flex-1 text-center text-[16px] font-bold">ランチのたね</div>
        <div className="w-[52px] text-center text-[18px]">⋯</div>
      </div>
      <div className="relative flex-1 overflow-hidden">{children}</div>
    </div>
  );
}

function StateFrame({ s }: { s: State }) {
  const api = useMemo(() => createMockApi({ recommend: REC, ...s.mock }), [s]);
  const registered = s.mock?.registered !== false;
  const [path, setPath] = useState(s.path ?? '/');
  const nav = useMemo<Nav>(() => ({ path, push: setPath, replace: setPath }), [path]);
  // 画面を移動したら「初期状態」は外す（ボードの状態から触り始められるように）
  const initial = path === (s.path ?? '/') ? s.initial : undefined;
  return (
    <PhoneFrame>
      <AppProvider api={api} initialMe={registered ? ME : null}>
        <NavProvider value={nav}>
          <ToastProvider initial={s.toast}>
            <AppRoutes initial={initial} holdBoot={s.holdBoot} bootDelay={s.bootDelay} />
          </ToastProvider>
        </NavProvider>
      </AppProvider>
    </PhoneFrame>
  );
}

function CardsSheet() {
  const base = { note: '', joined: false, isMine: false, closed: false, likedByMe: false };
  const host = (name: string, icon: string, isMe = false) => ({ name, icon, isMe });
  const cards: [string, Recruit][] = [
    ['参加できる', { ...base, id: 'a', shop: { id: 's2', name: '定食屋 こまち', emoji: '🍱' }, host: host('鈴木', '⚽'), departTime: '12:30', place: '1階ロビー', count: 1 }],
    ['参加中', { ...base, id: 'b', shop: { id: 's1', name: '麺処 しおかぜ', emoji: '🍜' }, host: host('佐藤', '🐳'), departTime: '12:15', place: '1階ロビー', count: 3, joined: true }],
    ['自分の募集（「取り消す」）', { ...base, id: 'c', shop: { id: 's3', name: 'スパイス食堂 ナナ', emoji: '🍛' }, host: host('田中', '🐣', true), departTime: '12:30', place: '1階ロビー', count: 1, isMine: true }],
    ['締め切り（出発時間を過ぎた）', { ...base, id: 'd', shop: { id: 's7', name: 'おばんざい 小春', emoji: '🍱' }, host: host('中村', '🍵'), departTime: '12:00', place: '1階ロビー', count: 3, closed: true }],
    ['参加できる＋気になっている店（ハイライト）', { ...base, id: 'e', shop: { id: 's5', name: 'グリーンボウル虎ノ門', emoji: '🍽️' }, host: host('伊藤', '🌿'), departTime: '13:00', place: '1階ロビー', count: 2, likedByMe: true }],
  ];
  return (
    <div className="flex w-[375px] flex-col gap-[18px] overflow-hidden rounded-dialog border border-line-strong bg-bg px-4 pb-6 pt-5">
      {cards.map(([label, r]) => (
        <div key={r.id} className="flex flex-col gap-2">
          <div className="text-[12px] font-bold leading-[1.3] text-ink-2">{label}</div>
          <RecruitCard r={r} />
        </div>
      ))}
    </div>
  );
}

export default function DevStatesPage() {
  const [showOptional, setShowOptional] = useState(true);
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_ENABLE_DEV_STATES !== 'true') {
    return <div className="p-6">このページは開発時のみ使えます。</div>;
  }
  return (
    <div className="min-h-screen bg-[#EFE8DE] text-ink">
      <header className="flex flex-wrap items-center gap-4 border-b border-ink/10 bg-bg px-12 py-8">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-sprout-soft text-[36px]">🌱</div>
        <div>
          <div className="font-maru text-[34px] font-bold leading-[1.2]">ランチのたね</div>
          <div className="text-[14px] font-medium text-ink-2">/dev/states — デザインボードの各状態を実装で再現（すべてタップ可能・モックデータ）</div>
        </div>
        <label className="ml-auto flex items-center gap-2 text-[13px] font-bold">
          <input type="checkbox" checked={showOptional} onChange={(e) => setShowOptional(e.target.checked)} />
          「余裕があれば」の状態も表示
        </label>
      </header>
      {SECTIONS.map((sec) => (
        <section key={sec.id} id={sec.id} className="border-b border-ink/10 px-12 pb-10 pt-11">
          <h2 className="mb-7 mt-0 font-maru text-[24px] font-bold">{sec.title}</h2>
          <div className="flex flex-wrap items-start gap-x-9 gap-y-10">
            {sec.states
              .filter((s) => showOptional || !s.optional)
              .map((s) => (
                <div key={s.id} id={s.id} className="flex flex-none flex-col gap-[18px] px-2 pb-2">
                  <div className="-ml-2 flex items-center gap-2 text-[13px] font-bold">
                    {sec.id !== 'live' && <span className="rounded-[5px] bg-ink/10 px-[7px] py-[3px] font-mono text-[10.5px]">{circled(s.id)}</span>}
                    {s.label}
                    {s.optional ? (
                      <span className="rounded-full border border-[#D8CBBB] bg-white px-[7px] py-1 text-[10.5px] leading-none text-ink-2">余裕があれば</span>
                    ) : sec.id !== 'live' ? (
                      <span className="rounded-full bg-tomato px-[7px] py-1 text-[10.5px] leading-none text-white">必須</span>
                    ) : null}
                  </div>
                  <StateFrame s={s} />
                </div>
              ))}
            {sec.id === 's4' && (
              <div id="4-5" className="flex flex-none flex-col gap-[18px] px-2 pb-2">
                <div className="-ml-2 flex items-center gap-2 text-[13px] font-bold">
                  <span className="rounded-[5px] bg-ink/10 px-[7px] py-[3px] font-mono text-[10.5px]">④-5</span>募集カードの状態
                  <span className="rounded-full bg-tomato px-[7px] py-1 text-[10.5px] leading-none text-white">必須</span>
                </div>
                <CardsSheet />
              </div>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}

function circled(id: string) {
  const [a, b] = id.split('-');
  return `${'⓪①②③④⑤'[Number(a)]}-${b}`;
}
