import { type Writable, writable } from "svelte/store";
import { type User, type Session } from "@supabase/supabase-js";
import { getMyProfile } from "../supabase";
import { developmentFlag } from "./developmentFlagStore";
import { get as storeGet } from "svelte/store";
import { supabase } from "../supabase";
import { readSupabaseSession } from "./supabaseAuth/readSupabaseSession";

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
    
    console.log("INITIALIZE", accessTokenCookie, refreshTokenCookie);
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
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
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
export type SubscriptionPlan = "free" | "basic" | "premium";

export const updateToken: Writable<boolean> = writable(false);
export const onlineStatus: Writable<OnlineStatus> = writable("unknown");
export const onlineAccount: Writable<OnlineAccount | null> = writable(null);
export const onlineProfile: Writable<OnlineProfile | null> = writable(null);
export const subscriptionPlan: Writable<SubscriptionPlan | null> = writable(null); // 未ログインならnull、ログインしているならdefaultはfree

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
        const money = payload.new.fragile + payload.new.money;
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

export function bootstrap() {
  authStore.subscribe(async (state) => {
    console.log("authStore.subscribe", state);
    if (state.loading) return;

    if (state.user) {
      const { data: data2, error: error2 } = await supabase
        .rpc('claim_daily_bonus')
      if (error2) {
        console.error(error2);
        onlineStatus.set("signed-out");
        return;
      }

      const {data, error} = await supabase
        .from("wallet_total_points")
        .select("total_points, subscription_plan")
        .eq("id", state.user.id)
        .single();
      if (error) {
        console.error(error);
        onlineStatus.set("signed-out");
        return;
      }
      const feathral = data?.total_points ?? 0;
      const plan = data?.subscription_plan;

      onlineAccount.set({ user: state.user, feathral });
      onlineStatus.set("signed-in");
      subscriptionPlan.set(plan);

      // fetch profile
      const profile = await getMyProfile();
      if (profile) {
        onlineProfile.set(profile);
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
