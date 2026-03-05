'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { WhatsappIcon } from "@/components/icons/whatsapp-icon";


// Types
interface IncludeCetak {
  nama: string;
  jumlah: number;
}

interface Package {
  id: string;
  namaPaket: string;
  kategori: string;
  harga: number;
  deskripsi: string | null;
  kuotaEdit: number | null;
  includeCetak: IncludeCetak[] | null;
}

interface CustomField {
  id: string;
  label: string;
  tipe: 'TEXT' | 'TEXTAREA' | 'DATE' | 'SELECT';
  isRequired: boolean;
  urutan: number;
}

interface VendorData {
  id: string;
  namaStudio: string | null;
  logoUrl: string | null;
  waAdmin: string | null;
  dpPercentage: number;
  rekeningPembayaran: string | null;
  syaratKetentuan: string | null;
  themeColor: string;
  successMessage: string | null;
  bookingFormActive: boolean;
  packages: Package[];
  customFields: CustomField[];
}

interface BookingResponse {
  id: string;
  kodeBooking: string;
  namaClient: string;
  tanggalSesi: string;
  status: string;
  hargaPaket: number;
  dpAmount: number;
  dpPercentage: number;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export function BookingFormContent() {
  const searchParams = useSearchParams();
  const vendorId = searchParams.get('v');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vendorData, setVendorData] = useState<VendorData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<BookingResponse | null>(null);

  // Form state
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [namaClient, setNamaClient] = useState('');
  const [hpClient, setHpClient] = useState('');
  const [emailClient, setEmailClient] = useState('');
  const [tanggalSesi, setTanggalSesi] = useState('');
  const [lokasiSesi, setLokasiSesi] = useState('');
  const [catatan, setCatatan] = useState('');
  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Fetch vendor data
  useEffect(() => {
    if (!vendorId) {
      setError('Vendor ID tidak ditemukan. Pastikan link yang Anda gunakan sudah benar.');
      setLoading(false);
      return;
    }

    const fetchVendorData = async () => {
      try {
        const response = await fetch(`/api/public/booking?vendorId=${vendorId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Vendor tidak ditemukan');
          }
          throw new Error('Gagal memuat data vendor');
        }

        const data = await response.json();
        
        if (!data.vendor.bookingFormActive) {
          throw new Error('Form booking saat ini tidak aktif. Silakan hubungi studio untuk informasi lebih lanjut.');
        }

        setVendorData(data.vendor);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
      } finally {
        setLoading(false);
      }
    };

    fetchVendorData();
  }, [vendorId]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!vendorData || !vendorId) return;

    // Validation
    if (!selectedPackageId) {
      alert('Silakan pilih paket terlebih dahulu');
      return;
    }

    if (!namaClient.trim() || !hpClient.trim()) {
      alert('Nama dan nomor HP wajib diisi');
      return;
    }

    if (!tanggalSesi) {
      alert('Tanggal sesi wajib diisi');
      return;
    }

    // Validate custom fields
    for (const field of vendorData.customFields) {
      if (field.isRequired && !customFields[field.id]?.trim()) {
        alert(`${field.label} wajib diisi`);
        return;
      }
    }

    if (vendorData.syaratKetentuan && !agreedToTerms) {
      alert('Anda harus menyetujui syarat dan ketentuan');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/public/booking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vendorId,
          namaClient: namaClient.trim(),
          hpClient: hpClient.trim(),
          emailClient: emailClient.trim() || null,
          tanggalSesi,
          lokasiSesi: lokasiSesi.trim() || null,
          paketId: selectedPackageId,
          catatan: catatan.trim() || null,
          customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error ?? 'Gagal membuat booking');
      }

      const data = await response.json();
      setSuccessData(data.booking);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Terjadi kesalahan saat membuat booking');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-gray-300 border-t-gray-700 rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Memuat form booking...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !vendorData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Terjadi Kesalahan</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  // Success state
  if (successData) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6 text-center">
            {vendorData.logoUrl && (
              <Image
                src={vendorData.logoUrl}
                alt={vendorData.namaStudio ?? 'Studio'}
                width={120}
                height={64}
                className="h-16 mx-auto mb-4 object-contain"
              />
            )}
            {vendorData.namaStudio && (
              <h1 className="text-2xl font-bold text-gray-900">{vendorData.namaStudio}</h1>
            )}
          </div>

          {/* Success Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-center mb-6">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: vendorData.themeColor + '20' }}
              >
                <svg
                  className="w-10 h-10"
                  style={{ color: vendorData.themeColor }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Berhasil!</h2>
              <p className="text-gray-600">
                {vendorData.successMessage ?? 'Terima kasih telah melakukan booking. Kami akan segera menghubungi Anda.'}
              </p>
            </div>

            <div className="border-t border-gray-200 pt-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Kode Booking</p>
                <p className="text-2xl font-bold" style={{ color: vendorData.themeColor }}>
                  {successData.kodeBooking}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Nama Client</p>
                  <p className="font-semibold text-gray-900">{successData.namaClient}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Tanggal Sesi</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(successData.tanggalSesi).toLocaleDateString('id-ID', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h3 className="font-semibold text-gray-900 mb-3">Informasi Pembayaran</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Harga Paket</span>
                    <span className="font-semibold">{formatCurrency(successData.hargaPaket)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">DP ({successData.dpPercentage}%)</span>
                    <span className="font-bold text-lg" style={{ color: vendorData.themeColor }}>
                      {formatCurrency(successData.dpAmount)}
                    </span>
                  </div>
                </div>

                {vendorData.rekeningPembayaran && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm font-semibold text-gray-900 mb-2">Transfer ke:</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{vendorData.rekeningPembayaran}</p>
                  </div>
                )}
              </div>

              <p className="text-sm text-gray-600 text-center mt-6">
                Simpan kode booking Anda untuk referensi. Kami akan segera menghubungi Anda untuk konfirmasi.
              </p>

              {/* WA Admin Link */}
              <div className="mt-6 text-center">
                <a
                  href={`https://wa.me/${(vendorData.waAdmin ?? '6282353345446').replace(/\D/g, '')}?text=${encodeURIComponent(
                    `Halo, saya baru saja melakukan booking dengan kode *${successData.kodeBooking}*.\n\nNama: ${successData.namaClient}\nTanggal Sesi: ${new Date(successData.tanggalSesi).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}\nTotal: ${formatCurrency(successData.hargaPaket)}\nDP (${successData.dpPercentage}%): ${formatCurrency(successData.dpAmount)}\n\nMohon konfirmasinya, terima kasih 🙏`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-green-500 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-green-600 transition"
                >
                  <WhatsappIcon className="h-5 w-5" />
                  Konfirmasi via WhatsApp
                </a>
                <p className="mt-2 text-xs text-gray-400">Pesan otomatis sudah disiapkan, tinggal kirim!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main form
  const selectedPackage = vendorData.packages.find((p) => p.id === selectedPackageId);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 text-center">
          {vendorData.logoUrl && (
            <Image
              src={vendorData.logoUrl}
              alt={vendorData.namaStudio ?? 'Studio'}
              width={120}
              height={64}
              className="h-16 mx-auto mb-4 object-contain"
            />
          )}
          {vendorData.namaStudio && (
            <h1 className="text-2xl font-bold text-gray-900">{vendorData.namaStudio}</h1>
          )}
          <p className="text-gray-600 mt-2">Form Booking Sesi Foto</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Pilih Paket */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">1. Pilih Paket</h2>
            <div className="space-y-3">
              {vendorData.packages.map((pkg) => (
                <div
                  key={pkg.id}
                  onClick={() => setSelectedPackageId(pkg.id)}
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    selectedPackageId === pkg.id
                      ? 'border-current shadow-md'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  style={
                    selectedPackageId === pkg.id
                      ? { borderColor: vendorData.themeColor, backgroundColor: vendorData.themeColor + '08' }
                      : {}
                  }
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-lg text-gray-900">{pkg.namaPaket}</h3>
                        <span
                          className="text-xs px-2 py-1 rounded-full font-medium"
                          style={{
                            backgroundColor: vendorData.themeColor + '20',
                            color: vendorData.themeColor,
                          }}
                        >
                          {pkg.kategori}
                        </span>
                      </div>
                      <p className="text-xl font-bold" style={{ color: vendorData.themeColor }}>
                        {formatCurrency(pkg.harga)}
                      </p>
                    </div>
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        selectedPackageId === pkg.id ? 'border-current' : 'border-gray-300'
                      }`}
                      style={selectedPackageId === pkg.id ? { borderColor: vendorData.themeColor } : {}}
                    >
                      {selectedPackageId === pkg.id && (
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: vendorData.themeColor }}></div>
                      )}
                    </div>
                  </div>
                  {pkg.deskripsi && <p className="text-sm text-gray-600 mb-2">{pkg.deskripsi}</p>}
                  {pkg.kuotaEdit !== null && (
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Kuota Edit:</span> {pkg.kuotaEdit} foto
                    </p>
                  )}
                  {pkg.includeCetak && pkg.includeCetak.length > 0 && (
                    <div className="text-sm text-gray-700 mt-2">
                      <span className="font-semibold">Include Cetak:</span>
                      <ul className="list-disc list-inside ml-2">
                        {pkg.includeCetak.map((cetak, idx) => (
                          <li key={idx}>
                            {cetak.nama} ({cetak.jumlah}x)
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Data Diri */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">2. Data Diri</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={namaClient}
                  onChange={(e) => setNamaClient(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-offset-0 focus:border-transparent outline-none"
                  style={{ outlineColor: vendorData.themeColor }}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nomor HP/WhatsApp <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={hpClient}
                  onChange={(e) => setHpClient(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-offset-0 focus:border-transparent outline-none"
                  placeholder="08xxxxxxxxxx"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email (Opsional)</label>
                <input
                  type="email"
                  value={emailClient}
                  onChange={(e) => setEmailClient(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-offset-0 focus:border-transparent outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Detail Sesi */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">3. Detail Sesi</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tanggal Sesi <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={tanggalSesi}
                  onChange={(e) => setTanggalSesi(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-offset-0 focus:border-transparent outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Lokasi Sesi (Opsional)</label>
                <input
                  type="text"
                  value={lokasiSesi}
                  onChange={(e) => setLokasiSesi(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-offset-0 focus:border-transparent outline-none"
                  placeholder="Contoh: Studio, Outdoor, Hotel, dll"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Catatan (Opsional)</label>
                <textarea
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-offset-0 focus:border-transparent outline-none resize-none"
                  placeholder="Tambahkan informasi tambahan yang perlu kami ketahui..."
                />
              </div>
            </div>
          </div>

          {/* Section 4: Custom Fields */}
          {vendorData.customFields.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">4. Informasi Tambahan</h2>
              <div className="space-y-4">
                {vendorData.customFields
                  .sort((a, b) => a.urutan - b.urutan)
                  .map((field) => (
                    <div key={field.id}>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        {field.label} {field.isRequired && <span className="text-red-500">*</span>}
                      </label>
                      {field.tipe === 'TEXT' && (
                        <input
                          type="text"
                          value={customFields[field.id] ?? ''}
                          onChange={(e) =>
                            setCustomFields((prev) => ({ ...prev, [field.id]: e.target.value }))
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-offset-0 focus:border-transparent outline-none"
                          required={field.isRequired}
                        />
                      )}
                      {field.tipe === 'TEXTAREA' && (
                        <textarea
                          value={customFields[field.id] ?? ''}
                          onChange={(e) =>
                            setCustomFields((prev) => ({ ...prev, [field.id]: e.target.value }))
                          }
                          rows={3}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-offset-0 focus:border-transparent outline-none resize-none"
                          required={field.isRequired}
                        />
                      )}
                      {field.tipe === 'DATE' && (
                        <input
                          type="date"
                          value={customFields[field.id] ?? ''}
                          onChange={(e) =>
                            setCustomFields((prev) => ({ ...prev, [field.id]: e.target.value }))
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-offset-0 focus:border-transparent outline-none"
                          required={field.isRequired}
                        />
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Section 5: Terms & Conditions */}
          {vendorData.syaratKetentuan && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {vendorData.customFields.length > 0 ? '5' : '4'}. Syarat & Ketentuan
              </h2>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 max-h-60 overflow-y-auto">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{vendorData.syaratKetentuan}</p>
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-gray-300 cursor-pointer"
                  style={{ accentColor: vendorData.themeColor }}
                  required
                />
                <span className="text-sm text-gray-700">
                  Saya telah membaca dan menyetujui syarat & ketentuan yang berlaku{' '}
                  <span className="text-red-500">*</span>
                </span>
              </label>
            </div>
          )}

          {/* Submit Button */}
          <div className="bg-white rounded-lg shadow-md p-6">
            {selectedPackage && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700 font-semibold">Paket Dipilih:</span>
                  <span className="font-bold text-gray-900">{selectedPackage.namaPaket}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700">Harga Paket:</span>
                  <span className="font-bold text-lg" style={{ color: vendorData.themeColor }}>
                    {formatCurrency(selectedPackage.harga)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span className="text-gray-700">DP yang harus dibayar ({vendorData.dpPercentage}%):</span>
                  <span className="font-bold text-lg" style={{ color: vendorData.themeColor }}>
                    {formatCurrency(selectedPackage.harga * (vendorData.dpPercentage / 100))}
                  </span>
                </div>
              </div>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-6 rounded-lg font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg"
              style={{ backgroundColor: vendorData.themeColor }}
            >
              {submitting ? 'Memproses...' : 'Kirim Booking'}
            </button>
            <p className="text-xs text-gray-500 text-center mt-3">
              Dengan mengirim form ini, data Anda akan diproses untuk keperluan booking sesi foto.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

