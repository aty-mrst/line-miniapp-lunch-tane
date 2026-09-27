'use client';
import { Suspense, useMemo } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { AppRoutes } from '@/components/AppRoutes';
import { AppProvider, NavProvider, ToastProvider, type Nav } from '@/components/providers';
import { USE_MOCK } from '@/lib/constants';
import { createMockApi } from '@/lib/api/mock';
import { createHttpApi } from '@/lib/api/http';
import { DEV_AUTH, getIdToken } from '@/lib/liff';
import type { Api } from '@/lib/api/types';

// API はモジュールで1つだけ作る（モックはページをまたいで状態を保つ）。
// モック：田中として登録済みで起動。?fresh を付けると未登録（登録画面から）。
// 開発用認証（NEXT_PUBLIC_DEV_AUTH=true）：?as=U_dev_sato のようにユーザーを切り替えられる（タブごとに記憶）。
let api: Api | null = null;
function getApi(search: URLSearchParams) {
  if (api) return api;
  if (USE_MOCK) api = createMockApi({ registered: !search.has('fresh') });
  else api = createHttpApi(getIdToken, DEV_AUTH ? devUser(search.get('as')) : undefined);
  return api;
}

function devUser(as: string | null): string {
  try {
    if (as) sessionStorage.setItem('devUser', as);
    return sessionStorage.getItem('devUser') ?? 'U_dev_tanaka';
  } catch {
    return as ?? 'U_dev_tanaka';
  }
}

function Root() {
  const pathname = usePathname();
  const search = useSearchParams();
  const path = pathname + (search.toString() ? `?${search}` : '');
  const nav = useMemo<Nav>(
    () => ({
      path,
      // 画面はすべてクライアントで描くので、サーバー往復のない history API で遷移する
      // （Next は pushState を usePathname / useSearchParams に反映する）
      push: (p) => window.history.pushState(null, '', p),
      replace: (p) => window.history.replaceState(null, '', p),
    }),
    [path],
  );
  return (
    <AppProvider api={getApi(search)}>
      <NavProvider value={nav}>
        <ToastProvider>
          <div className="relative mx-auto h-[100dvh] max-w-[430px] overflow-hidden bg-bg">
            <AppRoutes bootDelay={600} />
          </div>
        </ToastProvider>
      </NavProvider>
    </AppProvider>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Root />
    </Suspense>
  );
}
