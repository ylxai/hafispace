import { Resend } from 'resend';

import { env } from '@/lib/env';
import logger from '@/lib/logger';

import { formatRupiah } from './format';

/**
 * Escape HTML special characters — untuk header email fields (From, Subject, dll)
 * Menghapus newline untuk prevent email header injection
 */
function escapeHtml(str: string): string {
  return str
    .replace(/[\r\n]/g, '') // prevent email header injection
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Escape HTML special characters — untuk body email (dalam <pre>, <div>, dll)
 * Mempertahankan newline agar format teks terjaga di dalam tag <pre>
 */
function escapeHtmlBody(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

let resend: Resend | null = null;

function getResend() {
  resend ??= new Resend(env.RESEND_API_KEY);
  return resend;
}

export async function sendBookingConfirmationEmail({
  to,
  namaClient,
  kodeBooking,
  tanggalSesi,
  namaPaket,
  hargaPaket,
  dpAmount,
  dpPercentage,
  namaStudio,
  rekeningPembayaran,
  invoiceUrl,
}: {
  to: string;
  namaClient: string;
  kodeBooking: string;
  tanggalSesi: string;
  namaPaket: string;
  hargaPaket: number;
  dpAmount: number;
  dpPercentage: number;
  namaStudio: string;
  rekeningPembayaran?: string | null;
  invoiceUrl: string;
}) {
  if (!env.RESEND_API_KEY) {
    // RESEND_API_KEY not set — email skipped (set in .env to enable)
    return { success: false, error: 'No API key' };
  }

  try {
    const formatDate = (s: string) => new Date(s).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const safeClient = escapeHtml(namaClient);
    const safeStudio = escapeHtml(namaStudio);
    const safePaket = escapeHtml(namaPaket);
    const safeKode = escapeHtml(kodeBooking);
    const safeRekening = rekeningPembayaran ? escapeHtmlBody(rekeningPembayaran) : null; // escapeHtmlBody: preserve newline untuk format <pre>

    // Sanitize invoiceUrl — case-insensitive https check + escape untuk prevent attribute injection
    const safeInvoiceUrl = escapeHtml(/^https:\/\//i.test(invoiceUrl) ? invoiceUrl : "#");

    await getResend().emails.send({
      from: `${safeStudio} <onboarding@resend.dev>`,
      to,
      subject: `Konfirmasi Booking ${safeKode} - ${safeStudio}`,
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #0f172a;">Terima kasih, ${safeClient}! 🎉</h2>
          <p>Booking Anda telah diterima oleh <strong>${safeStudio}</strong>.</p>
          <div style="background: #f8fafc; border-radius: 12px; padding: 16px; margin: 16px 0;">
            <p><strong>Kode Booking:</strong> ${safeKode}</p>
            <p><strong>Paket:</strong> ${safePaket}</p>
            <p><strong>Tanggal Sesi:</strong> ${formatDate(tanggalSesi)}</p>
            <p><strong>Total:</strong> ${formatRupiah(hargaPaket)}</p>
            <p><strong>DP (${dpPercentage}%):</strong> ${formatRupiah(dpAmount)}</p>
          </div>
          ${safeRekening ? `<div style="background: #fefce8; border-radius: 12px; padding: 16px; margin: 16px 0;"><p><strong>Rekening Pembayaran:</strong></p><pre style="font-family: monospace;">${safeRekening}</pre></div>` : ''}
          <a href="${safeInvoiceUrl}" style="display: inline-block; background: #0f172a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0;">Lihat Invoice</a>
          <p style="color: #94a3b8; font-size: 12px;">Powered by Hafispace</p>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown email error';
    logger.error({ err: error }, 'Email error');
    return { success: false, error: message };
  }
}
