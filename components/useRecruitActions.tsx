'use client';
import { useState } from 'react';
import { ApiError, type Recruit } from '@/lib/api/types';
import { useApp, useToast } from './providers';
import { ConfirmDialog } from './ui';

/**
 * 募集カードの「参加する／参加中 ✓／取り消す」の共通処理。
 * update で画面側の募集リストを楽観的に書き換え、失敗したら戻す。
 */
export function useRecruitActions(update: (fn: (list: Recruit[]) => Recruit[]) => void, opts?: { initialCancelId?: string | null; onChanged?: () => void }) {
  const { api } = useApp();
  const toast = useToast();
  const [cancelId, setCancelId] = useState<string | null>(opts?.initialCancelId ?? null);
  const [busy, setBusy] = useState(false);

  const patch = (id: string, joined: boolean) =>
    update((list) => list.map((x) => (x.id === id ? { ...x, joined, count: x.count + (joined ? 1 : -1) } : x)));

  const join = async (r: Recruit) => {
    const on = !r.joined;
    patch(r.id, on);
    try {
      await api.setJoin(r.id, on);
      toast.show(on ? `参加しました。${r.departTime}に${r.place}集合です` : '参加を取り消しました');
      opts?.onChanged?.();
    } catch (e) {
      patch(r.id, !on);
      if (e instanceof ApiError && e.code === 'CLOSED') {
        toast.show(e.message, 'err');
        opts?.onChanged?.();
      } else toast.show('通信エラーで操作できませんでした。もう一度お試しください', 'err');
    }
  };

  const confirmCancel = async () => {
    if (!cancelId) return;
    setBusy(true);
    try {
      await api.cancelRecruit(cancelId);
      update((list) => list.filter((x) => x.id !== cancelId));
      toast.show('募集を取り消しました');
      opts?.onChanged?.();
    } catch {
      toast.show('通信エラーで取り消せませんでした。もう一度お試しください', 'err');
    } finally {
      setBusy(false);
      setCancelId(null);
    }
  };

  const dialog = (
    <ConfirmDialog
      open={!!cancelId}
      icon="🙅"
      title="募集を取り消しますか？"
      body="参加している人の「参加中」も消えます。元に戻せません"
      okLabel="取り消す"
      onOk={confirmCancel}
      onCancel={() => setCancelId(null)}
      busy={busy}
    />
  );

  return { join, askCancel: (r: Recruit) => setCancelId(r.id), dialog };
}
