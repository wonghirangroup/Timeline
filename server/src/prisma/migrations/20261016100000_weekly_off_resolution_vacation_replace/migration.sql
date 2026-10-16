-- resolve alert "เช็คอินวันที่จองวันหยุดไว้เอง": เพิ่ม 2 ทางเลือก — REPLACE (แอดมินเลือกวันหยุดใหม่ให้) และ VACATION (เก็บเป็นวันลาพักร้อนสะสม)
ALTER TABLE `attendance_records`
  MODIFY COLUMN `weekly_off_resolution` ENUM('RESCHEDULE', 'COMPENSATE', 'VACATION', 'REPLACE') NULL;
