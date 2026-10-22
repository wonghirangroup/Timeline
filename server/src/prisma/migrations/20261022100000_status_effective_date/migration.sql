-- วันที่มีผลของการเปลี่ยนสถานะพนักงาน (ลาออก/เลิกจ้าง/ไม่ใช้งาน ย้อนหลังได้)
ALTER TABLE `employees` ADD COLUMN `status_effective_date` DATE NULL;
ALTER TABLE `employee_status_logs` ADD COLUMN `effective_date` DATE NULL;
