"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";

interface ImageEditorProps {
  file: File;
  onEditComplete: (editedFile: File) => void;
  onCancel: () => void;
}

export function ImageEditor({ file, onEditComplete, onCancel }: ImageEditorProps) {
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [zoom, setZoom] = useState(100);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Lazy initial state: URL dibuat sekali saat pertama render (bukan di useEffect)
  // sehingga src tidak pernah kosong ("") — mencegah crash di next/image
  const [objectUrl] = useState<string>(() => URL.createObjectURL(file));

  // Revoke URL saat komponen unmount untuk mencegah memory leak
  useEffect(() => {
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  const handleRotate = (degrees: number) => {
    setRotation((prev) => (prev + degrees) % 360);
  };

  const handleFlip = (axis: "h" | "v") => {
    if (axis === "h") setFlipH(!flipH);
    if (axis === "v") setFlipV(!flipV);
  };

  const handleZoom = (value: number) => {
    setZoom(Math.min(200, Math.max(50, value)));
  };

  const handleApply = () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    // Apply transformations
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);
    
    // Apply zoom
    const scale = zoom / 100;
    ctx.scale(scale, scale);
    
    // Draw image
    ctx.drawImage(image, 0, 0);
    ctx.restore();

    // Convert to file
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const editedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now(),
          });
          onEditComplete(editedFile);
        }
      },
      file.type,
      0.95
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Edit Image</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:border-slate-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700"
          >
            Apply & Upload
          </button>
        </div>
      </div>

      {/* Image Preview */}
      <div className="relative overflow-hidden rounded-xl bg-slate-100">
        <Image
          src={objectUrl}
          alt={file.name}
          width={800}
          height={600}
          className="mx-auto max-h-96 w-auto object-contain"
          style={{
            transform: `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
            transition: "transform 0.3s ease",
          }}
          onLoad={(e) => {
            const img = e.currentTarget;
            imageRef.current = img;
            const canvas = canvasRef.current;
            if (canvas) {
              canvas.width = img.naturalWidth;
              canvas.height = img.naturalHeight;
            }
          }}
        />
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Controls */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Rotation */}
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="mb-3 text-sm font-medium text-slate-700">Rotate</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleRotate(-90)}
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
              title="Rotate Left"
            >
              ↶ -90°
            </button>
            <button
              type="button"
              onClick={() => handleRotate(90)}
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
              title="Rotate Right"
            >
              ↷ +90°
            </button>
          </div>
          <p className="mt-2 text-center text-xs text-slate-500">
            Current: {rotation}°
          </p>
        </div>

        {/* Flip */}
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="mb-3 text-sm font-medium text-slate-700">Flip</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleFlip("h")}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                flipH
                  ? "border-sky-500 bg-sky-50 text-sky-700"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              ↔ Horizontal
            </button>
            <button
              type="button"
              onClick={() => handleFlip("v")}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                flipV
                  ? "border-sky-500 bg-sky-50 text-sky-700"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              ↕ Vertical
            </button>
          </div>
        </div>

        {/* Zoom */}
        <div className="rounded-xl border border-slate-200 p-4 sm:col-span-2">
          <p className="mb-3 text-sm font-medium text-slate-700">Zoom</p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleZoom(zoom - 10)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
            >
              −
            </button>
            <input
              type="range"
              min="50"
              max="200"
              value={zoom}
              onChange={(e) => handleZoom(Number(e.target.value))}
              className="flex-1"
            />
            <button
              type="button"
              onClick={() => handleZoom(zoom + 10)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
            >
              +
            </button>
            <span className="w-12 text-center text-sm text-slate-600">{zoom}%</span>
          </div>
        </div>
      </div>

      {/* Reset */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => {
            setRotation(0);
            setFlipH(false);
            setFlipV(false);
            setZoom(100);
          }}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          Reset All Changes
        </button>
      </div>
    </div>
  );
}
