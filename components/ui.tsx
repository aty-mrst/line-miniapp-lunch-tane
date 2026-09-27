'use client';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { useToast } from './providers';

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ');
}

const press = 'transition-transform duration-100 active:scale-[.97] cursor-pointer';

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement>;

/* ---------- ボタン ---------- */

/** メインボタン（トマト）。disabled のときは直下に理由を出す */
export function PrimaryButton({ reason, className, children, disabled, ...p }: BtnProps & { reason?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <button
        {...p}
        disabled={disabled}
        className={cx(
          'h-[52px] rounded-full border-0 text-[16px] font-bold',
          disabled ? 'bg-disabled text-ink-disabled' : cx('bg-tomato text-white', press),
          className,
        )}
      >
        {children}
      </button>
      {disabled && reason && <div className="text-center text-[12px] text-ink-2">{reason}</div>}
    </div>
  );
}

export function SecondaryButton({ className, ...p }: BtnProps) {
  return <button {...p} className={cx('h-12 rounded-full border-[1.5px] border-line-strong bg-white text-[15px] font-bold text-ink', press, className)} />;
}

export function SubActionButton({ className, ...p }: BtnProps) {
  return <button {...p} className={cx('h-12 rounded-full border-[1.5px] border-tomato-soft-border bg-tomato-soft text-[15px] font-bold text-tomato-ink', press, className)} />;
}

/** 選択タイル（登録フォーム・募集フォーム） */
export function SelectTile({ selected, className, ...p }: BtnProps & { selected: boolean }) {
  return (
    <button
      {...p}
      aria-pressed={selected}
      className={cx(
        'rounded-input border-[1.5px] p-0',
        selected ? 'border-tomato bg-tomato-soft text-tomato-ink' : 'border-line-strong bg-white text-ink',
        press,
        className,
      )}
    />
  );
}

/** 絞り込みチップ（選択時に「✓ 」を付ける） */
export function FilterChip({ selected, label, ...p }: BtnProps & { selected: boolean; label: string }) {
  return (
    <button
      {...p}
      aria-pressed={selected}
      className={cx(
        'h-9 flex-none whitespace-nowrap rounded-full border-[1.5px] px-3 text-[13px] font-bold',
        selected ? 'border-tomato bg-tomato-soft text-tomato-ink' : 'border-line-strong bg-white text-ink',
        press,
      )}
    >
      {selected ? `✓ ${label}` : label}
    </button>
  );
}

/* ---------- 表示部品 ---------- */

export function Tag({ kind }: { kind: 'req' | 'opt' }) {
  return kind === 'req' ? (
    <span className="rounded-tag bg-tomato-soft px-1.5 py-1 text-[11px] font-bold leading-none text-tomato-ink">必須</span>
  ) : (
    <span className="rounded-tag bg-neutral-tag px-1.5 py-1 text-[11px] font-bold leading-none text-ink-2">任意</span>
  );
}

export function FieldLabel({ label, kind, right }: { label: string; kind?: 'req' | 'opt'; right?: ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[15px] font-bold">{label}</span>
      {kind && <Tag kind={kind} />}
      {right && <span className="ml-auto text-[12px] text-ink-2">{right}</span>}
    </div>
  );
}

/** 絵文字を丸い下地に入れる（アバター・店の絵文字共通） */
export function EmojiCircle({ emoji, size, font, className, style }: { emoji: string; size: number; font: number; className?: string; style?: React.CSSProperties }) {
  return (
    <span
      className={cx('grid flex-none place-items-center rounded-full bg-emoji-bg', className)}
      style={{ width: size, height: size, fontSize: font, ...style }}
    >
      {emoji}
    </span>
  );
}

/** 重ねて並べるアバター。自分は枠からし色 */
export function AvatarStack({ people, size = 38, font = 20, overlap = 10, max = 7, border = 2.5, borderColor = '#FFFFFF' }: {
  people: { icon: string; isMe?: boolean }[]; size?: number; font?: number; overlap?: number; max?: number; border?: number; borderColor?: string;
}) {
  const shown = people.slice(0, max);
  const more = people.length - shown.length;
  return (
    <div className="flex items-center pl-1">
      {shown.map((p, i) => (
        <EmojiCircle
          key={i}
          emoji={p.icon}
          size={size}
          font={font}
          className="box-border"
          style={{ marginLeft: i ? -overlap : 0, border: `${border}px solid ${p.isMe ? '#E8A710' : borderColor}` }}
        />
      ))}
      {more > 0 && <span className="ml-2 text-[13px] font-bold text-ink-2">ほか{more}人</span>}
    </div>
  );
}

export function Badge({ tone, children }: { tone: 'mustard' | 'tomato'; children: ReactNode }) {
  return (
    <div
      className={cx(
        'self-start rounded-full px-[9px] py-[5px] text-[11px] font-bold leading-none',
        tone === 'mustard' ? 'bg-mustard-soft text-mustard-ink' : 'bg-tomato-soft text-tomato-ink',
      )}
    >
      {children}
    </div>
  );
}

/* ---------- 画面の骨組み ---------- */

/** アプリ内ヘッダー 48px。‹ 戻る + タイトル */
export function ScreenHeader({ title, backLabel, onBack }: { title?: string; backLabel?: string; onBack: () => void }) {
  return (
    <div className="flex h-12 flex-none items-center gap-0.5 px-1.5">
      {backLabel ? (
        <button onClick={onBack} className="flex h-11 cursor-pointer items-center gap-0.5 border-0 bg-transparent px-2.5 text-[15px] font-medium text-ink">
          <span className="text-[24px] leading-none">‹</span>
          {backLabel}
        </button>
      ) : (
        <button onClick={onBack} aria-label="戻る" className="h-11 w-11 cursor-pointer border-0 bg-transparent text-[26px] text-ink">
          ‹
        </button>
      )}
      {title && <div className="font-maru text-[17px] font-bold">{title}</div>}
    </div>
  );
}

/**
 * 画面の共通レイアウト：[header] [スクロール領域] [下部固定バー]
 * トーストは下部バーの上（バーがない画面は下から24px）に出す。
 */
export function Screen({ header, bar, children, scrollClassName }: { header?: ReactNode; bar?: ReactNode; children: ReactNode; scrollClassName?: string }) {
  return (
    <div className="absolute inset-0 flex flex-col">
      {header}
      <div className={cx('la-scroll flex flex-1 flex-col overflow-y-auto', scrollClassName)}>{children}</div>
      <div className="relative flex-none">
        <ToastSlot offset={bar ? 12 : 24} />
        {bar && (
          <div className="flex flex-col gap-2 border-t border-line bg-white px-4 pt-3" style={{ paddingBottom: 'calc(12px + var(--safe-bottom))' }}>
            {bar}
          </div>
        )}
      </div>
    </div>
  );
}

function ToastSlot({ offset }: { offset: number }) {
  const { toast } = useToast();
  if (!toast) return null;
  const err = toast.kind === 'err';
  return (
    <div
      key={toast.id}
      role="status"
      className={cx('toast-in absolute left-4 right-4 z-[5] flex items-center gap-2.5 rounded-toast px-4 py-3.5 text-[14px] font-medium leading-normal text-white shadow-toast', err ? 'bg-danger' : 'bg-ink')}
      style={{ bottom: `calc(100% + ${offset}px)` }}
    >
      <span className="grid h-[22px] w-[22px] flex-none place-items-center rounded-full bg-white/20 text-[12px] font-bold">{err ? '!' : '✓'}</span>
      <span>{toast.msg}</span>
    </div>
  );
}

export function ConfirmDialog({ open, icon, title, body, okLabel, onOk, onCancel, busy }: {
  open: boolean; icon: string; title: string; body: string; okLabel: string; onOk: () => void; onCancel: () => void; busy?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-[6] flex items-center justify-center bg-[rgba(42,33,27,.5)] p-6" role="dialog" aria-modal="true">
      <div className="flex w-full flex-col gap-2.5 rounded-dialog bg-white px-5 pb-5 pt-6 text-center">
        <div className="text-[36px]">{icon}</div>
        <div className="font-maru text-[18px] font-bold leading-[1.4]">{title}</div>
        <div className="text-[14px] leading-[1.65] text-ink-2 [text-wrap:pretty]">{body}</div>
        <button onClick={onOk} disabled={busy} className={cx('mt-2.5 h-[52px] rounded-full border-0 bg-danger text-[16px] font-bold text-white', press)}>
          {okLabel}
        </button>
        <SecondaryButton onClick={onCancel}>やめる</SecondaryButton>
      </div>
    </div>
  );
}

export function TextInput({ invalid, className, ...p }: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      {...p}
      className={cx(
        'h-12 box-border rounded-input border-[1.5px] px-3.5 text-[16px] text-ink outline-none placeholder:text-ink-2/60',
        invalid ? 'border-danger bg-danger-soft' : 'border-line-strong bg-white focus:border-tomato',
        className,
      )}
    />
  );
}
