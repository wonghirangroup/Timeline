-- AlterTable: เวลาที่ "สถานะลาออก" มีผลกับพนักงานจริง (อนุมัติแล้วยังทำงานได้จนถึงวันทำงานสุดท้าย — ระบบเปลี่ยนสถานะให้หลังวันนั้น)
ALTER TABLE `resignation_requests` ADD COLUMN `applied_at` DATETIME(3) NULL;

-- คำขอที่อนุมัติไปก่อนหน้านี้ถูกเปลี่ยนสถานะพนักงานทันทีอยู่แล้ว → ถือว่ามีผลแล้ว (กัน job รอบถัดไปมาเปลี่ยนซ้ำ)
UPDATE `resignation_requests` SET `applied_at` = `reviewed_at` WHERE `status` = 'APPROVED' AND `reviewed_at` IS NOT NULL;
