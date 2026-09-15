-- AlterTable
ALTER TABLE `tenants` ADD COLUMN `signer_name` VARCHAR(191) NULL,
    ADD COLUMN `signer_title` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `hr_documents` (
    `id` VARCHAR(191) NOT NULL,
    `tenant_id` VARCHAR(191) NOT NULL,
    `employee_id` VARCHAR(191) NOT NULL,
    `type` ENUM('PAYSLIP', 'SALARY_CERT', 'RESIGNATION_LETTER') NOT NULL,
    `doc_number` VARCHAR(191) NULL,
    `period` VARCHAR(191) NULL,
    `data` JSON NOT NULL,
    `document_request_id` VARCHAR(191) NULL,
    `created_by` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `hr_documents_tenant_id_idx`(`tenant_id`),
    INDEX `hr_documents_employee_id_idx`(`employee_id`),
    INDEX `hr_documents_document_request_id_idx`(`document_request_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `hr_documents` ADD CONSTRAINT `hr_documents_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hr_documents` ADD CONSTRAINT `hr_documents_document_request_id_fkey` FOREIGN KEY (`document_request_id`) REFERENCES `document_requests`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
