-- AlterTable
ALTER TABLE `login_ads`
    ADD COLUMN `media_type` VARCHAR(191) NOT NULL DEFAULT 'IMAGE',
    ADD COLUMN `video_url` TEXT NULL;
