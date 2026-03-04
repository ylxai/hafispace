import { Resend } from 'resend';

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
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
  if (!process.env.RESEND_API_KEY) {
    console.log('RESEND_API_KEY not set, skipping email');
    return { success: false, error: 'No API key' };
  }

  try {
    const formatRupiah = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
    const formatDate = (s: string) => new Date(s).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    await getResend().emails.send({
      from: `${namaStudio} <noreply@hafispace.com>`,
      to,
      subject: `Konfirmasi Booking ${kodeBooking} - ${namaStudio}`,
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #0f172a;">Terima kasih, ${namaClient}! 🎉</h2>
          <p>Booking Anda telah diterima oleh <strong>${namaStudio}</strong>.</p>
          <div style="background: #f8fafc; border-radius: 12px; padding: 16px; margin: 16px 0;">
            <p><strong>Kode Booking:</strong> ${kodeBooking}</p>
            <p><strong>Paket:</strong> ${namaPaket}</p>
            <p><strong>Tanggal Sesi:</strong> ${formatDate(tanggalSesi)}</p>
            <p><strong>Total:</strong> ${formatRupiah(hargaPaket)}</p>
            <p><strong>DP (${dpPercentage}%):</strong> ${formatRupiah(dpAmount)}</p>
          </div>
          ${rekeningPembayaran ? `<div style="background: #fefce8; border-radius: 12px; padding: 16px; margin: 16px 0;"><p><strong>Rekening Pembayaran:</strong></p><pre style="font-family: monospace;">${rekeningPembayaran}</pre></div>` : ''}
          <a href="${invoiceUrl}" style="display: inline-block; background: #0f172a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0;">Lihat Invoice</a>
          <p style="color: #94a3b8; font-size: 12px;">Powered by Hafispace</p>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error('Email error:', error);
    return { success: false, error };
  }
}
