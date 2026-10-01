-- ขยาย enum HrDocumentType ให้รองรับ WORK_CERT (หนังสือรับรองการทำงาน) ซึ่งเดิมมีแค่
-- ใน DocumentRequestType (คำขอ) แต่ยังสร้างเอกสารในระบบไม่ได้
ALTER TABLE `hr_documents` MODIFY COLUMN `type` ENUM('PAYSLIP', 'SALARY_CERT', 'RESIGNATION_LETTER', 'WORK_CERT') NOT NULL;

-- CreateTable
CREATE TABLE `hr_document_templates` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `doc_type` ENUM('PAYSLIP', 'SALARY_CERT', 'RESIGNATION_LETTER', 'WORK_CERT') NOT NULL,
    `elements` JSON NOT NULL,
    `updated_by` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `hr_document_templates_tenant_id_doc_type_key`(`tenant_id`, `doc_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
