import { stringFromBase64URL } from "./base64Url";

// supabase/ssrの現在の実装に合わせたコード
// hackなので、SSR側の実装が変わると動かなくなる可能性がある

/**
 * クッキー文字列を分割＆結合して、中の JSON を取り出す
 */
function readSplitAndDecodeCookie(projectRef: string): any | null {
  // 例: sb-<PROJECTREF>-auth-token
  const prefix = `sb-${projectRef}-auth-token`;

  // document.cookie からすべてのクッキーを取得 (["key=value", "key2=value2", ...] 形式)
  const rawCookiePairs = document.cookie.split(/;\s*/).map((c) => c.split('='));

  // prefix 名そのもの or prefix.0, prefix.1... を集める
  const parts: { idx: number; value: string }[] = [];
  for (const [key, val] of rawCookiePairs) {
    if (key === prefix) {
      // 分割されていない場合（.0 等なし）
      parts.push({ idx: 0, value: val });
    } else if (key.startsWith(prefix + '.')) {
      // 例: "sb-<PROJECTREF>-auth-token.0"
      const match = key.match(/\.(\d+)$/);
      if (match) {
        const idx = parseInt(match[1], 10);
        parts.push({ idx, value: val });
      }
    }
  }
  console.log("parts", parts);

  if (parts.length === 0) {
    return null; // 見つからない
  }

  // idx 順にソートして結合
  parts.sort((a, b) => a.idx - b.idx);
  const chunkedCookie = parts.map((p) => p.value).join('');

  // Base64 デコード → JSON パース
  try {
    // デコード (Base64URL の場合は置換が必要かも: replace('-', '+'), replace('_', '/') など)
    // ライブラリ実装によってはBase64URLだったりしますが、とりあえず通常のatobで動く場合が多いです。
    const BASE64_PREFIX = "base64-";
    let decoded = chunkedCookie;
    if (chunkedCookie.startsWith(BASE64_PREFIX)) {
      decoded = stringFromBase64URL(
        chunkedCookie.substring(BASE64_PREFIX.length),
      );
    }
    return JSON.parse(decoded);
  } catch (err) {
    console.warn('Cookie decode/parse error', err);
    return null;
  }
}

/**
 * SSR 側で作られた「sb-<projectRef>-auth-token(.0,.1,...)」Cookieを読み込んで
 * そこに含まれる access_token / refresh_token を返すヘルパー
 * （他にも expires_at, user なども入っている）
 */
export function readSupabaseSession(projectRef: string) {
  const data = readSplitAndDecodeCookie(projectRef);
  if (!data) return null;

  // data 例:
  // {
  //   "access_token": "...",
  //   "refresh_token": "...",
  //   "expires_at": 1234567890,
  //   "user": { ... },
  //   ...
  // }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
    user: data.user,
    token_type: data.token_type
    // 必要に応じて他のフィールドも
  };
}
