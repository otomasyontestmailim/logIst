/**
 * E-posta gönderme yardımcısı — Resend API.
 * Ortam değişkenleri:
 *   RESEND_API_KEY   — Resend dashboard'dan alınan API anahtarı
 *   EMAIL_FROM       — Gönderen adres (örn. "Lojistik CRM <noreply@qratix.com>")
 *                     Resend ücretsiz planda yalnızca onaylı domainlerden gönderilebilir.
 *
 * Resend paketi yüklü olmalıdır: npm install resend
 */

import "server-only";

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

interface SendEmailResult {
  ok: boolean;
  id?: string;
  error?: string;
}

export async function sendEmail(
  opts: SendEmailOptions,
): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Lojistik CRM <noreply@lojistik.app>";

  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY tanımlı değil — e-posta atlandı.");
    return { ok: false, error: "email_not_configured" };
  }

  // Dynamic import to handle missing package gracefully at runtime
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  let Resend: typeof import("resend").Resend;
  try {
    const mod = await import("resend");
    Resend = mod.Resend;
  } catch {
    console.error("[email] resend paketi yüklü değil — npm install resend");
    return { ok: false, error: "resend_not_installed" };
  }

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from,
    to: Array.isArray(opts.to) ? opts.to : [opts.to],
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });

  if (error) {
    console.error("[email] Resend hatası:", error);
    return { ok: false, error: error.message };
  }

  return { ok: true, id: data?.id };
}

// ─── Şablon yardımcıları ──────────────────────────────────────────────────────

export function driverInviteEmail(opts: {
  orgName: string;
  driverName: string;
  email: string;
  password: string;
  appUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = `${opts.orgName} — Şoför uygulamasına davet`;
  const loginUrl = `${opts.appUrl}/sign-in`;

  const html = `
<!DOCTYPE html>
<html lang="tr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1a1a1a">
  <h2 style="margin-bottom:8px">${opts.orgName}</h2>
  <p>Merhaba <strong>${opts.driverName}</strong>,</p>
  <p>Şoför uygulamasına davet edildiniz. Aşağıdaki bilgilerle giriş yapabilirsiniz:</p>
  <table style="border-collapse:collapse;margin:16px 0;width:100%">
    <tr>
      <td style="padding:8px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;width:120px">E-posta</td>
      <td style="padding:8px 12px;border:1px solid #e2e8f0">${opts.email}</td>
    </tr>
    <tr>
      <td style="padding:8px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600">Geçici şifre</td>
      <td style="padding:8px 12px;border:1px solid #e2e8f0;font-family:monospace;font-size:1.1em">${opts.password}</td>
    </tr>
  </table>
  <p>Giriş yaptıktan sonra şifrenizi değiştirmenizi öneririz.</p>
  <a href="${loginUrl}" style="display:inline-block;margin-top:8px;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">
    Uygulamaya Git
  </a>
  <hr style="margin-top:32px;border:none;border-top:1px solid #e2e8f0">
  <p style="font-size:0.8em;color:#6b7280">Bu e-posta ${opts.orgName} tarafından gönderilmiştir.</p>
</body>
</html>`;

  const text = `${opts.orgName} — Şoför Daveti\n\nMerhaba ${opts.driverName},\n\nE-posta: ${opts.email}\nGeçici şifre: ${opts.password}\n\nGiriş: ${loginUrl}`;

  return { subject, html, text };
}

export function expiryReminderEmail(opts: {
  orgName: string;
  adminName: string;
  items: Array<{
    driverName: string;
    docType: string;
    expiry: string;
    daysLeft: number;
  }>;
  appUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = `${opts.orgName} — ${opts.items.length} şoför belgesi yakında sona eriyor`;
  const driversUrl = `${opts.appUrl}/drivers`;

  const rows = opts.items
    .map(
      (item) =>
        `<tr>
          <td style="padding:8px 12px;border:1px solid #e2e8f0">${item.driverName}</td>
          <td style="padding:8px 12px;border:1px solid #e2e8f0">${item.docType}</td>
          <td style="padding:8px 12px;border:1px solid #e2e8f0">${item.expiry}</td>
          <td style="padding:8px 12px;border:1px solid #e2e8f0;color:${item.daysLeft <= 7 ? "#dc2626" : "#d97706"}">${item.daysLeft} gün</td>
        </tr>`,
    )
    .join("");

  const html = `
<!DOCTYPE html>
<html lang="tr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a">
  <h2 style="margin-bottom:8px">${opts.orgName}</h2>
  <p>Merhaba <strong>${opts.adminName}</strong>,</p>
  <p>Aşağıdaki şoför belgelerinin süresi <strong>30 gün içinde</strong> dolmaktadır:</p>
  <table style="border-collapse:collapse;width:100%;margin:16px 0">
    <thead>
      <tr style="background:#f8fafc">
        <th style="padding:8px 12px;border:1px solid #e2e8f0;text-align:left">Şoför</th>
        <th style="padding:8px 12px;border:1px solid #e2e8f0;text-align:left">Belge</th>
        <th style="padding:8px 12px;border:1px solid #e2e8f0;text-align:left">Bitiş Tarihi</th>
        <th style="padding:8px 12px;border:1px solid #e2e8f0;text-align:left">Kalan</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <a href="${driversUrl}" style="display:inline-block;margin-top:8px;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">
    Şoförleri Görüntüle
  </a>
  <hr style="margin-top:32px;border:none;border-top:1px solid #e2e8f0">
  <p style="font-size:0.8em;color:#6b7280">Bu e-posta ${opts.orgName} tarafından otomatik olarak gönderilmiştir.</p>
</body>
</html>`;

  const textLines = opts.items.map(
    (item) =>
      `• ${item.driverName} — ${item.docType}: ${item.expiry} (${item.daysLeft} gün kaldı)`,
  );
  const text = [
    `${opts.orgName} — Şoför Belgesi Uyarısı`,
    "",
    `Merhaba ${opts.adminName},`,
    "",
    "Aşağıdaki şoför belgelerinin süresi 30 gün içinde dolmaktadır:",
    "",
    ...textLines,
    "",
    `Şoförleri görüntüle: ${driversUrl}`,
  ].join("\n");

  return { subject, html, text };
}

export function documentStatusEmail(opts: {
  driverName: string;
  docType: string;
  status: "approved" | "rejected";
  tripLabel: string;
  appUrl: string;
}): { subject: string; html: string; text: string } {
  const statusLabel =
    opts.status === "approved" ? "Onaylandı ✓" : "Reddedildi ✗";
  const subject = `Belge ${statusLabel}: ${opts.docType} — ${opts.tripLabel}`;

  const html = `
<!DOCTYPE html>
<html lang="tr">
<head><meta charset="utf-8"></head>
<body style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1a1a1a">
  <p>Merhaba <strong>${opts.driverName}</strong>,</p>
  <p>
    <strong>${opts.tripLabel}</strong> seferine yüklediğiniz
    <strong>${opts.docType}</strong> belgesi
    <span style="color:${opts.status === "approved" ? "#16a34a" : "#dc2626"};font-weight:600">${statusLabel}</span>.
  </p>
  <a href="${opts.appUrl}/driver" style="display:inline-block;margin-top:8px;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">
    Uygulamaya Git
  </a>
</body>
</html>`;

  const text = `Belge ${statusLabel}: ${opts.docType} — ${opts.tripLabel}`;

  return { subject, html, text };
}
