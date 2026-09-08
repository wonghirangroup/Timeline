-- CreateTable
CREATE TABLE `firebase_sync_runs` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `trigger` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `finished_at` DATETIME(3) NULL,
    `duration_ms` INTEGER NULL,
    `summary` JSON NULL,
    `error` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `firebase_sync_runs_tenant_id_started_at_idx`(`tenant_id`, `started_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `firebase_sync_runs` ADD CONSTRAINT `firebase_sync_runs_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- NOTE: prisma migrate diff อยากเพิ่ม FK groups/divisions/departments/positions → tenants
-- ที่หายไปจาก DB (drift เก่าจาก v085) ด้วย — ตัดออกจาก migration นี้เพราะไม่เกี่ยวกับงาน
-- FirebaseSyncRun และเสี่ยง fail ถ้ามี orphan row ค้าง จัดการแยกภายหลัง
