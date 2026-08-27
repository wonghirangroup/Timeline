-- วันหยุดนักขัตฤกษ์รายบุคคล + วันหยุดชดเชยอัตโนมัติเมื่อทำงานในวันหยุด (feedback 2026-08-26)

-- AlterTable: Holiday
ALTER TABLE `holidays`
  ADD COLUMN `employee_includes` JSON NULL,
  ADD COLUMN `employee_excludes` JSON NULL,
  ADD COLUMN `compensate_days` INTEGER NOT NULL DEFAULT 1;

-- AlterTable: AttendanceRecord
ALTER TABLE `attendance_records`
  ADD COLUMN `worked_on_holiday` BOOLEAN NOT NULL DEFAULT false;
