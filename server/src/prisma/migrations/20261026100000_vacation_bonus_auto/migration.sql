-- โบนัสพักร้อนสิ้นเดือน: ค่าเริ่มต้นรอแอดมินตรวจและเลือกรายคน (ไม่ให้อัตโนมัติ)
ALTER TABLE `tenants` ADD COLUMN `vacation_bonus_auto` BOOLEAN NOT NULL DEFAULT false;
