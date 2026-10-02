-- รหัสสาขา: เพิ่มคอลัมน์ + รันรหัสย้อนหลังให้สาขาเดิมทุกอัน (รวมที่ soft-delete เพื่อไม่ให้รหัสถูกนำกลับมาใช้ซ้ำ)
ALTER TABLE `branches` ADD COLUMN `branch_code` VARCHAR(191) NULL;

UPDATE `branches` b
JOIN (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY created_at, id) AS rn FROM `branches`
) x ON x.id = b.id
SET b.branch_code = CONCAT('BR', LPAD(x.rn, 3, '0'));

CREATE UNIQUE INDEX `branches_tenant_id_branch_code_key` ON `branches`(`tenant_id`, `branch_code`);
