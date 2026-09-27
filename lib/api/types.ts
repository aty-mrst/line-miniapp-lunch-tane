import type { Budget, DepartTime, Genre, Place, Walk } from '../constants';

export type Me = { id: string; name: string; icon: string };

export type Person = { name: string; icon: string; isMe: boolean };

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

export type HomeData = { recommend: ShopSummary[]; recruits: Recruit[]; shopCount: number };

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
  register(input: { name: string; icon: string }): Promise<Me>;
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
