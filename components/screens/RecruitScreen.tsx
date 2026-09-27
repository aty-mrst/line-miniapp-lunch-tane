'use client';
import { useState } from 'react';
import { ApiError, type ShopDetail } from '@/lib/api/types';
import { DEPART_RANGE, PLACES, departTimes, isDepartTime, type DepartTime, type Place } from '@/lib/constants';
import { isPast, jstTime } from '@/lib/time';
import { useApp, useNav, useToast } from '../providers';
import { useAsync } from '../useAsync';
import { AvatarStack, EmojiCircle, FieldLabel, PrimaryButton, Screen, ScreenHeader, SecondaryButton, SelectTile, TextInput, cx } from '../ui';

export type RecruitInitial = { time?: string; place?: string; placeOther?: string; note?: string; done?: boolean };

const asTime = (t?: string): DepartTime | null => (t && isDepartTime(t) ? t : null);
const asPlace = (p?: string): Place | null => (p && PLACES.some((x) => x.v === p) ? (p as Place) : null);

export function RecruitScreen({ shopId, initial }: { shopId: string; initial?: RecruitInitial }) {
  const { api } = useApp();
  const nav = useNav();
  const toast = useToast();
  const shop = useAsync(() => api.getShop(shopId), [api, shopId]);

  const [time, setTime] = useState<DepartTime | null>(asTime(initial?.time));
  const [place, setPlace] = useState<Place | null>(asPlace(initial?.place));
  const [placeOther, setPlaceOther] = useState(initial?.placeOther ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [done, setDone] = useState(!!initial?.done);
  const [busy, setBusy] = useState(false);

  const now = api.now();
  const options = departTimes().filter((t) => !isPast(t, now)); // 今より後の時間だけ
  const allPast = options.length === 0;
  const timeOk = !!time && !isPast(time, now);
  const isOther = place === 'その他';
  const placeName = isOther ? placeOther.trim() : place ?? '';
  const canSubmit = !allPast && timeOk && !!placeName && !busy;
  const reason = allPast ? '今日の募集は締め切りました' : isOther && timeOk ? '集合場所を入力すると押せます' : '出発時間と集合場所を選ぶと押せます';

  const submit = async () => {
    if (!canSubmit || !time || !place) return;
    setBusy(true);
    try {
      await api.createRecruit({
        shopId,
        departTime: time,
        place,
        placeOther: isOther ? placeOther.trim() : undefined,
        note: note.trim() || undefined,
      });
      setDone(true);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'ALREADY_HOSTING') toast.show(e.message, 'err');
      else toast.show('通信エラーで募集できませんでした。入力内容はそのまま残っています', 'err');
    } finally {
      setBusy(false);
    }
  };

  const d = shop.data;
  const ready = !shop.loading && !shop.error && !!d;

  if (done && ready) {
    return <DoneView shop={d} time={time ?? ''} placeName={placeName} onHome={() => nav.push('/')} />;
  }

  return (
    <Screen
      header={<ScreenHeader title="今日ここ行く" onBack={() => nav.push(`/shops/${shopId}`)} />}
      scrollClassName="gap-[22px] px-4 pb-6 pt-1"
      bar={
        ready && !done ? (
          <PrimaryButton disabled={!canSubmit} reason={busy ? undefined : reason} onClick={submit}>
            この内容で募集する
          </PrimaryButton>
        ) : undefined
      }
    >
      {shop.loading && <FormSkeleton />}

      {!shop.loading && !!shop.error && (
        <div className="flex flex-col items-center gap-2.5 px-4 py-14 text-center">
          <div className="text-[48px]">😵‍💫</div>
          <div className="font-maru text-[18px] font-bold leading-[1.4]">読み込めませんでした</div>
          <div className="text-[14px] leading-[1.6] text-ink-2">通信状況を確認して、もう一度お試しください</div>
          <SecondaryButton className="mt-3 px-7" onClick={shop.reload}>
            ↻ 再読み込み
          </SecondaryButton>
        </div>
      )}

      {ready && (
        <>
          {/* お店 */}
          <div className="flex flex-col gap-2">
            <FieldLabel label="お店" />
            <div className="flex items-center gap-3 rounded-card border border-line bg-white px-3.5 py-3">
              <EmojiCircle emoji={d.emoji} size={48} font={26} />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="block text-[16px] font-bold leading-[1.4]">{d.name}</span>
                <span className="text-[12px] text-ink-2">
                  徒歩{d.walk} · {d.budget}
                </span>
              </div>
            </div>
          </div>

          {/* 出発時間 */}
          <div className="flex flex-col gap-2">
            <FieldLabel label="出発時間" kind="req" right={`いま ${jstTime(now)}`} />
            <div className="relative">
              <select
                aria-label="出発時間"
                value={timeOk ? time! : ''}
                disabled={allPast}
                onChange={(e) => setTime(e.target.value || null)}
                className={cx(
                  'h-[52px] w-full cursor-pointer appearance-none rounded-input border-[1.5px] pl-4 pr-10 font-maru text-[17px] font-bold outline-none',
                  allPast
                    ? 'border-disabled-soft bg-disabled-soft text-ink-disabled'
                    : timeOk
                      ? 'border-tomato bg-tomato-soft text-tomato-ink'
                      : 'border-line-strong bg-white text-ink-2',
                )}
              >
                <option value="">{allPast ? '今日はもう選べる時間がありません' : '時間を選ぶ'}</option>
                {options.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[13px] text-ink-2">▾</span>
            </div>
            <div className="text-[12px] text-ink-2">
              {DEPART_RANGE.from}〜{DEPART_RANGE.to}の{DEPART_RANGE.stepMin}分刻みで選べます
            </div>
          </div>

          {/* 集合場所 */}
          <div className="flex flex-col gap-2">
            <FieldLabel label="集合場所" kind="req" />
            <div className="grid grid-cols-2 gap-1.5">
              {PLACES.map((p) => (
                <SelectTile key={p.v} selected={place === p.v} onClick={() => setPlace(p.v)} className="h-[52px] text-[15px] font-bold">
                  {p.e} {p.v}
                </SelectTile>
              ))}
            </div>
            {isOther && (
              <TextInput
                value={placeOther}
                onChange={(e) => setPlaceOther(e.target.value)}
                placeholder="例：虎ノ門ヒルズ駅 A1出口"
                maxLength={30}
                aria-label="集合場所"
                className={cx('px-3.5 text-[15px]', '!border-tomato')}
              />
            )}
          </div>

          {/* ひとこと */}
          <div className="flex flex-col gap-2">
            <FieldLabel label="ひとこと" kind="opt" />
            <TextInput
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="例：さくっと食べて戻ります"
              maxLength={60}
              aria-label="ひとこと"
              className="text-[15px]"
            />
          </div>
        </>
      )}
    </Screen>
  );
}

function DoneView({ shop, time, placeName, onHome }: { shop: ShopDetail; time: string; placeName: string; onHome: () => void }) {
  const others = shop.likers.filter((p) => !p.isMe);
  return (
    <Screen
      scrollClassName="items-center gap-3.5 px-4 pb-6 pt-10 text-center"
      bar={<PrimaryButton onClick={onHome}>ホームで確認する</PrimaryButton>}
    >
      <div className="grid h-[104px] w-[104px] place-items-center rounded-full bg-tomato-soft text-[56px]">🙌</div>
      <div className="font-maru text-[24px] font-bold leading-[1.3]">募集しました！</div>

      <div className="mt-1.5 flex items-center gap-3 self-stretch rounded-card border border-line bg-white px-4 py-3.5 text-left">
        <div className="flex w-14 flex-none flex-col items-center">
          <span className="font-maru text-[20px] font-bold leading-[1.1]">{time}</span>
          <span className="text-[11px] font-medium text-ink-2">出発</span>
        </div>
        <div className="w-px self-stretch bg-line" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="block text-[15px] font-bold leading-[1.4]">
            {shop.emoji} {shop.name}
          </span>
          <span className="block text-[12px] leading-[1.4] text-ink-2">{placeName}集合</span>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 self-stretch rounded-card bg-mustard-soft px-4 py-3.5 text-left">
        {others.length > 0 && <AvatarStack people={others} size={32} font={17} overlap={8} border={2} borderColor="#FFF3D1" />}
        <div className="text-[14px] font-medium leading-[1.6] text-mustard-ink-2 [text-wrap:pretty]">
          この店を『気になる』にしている人のホームで目立って表示されます
        </div>
      </div>
    </Screen>
  );
}

function FormSkeleton() {
  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="h-[15px] w-[60px] rounded-md bg-skeleton" />
        <div className="h-[74px] rounded-card bg-skeleton" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-[15px] w-[90px] rounded-md bg-skeleton" />
        <div className="h-[110px] rounded-input bg-skeleton" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-[15px] w-[90px] rounded-md bg-skeleton" />
        <div className="h-[110px] rounded-input bg-skeleton" />
      </div>
    </>
  );
}
