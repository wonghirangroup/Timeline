-- หักเงินเมื่อยื่นลาทับวันหยุด/วันลาของคนตำแหน่งเดียวกัน (ตั้งค่าต่อบริษัท, ยอดเก็บต่อคำขอ)
ALTER TABLE `tenants`
  ADD COLUMN `leave_conflict_fee_enabled` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `leave_conflict_fee_weekday` INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN `leave_conflict_fee_weekend` INTEGER NOT NULL DEFAULT 100;
ALTER TABLE `leave_requests` ADD COLUMN `conflict_fee` INTEGER NOT NULL DEFAULT 0;
