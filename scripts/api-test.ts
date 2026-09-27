// API の通しテスト。dev サーバー（NEXT_PUBLIC_DEV_AUTH=true）に対して実行する。
//   npm run dev   →   npm run test:api
// 専用のテストユーザー（U_dev_test_*）で操作し、最後に自分が作ったデータだけを消す。
import postgres from 'postgres';

const BASE = process.env.API_BASE ?? 'http://localhost:3100';
const A = 'U_dev_test_a';
const B = 'U_dev_test_b';
const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });

let pass = 0;
const fails: string[] = [];
function ok(cond: unknown, label: string) {
  if (cond) pass++;
  else fails.push(label);
  console.log(`${cond ? '✓' : '✗'} ${label}`);
}

async function call(user: string | null, method: string, path: string, body?: unknown) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(user ? { 'x-dev-user': user } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  return { status: res.status, json };
}

async function cleanup() {
  const ids = (await sql`select id from users where line_user_id like 'U_dev_test_%'`).map((r) => r.id);
  if (!ids.length) return;
  await sql`delete from shops where created_by in ${sql(ids)}`;
  await sql`delete from users where id in ${sql(ids)}`;
}

async function main() {
  await cleanup();
  const u = Date.now().toString(36);

  console.log('\n■ 認証・登録');
  ok((await call(null, 'GET', '/api/me')).status === 401, '認証なし → 401');
  const nr = await call(A, 'GET', '/api/me');
  ok(nr.status === 404 && nr.json.error.code === 'NOT_REGISTERED', '未登録 → 404 NOT_REGISTERED');
  ok((await call(A, 'POST', '/api/me', { name: 'テストA', icon: '🐣🍙' })).status === 400, '絵文字2つ → 400');
  ok((await call(A, 'POST', '/api/me', { name: 'テストA', icon: 'a' })).status === 400, '絵文字でない → 400');
  ok((await call(A, 'POST', '/api/me', { name: 'あ'.repeat(21), icon: '🐣' })).status === 400, '名前21文字 → 400');
  ok((await call(A, 'POST', '/api/me', { name: '  ', icon: '🐣' })).status === 400, '名前が空白だけ → 400');
  ok((await call(A, 'POST', '/api/me', { name: 'テストA', icon: '👨‍👩‍👧' })).status === 200, '1書記素の結合絵文字 → OK');
  ok((await call(B, 'POST', '/api/me', { name: 'テストB', icon: '🇯🇵' })).status === 200, '国旗 → OK');
  const meA = await call(A, 'GET', '/api/me');
  ok(meA.json.name === 'テストA' && meA.json.icon === '👨‍👩‍👧', '登録内容が取得できる');
  ok((await call('U_dev_test_c', 'PATCH', '/api/me', { name: 'x', icon: '🐣' })).status === 404, '未登録ユーザーはプロフィール編集できない → 404');
  ok((await call(A, 'PATCH', '/api/me', { name: 'テストA', icon: '🐣🍙' })).status === 400, 'プロフィール編集：絵文字2つ → 400');
  const edited = await call(A, 'PATCH', '/api/me', { name: ' テストA改 ', icon: '🦉' });
  ok(edited.status === 200 && edited.json.name === 'テストA改' && edited.json.icon === '🦉', 'プロフィールを編集できる（前後の空白は除く）');
  const IMG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8U';
  const withImg = await call(A, 'PATCH', '/api/me', { name: 'テストA改', icon: '🦉', image: IMG });
  ok(withImg.status === 200 && withImg.json.image === IMG, 'プロフィール画像を設定できる');
  ok((await call(A, 'PATCH', '/api/me', { name: 'テストA改', icon: '🦉', image: 'https://example.com/a.png' })).status === 400, '画像がdata URLでない → 400');
  ok((await call(A, 'PATCH', '/api/me', { name: 'テストA改', icon: '🦉', image: 'data:image/svg+xml;base64,PHN2Zz4=' })).status === 400, 'SVG画像 → 400');
  ok((await call(A, 'PATCH', '/api/me', { name: 'テストA改', icon: '🦉', image: 'data:image/jpeg;base64,' + 'A'.repeat(100_001) })).status === 400, '大きすぎる画像 → 400');
  const noImg = await call(A, 'PATCH', '/api/me', { name: 'テストA改', icon: '🦉', image: null });
  ok(noImg.status === 200 && noImg.json.image === null, '画像を外して絵文字に戻せる');
  await call(A, 'PATCH', '/api/me', { name: 'テストA改', icon: '🦉', image: IMG });

  console.log('\n■ お店の登録');
  const shopIn = { mapUrl: `https://maps.app.goo.gl/test-${u}`, name: `テスト食堂 ${u}`, genre: 'カレー', walk: '5分以内', budget: '〜1,000円', note: 'テストです' };
  ok((await call(A, 'POST', '/api/shops', { ...shopIn, mapUrl: 'https://tabelog.com/x' })).status === 400, 'Googleマップ以外のURL → 400');
  ok((await call(A, 'POST', '/api/shops', { ...shopIn, genre: '中華' })).status === 400, '存在しないジャンル → 400');
  ok((await call(A, 'POST', '/api/shops', { ...shopIn, note: 'あ'.repeat(101) })).status === 400, 'ひとこと101文字 → 400');
  const created = await call(A, 'POST', '/api/shops', shopIn);
  ok(created.status === 200 && created.json.emoji === '🍛' && created.json.createdBy.isMe, '登録できる（絵文字はジャンルから）');
  ok(created.json.createdBy.image?.startsWith('data:image/jpeg'), '登録者の画像がお店情報に含まれる');
  const cafe = await call(A, 'POST', '/api/shops', { ...shopIn, mapUrl: `https://maps.app.goo.gl/cafe-${u}`, name: `テストカフェ ${u}`, genre: 'カフェ' });
  ok(cafe.status === 200 && cafe.json.emoji === '☕', '新ジャンル「カフェ」で登録できる（☕）');
  const teishoku = await call(A, 'PATCH', `/api/shops/${cafe.json.id}`, { ...shopIn, mapUrl: `https://maps.app.goo.gl/cafe-${u}`, name: `テストカフェ ${u}`, genre: '定食' });
  ok(teishoku.status === 200 && teishoku.json.emoji === '🍚', '新ジャンル「定食」に変更できる（🍚）');
  const shopId: string = created.json.id;
  const dupUrl = await call(B, 'POST', '/api/shops', { ...shopIn, name: '別の名前' + u });
  ok(dupUrl.status === 409 && dupUrl.json.error.shop.id === shopId && dupUrl.json.error.shop.createdByName === 'テストA改', '同じURL → 409 DUPLICATE（登録者名つき）');
  const dupName = await call(B, 'POST', '/api/shops', { ...shopIn, mapUrl: `https://maps.app.goo.gl/other-${u}`, name: `テスト食堂　${u.toUpperCase()}` });
  ok(dupName.status === 409, '店名の全角空白・大文字違い → 409（正規化して判定）');
  const chk = await call(B, 'GET', `/api/shops/check?url=&name=${encodeURIComponent(shopIn.name)}`);
  ok(chk.json?.id === shopId, '入力中の重複チェックで見つかる');
  const chkEx = await call(A, 'GET', `/api/shops/check?url=${encodeURIComponent(shopIn.mapUrl)}&name=&exclude=${shopId}`);
  ok(chkEx.json === null, '編集中は自分自身を重複扱いしない');

  console.log('\n■ 一覧・絞り込み');
  const all = await call(B, 'GET', '/api/shops');
  ok(all.json.some((s: { id: string }) => s.id === shopId), '一覧に出る');
  const f1 = await call(B, 'GET', '/api/shops?walk=5%E5%88%86%E4%BB%A5%E5%86%85&genre=%E3%82%AB%E3%83%AC%E3%83%BC');
  ok(f1.json.every((s: { walk: string; genre: string }) => s.walk === '5分以内' && s.genre === 'カレー') && f1.json.some((s: { id: string }) => s.id === shopId), '徒歩×ジャンルで AND 絞り込み');
  const f2 = await call(B, 'GET', `/api/shops?budget=${encodeURIComponent('1,500円〜')}`);
  ok(!f2.json.some((s: { id: string }) => s.id === shopId), '条件外は出ない');

  console.log('\n■ 店舗ページ・気になる・リアクション');
  const d0 = await call(B, 'GET', `/api/shops/${shopId}`);
  ok(d0.json.note === 'テストです' && !d0.json.createdBy.isMe && d0.json.likeCount === 0 && d0.json.reactionCount === 0, '詳細が取れる（他人の店）');
  await call(B, 'PUT', `/api/shops/${shopId}/interest`);
  ok((await call(B, 'PUT', `/api/shops/${shopId}/interest`)).status === 204, '気になるON（2回呼んでもOK）');
  await call(A, 'PUT', `/api/shops/${shopId}/interest`);
  const d1 = await call(B, 'GET', `/api/shops/${shopId}`);
  ok(d1.json.likeCount === 2 && d1.json.liked && d1.json.likers[0].isMe, '気になる人2人・自分が先頭');
  ok(d1.json.likers.some((p: { image: string | null }) => p.image === IMG), '気になる人の画像が返る');
  const hl = await call(B, 'GET', '/api/home');
  ok(hl.json.likedCount === 1, 'ホームの「自分の気になる数」が1');
  const rk = hl.json.ranking as { id: string; likeCount: number }[];
  ok(rk.length <= 6 && rk.every((x, i) => x.likeCount > 0 && (i === 0 || rk[i - 1].likeCount >= x.likeCount)), 'ランキングは6件以内・気になる数の多い順');
  ok(hl.json.recommend.length <= 3, 'おすすめは最大3件');
  await call(B, 'PUT', `/api/shops/${shopId}/reaction`);
  const d2 = await call(B, 'GET', `/api/shops/${shopId}`);
  ok(d2.json.reactionCount === 1 && d2.json.reacted, 'リアクションON');
  await call(B, 'DELETE', `/api/shops/${shopId}/reaction`);
  await call(A, 'DELETE', `/api/shops/${shopId}/interest`);
  const d3 = await call(B, 'GET', `/api/shops/${shopId}`);
  ok(d3.json.reactionCount === 0 && !d3.json.reacted && d3.json.likeCount === 1, 'リアクションOFF・気になるOFFが反映');
  ok((await call(B, 'GET', '/api/shops/not-a-uuid')).status === 404, '不正なID → 404');
  ok((await call(B, 'PUT', '/api/shops/00000000-0000-0000-0000-000000000000/interest')).status === 404, '存在しない店に気になる → 404');

  console.log('\n■ お店の編集');
  const upd = await call(A, 'PATCH', `/api/shops/${shopId}`, { ...shopIn, name: `テスト食堂 改 ${u}`, genre: 'タイ料理', note: '' });
  ok(upd.status === 200 && upd.json.name === `テスト食堂 改 ${u}` && upd.json.emoji === '🌶️', '登録者は編集できる');
  ok((await call(B, 'PATCH', `/api/shops/${shopId}`, shopIn)).status === 403, '他人は編集できない → 403');
  ok((await call(B, 'DELETE', `/api/shops/${shopId}`)).status === 403, '他人は削除できない → 403');
  const bShop = await call(B, 'POST', '/api/shops', { ...shopIn, mapUrl: `https://www.google.com/maps/place/b-${u}`, name: `Bの店 ${u}` });
  ok(bShop.status === 200, 'google.com/maps 形式のURLも登録できる');
  ok((await call(A, 'PATCH', `/api/shops/${shopId}`, { ...shopIn, name: `Bの店 ${u}` })).status === 409, '他の店と同じ名前に編集 → 409');

  console.log('\n■ 募集（今日ここ行く）');
  ok((await call(A, 'POST', '/api/recruits', { shopId, departTime: '12:00', place: '1階ロビー' })).status === 400, '過ぎた時間 → 400');
  ok((await call(A, 'POST', '/api/recruits', { shopId, departTime: '13:15', place: 'その他' })).status === 400, '「その他」で場所の入力なし → 400');
  ok((await call(A, 'POST', '/api/recruits', { shopId, departTime: '12:07', place: '1階ロビー' })).status === 400, '5分刻みでない時間 → 400');
  ok((await call(A, 'POST', '/api/recruits', { shopId, departTime: '24:00', place: '1階ロビー' })).status === 400, '範囲外の時間 → 400');
  const rec = await call(A, 'POST', '/api/recruits', { shopId, departTime: '13:35', place: 'その他', placeOther: '虎ノ門駅 2番出口', note: 'さくっと' });
  ok(rec.status === 200 && rec.json.place === '虎ノ門駅 2番出口' && rec.json.isMine && rec.json.count === 1, '募集できる（その他の場所が表示名になる）');
  const rid: string = rec.json.id;
  const second = await call(A, 'POST', '/api/recruits', { shopId, departTime: '13:00', place: '現地' });
  ok(second.status === 200, '2件目の募集はできる');
  const third = await call(A, 'POST', '/api/recruits', { shopId, departTime: '13:10', place: '現地' });
  ok(third.status === 409 && third.json.error.code === 'ALREADY_HOSTING' && third.json.error.message === '今日の募集は2件までです', '3件目 → 409（1日2件まで）');
  const burst = await Promise.all([1, 2, 3].map(() => call(B, 'POST', '/api/recruits', { shopId, departTime: '13:20', place: '現地' })));
  ok(burst.filter((r) => r.status === 200).length === 2, '同時に3件送っても作られるのは2件まで');
  const hb = await call(B, 'GET', '/api/home');
  const cardB = hb.json.recruits.find((r: { id: string }) => r.id === rid);
  ok(cardB && cardB.likedByMe && !cardB.isMine, 'Bのホームに出て、気になる店としてハイライト');
  ok(hb.json.recruits.every((r: { closed: boolean }) => !r.closed), 'ホームに締め切った募集は出ない');
  const times: string[] = hb.json.recruits.map((r: { departTime: string }) => r.departTime);
  ok(times.join() === [...times].sort().join(), 'ホームは出発時間順');
  ok((await call(A, 'PUT', `/api/recruits/${rid}/join`)).status === 400, '自分の募集には参加できない');
  await call(B, 'PUT', `/api/recruits/${rid}/join`);
  ok((await call(B, 'PUT', `/api/recruits/${rid}/join`)).status === 204, '参加（2回呼んでもOK）');
  const ha = await call(A, 'GET', '/api/home');
  ok(ha.json.recruits.find((r: { id: string }) => r.id === rid)?.count === 2, '主催者側の人数が2人になる');
  const hb2 = await call(B, 'GET', '/api/home');
  ok(hb2.json.recruits.find((r: { id: string }) => r.id === rid)?.joined, '参加者側は「参加中」');
  await call(B, 'DELETE', `/api/recruits/${rid}/join`);
  ok((await call(A, 'GET', `/api/shops/${shopId}`)).json.recruits[0].count === 1, '参加取り消しで1人に戻る（店舗ページ）');
  await call(B, 'PUT', `/api/recruits/${rid}/join`);
  ok((await call(B, 'DELETE', `/api/recruits/${rid}`)).status === 403, '他人は募集を取り消せない → 403');
  ok((await call(A, 'DELETE', `/api/recruits/${rid}`)).status === 204, '主催者は取り消せる');
  ok(!(await call(B, 'GET', '/api/home')).json.recruits.some((r: { id: string }) => r.id === rid), '取り消した募集はホームから消える');
  ok((await call(B, 'PUT', `/api/recruits/${rid}/join`)).status === 410, '取り消し済みに参加 → 410');
  ok((await call(A, 'POST', '/api/recruits', { shopId, departTime: '13:45', place: '現地' })).status === 200, '取り消した募集は数えない（取り消し後にまた作れる）');

  console.log('\n■ お店の削除（関連データも消える）');
  await call(B, 'PUT', `/api/shops/${shopId}/interest`);
  await call(B, 'PUT', `/api/shops/${shopId}/reaction`);
  ok((await call(A, 'DELETE', `/api/shops/${shopId}`)).status === 204, '登録者は削除できる');
  const [left] = await sql`select
    (select count(*) from interests where shop_id = ${shopId})::int as i,
    (select count(*) from reactions where shop_id = ${shopId})::int as r,
    (select count(*) from recruits where shop_id = ${shopId})::int as rc`;
  ok(left.i === 0 && left.r === 0 && left.rc === 0, '気になる・リアクション・募集もDBから消えている');
  ok((await call(B, 'GET', `/api/shops/${shopId}`)).status === 404, '削除した店は 404');

  console.log('\n■ 不正なリクエスト');
  const bad = await fetch(BASE + '/api/shops', { method: 'POST', headers: { 'x-dev-user': A, 'Content-Type': 'application/json' }, body: '{oops' });
  ok(bad.status === 400, '壊れたJSON → 400');
  ok((await call('U_dev_evil"; drop table users; --', 'GET', '/api/me')).status === 401, '不正な x-dev-user → 401');
}

main()
  .catch((e) => {
    console.error(e);
    fails.push('例外で中断');
  })
  .finally(async () => {
    await cleanup();
    const [c] = await sql`select count(*)::int as n from users where line_user_id like 'U_dev_test_%'`;
    console.log(`\n結果: ${pass} 件成功 / ${fails.length} 件失敗（テストデータ残り: ${c.n}人）`);
    if (fails.length) console.log('失敗:\n- ' + fails.join('\n- '));
    await sql.end({ timeout: 1 });
    process.exit(fails.length ? 1 : 0);
  });
