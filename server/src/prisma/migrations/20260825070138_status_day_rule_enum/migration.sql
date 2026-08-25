-- AlterTable: upgrade off_on_saturday/off_on_sunday (boolean) → saturday_rule/sunday_rule (enum)
-- Written by hand (not `prisma migrate dev`, which needs a TTY) to preserve any existing
-- true values as 'OFF' instead of letting the column drop silently reset them to the new
-- default 'WORK'.

-- 1) add the new columns first, defaulting to WORK
ALTER TABLE `employee_status_types`
  ADD COLUMN `saturday_rule` ENUM('WORK', 'OFF', 'OFFSITE') NOT NULL DEFAULT 'WORK',
  ADD COLUMN `sunday_rule` ENUM('WORK', 'OFF', 'OFFSITE') NOT NULL DEFAULT 'WORK';

-- 2) carry over any existing true values as OFF (the old fields were plain on/off toggles)
UPDATE `employee_status_types` SET `saturday_rule` = 'OFF' WHERE `off_on_saturday` = 1;
UPDATE `employee_status_types` SET `sunday_rule` = 'OFF' WHERE `off_on_sunday` = 1;

-- 3) now safe to drop the old boolean columns
ALTER TABLE `employee_status_types`
  DROP COLUMN `off_on_saturday`,
  DROP COLUMN `off_on_sunday`;
