-- โหมดคิดค่าปรับสายต่อกะ: TIER (เดิม) หรือ PER_MINUTE (หักตามนาทีที่สาย)
-- กะเดิมทั้งหมด default = TIER → พฤติกรรมไม่เปลี่ยน

ALTER TABLE `shifts`
  ADD COLUMN `fine_mode` ENUM('TIER', 'PER_MINUTE') NOT NULL DEFAULT 'TIER',
  ADD COLUMN `late_grace_minutes` INTEGER NULL,
  ADD COLUMN `late_fine_per_minute` DECIMAL(8, 2) NULL,
  ADD COLUMN `late_fine_max` DECIMAL(8, 2) NULL;
