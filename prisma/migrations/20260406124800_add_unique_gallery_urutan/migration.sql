-- AddUniqueConstraint
-- Adds @@unique([galleryId, urutan]) to photos table
-- Required for createPhotoWithRetry P2002 retry mechanism to work correctly
-- Data has been pre-fixed: all urutan values are unique per gallery before this migration

CREATE UNIQUE INDEX "photos_gallery_id_urutan_key" ON "photos"("gallery_id", "urutan");
