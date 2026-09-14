-- DropIndex
DROP INDEX `weekly_off_requests_employee_id_week_start_key` ON `weekly_off_requests`;

-- CreateIndex
CREATE UNIQUE INDEX `weekly_off_requests_employee_id_week_start_day_of_week_key` ON `weekly_off_requests`(`employee_id`, `week_start`, `day_of_week`);
