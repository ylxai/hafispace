-- CreateTable
CREATE TABLE "photos" (
    "id" UUID NOT NULL,
    "gallery_id" UUID NOT NULL,
    "file_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "size" INTEGER,
    "mime_type" TEXT DEFAULT 'image/jpeg',
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "photos_gallery_id_file_id_key" ON "photos"("gallery_id", "file_id");

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_gallery_id_fkey" FOREIGN KEY ("gallery_id") REFERENCES "galleries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
