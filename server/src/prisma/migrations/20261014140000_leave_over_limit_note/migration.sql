-- AlterTable: หมายเหตุ "เกินเพดานรวม หยุด+พักร้อน/เดือน" ของคำขอลาพักร้อนที่พนักงานยื่นเอง (ส่งได้ แต่ให้แอดมินเห็นและตัดสินใจ)
ALTER TABLE `leave_requests` ADD COLUMN `over_limit_note` VARCHAR(500) NULL;
