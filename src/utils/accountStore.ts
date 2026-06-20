import { type Writable, writable } from "svelte/store";
import { type User, type Session } from "@supabase/supabase-js";
import { getMyProfile } from "../supabase";
import { developmentFlag } from "./developmentFlagStore";
import { get as storeGet } from "svelte/store";
import { supabase } from "../supabase";
import { readSupabaseSession } from "./supabaseAuth/readSupabaseSession";
import md5 from 'md5'; // md5ハッシュ化のためのライブラリを使用
import * as Sentry from "@sentry/svelte";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

interface AuthStore extends Writable<AuthState> {
  initialize: () => Promise<() => void>;
  signIn: (provider: Provider) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export type Provider = "google" | "github" | "discord" | "twitter";

function createAuthStore(): AuthStore {
  const { subscribe, set, update } = writable<AuthState>({
    user: null,
    session: null,
    loading: true,
  });

  async function initialize(): Promise<() => void> {
    // const cookies = document.cookie.split(/\s*;\s*/).map(cookie => cookie.split('='));
    // const accessTokenCookie = cookies.find(x => x[0] == 'my-access-token');
    // const refreshTokenCookie = cookies.find(x => x[0] == 'my-refresh-token');

    const session = readSupabaseSession('mf');
    const accessTokenCookie = session?.access_token;
    const refreshTokenCookie = session?.refresh_token;    
    
    // console.log("INITIALIZE", accessTokenCookie, refreshTokenCookie);
    if (accessTokenCookie && refreshTokenCookie) {
      // accessTokenCookie![1] = `adfas-${accessTokenCookie}`;
      const { data, error } = await supabase.auth.setSession({
        access_token: accessTokenCookie,
        refresh_token: refreshTokenCookie,
      })
      if (error) {
        console.error(error);
        // 失敗したときは初期ルートと同じ

        // AuthApiError: Invalid Refresh Token: Already Used
        // このエラーは、既に使用済みのリフレッシュトークンで再度認証しようとした際に発生します。
        // 主な原因:
        // 1.同じリフレッシュトークンを複数回使用
        // 2.トークンが既に失効している
        // 3.セッション管理の問題
      } else {
        console.log("setSession", data);
      }
    }

    // 認証状態の変更を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {

      const isDevelopment = storeGet(developmentFlag);
      const domain = isDevelopment ? '.example.local' : '.manga-farm.online';
      const secure = isDevelopment ? '' : 'secure;';

      console.log("onAuthStateChanged:", event);
      if (event === 'SIGNED_OUT') {
        // delete cookies on sign out
        const expires = new Date(0).toUTCString()
        document.cookie = `my-access-token=; Domain=${domain}; path=/; expires=${expires}; SameSite=Lax; ${secure}`
        document.cookie = `my-refresh-token=; Domain=${domain}; path=/; expires=${expires}; SameSite=Lax; ${secure}`
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const maxAge = 100 * 365 * 24 * 60 * 60 // 100 years, never expires
        document.cookie = `my-access-token=${session!.access_token}; Domain=${domain}; path=/; max-age=${maxAge}; SameSite=Lax; ${secure}`
        document.cookie = `my-refresh-token=${session!.refresh_token}; Domain=${domain}; path=/; max-age=${maxAge}; SameSite=Lax; ${secure}`
      }
          
      updateState(session);

      const u = session?.user
      if (u) {
        Sentry.setUser({ id: u.id, email: u.email ?? undefined }) // ← ここで付与
        Sentry.setTag('user_id', u.id)
      } else {
        Sentry.setUser(null)
        Sentry.setTag('user_id', 'null')
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }

  function updateState(session: Session | null): void {
    set({
      user: session?.user ?? null,
      session: session,
      loading: false,
    });
  }

  async function signIn(provider: Provider): Promise<void> {
    const url = new URL(window.location.href);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        queryParams: {
          access_type: "offline",
          redirectTo: `${url.origin}/auth/callback?next=/home`,
          prompt: "consent",
        },
      },
    });
    if (error) throw error;
  }

  async function signInWithEmail(
    email: string,
    password: string
  ): Promise<void> {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  }

  async function signUpWithEmail(
    email: string,
    password: string
  ): Promise<void> {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
  }

  async function signOut(): Promise<void> {
    try {
      try {
        const { error } = await supabase.auth.signOut();
        if (error && error.name !== 'AuthSessionMissingError') {
          console.warn('[signOut] global error, falling back to local:', error);
          throw error;
        }
      } catch (e) {
        console.warn('[signOut] global failed, falling back to local:', e);
        try {
          await supabase.auth.signOut({ scope: 'local' });
        } catch (e2) {
          console.warn('[signOut] local also failed:', e2);
        }
      }
    } finally {
      // global/local 成否によらず localStorage と cookie を確実に削除
      clearAuthStorage();
    }
  }

  function clearAuthStorage(): void {
    // localStorage: sb-*-auth-token (Supabase JS が使う) を全部消す
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        localStorage.removeItem(key);
      }
    }

    // cookie: 現存する cookie 名を列挙し、auth 関連を全部消す
    // (domain あり/なし、ドメイン候補を複数試行 — どこに書かれているか不明なため)
    const isDevelopment = storeGet(developmentFlag);
    const domainCandidates = isDevelopment
      ? ['.example.local', 'example.local']
      : ['.manga-farm.online', 'manga-farm.online'];
    const expires = new Date(0).toUTCString();

    for (const cookieStr of document.cookie.split(';')) {
      const [name] = cookieStr.trim().split('=');
      if (!name) continue;
      // Supabase JS 系 (sb-*-auth-token, sb-*-auth-token.0, ...) と旧形式 (my-access-token, my-refresh-token)
      const isAuthCookie =
        (name.startsWith('sb-') && (name.endsWith('-auth-token') || name.includes('-auth-token.'))) ||
        name === 'my-access-token' ||
        name === 'my-refresh-token';
      if (!isAuthCookie) continue;
      // Domain 指定なし
      document.cookie = `${name}=; path=/; expires=${expires}; SameSite=Lax`;
      // Domain 指定あり (候補すべて)
      for (const d of domainCandidates) {
        document.cookie = `${name}=; Domain=${d}; path=/; expires=${expires}; SameSite=Lax`;
      }
    }
  }

  return {
    subscribe,
    initialize,
    signIn,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    set,
    update,
  };
}

export const authStore = createAuthStore();

export type OnlineAccount = {
  user: any;
  feathral: number;
  subscriptionPlan: SubscriptionPlan;
  avatar: string;
};

export type OnlineProfile = {
  username: string;
  display_name: string;
  email: string;
  bio: string;
  related_url: string;
  is_admin: boolean;
};

export type OnlineStatus = "unknown" | "signed-in" | "signed-out";
export type SubscriptionPlan = "free" | "basic" | "basic/en" | "premium";
export type FatalStorageError = "none" | "indexeddb-unavailable";

export const updateToken: Writable<boolean> = writable(false);
export const onlineStatus: Writable<OnlineStatus> = writable("unknown");
export const onlineAccount: Writable<OnlineAccount | null> = writable(null);
export const onlineProfile: Writable<OnlineProfile | null> = writable(null);
export const fatalStorageError: Writable<FatalStorageError> = writable("none");

async function subscribeToWallet(uid: string) {
  const jwt = await supabase.auth.getSession();
  supabase.realtime.setAuth(jwt.data.session?.access_token!);

  supabase
    .channel('table-db-changes')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'wallets',
        filter: `id=eq.${uid}`,
      },
      (payload) => {
        console.log("payload", payload);
        const money = payload.new.resilient + payload.new.permanent;
        onlineAccount.update((account) => {
          if (account) {
            account.feathral = money;
          }
          return account;
        });
      }
    )
    .subscribe((status, err) => {
      if (err) {
        console.error("ERROR", err);
        return;
      }
    })
}

function getAvatarUrl(email: string | undefined): string | null{
  return email ? `https://www.gravatar.com/avatar/${md5(email.trim().toLowerCase())}` : null;
}

export function bootstrap() {
  authStore.subscribe(async (state) => {
    console.log("authStore.subscribe", state);
    if (state.loading) return;

    if (state.user) {
      console.log("authStore.subscribe", state.user);

      const { data: data2, error: error2 } = await supabase
        .rpc('claim_daily_charge')
      if (error2) {
        console.error(error2);
        onlineStatus.set("signed-out");
        return;
      }
      console.log("claim_daily_charge", data2);

      const {data, error} = await supabase
        .from("charge_total")
        .select("total_charges, subscription_plan")
        .eq("id", state.user.id)
        .single();
      if (error) {
        console.error(error);
        onlineStatus.set("signed-out");
        return;
      }
      const feathral = data?.total_charges ?? 0;
      const plan = data?.subscription_plan;
      console.log("charge_total", data);

      onlineAccount.set({
        user: state.user, 
        feathral, 
        subscriptionPlan: plan,
        avatar:
          state.user.user_metadata.avatar_url ??
          state.user.user_metadata.picture ??
          getAvatarUrl(state.user.email) ??
          'https://api.dicebear.com/8.x/fun-emoji/svg' // emailがundefinedなことはまずないはずなので、ここはまずこない
      });
      console.log("onlineAccount", storeGet(onlineAccount));
      onlineStatus.set("signed-in");

      // fetch profile
      const profile = await getMyProfile();
      console.log("getMyProfile", profile);
      if (profile) {
        const profileWithEmail = {
          ...profile,
          email: state.user.email ?? ''
        }
        onlineProfile.set(profileWithEmail);
      }

      // subscribe wallet changes
      await subscribeToWallet(state.user.id);
    } else {
      onlineAccount.set(null);
      onlineStatus.set("signed-out");
    }
  });

  authStore.initialize();
}

export async function updateOnlineProfile() {
  const profile = await getMyProfile();
  console.log("getMyProfile", profile);
  if (profile) {
    const profileWithEmail = {
      ...profile,
      email: storeGet(onlineAccount)?.user.email ?? ''
    }
    onlineProfile.set(profileWithEmail);
  }
}

