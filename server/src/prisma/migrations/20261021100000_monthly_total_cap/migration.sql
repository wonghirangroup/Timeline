-- เพดานรวมวันหยุดจอง + ลาพักร้อน ต่อเดือน ตั้งค่าได้ต่อบริษัท (ค่าเดิม 10)
ALTER TABLE `tenants` ADD COLUMN `monthly_total_cap` INTEGER NOT NULL DEFAULT 10;
