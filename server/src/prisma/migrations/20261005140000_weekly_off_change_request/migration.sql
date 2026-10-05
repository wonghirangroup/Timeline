-- คำขอเปลี่ยนวันหยุดที่อนุมัติแล้ว: แถวใหม่ (PENDING) ชี้ไปหาแถวเดิม
ALTER TABLE `weekly_off_requests` ADD COLUMN `replaces_request_id` VARCHAR(191) NULL;
CREATE INDEX `weekly_off_requests_replaces_request_id_idx` ON `weekly_off_requests`(`replaces_request_id`);
