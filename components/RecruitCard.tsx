'use client';
import type { MouseEvent } from 'react';
import type { Recruit } from '@/lib/api/types';
import { Avatar, Badge, cx } from './ui';

/**
 * 募集カード。
 * variant='home'：店名＋主催者・集合場所（ホーム）
 * variant='shop'：主催者の募集／◯◯集合（店舗ページ内。店名は出さない）
 * variant='compact'：縦長カード（ホームの横スクロール用。ボタンはカード下端に全幅）
 */
export function RecruitCard({ r, variant = 'home', onOpen, onJoin, onCancel }: {
  r: Recruit; variant?: 'home' | 'shop' | 'compact'; onOpen?: () => void; onJoin?: (r: Recruit) => void; onCancel?: (r: Recruit) => void;
}) {
  const mine = r.isMine;
  const closed = r.closed;
  const joined = r.joined && !mine && !closed;
  const liked = variant !== 'shop' && r.likedByMe && !mine && !closed;
  const hostName = mine ? 'あなた' : `${r.host.name}さん`;
  const stop = (fn?: (r: Recruit) => void) => (e: MouseEvent) => {
    e.stopPropagation();
    fn?.(r);
  };

  const button = (cls: string) =>
    closed ? (
      <button onClick={stop()} disabled className={cx(cls, 'rounded-full border-0 bg-disabled px-3 text-[14px] font-bold text-ink-2')}>
        締め切り
      </button>
    ) : mine ? (
      <button onClick={stop(onCancel)} className={cx(cls, 'cursor-pointer rounded-full border-[1.5px] border-line-strong bg-white px-3 text-[14px] font-bold text-danger transition-transform duration-100 active:scale-[.97]')}>
        取り消す
      </button>
    ) : joined ? (
      <button onClick={stop(onJoin)} aria-pressed className={cx(cls, 'cursor-pointer rounded-full border-[1.5px] border-sprout-border bg-sprout-soft px-3 text-[14px] font-bold text-sprout-ink transition-transform duration-100 active:scale-[.97]')}>
        参加中 ✓
      </button>
    ) : (
      <button onClick={stop(onJoin)} aria-pressed={false} className={cx(cls, 'cursor-pointer rounded-full border-0 bg-tomato px-3.5 text-[14px] font-bold text-white transition-transform duration-100 active:scale-[.97]')}>
        参加する
      </button>
    );

  const cardTone = liked ? 'border-mustard bg-mustard-bg' : joined ? 'border-sprout-border bg-sprout-bg' : 'border-line bg-white';

  if (variant === 'compact')
    return (
      <div
        onClick={onOpen}
        className={cx('flex h-full flex-col gap-2 rounded-card border-[1.5px] p-3', onOpen && 'cursor-pointer', cardTone)}
        style={{ opacity: closed ? 0.55 : 1 }}
      >
        <div className="flex items-baseline gap-1.5">
          <span className={cx('font-maru text-[22px] font-bold leading-[1.1]', closed && 'line-through')}>{r.departTime}</span>
          <span className="text-[11px] font-medium text-ink-2">出発</span>
        </div>
        {liked && <Badge tone="mustard">🌱 あなたが気になっている店</Badge>}
        {mine && !closed && <Badge tone="tomato">あなたの募集</Badge>}
        <div className="line-clamp-2 text-[15px] font-bold leading-[1.35]">
          {r.shop.emoji} {r.shop.name}
        </div>
        <div className="flex min-w-0 items-center gap-1.5 text-[12px] leading-[1.3] text-ink-2">
          <Avatar p={r.host} size={22} font={13} />
          <span className="min-w-0 truncate">
            {hostName} · {r.place}
          </span>
        </div>
        <div className="text-[12px] font-bold leading-[1.3]">{r.count}人参加中</div>
        <div className="mt-auto pt-1">{button('h-11 w-full')}</div>
      </div>
    );

  return (
    <div
      onClick={onOpen}
      className={cx(
        'flex flex-col gap-2 rounded-card border-[1.5px] py-3 pl-3.5 pr-3',
        onOpen && 'cursor-pointer',
        cardTone,
      )}
      style={{ opacity: closed ? 0.55 : 1 }}
    >
      {liked && <Badge tone="mustard">🌱 あなたが気になっている店</Badge>}
      {mine && !closed && <Badge tone="tomato">あなたの募集</Badge>}
      <div className="flex items-center gap-3">
        <div className="flex w-[50px] flex-none flex-col items-center">
          <div className={cx('font-maru text-[19px] font-bold leading-[1.1]', closed && 'line-through')}>{r.departTime}</div>
          <div className="text-[11px] font-medium leading-normal text-ink-2">出発</div>
        </div>
        <div className="w-px self-stretch bg-line" />
        {variant === 'home' ? (
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="text-[15px] font-bold leading-[1.35]">
              {r.shop.emoji} {r.shop.name}
            </div>
            <div className="flex items-center gap-1.5 text-[12px] leading-[1.3] text-ink-2">
              <Avatar p={r.host} size={22} font={13} />
              <span>
                {hostName} · {r.place}
              </span>
            </div>
            <div className="text-[12px] font-bold leading-[1.3]">{r.count}人参加中</div>
          </div>
        ) : (
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-center gap-1.5 text-[14px] font-bold leading-[1.3]">
              <Avatar p={r.host} size={24} font={14} />
              {hostName}の募集
            </div>
            <div className="text-[12px] leading-[1.3] text-ink-2">{r.place}集合</div>
            <div className="text-[12px] font-bold leading-[1.3]">{r.count}人参加中</div>
          </div>
        )}
        {button('h-11 min-w-[88px] flex-none')}
      </div>
    </div>
  );
}
