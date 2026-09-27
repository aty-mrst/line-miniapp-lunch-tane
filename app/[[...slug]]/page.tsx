'use client';
import { Suspense, useMemo } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { AppRoutes } from '@/components/AppRoutes';
import { AppProvider, NavProvider, ToastProvider, type Nav } from '@/components/providers';
import { USE_MOCK } from '@/lib/constants';
import { createMockApi } from '@/lib/api/mock';
import { createHttpApi } from '@/lib/api/http';
import { getIdToken } from '@/lib/liff';
import type { Api } from '@/lib/api/types';

// モックはページをまたいで状態を保つため、モジュールで1つだけ作る。
// モックは田中（U_dev_tanaka）として登録済みで起動。?fresh を付けると未登録（登録画面から）。
let api: Api | null = null;
function getApi(fresh: boolean) {
  if (!api) api = USE_MOCK ? createMockApi({ registered: !fresh }) : createHttpApi(getIdToken);
  return api;
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
    <AppProvider api={getApi(search.has('fresh'))}>
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
