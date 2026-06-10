/**
 * Tarayıcıda, kütüphanesiz görüntü sıkıştırma (belge yükleme için).
 * Telefon fotoğrafı (5–10 MB) ~200–500 KB JPEG'e iner; HEIC gibi formatlar
 * da canvas üzerinden JPEG'e dönüştürülmüş olur.
 *
 * Başarısız olursa (eski tarayıcı, bozuk dosya) orijinal dosya döner —
 * bucket'ın 10 MB limiti yine de korur.
 */
export async function compressImage(
  file: File,
  maxEdge = 1600,
  quality = 0.8,
): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    return blob ?? file;
  } catch {
    return file;
  }
}
