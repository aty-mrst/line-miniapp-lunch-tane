'use client';
import { useState } from 'react';
import { ApiError, type Me, type ShopDetail } from '@/lib/api/types';
import { genreEmoji } from '@/lib/constants';
import { openExternal } from '@/lib/liff';
import { shortDate } from '@/lib/time';
import { useApp, useNav, useToast } from '../providers';
import { RecruitCard } from '../RecruitCard';
import { useAsync } from '../useAsync';
import { useRecruitActions } from '../useRecruitActions';
import { Avatar, AvatarStack, ConfirmDialog, PrimaryButton, Screen, ScreenHeader, SecondaryButton, cx } from '../ui';

export type ShopInitial = { deleteOpen?: boolean };

const press = 'cursor-pointer transition-transform duration-100 active:scale-[.97]';

/** 「気になる」ON/OFF を詳細データに反映（自分は likers の先頭） */
function applyLike(d: ShopDetail, on: boolean, me: Me | null): ShopDetail {
  if (d.liked === on) return d;
  const others = d.likers.filter((p) => !p.isMe);
  return {
    ...d,
    liked: on,
    likeCount: Math.max(0, d.likeCount + (on ? 1 : -1)),
    likers: on ? [{ name: me?.name ?? '', icon: me?.icon ?? '🙂', image: me?.image ?? null, isMe: true }, ...others] : others,
  };
}

export function ShopScreen({ id, from, initial }: { id: string; from: 'home' | 'list' | 'likes' | 'mine'; initial?: ShopInitial }) {
  const { api, me } = useApp();
  const nav = useNav();
  const toast = useToast();
  const shop = useAsync(() => api.getShop(id), [api, id]);
  const [deleteOpen, setDeleteOpen] = useState(!!initial?.deleteOpen);
  const [deleting, setDeleting] = useState(false);
  const actions = useRecruitActions((fn) => shop.setData((d) => ({ ...d, recruits: fn(d.recruits) })), { onChanged: shop.refresh });

  const d = shop.data;
  const ready = !shop.loading && !shop.error && !!d;
  const notFound = shop.error instanceof ApiError && shop.error.status === 404;

  const back = () => nav.push(from === 'list' ? '/shops' : from === 'likes' ? '/likes' : from === 'mine' ? '/mine' : '/');

  const toggleLike = async () => {
    if (!d) return;
    const on = !d.liked;
    shop.setData((x) => applyLike(x, on, me));
    try {
      await api.setInterest(id, on);
      toast.show(on ? '「気になる」に追加しました' : '「気になる」から外しました');
    } catch {
      shop.setData((x) => applyLike(x, !on, me));
      toast.show('通信エラーで操作できませんでした。もう一度お試しください', 'err');
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteShop(id);
      setDeleteOpen(false);
      nav.push('/');
      toast.show('お店を削除しました');
    } catch {
      toast.show('通信エラーで削除できませんでした。もう一度お試しください', 'err');
      setDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Screen
        header={<ScreenHeader backLabel={from === 'list' ? 'みんなの店' : from === 'likes' ? '気になる店' : from === 'mine' ? '登録したお店' : 'ホーム'} onBack={back} />}
        scrollClassName="gap-4 px-4 pb-6"
        bar={
          ready ? (
            <>
              <SecondaryButton onClick={() => void openExternal(d.mapUrl)}>📍 マップで開く</SecondaryButton>
              <PrimaryButton onClick={() => nav.push(`/shops/${id}/recruit`)}>🙋 今日ここ行く</PrimaryButton>
            </>
          ) : undefined
        }
      >
        {shop.loading && <ShopSkeleton />}

        {!shop.loading && !!shop.error && (
          <div className="flex flex-col items-center gap-2.5 px-4 py-14 text-center">
            <div className="text-[48px]">😵‍💫</div>
            <div className="font-maru text-[18px] font-bold leading-[1.4]">{notFound ? 'お店が見つかりませんでした' : '読み込めませんでした'}</div>
            <div className="text-[14px] leading-[1.6] text-ink-2">
              {notFound ? 'すでに削除された可能性があります' : '通信状況を確認して、もう一度お試しください'}
            </div>
            <SecondaryButton className="mt-3 px-7" onClick={shop.reload}>
              ↻ 再読み込み
            </SecondaryButton>
          </div>
        )}

        {ready && (
          <>
            {/* ヒーロー */}
            <div className="flex flex-col items-center gap-2.5 py-1 text-center">
              <div className="grid h-[104px] w-[104px] place-items-center rounded-full border border-line bg-white text-[58px]">{d.emoji}</div>
              <div className="font-maru text-[22px] font-bold leading-[1.35]">{d.name}</div>
              <div className="flex flex-wrap justify-center gap-1.5">
                {[`${genreEmoji(d.genre)} ${d.genre}`, `🚶 徒歩${d.walk}`, `💴 ${d.budget}`].map((t) => (
                  <span key={t} className="flex-none whitespace-nowrap rounded-full border border-line bg-white px-2.5 py-[7px] text-[13px] font-medium leading-none">
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* 今日の募集 */}
            {d.recruits.length > 0 && (
              <div className="flex flex-col gap-2.5">
                <div className="font-maru text-[15px] font-bold">🙋 今日この店に行く人がいます</div>
                {d.recruits.map((r) => (
                  <RecruitCard key={r.id} r={r} variant="shop" onJoin={actions.join} onCancel={actions.askCancel} />
                ))}
              </div>
            )}

            {/* 登録者カード */}
            <div className="flex flex-col gap-3 rounded-card border border-line bg-white p-4">
              <div className="flex items-center gap-2.5">
                <Avatar p={d.createdBy} size={36} font={20} />
                <div className="flex-1 text-[14px] font-bold">{d.createdBy.isMe ? 'あなた' : `${d.createdBy.name}さん`}が登録</div>
                <span className="text-[12px] text-ink-2">{`${shortDate(d.createdAt)}に登録`}</span>
              </div>
              {!!d.note && (
                <div className="rounded-[4px_14px_14px_14px] bg-bg px-3.5 py-3 text-[15px] leading-[1.65] [text-wrap:pretty]">{d.note}</div>
              )}
              {d.createdBy.isMe && (
                <div className="flex items-center gap-2 border-t border-line pt-3">
                  <span className="flex-1 text-[12px] font-medium text-ink-2">あなたが登録したお店です</span>
                  <button
                    onClick={() => nav.push(`/shops/${id}/edit`)}
                    className={cx('h-9 rounded-full border-[1.5px] border-line-strong bg-white px-3.5 text-[13px] font-bold text-ink', press)}
                  >
                    編集
                  </button>
                  <button
                    onClick={() => setDeleteOpen(true)}
                    className={cx('h-9 rounded-full border-[1.5px] border-danger-border bg-white px-3.5 text-[13px] font-bold text-danger', press)}
                  >
                    削除
                  </button>
                </div>
              )}
            </div>

            {/* 気になっている人 */}
            <div className="flex flex-col gap-3 rounded-card border border-line bg-white p-4">
              <div className="flex items-baseline gap-1.5">
                <span className="text-[14px] font-bold">気になっている人</span>
                <span className="font-maru text-[20px] font-bold text-mustard-ink">{d.likeCount}</span>
                <span className="text-[13px] font-bold text-mustard-ink">人</span>
              </div>
              {d.likers.length > 0 ? (
                <AvatarStack people={d.likers} />
              ) : (
                <div className="text-[13px] text-ink-2">まだいません。最初の「気になる」をどうぞ</div>
              )}
              <button
                onClick={toggleLike}
                aria-pressed={d.liked}
                className={cx(
                  'h-11 rounded-full border-[1.5px] text-[15px] font-bold',
                  d.liked ? 'border-mustard bg-mustard-soft text-mustard-ink' : 'border-line-strong bg-white text-ink',
                  press,
                )}
              >
                {d.liked ? '🌱 気になる ✓' : '🌱 気になる'}
              </button>
            </div>
          </>
        )}
      </Screen>
      {actions.dialog}
      <ConfirmDialog
        open={deleteOpen}
        icon="🗑️"
        title="このお店を削除しますか？"
        body="この店の『気になる』と募集もすべて消えます。元に戻せません"
        okLabel="削除する"
        onOk={confirmDelete}
        onCancel={() => setDeleteOpen(false)}
        busy={deleting}
      />
    </>
  );
}

function ShopSkeleton() {
  return (
    <>
      <div className="flex flex-col items-center gap-2.5 py-1">
        <div className="h-[104px] w-[104px] rounded-full bg-skeleton" />
        <div className="h-[22px] w-[160px] rounded-md bg-skeleton" />
        <div className="h-[28px] w-[240px] rounded-full bg-skeleton" />
      </div>
      <div className="h-[150px] rounded-card bg-skeleton" />
      <div className="h-[96px] rounded-card bg-skeleton" />
    </>
  );
}
