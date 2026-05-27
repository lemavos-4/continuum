const AUTH_TOKEN_KEYS = [
  "access_token",
  "refresh_token",
  "token",
  "jwt",
  "login_token",
  "vault_id",
  "vaultId",
] as const;

function stripTokenKeys(params: URLSearchParams) {
  let changed = false;

  AUTH_TOKEN_KEYS.forEach((key) => {
    if (params.has(key)) {
      params.delete(key);
      changed = true;
    }
  });

  return changed;
}

export function sanitizeAuthRedirectUrl() {
  if (typeof window === "undefined") return false;

  const currentUrl = new URL(window.location.href);
  const searchChanged = stripTokenKeys(currentUrl.searchParams);

  const rawHash = window.location.hash.replace(/^#/, "");
  const [hashPath = "", hashQuery = ""] = rawHash.split("?", 2);
  const normalizedPath = hashPath.startsWith("/") ? hashPath : `/${hashPath}`;
  const hashParams = new URLSearchParams(hashQuery);
  const hashChanged = stripTokenKeys(hashParams);

  const cleanedHash = hashChanged || hashParams.toString()
    ? `${normalizedPath}${hashParams.toString() ? `?${hashParams.toString()}` : ""}`
    : normalizedPath;

  const nextUrl = `${currentUrl.origin}${currentUrl.pathname}${currentUrl.search}${cleanedHash ? `#${cleanedHash}` : ""}`;

  if (searchChanged || hashChanged) {
    window.history.replaceState({}, document.title, nextUrl);
    return true;
  }

  return false;
}

export function extractAuthTokensFromLocation() {
  if (typeof window === "undefined") return null;

  const searchParams = new URLSearchParams(window.location.search);
  const rawHash = window.location.hash.replace(/^#/, "");
  const [, hashQuery = ""] = rawHash.split("?", 2);
  const hashParams = new URLSearchParams(hashQuery);

  const getValue = (key: string) => searchParams.get(key) ?? hashParams.get(key);

  return {
    accessToken: getValue("access_token") ?? getValue("token") ?? getValue("jwt") ?? getValue("login_token"),
    refreshToken: getValue("refresh_token"),
    vaultId: getValue("vault_id") ?? getValue("vaultId"),
  };
}
