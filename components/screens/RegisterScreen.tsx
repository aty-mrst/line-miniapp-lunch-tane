'use client';
import { useRef, useState } from 'react';
import type { Me } from '@/lib/api/types';
import { isOneEmoji, LIMITS } from '@/lib/validation';
import { useApp, useToast } from '../providers';
import { FieldLabel, PrimaryButton, Screen, SecondaryButton, TextInput, cx } from '../ui';

export type RegisterInitial = { name?: string; icon?: string; kbOpen?: boolean };

export function BootScreen({ error }: { error?: boolean }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-bg">
      <div className="grid h-[104px] w-[104px] place-items-center rounded-full bg-sprout-soft text-[56px]">🌱</div>
      <div className="font-maru text-[26px] font-bold leading-[1.2]">ランチのたね</div>
      {error ? (
        <>
          <div className="text-[14px] leading-[1.6] text-ink-2">起動できませんでした。通信状況を確認してください</div>
          <SecondaryButton className="px-7" onClick={() => location.reload()}>
            ↻ 再読み込み
          </SecondaryButton>
        </>
      ) : (
        <>
          <div className="mt-3 flex gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-tomato" />
            <div className="h-2 w-2 animate-pulse rounded-full bg-tomato-light [animation-delay:150ms]" />
            <div className="h-2 w-2 animate-pulse rounded-full bg-tomato-lighter [animation-delay:300ms]" />
          </div>
          <div className="text-[13px] leading-normal text-ink-2">準備しています…</div>
        </>
      )}
    </div>
  );
}

export function RegisterScreen({ initial, onDone }: { initial?: RegisterInitial; onDone: (me: Me) => void }) {
  const { api } = useApp();
  const toast = useToast();
  const [name, setName] = useState(initial?.name ?? '');
  const [icon, setIcon] = useState(initial?.icon ?? '');
  const [draft, setDraft] = useState('');
  const [kb, setKb] = useState(!!initial?.kbOpen);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const iconErr = !!icon && !isOneEmoji(icon);
  const canStart = !!name.trim() && !!icon && !iconErr;

  // 絵文字キーボードを直接開くWeb APIはないため、隠しinputにフォーカスしてOSのキーボードを開く
  const onIconInput = (v: string) => {
    setDraft(v);
    if (!v) return;
    setIcon(v);
    if (isOneEmoji(v)) inputRef.current?.blur();
  };

  const start = async () => {
    if (!canStart || busy) return;
    setBusy(true);
    try {
      onDone(await api.register({ name: name.trim(), icon }));
    } catch {
      toast.show('通信エラーで登録できませんでした。もう一度お試しください', 'err');
      setBusy(false);
    }
  };

  const circle = kb
    ? 'border-[2.5px] border-solid border-tomato bg-tomato-soft'
    : iconErr
      ? 'border-[2.5px] border-solid border-danger bg-danger-soft'
      : icon
        ? 'border-2 border-solid border-line bg-emoji-bg'
        : 'border-2 border-dashed border-tomato-light bg-bg';

  return (
    <Screen
      scrollClassName="gap-5 px-4 pb-6 pt-7"
      bar={
        <PrimaryButton disabled={!canStart || busy} reason={!canStart ? 'アイコンと名前を入れると押せます' : undefined} onClick={start}>
          はじめる
        </PrimaryButton>
      }
    >
      <div className="flex flex-col items-center gap-2.5 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-sprout-soft text-[34px]">🌱</div>
        <h1 className="m-0 font-maru text-[22px] font-bold leading-[1.35]">ランチのたねへようこそ</h1>
        <div className="text-[14px] leading-[1.6] text-ink-2 [text-wrap:pretty]">
          社員が見つけたランチの店が集まる場所です。
          <br />
          まずは、みんなに表示される姿を決めましょう。
        </div>
      </div>

      <div className="flex flex-col gap-5 rounded-dialog border border-line bg-white px-4 py-5">
        <div className="flex flex-col items-center gap-2.5">
          <div className="self-stretch">
            <FieldLabel label="アイコン" kind="req" right="好きな絵文字を1つ" />
          </div>
          <div className={cx('relative grid h-24 w-24 place-items-center rounded-full', circle)}>
            {icon ? (
              <span style={{ fontSize: iconErr ? 34 : 52 }} className="leading-none">
                {icon}
              </span>
            ) : (
              <span className="flex flex-col items-center gap-0.5 text-tomato-ink">
                <span className="text-[30px] leading-none">＋</span>
                <span className="text-[11px] font-bold leading-[1.3]">
                  タップして
                  <br />
                  えらぶ
                </span>
              </span>
            )}
            <input
              ref={inputRef}
              aria-label="アイコン（絵文字を1つ）"
              value={draft}
              onFocus={() => {
                setDraft('');
                setKb(true);
              }}
              onBlur={() => setKb(false)}
              onChange={(e) => onIconInput(e.target.value)}
              autoComplete="off"
              autoCorrect="off"
              enterKeyHint="done"
              className="absolute inset-0 cursor-pointer rounded-full border-0 bg-transparent text-[16px] text-transparent caret-transparent opacity-0 outline-none"
            />
          </div>
          {kb && <div className="text-[12px] font-medium text-tomato-ink">キーボードから絵文字を1つ選んでください</div>}
          {iconErr && !kb && <div className="text-[13px] font-bold leading-[1.4] text-danger">⚠ 絵文字を1つだけ入力してください</div>}
        </div>
        <div className="flex flex-col gap-2">
          <FieldLabel label="名前" kind="req" />
          <TextInput value={name} maxLength={LIMITS.name} onChange={(e) => setName(e.target.value)} placeholder="例：田中" />
        </div>
      </div>

      {canStart && (
        <div className="flex flex-col gap-2">
          <div className="text-[12px] font-bold text-ink-2">プレビュー</div>
          <div className="flex items-center gap-3 rounded-card border-[1.5px] border-dashed border-line-strong bg-white px-4 py-3.5">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-emoji-bg text-[26px]">{icon}</span>
            <span className="text-[15px] leading-[1.4]">
              <b className="font-bold">{name.trim()}さん</b>として表示されます
            </span>
          </div>
        </div>
      )}
    </Screen>
  );
}
