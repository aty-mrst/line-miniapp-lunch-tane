'use client';
import { useRef, useState } from 'react';
import { isOneEmoji, LIMITS } from '@/lib/validation';
import { FieldLabel, TextInput, cx } from './ui';

export type ProfileInitial = { name?: string; icon?: string; kbOpen?: boolean };

/** アイコン（絵文字1つ）と名前の入力状態。登録画面とプロフィール編集で共通 */
export function useProfileForm(initial?: ProfileInitial) {
  const [name, setName] = useState(initial?.name ?? '');
  const [icon, setIcon] = useState(initial?.icon ?? '');
  const [kb, setKb] = useState(!!initial?.kbOpen);
  const iconErr = !!icon && !isOneEmoji(icon);
  const valid = !!name.trim() && !!icon && !iconErr;
  return { name, setName, icon, setIcon, kb, setKb, iconErr, valid };
}

export type ProfileForm = ReturnType<typeof useProfileForm>;

/** 白カード：アイコン（大きな丸をタップ → OSの絵文字キーボード）＋名前 */
export function ProfileFields({ form }: { form: ProfileForm }) {
  const { name, setName, icon, setIcon, kb, setKb, iconErr } = form;
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // 絵文字キーボードを直接開くWeb APIはないため、隠しinputにフォーカスしてOSのキーボードを開く
  const onIconInput = (v: string) => {
    setDraft(v);
    if (!v) return;
    setIcon(v);
    if (isOneEmoji(v)) inputRef.current?.blur();
  };

  const circle = kb
    ? 'border-[2.5px] border-solid border-tomato bg-tomato-soft'
    : iconErr
      ? 'border-[2.5px] border-solid border-danger bg-danger-soft'
      : icon
        ? 'border-2 border-solid border-line bg-emoji-bg'
        : 'border-2 border-dashed border-tomato-light bg-bg';

  return (
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
        <TextInput value={name} maxLength={LIMITS.name} onChange={(e) => setName(e.target.value)} placeholder="例：田中" aria-label="名前" />
      </div>
    </div>
  );
}

/** 「🐣 田中さんとして表示されます」 */
export function ProfilePreview({ form }: { form: ProfileForm }) {
  if (!form.valid) return null;
  return (
    <div className="flex flex-col gap-2">
      <div className="text-[12px] font-bold text-ink-2">プレビュー</div>
      <div className="flex items-center gap-3 rounded-card border-[1.5px] border-dashed border-line-strong bg-white px-4 py-3.5">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-emoji-bg text-[26px]">{form.icon}</span>
        <span className="text-[15px] leading-[1.4]">
          <b className="font-bold">{form.name.trim()}さん</b>として表示されます
        </span>
      </div>
    </div>
  );
}
