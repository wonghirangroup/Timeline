-- เลขที่คำขอที่คนอ่านออก (feedback 2026-10-02 "มีรหัสคำขอเอกสารไหม ... ทุกๆอัน") — เพิ่มคอลัมน์ request_no
-- ให้ 6 ตารางคำขอ + ตารางตัวนับ ส่วนการเติมเลขย้อนหลังให้แถวเก่าทำด้วยสคริปต์
-- (src/scripts/backfill-request-no.ts) ไม่ใส่ใน migration เพื่อให้ migration นี้มีแต่ DDL ที่ปลอดภัย
ALTER TABLE `resignation_requests` ADD COLUMN `request_no` VARCHAR(191) NULL;
ALTER TABLE `document_requests`    ADD COLUMN `request_no` VARCHAR(191) NULL;
ALTER TABLE `offsite_checkins`     ADD COLUMN `request_no` VARCHAR(191) NULL;
ALTER TABLE `leave_requests`       ADD COLUMN `request_no` VARCHAR(191) NULL;
ALTER TABLE `ot_requests`          ADD COLUMN `request_no` VARCHAR(191) NULL;
ALTER TABLE `weekly_off_requests`  ADD COLUMN `request_no` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `resignation_requests_tenant_id_request_no_key` ON `resignation_requests`(`tenant_id`, `request_no`);
CREATE UNIQUE INDEX `document_requests_tenant_id_request_no_key`    ON `document_requests`(`tenant_id`, `request_no`);
CREATE UNIQUE INDEX `offsite_checkins_tenant_id_request_no_key`     ON `offsite_checkins`(`tenant_id`, `request_no`);
CREATE UNIQUE INDEX `leave_requests_tenant_id_request_no_key`       ON `leave_requests`(`tenant_id`, `request_no`);
CREATE UNIQUE INDEX `ot_requests_tenant_id_request_no_key`          ON `ot_requests`(`tenant_id`, `request_no`);
CREATE UNIQUE INDEX `weekly_off_requests_tenant_id_request_no_key`  ON `weekly_off_requests`(`tenant_id`, `request_no`);

CREATE TABLE `request_counters` (
    `tenant_id` VARCHAR(191) NOT NULL,
    `prefix` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `last` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`tenant_id`, `prefix`, `year`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
