-- เทมเพลตข้อความประกาศ + เลือกส่งรายคนได้แม้อยู่โหมด broadcast (feedback
-- requirement doc 2026-08-26, ทำต่อคิว backlog 2026-08-27)

-- AlterTable: Announcement
ALTER TABLE `announcements`
  ADD COLUMN `branch_id` VARCHAR(191) NULL,
  ADD COLUMN `employee_ids` JSON NULL;

-- CreateTable: AnnouncementTemplate
CREATE TABLE `announcement_templates` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `announcement_templates_tenant_id_idx`(`tenant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
