# Project Overview

## ชื่อโครงการ
**TimeLine HR** — ระบบจัดการเวลาทำงาน การเข้า-ออกงาน และการลา แบบ SaaS หลายผู้เช่า (Multi-tenant)

## ภาพรวมผลิตภัณฑ์

TimeLine HR คือระบบ SaaS ที่ Vendor ขายให้บริษัทลูกค้า (tenant) หลายราย แต่ละบริษัทมีข้อมูลแยกจากกันอย่างสมบูรณ์ (multi-tenant, isolated by `tenant_id` ทุกตาราง) ระบบครอบคลุม:

- **การเช็คชื่อแบบอิงกะ (Shift-based attendance)** ผ่าน LINE LIFF พร้อม geo-fencing ตรวจตำแหน่ง GPS
- **การจัดการสาขา (Branch management)** — หลายสาขา แต่ละสาขากำหนดพิกัด/รัศมี/กะของตัวเองได้
- **การจัดการวันลาและวันหยุด (Leave & Holiday management)** — ลาป่วย/กิจ/พักร้อน/คลอด/ชดเชย/กำหนดเอง, จองวันหยุดประจำสัปดาห์-เดือน, วันหยุดนักขัตฤกษ์ของบริษัท
- **นโยบายพักร้อนตามอายุงาน** — คำนวณสิทธิ์พักร้อนอัตโนมัติตามอายุงาน พร้อม cron โบนัส/รีเซ็ตประจำปี
- **OT (ล่วงเวลา)** — ยื่นขอ, อนุมัติ, จำกัดชั่วโมงต่อสัปดาห์
- **เอกสาร HR** — สลิปเงินเดือน, หนังสือรับรองเงินเดือน, ใบลาออก (สร้าง/พิมพ์ในระบบได้)
- **วงจรชีวิตพนักงาน (HR Lifecycle)** — ทดลองงาน, หนังสือเตือน, เอกสารประจำตัว (บัตร ปชช./วีซ่า ฯลฯ) พร้อมแจ้งเตือนก่อนหมดอายุ
- **คำขอลาออก** — พนักงานยื่นผ่าน LIFF, แอดมินอนุมัติแล้วระบบเปลี่ยนสถานะอัตโนมัติ
- **ประกาศบริษัท** — broadcast ข้อความ + ส่งทาง LINE ได้
- **แจ้งเตือนผ่าน LINE** — Flex Message พร้อมปุ่มลิงก์เข้าเว็บแอดมิน/แอปพนักงานแบบ auto-login (magic link)
- **รายงาน 7 หมวด** — ผู้บริหาร, พนักงาน, การเช็คอิน, สาขา, วันหยุด, วันลา, การส่งข้อความไลน์
- **ระบบ Super Admin แยกต่างหาก** — จัดการ tenant, แพ็กเกจ, บิล/invoice, feature flag ต่อบริษัท

## กลุ่มเป้าหมาย

HR Admin และ Manager ของบริษัท SME ไทย ที่ต้องการเครื่องมือใช้งานได้จริงทันที ไม่ต้องฝึกอบรมนาน โดยเฉพาะธุรกิจที่มีหลายสาขาและพนักงานกะ (ค้าปลีก, โรงงาน, บริการ)

## เป้าหมายความสำเร็จของโครงการ

- HR Admin ใช้งานได้ทันทีโดยไม่ต้องฝึกอบรมยาว (ดู [Introduction](Introduction.md), [Design Principles](../../DESIGN.md))
- พนักงานเช็คอินได้เองผ่านมือถือ ลดภาระบันทึกมือของ HR
- ลดข้อผิดพลาดจากการคำนวณสาย/ขาด/ค่าปรับด้วยมือ
- HR ตรวจสอบและอนุมัติคำขอผ่านช่องทางเดียว มีประวัติ (audit trail) ครบ

## สถาปัตยกรรมระดับสูง (High-level Architecture)

ระบบเป็น **Monorepo** ประกอบด้วย 4 แอปพลิเคชันหลัก ที่คุยกันผ่าน REST API ตัวเดียว:

```
timeline/
├── server/       Fastify API (Node.js + TypeScript + Prisma ORM + MySQL)
├── admin/        เว็บแอป Admin/Manager (React + Vite)
├── superadmin/   เว็บแอป Super Admin/Vendor (React + Vite)
├── employee/     แอป LINE LIFF สำหรับพนักงาน (React + Vite)
└── shared/       Types/Schemas/Utils ที่ใช้ร่วมกันทุกแอป
```

ดูรายละเอียดสถาปัตยกรรมเต็มรูปแบบที่ [Class Diagram](Class%20Diagram.md), [ER Diagram](ER_Diagram.md), และ [Development Environment](Development_Environment.md)

## เทคโนโลยีหลักที่ใช้ (Tech Stack Summary)

| ชั้น | เทคโนโลยี |
|---|---|
| Backend API | Fastify 4 (Node.js), TypeScript, Prisma ORM |
| ฐานข้อมูล | MySQL |
| Authentication | JWT (access/refresh token), OAuth2 Password Flow, Magic Link (single-use token) |
| Frontend (Admin/Super Admin) | React 18, Vite, React Router, TanStack Query, Zustand, Axios |
| Frontend (Employee) | React 18, Vite, LINE LIFF SDK |
| การแจ้งเตือน | LINE Messaging API (Flex Message, multicast/push) |
| Deployment (Server) | Docker Compose บน VPS (SSH deploy) |
| Deployment (Frontend) | Vercel (auto-deploy จาก git push) |
| Scheduled Jobs | node-cron (ซิงค์ข้อมูล, โบนัสพักร้อน, รีเซ็ตประจำปี) |

ดูรายละเอียดเวอร์ชันทั้งหมดที่ [Development_Environment.md](Development_Environment.md)

## แอปพลิเคชันย่อยและผู้ใช้งาน

| แอป | ผู้ใช้ | ช่องทาง |
|---|---|---|
| **admin** | Admin, Manager, Executive, Dept Head | เว็บเบราว์เซอร์ (desktop/mobile) |
| **employee** | พนักงาน | LINE LIFF (ในแอป LINE) |
| **superadmin** | Vendor (ผู้ให้บริการระบบ) | เว็บเบราว์เซอร์ |
| **server** | ให้บริการ REST API แก่ทั้ง 3 แอปข้างต้น | — |

## เอกสารที่เกี่ยวข้องในชุดนี้

ดู [README.md](README.md) สำหรับดัชนีเอกสารทั้งหมด
