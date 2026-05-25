import { vaultApi } from "@/lib/api";

const blobCache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();

export async function resolveVaultBlob(fileId: string): Promise<string> {
  const cached = blobCache.get(fileId);
  if (cached) return cached;
  const inFlight = pending.get(fileId);
  if (inFlight) return inFlight;

  const p = (async () => {
    const res = await vaultApi.download(fileId);
    const url = URL.createObjectURL(res.data as Blob);
    blobCache.set(fileId, url);
    return url;
  })();
  pending.set(fileId, p);
  try {
    return await p;
  } finally {
    pending.delete(fileId);
  }
}

export function invalidateVaultBlob(fileId: string) {
  const url = blobCache.get(fileId);
  if (url) {
    URL.revokeObjectURL(url);
    blobCache.delete(fileId);
  }
}
