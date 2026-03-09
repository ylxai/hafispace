"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import Image from "next/image";
import cloudinaryLoader from "@/lib/image-loader";
import { MIN_SWIPE_DISTANCE_PX } from "@/lib/constants";
import { generateLightboxThumbnailUrl } from "@/lib/cloudinary/utils";

interface Photo {
  id: string;
  storageKey: string;
  filename: string;
  url: string;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
}

interface LightboxProps {
  photos: Photo[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (photo: Photo) => void;
  onDeselect?: (photo: Photo) => void;
  isSelected?: (photo: Photo) => boolean;
  showSelectionControls?: boolean;
}

export function Lightbox({
  photos,
  initialIndex = 0,
  isOpen,
  onClose,
  onSelect,
  onDeselect,
  isSelected,
  showSelectionControls = false,
}: LightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentPhoto = photos?.[currentIndex];
  const minSwipeDistance = MIN_SWIPE_DISTANCE_PX;

  // Reset index when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setIsZoomed(false);
    }
  }, [isOpen, initialIndex]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isZoomed) {
          setIsZoomed(false);
        } else {
          onClose();
        }
      } else if (e.key === "ArrowLeft") {
        goToPrevious();
      } else if (e.key === "ArrowRight") {
        goToNext();
      } else if (e.key === " " || e.key === "Enter") {
        if (showSelectionControls && currentPhoto) {
          handleToggleSelect();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isZoomed, currentIndex, showSelectionControls, currentPhoto, onClose]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
    setIsZoomed(false);
  }, [photos.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
    setIsZoomed(false);
  }, [photos.length]);

  const handleToggleSelect = useCallback(() => {
    if (!currentPhoto) return;
    
    if (isSelected?.(currentPhoto)) {
      onDeselect?.(currentPhoto);
    } else {
      onSelect?.(currentPhoto);
    }
  }, [currentPhoto, isSelected, onSelect, onDeselect]);

  // Touch handlers for swipe
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.targetTouches[0]) {
      setTouchEnd(null);
      setTouchStart(e.targetTouches[0].clientX);
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.targetTouches[0]) {
      setTouchEnd(e.targetTouches[0].clientX);
    }
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) {
      goToNext();
    } else if (isRightSwipe) {
      goToPrevious();
    }
  };

  // Reset zoom when changing photos
  useEffect(() => {
    setIsZoomed(false);
  }, [currentIndex]);

  if (!isOpen || !currentPhoto) return null;

  const selected = isSelected?.(currentPhoto) ?? false;

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col bg-slate-950/98 backdrop-blur-md"
      ref={containerRef}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-3">
          <p className="text-sm font-medium text-white sm:text-base">
            {currentIndex + 1} <span className="text-slate-400">/ {photos.length}</span>
          </p>
          {currentPhoto.width && currentPhoto.height && (
            <p className="hidden text-xs text-slate-400 sm:block">
              {currentPhoto.width} × {currentPhoto.height}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {showSelectionControls && (
            <button
              type="button"
              onClick={handleToggleSelect}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 sm:px-6 ${
                selected
                  ? "bg-white text-slate-900 hover:bg-slate-100"
                  : "border border-white/30 text-white hover:bg-white/10"
              }`}
            >
              {selected ? "✓ Selected" : "Select"}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/20 sm:p-3"
            aria-label="Close"
          >
            <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main image area */}
      <div 
        className="relative flex-1 overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Navigation arrows - hidden on mobile, shown on hover/tap */}
        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
              className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white/80 transition-all hover:bg-black/60 hover:text-white sm:left-4 sm:p-3"
              aria-label="Previous"
            >
              <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); goToNext(); }}
              className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white/80 transition-all hover:bg-black/60 hover:text-white sm:right-4 sm:p-3"
              aria-label="Next"
            >
              <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* Image */}
        <div 
          className="flex h-full w-full items-center justify-center p-4 sm:p-8"
          onClick={() => setIsZoomed(!isZoomed)}
        >
          <div className={`relative h-full w-full transition-transform duration-300 ${isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}>
            <Image
              src={currentPhoto.url}
              alt={currentPhoto.filename}
              fill
              className={`object-contain transition-transform duration-300 ${
                isZoomed ? "scale-150" : "scale-100"
              }`}
              sizes="100vw"
              priority
              loader={cloudinaryLoader}
              quality={90}
            />
          </div>
        </div>

        {/* Filename at bottom of image */}
        <div className="absolute bottom-4 left-0 right-0 text-center sm:hidden">
          <p className="inline-block rounded-full bg-black/60 px-4 py-1.5 text-xs text-white">
            {currentPhoto.filename}
          </p>
        </div>
      </div>

      {/* Thumbnail strip */}
      {photos.length > 1 && (
        <div className="border-t border-white/10 bg-slate-900/80 px-2 py-2 sm:px-4 sm:py-3">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide sm:gap-2">
            {photos.map((photo, index) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setCurrentIndex(index)}
                className={`relative shrink-0 overflow-hidden rounded-lg transition-all duration-200 ${
                  index === currentIndex
                    ? "ring-2 ring-white ring-offset-2 ring-offset-slate-900"
                    : "opacity-40 hover:opacity-80"
                }`}
              >
                <div className="h-12 w-12 sm:h-14 sm:w-14">
                  <Image
                    src={generateLightboxThumbnailUrl(photo.url)}
                    alt={photo.filename}
                    fill
                    className="object-cover"
                    sizes="60px"
                    loader={cloudinaryLoader}
                    quality={75}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = photo.url;
                    }}
                  />
                </div>
                {isSelected?.(photo) && (
                  <div className="absolute right-0.5 top-0.5 rounded-full bg-sky-500 p-0.5 sm:p-1">
                    <svg className="h-2.5 w-2.5 text-white sm:h-3 sm:w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
