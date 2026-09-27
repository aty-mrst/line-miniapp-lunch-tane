'use client';
import { jstDateLabel } from '@/lib/time';
import { useApp, useNav } from '../providers';
import { RecruitCard } from '../RecruitCard';
import { useAsync } from '../useAsync';
import { useRecruitActions } from '../useRecruitActions';
import { Avatar, EmojiCircle, PrimaryButton, Screen, SecondaryButton, SubActionButton, cx } from '../ui';

export type HomeInitial = { cancelId?: string };

/** 横スクロール行：画面の右端まで伸ばす（左は16pxの余白） */
const ROW = 'la-scroll -mx-4 flex snap-x gap-2 overflow-x-auto px-4 scroll-px-4';

export function HomeScreen({ initial }: { initial?: HomeInitial }) {
  const { api, me } = useApp();
  const nav = useNav();
  const home = useAsync(() => api.getHome(), [api]);
  const actions = useRecruitActions((fn) => home.setData((d) => ({ ...d, recruits: fn(d.recruits) })), {
    initialCancelId: initial?.cancelId,
    onChanged: home.refresh,
  });

  const data = home.data;
  const ready = !home.loading && !home.error && data && data.shopCount > 0;
  const noShops = !home.loading && !home.error && data && data.shopCount === 0;
  const cards = data?.recruits ?? [];
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
            className="relative h-11 w-11 flex-none cursor-pointer rounded-full border border-line bg-white p-0 transition-transform duration-100 active:scale-[.97]"
          >
            {me && <Avatar p={me} size={42} font={24} />}
            <span className="absolute -bottom-0.5 -right-0.5 grid h-[18px] w-[18px] place-items-center rounded-full border-[1.5px] border-white bg-ink text-[9px] leading-none text-white">✎</span>
          </button>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="text-[12px] font-medium text-ink-2">{jstDateLabel(api.now())}</div>
            <div className="font-maru text-[18px] font-bold leading-[1.3]">
              {/* 狭い画面では「〇〇さん、」の後で改行する（語の途中で折り返さない） */}
              <span className="inline-block">{me?.name}さん、</span>
              <span className="inline-block">今日はどこ行く？</span>
            </div>
          </div>
        </div>

        {data && !home.error && (
          <MyStats
            myShopCount={data.myShopCount}
            receivedLikes={data.receivedLikes}
            likedCount={data.likedCount}
            onMine={() => nav.push('/mine')}
            onLikes={() => nav.push('/likes')}
          />
        )}

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
              <h2 className="m-0 font-maru text-[17px] font-bold">今日のおすすめTOP3</h2>
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
              {cards.length === 0 ? (
                <div className="flex flex-col items-center gap-1.5 rounded-card border-[1.5px] border-dashed border-line-strong bg-white/50 px-4 py-6 text-center">
                  <div className="text-[30px]">🍽️</div>
                  <div className="text-[15px] font-bold leading-normal">まだ募集はありません。</div>
                  <div className="text-[13px] leading-[1.6] text-ink-2">おすすめの店から『今日ここ行く』で募集できます</div>
                </div>
              ) : (
                <div className={cx(ROW, 'items-stretch')}>
                  {cards.map((r) => (
                    <div key={r.id} className="flex-none snap-start" style={{ width: 'calc((100% + 8px) / 1.4)' }}>
                      <RecruitCard r={r} variant="compact" onOpen={() => openShop(r.shop.id)} onJoin={actions.join} onCancel={actions.askCancel} />
                    </div>
                  ))}
                </div>
              )}
            </section>

            {data.ranking.length > 0 && (
              <section className="flex flex-col gap-3">
                <h2 className="m-0 font-maru text-[17px] font-bold">🌱 気になるランキング</h2>
                <div className={ROW}>
                  {data.ranking.slice(0, 6).map((s, i) => (
                    <button
                      key={s.id}
                      onClick={() => openShop(s.id)}
                      className="relative flex flex-none snap-start cursor-pointer flex-col items-center gap-2 rounded-card border border-line bg-white px-1.5 pb-3 pt-3.5 text-ink transition-transform duration-100 active:scale-[.97]"
                      style={{ width: 'calc((100% - 8px) / 3.5)' }}
                    >
                      <span
                        className={cx(
                          'absolute left-1.5 top-1.5 grid h-[22px] min-w-[22px] place-items-center rounded-full px-1 font-maru text-[12px] font-bold leading-none',
                          i < 3 ? 'bg-mustard text-white' : 'bg-neutral-tag text-ink-2',
                        )}
                      >
                        {i + 1}
                      </span>
                      <EmojiCircle emoji={s.emoji} size={52} font={28} />
                      <span className="line-clamp-2 text-center text-[13px] font-bold leading-[1.35]">{s.name}</span>
                      <span className="mt-auto text-[12px] font-bold leading-none text-mustard-ink">🌱 {s.likeCount}人</span>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </Screen>
      {actions.dialog}
    </>
  );
}

/** 「あなたのたね」：登録したお店・もらった🌱・気になる店 */
function MyStats({ myShopCount, receivedLikes, likedCount, onMine, onLikes }: {
  myShopCount: number; receivedLikes: number; likedCount: number; onMine: () => void; onLikes: () => void;
}) {
  const cell = 'flex min-h-[68px] flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 border-0 bg-transparent px-1 py-2 text-ink transition-transform duration-100 active:scale-[.97]';
  return (
    <section className="-mt-2 flex flex-col gap-2 rounded-card border border-line bg-white px-2 pb-1 pt-3">
      <div className="px-2 text-[12px] font-bold text-ink-2">あなたのたね</div>
      <div className="flex items-stretch">
        <button onClick={onMine} className={cell} aria-label={`登録したお店 ${myShopCount}店`}>
          <span className="font-maru text-[22px] font-bold leading-none">
            {myShopCount}
            <span className="ml-0.5 text-[12px]">店</span>
          </span>
          <span className="text-[11px] font-bold text-ink-2">登録したお店</span>
        </button>
        <div className="my-2 w-px bg-line" />
        <button onClick={onMine} className={cell} aria-label={`もらった気になる ${receivedLikes}`}>
          <span className="flex items-center gap-1 font-maru text-[22px] font-bold leading-none text-mustard-ink">
            <span className="text-[16px]">🌱</span>
            {receivedLikes}
          </span>
          <span className="text-[11px] font-bold text-ink-2">もらった気になる</span>
        </button>
        <div className="my-2 w-px bg-line" />
        <button onClick={onLikes} className={cell} aria-label={`気になる店 ${likedCount}件`}>
          <span className="font-maru text-[22px] font-bold leading-none">
            {likedCount}
            <span className="ml-0.5 text-[12px]">店</span>
          </span>
          <span className="text-[11px] font-bold text-ink-2">気になる店</span>
        </button>
      </div>
    </section>
  );
}

function HomeSkeleton() {
  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="h-[18px] w-[150px] rounded-md bg-skeleton" />
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[116px] rounded-card bg-skeleton" />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="h-[18px] w-[150px] rounded-md bg-skeleton" />
        <div className="-mx-4 flex gap-2 overflow-hidden px-4">
          {[0, 1].map((i) => (
            <div key={i} className="h-[180px] flex-none rounded-card bg-skeleton" style={{ width: 'calc((100% + 8px) / 1.4)' }} />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="h-[18px] w-[170px] rounded-md bg-skeleton" />
        <div className="-mx-4 flex gap-2 overflow-hidden px-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[132px] flex-none rounded-card bg-skeleton" style={{ width: 'calc((100% - 8px) / 3.5)' }} />
          ))}
        </div>
      </div>
    </>
  );
}
