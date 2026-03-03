'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { cloudinaryLoader } from '@/lib/image-loader';

interface ViesusPreviewProps {
  imageUrl: string;
  publicId: string;
  vendorId: string;
}

export default function ViesusPreview({ imageUrl, publicId, vendorId }: ViesusPreviewProps) {
  const [viesusImageUrl, setViesusImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchViesusImage = async () => {
      try {
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        if (!cloudName) {
          throw new Error('Cloudinary cloud name not configured');
        }
        
        const viesusUrl = `https://res.cloudinary.com/${cloudName}/image/upload/e_viesus_correct,q_auto/${publicId}`;
        setViesusImageUrl(viesusUrl);
      } catch (err) {
        console.error('Error fetching VIESUS-enhanced image:', err);
        setError('Failed to load VIESUS-enhanced image');
      } finally {
        setLoading(false);
      }
    };

    if (publicId) {
      fetchViesusImage();
    }
  }, [publicId, vendorId]);

  if (loading) {
    return <div className="text-sm text-slate-500">Loading enhanced image...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-500">{error}</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <h3 className="text-sm font-medium text-slate-700 mb-2">Original</h3>
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-slate-200">
          <Image 
            loader={cloudinaryLoader}
            src={imageUrl}
            alt="Original"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
      </div>
      <div>
        <h3 className="text-sm font-medium text-slate-700 mb-2">VIESUS Enhanced</h3>
        {viesusImageUrl && (
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-slate-200">
            <Image 
              loader={cloudinaryLoader}
              src={viesusImageUrl}
              alt="VIESUS Enhanced"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        )}
      </div>
    </div>
  );
}