"use client";

import { Check } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { useInView } from "react-intersection-observer";

import { cn } from "@/lib/utils";
import type { ApiPhoto } from "@/types/gallery";

// ApiPhoto adalah single source of truth untuk Photo type
type Photo = ApiPhoto;

interface ProgressivePhotoCardProps {
  photo: Photo;
  index?: number; // Optional, for future use (sorting, etc)
  onClick: () => void;
  isSelected: boolean;
  canSelect: boolean;
  onToggleSelect: (photoId: string) => void;
  priority?: boolean;
}

/**
 * Progressive loading photo card with intersection observer
 * Only loads images when they're about to enter viewport (200px margin)
 * Enhances performance for galleries with 100+ photos
 */
export function ProgressivePhotoCard({
  photo,
  index: _index, // Prefix with _ to indicate intentionally unused
  onClick,
  isSelected,
  canSelect,
  onToggleSelect,
  priority = false,
}: ProgressivePhotoCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  // Progressive loading: load images 200px before they enter viewport
  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin: "200px 0px",
    skip: priority, // Skip intersection observer for priority images (first 4)
  });

  const shouldLoad = priority || inView;

  return (
    <div ref={ref} className="w-full">
      {/**
       * Pattern: Clickable card with inner interactive element
       * 
       * HTML spec: <button> CANNOT contain interactive content (<button>, <a>, etc.)
       * Solution: Use <div role="button"> for outer card, <button> for inner selection indicator
       * 
       * This is the correct accessible pattern for "card with action button":
       * - Outer div: handles lightbox click (entire card)
       * - Inner button: handles selection toggle (checkmark icon)
       * 
       * @see https://www.w3.org/WAI/ARIA/apg/patterns/button/
       */}
      <div
        role="button"
        tabIndex={0}
        onClick={(e) => {
          if (e.shiftKey || e.metaKey || e.ctrlKey) {
            e.preventDefault();
            onToggleSelect(photo.id);
          } else {
            onClick();
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        }}
        className={cn(
          "relative w-full aspect-square overflow-hidden rounded-lg",
          "transition-all duration-200 ease-out",
          "group cursor-pointer",
          "hover:shadow-lg hover:scale-[1.02]",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
          isSelected && "ring-4 ring-blue-500 scale-95"
        )}
        aria-label={`${isSelected ? "Deselect" : "Select"} ${photo.filename}`}
      >
        {/* Selection indicator - proper <button> inside div container (valid HTML) */}
        <button
          type="button"
          aria-label={isSelected ? `Batalkan pilihan ${photo.filename}` : `Pilih ${photo.filename}`}
          className={cn(
            "absolute top-2 right-2 z-10",
            "w-8 h-8 rounded-full border-2",
            "flex items-center justify-center",
            "transition-all duration-200",
            "shadow-lg",
            "focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500",
            isSelected
              ? "bg-blue-500 border-white scale-110"
              : "bg-white/90 border-gray-300 backdrop-blur-sm group-hover:border-blue-500 group-hover:scale-110"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(photo.id);
          }}
        >
          {isSelected && <Check className="w-5 h-5 text-white" />}
        </button>

        {/* Hover overlay */}
        <div
          className={cn(
            "absolute inset-0 transition-colors duration-200",
            "bg-black/0 group-hover:bg-black/10"
          )}
        />

        {/* Image or skeleton */}
        {shouldLoad ? (
          <>
            {/* Skeleton while loading */}
            {!imageLoaded && (
              <div className="absolute inset-0 bg-gray-200 animate-pulse" />
            )}

            {/* Actual image */}
            <Image
              src={photo.url}
              alt={photo.filename}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className={cn(
                "object-cover transition-opacity duration-300",
                imageLoaded ? "opacity-100" : "opacity-0"
              )}
              onLoad={() => setImageLoaded(true)}
              priority={priority}
              quality={85}
              placeholder="blur"
              blurDataURL={`data:image/svg+xml;base64,${btoa(
                '<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="400" fill="#e5e7eb"/></svg>'
              )}`}
            />
          </>
        ) : (
          // Skeleton placeholder before loading
          <div className="absolute inset-0 bg-gray-200 animate-pulse" />
        )}

        {/* Disabled overlay */}
        {!canSelect && !isSelected && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white text-sm font-medium px-3 py-1 bg-black/70 rounded">
              Maksimal tercapai
            </span>
          </div>
        )}
      </div>

      {/* Caption (optional) */}
      <div className="mt-2 px-1">
        <p className="text-xs text-gray-500 truncate">{photo.filename}</p>
      </div>
    </div>
  );
}
