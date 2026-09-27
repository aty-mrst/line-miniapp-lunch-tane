'use client';
import { useState } from 'react';
import { jstDateLabel } from '@/lib/time';
import { useApp, useNav } from '../providers';
import { RecruitCard } from '../RecruitCard';
import { useAsync } from '../useAsync';
import { useRecruitActions } from '../useRecruitActions';
import { EmojiCircle, PrimaryButton, Screen, SecondaryButton, SubActionButton, cx } from '../ui';

export type HomeInitial = { expanded?: boolean; cancelId?: string };

export function HomeScreen({ initial }: { initial?: HomeInitial }) {
  const { api, me } = useApp();
  const nav = useNav();
  const home = useAsync(() => api.getHome(), [api]);
  const [expanded, setExpanded] = useState(!!initial?.expanded);
  const actions = useRecruitActions((fn) => home.setData((d) => ({ ...d, recruits: fn(d.recruits) })), {
    initialCancelId: initial?.cancelId,
    onChanged: home.refresh,
  });

  const data = home.data;
  const ready = !home.loading && !home.error && data && data.shopCount > 0;
  const noShops = !home.loading && !home.error && data && data.shopCount === 0;
  const cards = data?.recruits ?? [];
  const shown = expanded ? cards : cards.slice(0, 3);
  const more = Math.max(0, cards.length - 3);
  const openShop = (id: string) => nav.push(`/shops/${id}`);

  return (
    <>
      <Screen
        scrollClassName="gap-6 px-4 pb-6 pt-4"
        bar={
          ready ? (
            <div className="flex gap-2">
              <SecondaryButton className="h-[52px] flex-1" onClick={() => nav.push('/shops')}>
                🍽️ すべての店
              </SecondaryButton>
              <SubActionButton className="h-[52px] flex-1" onClick={() => nav.push('/shops/new')}>
                ＋ お店を登録
              </SubActionButton>
            </div>
          ) : undefined
        }
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => nav.push('/me')}
            aria-label="プロフィールを編集"
            className="relative grid h-11 w-11 flex-none cursor-pointer place-items-center rounded-full border border-line bg-white p-0 text-[24px] transition-transform duration-100 active:scale-[.97]"
          >
            {me?.icon}
            <span className="absolute -bottom-0.5 -right-0.5 grid h-[18px] w-[18px] place-items-center rounded-full border-[1.5px] border-white bg-ink text-[9px] leading-none text-white">✎</span>
          </button>
          <div className="flex flex-col gap-0.5">
            <div className="text-[12px] font-medium text-ink-2">{jstDateLabel(api.now())}</div>
            <div className="font-maru text-[18px] font-bold leading-[1.3]">{me?.name}さん、今日はどこ行く？</div>
          </div>
        </div>

        {home.loading && <HomeSkeleton />}

        {!home.loading && !!home.error && (
          <div className="flex flex-col items-center gap-2.5 px-4 py-14 text-center">
            <div className="text-[48px]">😵‍💫</div>
            <div className="font-maru text-[18px] font-bold leading-[1.4]">読み込めませんでした</div>
            <div className="text-[14px] leading-[1.6] text-ink-2">通信状況を確認して、もう一度お試しください</div>
            <SecondaryButton className="mt-3 px-7" onClick={home.reload}>
              ↻ 再読み込み
            </SecondaryButton>
          </div>
        )}

        {noShops && (
          <div className="flex flex-col items-center gap-3 rounded-dialog border border-line bg-white px-5 pb-6 pt-8 text-center">
            <div className="grid h-24 w-24 place-items-center rounded-full bg-sprout-soft text-[52px]">🌱</div>
            <div className="font-maru text-[20px] font-bold leading-[1.4]">まだお店がありません</div>
            <div className="text-[14px] leading-[1.7] text-ink-2 [text-wrap:pretty]">
              虎ノ門で見つけた「ここ良かった」を、
              <br />
              最初の1店として登録してみませんか？
            </div>
            <div className="mt-2 self-stretch">
              <PrimaryButton className="w-full" onClick={() => nav.push('/shops/new')}>
                ＋ 最初のお店を登録
              </PrimaryButton>
            </div>
            <div className="text-[12px] text-ink-2">Googleマップのリンクを貼って、あとは選ぶだけ</div>
          </div>
        )}

        {ready && (
          <>
            <section className="flex flex-col gap-3">
              <h2 className="m-0 font-maru text-[17px] font-bold">今日のおすすめ</h2>
              <div className="grid grid-cols-3 gap-2">
                {data.recommend.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => openShop(s.id)}
                    className="flex min-h-[124px] cursor-pointer flex-col items-center gap-2.5 rounded-card border border-line bg-white px-1.5 pb-3.5 pt-4 text-ink transition-transform duration-100 active:scale-[.97]"
                  >
                    <EmojiCircle emoji={s.emoji} size={56} font={32} />
                    <span className="text-center text-[13px] font-bold leading-[1.4] [text-wrap:pretty]">{s.name}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <h2 className="m-0 font-maru text-[17px] font-bold">今日ここ行く人？</h2>
                {cards.length > 0 && <span className="rounded-full bg-tomato-soft px-2 py-[5px] text-[12px] font-bold leading-none text-tomato-ink">{cards.length}件</span>}
              </div>
              {cards.length === 0 && (
                <div className="flex flex-col items-center gap-1.5 rounded-card border-[1.5px] border-dashed border-line-strong bg-white/50 px-4 py-6 text-center">
                  <div className="text-[30px]">🍽️</div>
                  <div className="text-[15px] font-bold leading-normal">まだ募集はありません。</div>
                  <div className="text-[13px] leading-[1.6] text-ink-2">おすすめの店から『今日ここ行く』で募集できます</div>
                </div>
              )}
              {shown.map((r) => (
                <RecruitCard key={r.id} r={r} onOpen={() => openShop(r.shop.id)} onJoin={actions.join} onCancel={actions.askCancel} />
              ))}
              {more > 0 && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className={cx('h-11 cursor-pointer rounded-input border border-line bg-white text-[14px] font-bold text-ink')}
                >
                  {expanded ? '閉じる ▴' : `ほか${more}件を表示 ▾`}
                </button>
              )}
            </section>
          </>
        )}
      </Screen>
      {actions.dialog}
    </>
  );
}

function HomeSkeleton() {
  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="h-[18px] w-[120px] rounded-md bg-skeleton" />
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[116px] rounded-card bg-skeleton" />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="h-[18px] w-[150px] rounded-md bg-skeleton" />
        <div className="h-[92px] rounded-card bg-skeleton" />
        <div className="h-[92px] rounded-card bg-skeleton" />
      </div>
    </>
  );
}
