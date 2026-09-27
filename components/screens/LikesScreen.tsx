'use client';
import { useApp, useNav } from '../providers';
import { useAsync } from '../useAsync';
import { EmojiCircle, Screen, ScreenHeader, SecondaryButton } from '../ui';

/** 自分が「🌱 気になる」にしている店の一覧 */
export function LikesScreen() {
  const { api } = useApp();
  const nav = useNav();
  const list = useAsync(() => api.listShops(), [api]);
  const ready = !list.loading && !list.error && !!list.data;
  const rows = (list.data ?? []).filter((s) => s.liked);

  return (
    <Screen header={<ScreenHeader title="気になる店" onBack={() => nav.push('/')} />} scrollClassName="gap-3 px-4 pb-8 pt-3">
      {list.loading && (
        <>
          <div className="h-[15px] w-10 rounded-md bg-skeleton" />
          <div className="flex flex-col overflow-hidden rounded-card border border-line bg-white">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 border-b border-row-divider px-3.5 py-3 last:border-b-0">
                <div className="h-12 w-12 flex-none rounded-full bg-skeleton" />
                <div className="flex flex-1 flex-col gap-2">
                  <div className="h-[15px] w-[60%] rounded-md bg-skeleton" />
                  <div className="h-3 w-[80%] rounded-md bg-skeleton" />
                </div>
              </div>
            ))}
          </div>
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
          <div className="text-[14px] font-bold" aria-live="polite">
            {rows.length}件
          </div>
          <div className="flex flex-col overflow-hidden rounded-card border border-line bg-white">
            {rows.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => nav.push(`/shops/${s.id}?from=likes`)}
                className="flex cursor-pointer items-center gap-3 border-0 border-b border-solid border-row-divider bg-white px-3.5 py-3 text-left text-ink last:border-b-0 active:bg-bg"
              >
                <EmojiCircle emoji={s.emoji} size={48} font={26} />
                <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                  <span className="text-[15px] font-bold">{s.name}</span>
                  <span className="text-[12px] text-ink-2">
                    徒歩{s.walk} · 🌱{s.likeCount}人 · {s.genre}
                  </span>
                </span>
                <span className="text-[20px] text-chevron" aria-hidden>
                  ›
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {ready && rows.length === 0 && (
        <div className="flex flex-col items-center gap-3 px-2 py-12 text-center">
          <div className="grid h-24 w-24 place-items-center rounded-full bg-sprout-soft text-[52px]">🌱</div>
          <div className="font-maru text-[18px] font-bold leading-[1.4]">まだ気になる店はありません</div>
          <div className="text-[14px] leading-[1.7] text-ink-2 [text-wrap:pretty]">お店のページで「🌱 気になる」を押すと、ここに集まります</div>
          <SecondaryButton className="mt-2 px-7" onClick={() => nav.push('/shops')}>
            🍽️ すべての店を見る
          </SecondaryButton>
        </div>
      )}
    </Screen>
  );
}
