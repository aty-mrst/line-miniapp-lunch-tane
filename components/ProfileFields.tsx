'use client';
import { useRef, useState } from 'react';
import type { ProfileInput } from '@/lib/api/types';
import { IMAGE_MAX_CHARS, isImageDataUrl, isOneEmoji, LIMITS } from '@/lib/validation';
import { Avatar, FieldLabel, TextInput, cx } from './ui';

export type ProfileInitial = { name?: string; icon?: string; image?: string | null; kbOpen?: boolean };
export type IconMode = 'emoji' | 'image';

/** 画像モードで絵文字未設定のときにAPIへ送る代わりの絵文字 */
const FALLBACK_ICON = '🙂';
const IMAGE_PX = 160;

/** アイコン（絵文字1つ or 画像）と名前の入力状態。登録画面とプロフィール編集で共通 */
export function useProfileForm(initial?: ProfileInitial) {
  const [name, setName] = useState(initial?.name ?? '');
  const [icon, setIcon] = useState(initial?.icon ?? '');
  const [image, setImage] = useState<string | null>(initial?.image ?? null);
  const [mode, setMode] = useState<IconMode>(initial?.image ? 'image' : 'emoji');
  const [kb, setKb] = useState(!!initial?.kbOpen);
  const iconErr = !!icon && !isOneEmoji(icon);
  const valid = !!name.trim() && (mode === 'image' ? !!image : !!icon && !iconErr);
  /** 送信用ペイロード。画像モードでも icon は必須なので有効な絵文字がなければ代わりの絵文字を入れる */
  const payload = (): ProfileInput => ({
    name: name.trim(),
    icon: icon && !iconErr ? icon : FALLBACK_ICON,
    image: mode === 'image' ? image : null,
  });
  return { name, setName, icon, setIcon, image, setImage, mode, setMode, kb, setKb, iconErr, valid, payload };
}

export type ProfileForm = ReturnType<typeof useProfileForm>;

/** 画像ファイルをデコード。EXIFの向きを反映（createImageBitmap → だめなら <img>） */
async function decodeImage(file: File): Promise<{ src: CanvasImageSource; w: number; h: number; close: () => void }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return { src: bmp, w: bmp.width, h: bmp.height, close: () => bmp.close() };
    } catch {
      // Safari の一部などオプション非対応・デコード不可 → <img> で再挑戦
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.style.imageOrientation = 'from-image';
    img.src = url;
    await img.decode();
    if (!img.naturalWidth || !img.naturalHeight) throw new Error('decode');
    return { src: img, w: img.naturalWidth, h: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

/** 中央を正方形に切り抜き、160×160 の JPEG data URL にする。上限を超えたら画質を下げて再試行 */
export async function fileToAvatarDataUrl(file: File): Promise<string> {
  const { src, w, h, close } = await decodeImage(file);
  try {
    const side = Math.min(w, h);
    const canvas = document.createElement('canvas');
    canvas.width = IMAGE_PX;
    canvas.height = IMAGE_PX;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas');
    ctx.fillStyle = '#FFFFFF'; // 透過PNGの背景を白に（JPEGは透過できない）
    ctx.fillRect(0, 0, IMAGE_PX, IMAGE_PX);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, (w - side) / 2, (h - side) / 2, side, side, 0, 0, IMAGE_PX, IMAGE_PX);
    for (const q of [0.85, 0.7, 0.5]) {
      const url = canvas.toDataURL('image/jpeg', q);
      if (url.length <= IMAGE_MAX_CHARS && isImageDataUrl(url)) return url;
    }
    throw new Error('too large');
  } finally {
    close();
  }
}

/** 白カード：アイコン（絵文字 or 画像）＋名前 */
export function ProfileFields({ form }: { form: ProfileForm }) {
  const { name, setName, icon, setIcon, image, setImage, mode, setMode, kb, setKb, iconErr } = form;
  const [draft, setDraft] = useState('');
  const [imgErr, setImgErr] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // 絵文字キーボードを直接開くWeb APIはないため、隠しinputにフォーカスしてOSのキーボードを開く
  const onIconInput = (v: string) => {
    setDraft(v);
    if (!v) return;
    setIcon(v);
    if (isOneEmoji(v)) inputRef.current?.blur();
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setLoading(true);
    setImgErr(false);
    try {
      setImage(await fileToAvatarDataUrl(file));
    } catch {
      setImgErr(true);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = () => fileRef.current?.click();

  const emojiCircle = kb
    ? 'border-[2.5px] border-solid border-tomato bg-tomato-soft'
    : iconErr
      ? 'border-[2.5px] border-solid border-danger bg-danger-soft'
      : icon
        ? 'border-2 border-solid border-line bg-emoji-bg'
        : 'border-2 border-dashed border-tomato-light bg-bg';
  const imageCircle = imgErr
    ? 'border-[2.5px] border-solid border-danger bg-danger-soft'
    : image
      ? 'border-2 border-solid border-line bg-emoji-bg'
      : 'border-2 border-dashed border-tomato-light bg-bg';

  return (
    <div className="flex flex-col gap-5 rounded-dialog border border-line bg-white px-4 py-5">
      <div className="flex flex-col items-center gap-2.5">
        <div className="self-stretch">
          <FieldLabel label="アイコン" kind="req" right={mode === 'emoji' ? '好きな絵文字を1つ' : '好きな画像を1枚'} />
        </div>
        <div role="radiogroup" aria-label="アイコンの種類" className="flex gap-2 self-stretch">
          {(
            [
              ['emoji', '絵文字'],
              ['image', '画像'],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => {
                setMode(m);
                setKb(false);
              }}
              className={cx(
                'h-10 min-h-[40px] flex-1 rounded-full border-[1.5px] border-solid text-[14px] font-bold',
                mode === m ? 'border-tomato bg-tomato-soft text-tomato-ink' : 'border-line bg-white text-ink-2',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === 'emoji' ? (
          <>
            <div className={cx('relative grid h-24 w-24 place-items-center rounded-full', emojiCircle)}>
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
          </>
        ) : (
          <>
            <button
              type="button"
              aria-label={image ? 'アイコン画像を変える' : 'アイコン画像をえらぶ'}
              onClick={pickImage}
              disabled={loading}
              className={cx('relative grid h-24 w-24 place-items-center overflow-hidden rounded-full p-0', imageCircle)}
            >
              {image ? (
                <Avatar p={{ icon: FALLBACK_ICON, image }} size={92} font={52} className="h-full w-full" />
              ) : (
                <span className="flex flex-col items-center gap-0.5 text-tomato-ink">
                  <span className="text-[30px] leading-none">＋</span>
                  <span className="text-[11px] font-bold leading-[1.3]">
                    {loading ? (
                      '読みこみ中…'
                    ) : (
                      <>
                        タップして
                        <br />
                        画像をえらぶ
                      </>
                    )}
                  </span>
                </span>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                void onFile(e.target.files?.[0]);
                e.target.value = ''; // 同じファイルを選び直しても change が発火するように
              }}
            />
            {image && (
              <button type="button" onClick={pickImage} disabled={loading} className="min-h-[44px] px-3 text-[13px] font-bold text-tomato-ink underline underline-offset-2">
                {loading ? '読みこみ中…' : '画像を変える'}
              </button>
            )}
            {imgErr ? (
              <div className="text-[13px] font-bold leading-[1.4] text-danger">⚠ この画像は使えませんでした。別の画像を選んでください</div>
            ) : (
              <div className="text-[12px] text-ink-2">正方形に切り抜いて表示されます</div>
            )}
          </>
        )}
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
  const p = form.payload();
  return (
    <div className="flex flex-col gap-2">
      <div className="text-[12px] font-bold text-ink-2">プレビュー</div>
      <div className="flex items-center gap-3 rounded-card border-[1.5px] border-dashed border-line-strong bg-white px-4 py-3.5">
        <Avatar p={p} size={44} font={26} />
        <span className="text-[15px] leading-[1.4]">
          <b className="font-bold">{form.name.trim()}さん</b>として表示されます
        </span>
      </div>
    </div>
  );
}
