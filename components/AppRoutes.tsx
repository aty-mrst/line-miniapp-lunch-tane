'use client';
import { useEffect, useState } from 'react';
import { initLiff } from '@/lib/liff';
import { useApp, useNav } from './providers';
import { BootScreen, RegisterScreen, type RegisterInitial } from './screens/RegisterScreen';
import { HomeScreen, type HomeInitial } from './screens/HomeScreen';
import { ShopScreen, type ShopInitial } from './screens/ShopScreen';
import { ShopFormScreen, type ShopFormInitial } from './screens/ShopFormScreen';
import { RecruitScreen, type RecruitInitial } from './screens/RecruitScreen';
import { ListScreen, type ListInitial } from './screens/ListScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { LikesScreen } from './screens/LikesScreen';

/** 各画面に渡す「初期状態」（/dev/states でボードの各状態を再現するため） */
export type ScreenInitial = {
  home?: HomeInitial;
  shop?: ShopInitial;
  form?: ShopFormInitial;
  recruit?: RecruitInitial;
  list?: ListInitial;
  register?: RegisterInitial;
};

/**
 * 起動時の判定（LIFF → /api/me）と、path → 画面の対応。
 * ルート：/ /me /likes /register /shops /shops/new /shops/[id] /shops/[id]/edit /shops/[id]/recruit
 */
export function AppRoutes({ initial, bootDelay = 0, holdBoot = false }: { initial?: ScreenInitial; bootDelay?: number; holdBoot?: boolean }) {
  const { api, me, setMe } = useApp();
  const nav = useNav();
  const [boot, setBoot] = useState<'loading' | 'ready' | 'unregistered' | 'error'>(me ? 'ready' : 'loading');

  useEffect(() => {
    if (me || holdBoot) return;
    let alive = true;
    const t0 = Date.now();
    (async () => {
      try {
        await initLiff();
        const m = await api.getMe();
        await new Promise((r) => setTimeout(r, Math.max(0, bootDelay - (Date.now() - t0))));
        if (!alive) return;
        if (m) {
          setMe(m);
          setBoot('ready');
        } else setBoot('unregistered');
      } catch {
        if (alive) setBoot('error');
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, holdBoot]);

  if (!me) {
    if (boot === 'unregistered')
      return (
        <RegisterScreen
          initial={initial?.register}
          onDone={(m) => {
            setMe(m);
            setBoot('ready');
            nav.replace('/');
          }}
        />
      );
    return <BootScreen error={boot === 'error'} />;
  }

  const [pathname, query = ''] = nav.path.split('?');
  const params = new URLSearchParams(query);
  const seg = pathname.split('/').filter(Boolean);

  if (seg[0] === 'me') return <ProfileScreen />;
  if (seg[0] === 'likes') return <LikesScreen />;
  if (seg[0] === 'shops') {
    if (seg.length === 1) return <ListScreen initial={initial?.list} />;
    if (seg[1] === 'new') return <ShopFormScreen initial={initial?.form} />;
    if (seg[2] === 'edit') return <ShopFormScreen key={`edit-${seg[1]}`} editId={seg[1]} initial={initial?.form} />;
    if (seg[2] === 'recruit') return <RecruitScreen key={`rec-${seg[1]}`} shopId={seg[1]} initial={initial?.recruit} />;
    return <ShopScreen key={seg[1]} id={seg[1]} from={params.get('from') === 'list' ? 'list' : params.get('from') === 'likes' ? 'likes' : 'home'} initial={initial?.shop} />;
  }
  return <HomeScreen initial={initial?.home} />;
}
