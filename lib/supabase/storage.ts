import "server-only";

import { createClient } from "./server";

export const DOCUMENTS_BUCKET = "documents";

/**
 * Özel "documents" bucket'ındaki path'ler için toplu imzalı URL üretir.
 * RLS-scoped istemci kullanılır: storage select politikası kapı bekçisidir
 * (kullanıcı yalnızca kendi org klasörü için URL alabilir).
 *
 * Dönen Map: storage path → imzalı URL (üretilemeyenler haritada yer almaz).
 */
export async function getSignedDocumentUrls(
  paths: string[],
  expiresIn = 3600,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (paths.length === 0) return map;

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrls(paths, expiresIn);

  if (error || !data) return map;

  // Sonuç dizisi girişle aynı sıradadır
  data.forEach((item, i) => {
    if (item.signedUrl && !item.error) {
      map.set(paths[i], item.signedUrl);
    }
  });
  return map;
}
