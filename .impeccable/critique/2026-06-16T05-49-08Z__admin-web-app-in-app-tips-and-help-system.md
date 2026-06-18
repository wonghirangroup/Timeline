---
target: admin web app in-app tips and help system
total_score: 23
p0_count: 0
p1_count: 3
timestamp: 2026-06-16T05-49-08Z
slug: admin-web-app-in-app-tips-and-help-system
---
## Design Health Score — In-App Help & Learnability (ทั้ง Web App)

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Toast + loading states ดี แต่ไม่มี progress hint ใน wizard |
| 2 | Match System / Real World | 3 | ภาษาไทยครบ แต่ "สายระดับ 1/2", "รอบการจอง" ต้องการบริบท |
| 3 | User Control and Freedom | 3 | Cancel/ESC ครบ แต่ไม่มี undo |
| 4 | Consistency and Standards | 3 | Design language สอดคล้อง orange accent ชัดเจน |
| 5 | Error Prevention | 2 | Delete confirms มีแล้ว แต่ไม่มี hint ก่อนป้อนค่า threshold |
| 6 | Recognition Rather Than Recall | 2 | Nav labels ดี แต่ field อย่าง late_threshold_1 ต้องการ domain knowledge |
| 7 | Flexibility and Efficiency | 2 | ไม่มี keyboard shortcuts, bulk actions |
| 8 | Aesthetic and Minimalist Design | 3 | Clean ดี แต่ pages เริ่มหนาขึ้น |
| 9 | Error Recovery | 2 | Toast มี แต่ form validation ไม่ inline |
| 10 | Help and Documentation | 0 | ไม่มีระบบ help ใด ๆ เลยในทั้ง app |
| **Total** | | **23/40** | Acceptable — ช่องโหว่ใหญ่ที่ข้อ 10 |

## Anti-Patterns Verdict
LLM: App มี design language ที่สอดคล้องและ intentional — ไม่ใช่ AI slop
Detector: [] (exit 0) — clean
Browser: ไม่พร้อมใช้งาน

## Overall Impression
App มี visual foundation ที่แข็งแกร่ง แต่ feature set ขยายตัวทำให้ domain complexity ถูกโยนให้ผู้ใช้แบกรับเองทั้งหมด ไม่มีระบบ help แม้แต่ชิ้นเดียว ขัดกับ product goal "HR Admin ใช้งานได้ทันทีโดยไม่ต้องฝึก"

## Priority Issues

### [P1] ไม่มีระบบ Help เลยสักชิ้น ทั้ง App
Fix: เพิ่ม page-level tip banner (dismissible, localStorage) ต่อ 1 หน้า
Command: /impeccable onboard

### [P1] Shift Threshold Fields: ผู้ใช้ต้องเดาว่า Time = กี่โมงหรือกี่นาที
Fix: sublabel + live diff จาก start_time
Command: /impeccable clarify

### [P1] Booking Round Concept ไม่มีคำอธิบาย
Fix: Info banner อธิบาย Open/Close effect ต่อ LIFF
Command: /impeccable onboard

### [P2] Fine Rule Mode: ไม่มีคำแนะนำว่าควรเลือกแบบไหน
Fix: recommendation chip ใต้ mode cards
Command: /impeccable clarify

### [P2] Employee Wizard Step 3 (Line Linking) ไม่มี tip
Fix: อธิบาย next action หลัง complete step
Command: /impeccable onboard
