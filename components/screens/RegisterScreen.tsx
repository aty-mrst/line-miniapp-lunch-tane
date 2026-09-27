'use client';
import { useState } from 'react';
import type { Me } from '@/lib/api/types';
import { useApp, useToast } from '../providers';
import { ProfileFields, ProfilePreview, useProfileForm, type ProfileInitial } from '../ProfileFields';
import { PrimaryButton, Screen, SecondaryButton } from '../ui';

export type RegisterInitial = ProfileInitial;

export function BootScreen({ error }: { error?: boolean }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-bg">
      <div className="grid h-[104px] w-[104px] place-items-center rounded-full bg-sprout-soft text-[56px]">🌱</div>
      <div className="font-maru text-[26px] font-bold leading-[1.2]">ランチのたね</div>
      {error ? (
        <>
          <div className="text-[14px] leading-[1.6] text-ink-2">起動できませんでした。通信状況を確認してください</div>
          <SecondaryButton className="px-7" onClick={() => location.reload()}>
            ↻ 再読み込み
          </SecondaryButton>
        </>
      ) : (
        <>
          <div className="mt-3 flex gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-tomato" />
            <div className="h-2 w-2 animate-pulse rounded-full bg-tomato-light [animation-delay:150ms]" />
            <div className="h-2 w-2 animate-pulse rounded-full bg-tomato-lighter [animation-delay:300ms]" />
          </div>
          <div className="text-[13px] leading-normal text-ink-2">準備しています…</div>
        </>
      )}
    </div>
  );
}

export function RegisterScreen({ initial, onDone }: { initial?: RegisterInitial; onDone: (me: Me) => void }) {
  const { api } = useApp();
  const toast = useToast();
  const form = useProfileForm(initial);
  const [busy, setBusy] = useState(false);

  const start = async () => {
    if (!form.valid || busy) return;
    setBusy(true);
    try {
      onDone(await api.register({ name: form.name.trim(), icon: form.icon }));
    } catch {
      toast.show('通信エラーで登録できませんでした。もう一度お試しください', 'err');
      setBusy(false);
    }
  };

  return (
    <Screen
      scrollClassName="gap-5 px-4 pb-6 pt-7"
      bar={
        <PrimaryButton disabled={!form.valid || busy} reason={!form.valid ? 'アイコンと名前を入れると押せます' : undefined} onClick={start}>
          はじめる
        </PrimaryButton>
      }
    >
      <div className="flex flex-col items-center gap-2.5 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-sprout-soft text-[34px]">🌱</div>
        <h1 className="m-0 font-maru text-[22px] font-bold leading-[1.35]">ランチのたねへようこそ</h1>
        <div className="text-[14px] leading-[1.6] text-ink-2 [text-wrap:pretty]">
          社員が見つけたランチの店が集まる場所です。
          <br />
          まずは、みんなに表示される姿を決めましょう。
        </div>
      </div>
      <ProfileFields form={form} />
      <ProfilePreview form={form} />
    </Screen>
  );
}
