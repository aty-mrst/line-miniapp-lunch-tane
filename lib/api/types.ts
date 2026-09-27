import type { Budget, DepartTime, Genre, Place, Walk } from '../constants';

/** アイコンは絵文字（icon）か画像（image：縮小済みの data URL）。image があれば画像を優先して表示 */
export type Me = { id: string; name: string; icon: string; image: string | null };

export type ProfileInput = { name: string; icon: string; image?: string | null };

export type Person = { name: string; icon: string; image: string | null; isMe: boolean };

export type ShopSummary = {
  id: string;
  name: string;
  emoji: string;
  genre: Genre;
  walk: Walk;
  budget: Budget;
  likeCount: number;
  liked: boolean;
  createdBy: Person;
  createdAt: string; // ISO
};

export type Recruit = {
  id: string;
  shop: { id: string; name: string; emoji: string };
  host: Person;
  departTime: DepartTime;
  place: string; // 'その他' の場合は place_other の値
  note: string;
  count: number;
  joined: boolean;
  isMine: boolean;
  closed: boolean;
  likedByMe: boolean;
};

export type ShopDetail = ShopSummary & {
  note: string;
  mapUrl: string;
  likers: Person[]; // 自分がONなら先頭
  reactionCount: number;
  reacted: boolean;
  recruits: Recruit[];
};

export type HomeData = {
  recommend: ShopSummary[]; // 今日のおすすめTOP3（最大3件）
  ranking: ShopSummary[]; // 気になる数ランキング（1人以上の店の上位6件）
  recruits: Recruit[];
  shopCount: number;
  likedCount: number; // 自分が「気になる」にしている店の数
};

export type ShopInput = { mapUrl: string; name: string; genre: Genre; walk: Walk; budget: Budget; note: string };

export type RecruitInput = { shopId: string; departTime: DepartTime; place: Place; placeOther?: string; note?: string };

export type DuplicateShop = { id: string; name: string; emoji: string; createdByName: string };

export type ShopFilter = { walk: string[]; budget: string[]; genre: string[] };

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public data?: unknown) {
    super(message);
  }
}

export interface Api {
  now(): Date;
  getMe(): Promise<Me | null>;
  register(input: ProfileInput): Promise<Me>;
  updateMe(input: ProfileInput): Promise<Me>;
  getHome(): Promise<HomeData>;
  listShops(filter?: ShopFilter): Promise<ShopSummary[]>;
  checkShop(q: { url: string; name: string; excludeId?: string }): Promise<DuplicateShop | null>;
  getShop(id: string): Promise<ShopDetail>;
  createShop(input: ShopInput): Promise<ShopSummary>;
  updateShop(id: string, input: ShopInput): Promise<ShopSummary>;
  deleteShop(id: string): Promise<void>;
  setInterest(shopId: string, on: boolean): Promise<void>;
  setReaction(shopId: string, on: boolean): Promise<void>;
  createRecruit(input: RecruitInput): Promise<Recruit>;
  cancelRecruit(id: string): Promise<void>;
  setJoin(recruitId: string, on: boolean): Promise<void>;
}
