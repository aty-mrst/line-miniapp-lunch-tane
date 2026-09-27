'use client';
import { useEffect, useState } from 'react';
import { ApiError, type DuplicateShop, type ShopInput } from '@/lib/api/types';
import { BUDGETS, GENRES, WALKS, genreEmoji, type Budget, type Genre, type Walk } from '@/lib/constants';
import { LIMITS, isMapUrl } from '@/lib/validation';
import { useApp, useNav, useToast } from '../providers';
import { EmojiCircle, FieldLabel, PrimaryButton, Screen, ScreenHeader, SecondaryButton, SelectTile, TextInput, cx } from '../ui';

export type ShopFormInitial = { url?: string; name?: string; genre?: string; walk?: string; budget?: string; note?: string; doneShopId?: string };

type Form = { url: string; name: string; genre: string; walk: string; budget: string; note: string };
type DoneShop = { id: string; name: string; emoji: string; genre: string; walk: string; budget: string };

const blank: Form = { url: '', name: '', genre: '', walk: '', budget: '', note: '' };

function fromInitial(i?: ShopFormInitial): Form {
  return { url: i?.url ?? '', name: i?.name ?? '', genre: i?.genre ?? '', walk: i?.walk ?? '', budget: i?.budget ?? '', note: i?.note ?? '' };
}

/** 409 DUPLICATE の data は DuplicateShop そのもの（mock）か { shop } （HTTP）のどちらでも受ける */
function dupFromError(data: unknown): DuplicateShop | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  const s = (d.shop && typeof d.shop === 'object' ? d.shop : d) as Partial<DuplicateShop>;
  return s.id ? (s as DuplicateShop) : null;
}

export function ShopFormScreen({ editId, initial }: { editId?: string; initial?: ShopFormInitial }) {
  const { api } = useApp();
  const nav = useNav();
  const toast = useToast();
  const isEdit = !!editId;

  const [f, setF] = useState<Form>(() => fromInitial(initial));
  const [dup, setDup] = useState<DuplicateShop | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<DoneShop | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(isEdit);
  const [loadErr, setLoadErr] = useState(false);

  const upd = (p: Partial<Form>) => setF((s) => ({ ...s, ...p }));

  // 編集：既存の内容を読み込んで入れる
  const loadEdit = () => {
    if (!editId) return;
    setLoadingEdit(true);
    setLoadErr(false);
    api.getShop(editId).then(
      (s) => {
        setF({ url: s.mapUrl, name: s.name, genre: s.genre, walk: s.walk, budget: s.budget, note: s.note ?? '' });
        setLoadingEdit(false);
      },
      () => {
        setLoadErr(true);
        setLoadingEdit(false);
      },
    );
  };
  useEffect(() => {
    loadEdit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, editId]);

  // 完了画面の再現（/dev/states 用）
  useEffect(() => {
    if (isEdit || !initial?.doneShopId) return;
    let alive = true;
    api.getShop(initial.doneShopId).then(
      (s) => alive && setDone({ id: s.id, name: s.name, emoji: s.emoji || genreEmoji(s.genre), genre: s.genre, walk: s.walk, budget: s.budget }),
      () => {},
    );
    return () => {
      alive = false;
    };
  }, [api, isEdit, initial?.doneShopId]);

  // 入力中の重複チェック（300ms デバウンス）
  const url = f.url.trim();
  const name = f.name.trim();
  useEffect(() => {
    if (done || loadingEdit) return;
    if (!url && !name) {
      setDup(null);
      return;
    }
    let alive = true;
    const t = setTimeout(() => {
      api.checkShop({ url, name, excludeId: editId }).then(
        (d) => alive && setDup(d),
        () => {},
      );
    }, 300);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [api, url, name, editId, done, loadingEdit]);

  const urlValid = isMapUrl(url);
  const urlErr = !!url && !urlValid;
  const missing = [urlValid, !!name, !!f.genre, !!f.walk, !!f.budget].filter((x) => !x).length;
  const canSubmit = missing === 0 && !dup && !busy && !loadingEdit && !loadErr;
  const reason = dup ? 'すでに登録されているお店です' : urlErr ? 'リンクを確認してください' : missing > 0 ? `必須項目があと${missing}つです` : undefined;

  const submit = async () => {
    if (!canSubmit) return;
    const input: ShopInput = {
      mapUrl: url,
      name,
      genre: f.genre as Genre,
      walk: f.walk as Walk,
      budget: f.budget as Budget,
      note: f.note.trim(),
    };
    setBusy(true);
    try {
      if (editId) {
        await api.updateShop(editId, input);
        toast.show('保存しました');
        nav.push(`/shops/${editId}`);
      } else {
        const s = await api.createShop(input);
        toast.clear();
        setDone({ id: s.id, name: s.name, emoji: s.emoji || genreEmoji(s.genre), genre: s.genre, walk: s.walk, budget: s.budget });
      }
    } catch (e) {
      const d = e instanceof ApiError && (e.code === 'DUPLICATE' || e.status === 409) ? dupFromError(e.data) : null;
      if (d) setDup(d);
      else toast.show('通信エラーで登録できませんでした。入力内容はそのまま残っています', 'err');
    } finally {
      setBusy(false);
    }
  };

  const header = (
    <ScreenHeader title={isEdit ? 'お店を編集' : 'お店を登録'} onBack={() => nav.push(isEdit ? `/shops/${editId}` : '/')} />
  );

  /* ---------- 登録完了 ---------- */
  if (done && !isEdit) {
    return (
      <Screen
        header={header}
        scrollClassName="items-center gap-3.5 px-4 pb-6 pt-8 text-center"
        bar={
          <>
            <PrimaryButton className="w-full" onClick={() => nav.push(`/shops/${done.id}`)}>
              店舗ページを見る
            </PrimaryButton>
            <SecondaryButton
              onClick={() => {
                setF(blank);
                setDup(null);
                setDone(null);
                toast.clear();
              }}
            >
              もう1店登録する
            </SecondaryButton>
          </>
        }
      >
        <div className="grid h-[104px] w-[104px] flex-none place-items-center rounded-full bg-sprout-soft text-[56px]">🌱</div>
        <div className="font-maru text-[24px] font-bold leading-[1.3]">登録しました！</div>
        <div className="text-[14px] leading-[1.6] text-ink-2">みんなの店に、新しいたねが1つ増えました</div>
        <div className="mt-1.5 flex items-center gap-3 self-stretch rounded-card border border-line bg-white px-4 py-3.5 text-left">
          <EmojiCircle emoji={done.emoji} size={52} font={28} />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="block text-[16px] font-bold leading-[1.4]">{done.name}</span>
            <span className="text-[12px] text-ink-2">
              {done.genre} · 徒歩{done.walk} · {done.budget}
            </span>
          </div>
        </div>
      </Screen>
    );
  }

  /* ---------- 編集の読み込み ---------- */
  if (isEdit && (loadingEdit || loadErr)) {
    return (
      <Screen header={header} scrollClassName="gap-[22px] px-4 pb-6 pt-1">
        {loadingEdit ? (
          <>
            {[48, 48, 136, 44, 44].map((h, i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="h-[16px] w-[120px] rounded-md bg-skeleton" />
                <div className="rounded-input bg-skeleton" style={{ height: h }} />
              </div>
            ))}
          </>
        ) : (
          <div className="flex flex-col items-center gap-2.5 px-4 py-14 text-center">
            <div className="text-[48px]">😵‍💫</div>
            <div className="font-maru text-[18px] font-bold leading-[1.4]">読み込めませんでした</div>
            <div className="text-[14px] leading-[1.6] text-ink-2">通信状況を確認して、もう一度お試しください</div>
            <SecondaryButton className="mt-3 px-7" onClick={loadEdit}>
              ↻ 再読み込み
            </SecondaryButton>
          </div>
        )}
      </Screen>
    );
  }

  /* ---------- フォーム ---------- */
  return (
    <Screen
      header={header}
      scrollClassName="gap-[22px] px-4 pb-6 pt-1"
      bar={
        <PrimaryButton disabled={!canSubmit} reason={busy ? undefined : reason} onClick={submit}>
          {isEdit ? '保存する' : '登録する'}
        </PrimaryButton>
      }
    >
      {/* Googleマップのリンク */}
      <div className="flex flex-col gap-2">
        <FieldLabel label="Googleマップのリンク" kind="req" />
        <TextInput
            value={f.url}
            onChange={(e) => upd({ url: e.target.value })}
            placeholder="https://maps.app.goo.gl/…"
            inputMode="url"
            autoComplete="off"
            aria-label="Googleマップのリンク"
            aria-invalid={urlErr}
            invalid={urlErr}
            className="px-3 !text-[14px]"
          />
        {urlErr && (
          <div className="text-[13px] font-bold leading-[1.5] text-danger">⚠ Googleマップのリンクではないようです。Googleマップで店を開いてリンクをコピーしてください</div>
        )}
        <div className="text-[12px] leading-[1.6] text-ink-2">Googleマップで店を開き『共有』→『リンクをコピー』</div>
      </div>

      {/* 店名 */}
      <div className="flex flex-col gap-2">
        <FieldLabel label="店名" kind="req" />
        <TextInput
          value={f.name}
          onChange={(e) => upd({ name: e.target.value })}
          placeholder="例：麺処 しおかぜ"
          maxLength={LIMITS.shopName}
          aria-label="店名"
          className={cx(dup && '!border-mustard')}
        />
      </div>

      {dup && (
        <div className="flex flex-col gap-2.5 rounded-card border-[1.5px] border-mustard bg-mustard-soft p-3.5" role="status">
          <div className="text-[14px] font-bold leading-[1.5] text-mustard-ink-2">この店はすでに{dup.createdByName}さんが登録しています</div>
          <div className="flex items-center gap-2.5 rounded-input bg-white px-3 py-2.5">
            <span className="text-[26px]">{dup.emoji}</span>
            <span className="flex-1 text-[14px] font-bold">{dup.name}</span>
          </div>
          <button
            type="button"
            onClick={() => nav.push(`/shops/${dup.id}`)}
            className="h-11 cursor-pointer rounded-full border-0 bg-ink text-[14px] font-bold text-white transition-transform duration-100 active:scale-[.97]"
          >
            店舗ページを見る ›
          </button>
        </div>
      )}

      {/* ジャンル */}
      <div className="flex flex-col gap-2">
        <FieldLabel label="ジャンル" kind="req" />
        <div className="grid grid-cols-4 gap-1.5">
          {GENRES.map((g) => (
            <SelectTile
              key={g.v}
              type="button"
              selected={f.genre === g.v}
              onClick={() => upd({ genre: g.v })}
              className="flex h-16 flex-col items-center justify-center gap-0.5"
            >
              <span className="text-[24px] leading-[1.1]">{g.e}</span>
              <span className="text-center text-[11px] font-bold leading-[1.3]">{g.v}</span>
            </SelectTile>
          ))}
        </div>
      </div>

      {/* 徒歩 */}
      <div className="flex flex-col gap-2">
        <FieldLabel label="オフィスから徒歩" kind="req" />
        <div className="grid grid-cols-3 gap-1.5">
          {WALKS.map((w) => (
            <SelectTile key={w} type="button" selected={f.walk === w} onClick={() => upd({ walk: w })} className="h-11 text-[14px] font-bold">
              {w}
            </SelectTile>
          ))}
        </div>
      </div>

      {/* 予算 */}
      <div className="flex flex-col gap-2">
        <FieldLabel label="予算" kind="req" />
        <div className="grid grid-cols-3 gap-1.5">
          {BUDGETS.map((b) => (
            <SelectTile key={b} type="button" selected={f.budget === b} onClick={() => upd({ budget: b })} className="h-11 text-[14px] font-bold">
              {b}
            </SelectTile>
          ))}
        </div>
      </div>

      {/* ひとこと */}
      <div className="flex flex-col gap-2">
        <FieldLabel label="ひとこと" kind="opt" />
        <textarea
          value={f.note}
          onChange={(e) => upd({ note: e.target.value })}
          rows={2}
          maxLength={LIMITS.shopNote}
          placeholder="例：つけ麺が濃厚でおすすめ"
          aria-label="ひとこと"
          className="box-border resize-none rounded-input border-[1.5px] border-line-strong bg-white px-3.5 py-3 text-[15px] leading-[1.5] text-ink outline-none placeholder:text-ink-2/60 focus:border-tomato"
        />
      </div>
    </Screen>
  );
}
