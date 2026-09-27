'use client';
import { useMemo, useState } from 'react';
import type { ShopFilter } from '@/lib/api/types';
import { BUDGETS, GENRES, WALKS } from '@/lib/constants';
import { useApp, useNav } from '../providers';
import { useAsync } from '../useAsync';
import { EmojiCircle, FilterChip, Screen, ScreenHeader, SecondaryButton, SubActionButton } from '../ui';

export type ListInitial = { filter?: { walk?: string[]; budget?: string[]; genre?: string[] } };

type Group = keyof ShopFilter;

const GROUPS: { key: Group; label: string; opts: { v: string; label: string }[] }[] = [
  { key: 'walk', label: '徒歩', opts: WALKS.map((w) => ({ v: w, label: w })) },
  { key: 'budget', label: '予算', opts: BUDGETS.map((b) => ({ v: b, label: b })) },
  { key: 'genre', label: 'ジャンル', opts: GENRES.map((g) => ({ v: g.v, label: `${g.e} ${g.v}` })) },
];

const EMPTY: ShopFilter = { walk: [], budget: [], genre: [] };

export function ListScreen({ initial }: { initial?: ListInitial }) {
  const { api } = useApp();
  const nav = useNav();
  // 全件を1回だけ取得し、絞り込みは手元で行う（件数を即時に変えるため）
  const list = useAsync(() => api.listShops(), [api]);
  const [f, setF] = useState<ShopFilter>(() => ({
    walk: initial?.filter?.walk ?? [],
    budget: initial?.filter?.budget ?? [],
    genre: initial?.filter?.genre ?? [],
  }));

  const toggle = (g: Group, v: string) =>
    setF((s) => ({ ...s, [g]: s[g].includes(v) ? s[g].filter((x) => x !== v) : [...s[g], v] }));
  const clear = () => setF(EMPTY);

  const all = list.data ?? [];
  const rows = useMemo(
    () =>
      all.filter(
        (x) =>
          (!f.walk.length || f.walk.includes(x.walk)) &&
          (!f.budget.length || f.budget.includes(x.budget)) &&
          (!f.genre.length || f.genre.includes(x.genre)),
      ),
    [all, f],
  );
  const active = f.walk.length + f.budget.length + f.genre.length > 0;
  const ready = !list.loading && !list.error && !!list.data;

  const header = (
    <>
      <ScreenHeader title="みんなの店" onBack={() => nav.push('/')} />
      <div className="flex flex-none flex-col gap-2 border-b border-line pb-3 pt-1">
        {GROUPS.map((g) => (
          <div key={g.key} className="flex items-center gap-2 pl-4">
            <span className="w-[52px] flex-none text-[12px] font-bold text-ink-2">{g.label}</span>
            <div className="la-scroll flex gap-1.5 overflow-x-auto pr-4" role="group" aria-label={g.label}>
              {g.opts.map((o) => (
                <FilterChip key={o.v} type="button" label={o.label} selected={f[g.key].includes(o.v)} onClick={() => toggle(g.key, o.v)} />
              ))}
            </div>
          </div>
        ))}
        <div className="flex min-h-8 items-center px-4 pt-1">
          <span className="text-[14px] font-bold" aria-live="polite">
            {ready ? rows.length : '–'}件
          </span>
          {active && (
            <>
              {ready && <span className="ml-1.5 text-[12px] text-ink-2">（全{all.length}件中）</span>}
              <button
                type="button"
                onClick={clear}
                className="ml-auto h-8 cursor-pointer rounded-full border-0 bg-neutral-tag px-3 text-[12px] font-bold text-ink transition-transform duration-100 active:scale-[.97]"
              >
                ✕ 条件を解除
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );

  return (
    <Screen header={header} scrollClassName="px-4 pb-8 pt-3">
      {list.loading && (
        <div className="flex flex-col overflow-hidden rounded-card border border-line bg-white">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 border-b border-row-divider px-3.5 py-3 last:border-b-0">
              <div className="h-12 w-12 flex-none rounded-full bg-skeleton" />
              <div className="flex flex-1 flex-col gap-2">
                <div className="h-[15px] w-[60%] rounded-md bg-skeleton" />
                <div className="h-3 w-[80%] rounded-md bg-skeleton" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!list.loading && !!list.error && (
        <div className="flex flex-col items-center gap-2.5 px-4 py-14 text-center">
          <div className="text-[48px]">😵‍💫</div>
          <div className="font-maru text-[18px] font-bold leading-[1.4]">読み込めませんでした</div>
          <div className="text-[14px] leading-[1.6] text-ink-2">通信状況を確認して、もう一度お試しください</div>
          <SecondaryButton className="mt-3 px-7" onClick={list.reload}>
            ↻ 再読み込み
          </SecondaryButton>
        </div>
      )}

      {ready && rows.length > 0 && (
        <div className="flex flex-col overflow-hidden rounded-card border border-line bg-white">
          {rows.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => nav.push(`/shops/${s.id}?from=list`)}
              className="flex cursor-pointer items-center gap-3 border-0 border-b border-solid border-row-divider bg-white px-3.5 py-3 text-left text-ink last:border-b-0 active:bg-bg"
            >
              <EmojiCircle emoji={s.emoji} size={48} font={26} />
              <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <span className="text-[15px] font-bold">{s.name}</span>
                <span className="text-[12px] text-ink-2">
                  徒歩{s.walk} · 🌱{s.likeCount}人 · {s.createdBy.isMe ? 'あなた' : `${s.createdBy.name}さん`}
                </span>
              </span>
              <span className="text-[20px] text-chevron" aria-hidden>
                ›
              </span>
            </button>
          ))}
        </div>
      )}

      {ready && rows.length === 0 && (
        <div className="flex flex-col items-center gap-2 px-2 py-12 text-center">
          <div className="text-[44px]">🔍</div>
          <div className="font-maru text-[17px] font-bold leading-[1.4]">条件に合うお店がありません</div>
          <div className="text-[13px] leading-[1.6] text-ink-2">条件を減らすか、あなたの知っているお店を登録してください</div>
          <div className="mt-3.5 flex gap-2 self-stretch">
            <SecondaryButton className="h-12 flex-1 text-[14px]" onClick={clear}>
              絞り込みを解除
            </SecondaryButton>
            <SubActionButton className="h-12 flex-1 text-[14px]" onClick={() => nav.push('/shops/new')}>
              ＋ お店を登録
            </SubActionButton>
          </div>
        </div>
      )}
    </Screen>
  );
}
