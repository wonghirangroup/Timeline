-- ผูกพนักงานกับบัญชี User (แอดมิน) — ให้ switch ไปเว็บแอดมินจาก LIFF ได้
ALTER TABLE `employees` ADD COLUMN `user_id` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `employees_user_id_key` ON `employees`(`user_id`);

ALTER TABLE `employees` ADD CONSTRAINT `employees_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
