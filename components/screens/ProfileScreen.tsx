'use client';
import { useState } from 'react';
import { useApp, useNav, useToast } from '../providers';
import { ProfileFields, ProfilePreview, useProfileForm } from '../ProfileFields';
import { PrimaryButton, Screen, ScreenHeader } from '../ui';

/** プロフィール（アイコン・名前）の編集。ホームの自分のアイコンから開く */
export function ProfileScreen() {
  const { api, me, setMe } = useApp();
  const nav = useNav();
  const toast = useToast();
  const form = useProfileForm({ name: me?.name, icon: me?.icon, image: me?.image ?? null });
  const [busy, setBusy] = useState(false);

  const next = form.payload();
  const initialMode = me?.image ? 'image' : 'emoji';
  const changed =
    next.name !== me?.name ||
    form.mode !== initialMode ||
    (form.mode === 'image' ? next.image !== (me?.image ?? null) : form.icon !== me?.icon);
  const reason = !form.valid ? 'アイコンと名前を入れると押せます' : !changed ? '変更すると押せます' : undefined;

  const save = async () => {
    if (!form.valid || !changed || busy) return;
    setBusy(true);
    try {
      setMe(await api.updateMe(next));
      toast.show('プロフィールを保存しました');
      nav.push('/');
    } catch {
      toast.show('通信エラーで保存できませんでした。入力内容はそのまま残っています', 'err');
      setBusy(false);
    }
  };

  return (
    <Screen
      header={<ScreenHeader title="プロフィール" onBack={() => nav.push('/')} />}
      scrollClassName="gap-5 px-4 pb-6 pt-1"
      bar={
        <PrimaryButton disabled={!!reason || busy} reason={reason} onClick={save}>
          保存する
        </PrimaryButton>
      }
    >
      <div className="text-[14px] leading-[1.6] text-ink-2">みんなに表示されるアイコンと名前を変えられます。</div>
      <ProfileFields form={form} />
      <ProfilePreview form={form} />
    </Screen>
  );
}
