'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { WhatsappIcon } from "@/components/icons/whatsapp-icon";


// Types
interface IncludeCetak {
  nama: string;
  jumlah: number;
}
import { BookingFormContent } from "./_components/booking-form-content";

export default function BookingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="inline-block w-12 h-12 border-4 border-gray-300 border-t-gray-700 rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600">Memuat...</p>
          </div>
        </div>
      }
    >
      <BookingFormContent />
    </Suspense>
  );
}
