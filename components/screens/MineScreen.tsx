'use client';
import { receivedLikes } from '@/lib/api/recommend';
import { shortDate } from '@/lib/time';
import { useApp, useNav } from '../providers';
import { useAsync } from '../useAsync';
import { EmojiCircle, PrimaryButton, Screen, ScreenHeader, SecondaryButton } from '../ui';

/** 自分が登録したお店の一覧と、もらった「気になる」の数 */
export function MineScreen() {
  const { api } = useApp();
  const nav = useNav();
  const list = useAsync(() => api.listShops(), [api]);
  const ready = !list.loading && !list.error && !!list.data;
  const rows = (list.data ?? []).filter((s) => s.createdBy.isMe).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const total = rows.reduce((n, s) => n + receivedLikes(s), 0);

  return (
    <Screen
      header={<ScreenHeader title="登録したお店" onBack={() => nav.push('/')} />}
      scrollClassName="gap-3 px-4 pb-8 pt-3"
      bar={<PrimaryButton onClick={() => nav.push('/shops/new')}>＋ お店を登録</PrimaryButton>}
    >
      {list.loading && (
        <>
          <div className="h-[96px] rounded-card bg-skeleton" />
          <div className="h-[200px] rounded-card bg-skeleton" />
        </>
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
        <>
          {/* もらった気になるの合計 */}
          <div className="flex items-center gap-4 rounded-card border-[1.5px] border-mustard bg-mustard-bg px-4 py-4">
            <div className="grid h-14 w-14 flex-none place-items-center rounded-full bg-mustard-soft text-[30px]">🌱</div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="text-[12px] font-bold text-mustard-ink">あなたのお店がもらった「気になる」</div>
              <div className="flex items-baseline gap-1 text-mustard-ink">
                <span className="font-maru text-[32px] font-bold leading-none">{total}</span>
                <span className="text-[14px] font-bold">個</span>
                <span className="ml-2 text-[12px] font-medium text-ink-2">{rows.length}店を登録</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col overflow-hidden rounded-card border border-line bg-white">
            {rows.map((s) => {
              const n = receivedLikes(s);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => nav.push(`/shops/${s.id}?from=mine`)}
                  className="flex cursor-pointer items-center gap-3 border-0 border-b border-solid border-row-divider bg-white px-3.5 py-3 text-left text-ink last:border-b-0 active:bg-bg"
                >
                  <EmojiCircle emoji={s.emoji} size={48} font={26} />
                  <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                    <span className="text-[15px] font-bold">{s.name}</span>
                    <span className="text-[12px] text-ink-2">
                      {s.genre} · {shortDate(s.createdAt)}登録
                    </span>
                  </span>
                  <span
                    className={
                      n > 0
                        ? 'flex-none rounded-full bg-mustard-soft px-2.5 py-1.5 text-[13px] font-bold leading-none text-mustard-ink'
                        : 'flex-none rounded-full bg-neutral-tag px-2.5 py-1.5 text-[13px] font-bold leading-none text-ink-2'
                    }
                  >
                    🌱 {n}
                  </span>
                  <span className="text-[20px] text-chevron" aria-hidden>
                    ›
                  </span>
                </button>
              );
            })}
          </div>
          <div className="px-1 text-[12px] leading-[1.6] text-ink-2">🌱 は、ほかの人があなたのお店に付けた「気になる」の数です（自分で付けた分は数えません）</div>
        </>
      )}

      {ready && rows.length === 0 && (
        <div className="flex flex-col items-center gap-3 px-2 py-12 text-center">
          <div className="grid h-24 w-24 place-items-center rounded-full bg-sprout-soft text-[52px]">🌱</div>
          <div className="font-maru text-[18px] font-bold leading-[1.4]">まだ登録したお店はありません</div>
          <div className="text-[14px] leading-[1.7] text-ink-2 [text-wrap:pretty]">
            あなたの「ここ良かった」を登録すると、
            <br />
            みんなの「気になる」がここに届きます
          </div>
        </div>
      )}
    </Screen>
  );
}
