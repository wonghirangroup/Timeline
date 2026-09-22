# TimeLine HR — เอกสารประกอบโครงการ (Project Documentation)

ชุดเอกสารนี้จัดทำตามรูปแบบมาตรฐานเอกสารวิศวกรรมซอฟต์แวร์ สรุป/บันทึกสถาปัตยกรรมและพฤติกรรมของระบบ **TimeLine HR** ตามสถานะจริงของโค้ด — ดู [Introduction.md](Introduction.md) สำหรับความเป็นมาและขอบเขต

## ดัชนีเอกสาร

| เอกสาร | เนื้อหา |
|---|---|
| [Introduction.md](Introduction.md) | ความเป็นมา, วัตถุประสงค์, กลุ่มผู้ใช้, คำนิยาม |
| [Project_Overview.md](Project_Overview.md) | ภาพรวมผลิตภัณฑ์, ฟีเจอร์หลัก, เทคโนโลยี, สถาปัตยกรรมระดับสูง |
| [SRS.md](SRS.md) | Software Requirements Specification — ความต้องการเชิงหน้าที่และไม่ใช่หน้าที่ |
| [ER_Diagram.md](ER_Diagram.md) | แผนภาพความสัมพันธ์ของข้อมูล (Entity Relationship) |
| [Class Diagram.md](Class%20Diagram.md) | โครงสร้างโมดูล/service ฝั่ง backend และ frontend |
| [Data_Dictionary.md](Data_Dictionary.md) | รายละเอียดฟิลด์ของตารางข้อมูลหลัก |
| [Flowchart.md](Flowchart.md) | ลำดับการทำงานของกระบวนการหลัก (เช็คอิน, ขอลา, จองวันหยุด, ลาออก, magic login, ขอเอกสาร) |
| [Development_Environment.md](Development_Environment.md) | เทคโนโลยี, โครงสร้าง repo, การติดตั้งพัฒนาบนเครื่อง local |
| [Setup_Deployment_Guide.md](Setup_Deployment_Guide.md) | ขั้นตอน deploy ขึ้น production (backend/frontend/database) |
| [API_Documentation.md](API_Documentation.md) | ภาพรวม REST API, การยืนยันตัวตน, รายการ endpoint ตามโมดูล |
| [Master_Data.md](Master_Data.md) | ข้อมูลอ้างอิง/ตั้งค่าที่แอดมินปรับแต่งได้เอง |
| [Test_Cases.md](Test_Cases.md) | Test case อัตโนมัติและ manual QA |
| [User_Manual.md](User_Manual.md) | คู่มือการใช้งานสำหรับแอดมินและพนักงาน |

## เอกสารเชิงลึกเพิ่มเติม

สำหรับรายละเอียดการออกแบบระบบและกระบวนการพัฒนาแบบละเอียด ดูที่โฟลเดอร์ `docs/` (ระดับบนของโฟลเดอร์นี้):

- `SYSTEM_DESIGN.md`, `SYSTEM_OVERVIEW.md` — สถาปัตยกรรมและการออกแบบฉบับเต็ม
- `TESTING_GUIDE.md` — แนวทางการทดสอบโดยละเอียด
- `Flow/` — เอกสาร flow เชิงลึกรายฟีเจอร์ (Onboarding, Shift & Work Policy, Leave & Vacation, Admin Flow)
- `../../PRODUCT.md`, `../../DESIGN.md` — นิยามผลิตภัณฑ์และระบบดีไซน์ (root ของ repo)

## หมายเหตุ

เอกสารชุดนี้จัดทำขึ้นจากสถานะของโค้ดจริง ณ วันที่จัดทำ — หากมีการพัฒนาต่อในภายหลัง ควรอัปเดตเอกสารให้สอดคล้องกับ schema/API/flow ที่เปลี่ยนแปลงไปด้วย
