import Image from 'next/image';

export default function cloudinaryLoader({ src, width, quality }: { src: string; width: number; quality?: number }) {
  const params = ['f_auto', 'c_limit', `w_${width}`, `q_${quality ?? 'auto'}`];
  
  // Handle both full Cloudinary URLs and public IDs
  if (src.includes('cloudinary.com')) {
    // Extract the public ID from the URL
    const urlParts = src.split('/upload/');
    if (urlParts.length > 1) {
      return `${urlParts[0]}/upload/${params.join(',')}/${urlParts[1]}`;
    }
    return src;
  }
  
  // If it's just a public ID
  return `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/${params.join(',')}/${src}`;
}

export { Image, cloudinaryLoader };
