import bcrypt from 'bcryptjs'
import { prisma } from '../common/utils/prisma'

async function main() {
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'Password123!'
  const hashedPassword = await bcrypt.hash(password, 10)

  // ── 1. Super Admin (no tenant) ─────────────────────────────────────
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin' },
    update: {
      password: hashedPassword,
      first_name: 'Super',
      last_name: 'Admin',
      role: 'SUPER_ADMIN',
      is_active: true,
    },
    create: {
      email: 'superadmin',
      password: hashedPassword,
      first_name: 'Super',
      last_name: 'Admin',
      role: 'SUPER_ADMIN',
      is_active: true,
    },
  })
  console.log(`✅ Super Admin: ${superAdmin.email}`)

  // ── 2. Demo Tenant ──────────────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { id: 'tenant-demo-001' },
    update: { name: 'บริษัท วงศ์หิรัญ จำกัด', is_active: true },
    create: {
      id: 'tenant-demo-001',
      name: 'บริษัท วงศ์หิรัญ จำกัด',
      plan: 'PRO',
      max_employees: 50,
      max_branches: 5,
      is_active: true,
    },
  })
  console.log(`✅ Tenant: ${tenant.name} (${tenant.id})`)

  // ── 3. Admin ของ Tenant ─────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: 'wonghi_admin' },
    update: {
      password: hashedPassword,
      first_name: 'จิรพงศ์',
      last_name: 'ศรีอำไพ',
      role: 'ADMIN',
      is_active: true,
      tenant_id: tenant.id,
    },
    create: {
      email: 'wonghi_admin',
      password: hashedPassword,
      first_name: 'จิรพงศ์',
      last_name: 'ศรีอำไพ',
      role: 'ADMIN',
      is_active: true,
      tenant_id: tenant.id,
    },
  })
  console.log(`✅ Admin: ${admin.email} → tenant: ${tenant.name}`)

  // ── 4. Branch ───────────────────────────────────────────────────────
  const branch = await prisma.branch.upsert({
    where: { id: 'branch-demo-001' },
    update: { name: 'สาขาสำนักงานใหญ่', is_active: true },
    create: {
      id: 'branch-demo-001',
      tenant_id: tenant.id,
      name: 'สาขาสำนักงานใหญ่',
      location: '123 ถนนสุขุมวิท กรุงเทพฯ',
      is_active: true,
    },
  })
  console.log(`✅ Branch: ${branch.name}`)

  // ── 5. Shift ────────────────────────────────────────────────────────
  const shift = await prisma.shift.upsert({
    where: { id: 'shift-demo-001' },
    update: { name: 'กะเช้า', start_time: '08:00', end_time: '17:00' },
    create: {
      id:             'shift-demo-001',
      tenant_id:      tenant.id,
      branch_id:      branch.id,
      name:           'กะเช้า',
      start_time:     '08:00',
      end_time:       '17:00',
      late_threshold: 15,
      is_active:      true,
    },
  })
  const shift2 = await prisma.shift.upsert({
    where: { id: 'shift-demo-002' },
    update: { name: 'กะบ่าย', start_time: '13:00', end_time: '22:00' },
    create: {
      id:             'shift-demo-002',
      tenant_id:      tenant.id,
      branch_id:      branch.id,
      name:           'กะบ่าย',
      start_time:     '13:00',
      end_time:       '22:00',
      late_threshold: 15,
      is_active:      true,
    },
  })
  console.log(`✅ Shifts: ${shift.name}, ${shift2.name}`)

  // ── 6. Employees ─────────────────────────────────────────────────────
  const employees = [
    { id: 'emp-demo-001', code: 'EMP001', first_name: 'สมชาย',   last_name: 'ใจดี',     phone: '0811111111' },
    { id: 'emp-demo-002', code: 'EMP002', first_name: 'สมหญิง',  last_name: 'รักงาน',   phone: '0822222222' },
    { id: 'emp-demo-003', code: 'EMP003', first_name: 'วิชัย',   last_name: 'ขยันมาก',  phone: '0833333333' },
    { id: 'emp-demo-004', code: 'EMP004', first_name: 'นภา',     last_name: 'สดใส',     phone: '0844444444' },
    { id: 'emp-demo-005', code: 'EMP005', first_name: 'ประเสริฐ', last_name: 'มีวินัย',  phone: '0855555555' },
  ]

  for (const emp of employees) {
    await prisma.employee.upsert({
      where: { id: emp.id },
      update: { first_name: emp.first_name, last_name: emp.last_name },
      create: {
        id:            emp.id,
        tenant_id:     tenant.id,
        branch_id:     branch.id,
        employee_code: emp.code,
        first_name:    emp.first_name,
        last_name:     emp.last_name,
        phone:         emp.phone,
        is_active:     true,
      },
    })
  }
  console.log(`✅ Employees: ${employees.length} คน`)

  // ── 7. Leave Balances ────────────────────────────────────────────────
  const year = new Date().getFullYear()
  for (const emp of employees) {
    for (const [leave_type, total_days] of [['SICK', 30], ['PERSONAL', 6], ['VACATION', 10]] as const) {
      await prisma.leaveBalance.upsert({
        where: { employee_id_leave_type_year: { employee_id: emp.id, leave_type, year } },
        update: {},
        create: { tenant_id: tenant.id, employee_id: emp.id, leave_type, year, total_days },
      })
    }
  }
  console.log(`✅ Leave Balances: ${employees.length * 3} records`)

  // ── 8. Attendance Records (5 วันล่าสุด) ──────────────────────────────
  // ลบ attendance เก่าออกก่อน แล้วสร้างใหม่
  await prisma.attendanceRecord.deleteMany({
    where: { tenant_id: tenant.id },
  })

  for (let d = 4; d >= 0; d--) {
    const date = new Date()
    date.setDate(date.getDate() - d)
    date.setHours(0, 0, 0, 0)

    for (const emp of employees.slice(0, 3)) {
      const checkIn = new Date(date)
      checkIn.setHours(8, Math.floor(Math.random() * 20), 0, 0)
      const checkOut = new Date(date)
      checkOut.setHours(17, Math.floor(Math.random() * 30), 0, 0)

      await prisma.attendanceRecord.create({
        data: {
          tenant_id:    tenant.id,
          employee_id:  emp.id,
          shift_id:     shift.id,
          date,
          check_in_at:  checkIn,
          check_out_at: checkOut,
          is_late:      false,
          late_minutes: 0,
        },
      })
    }
  }
  console.log(`✅ Attendance Records: 5 วัน × 3 คน`)

  // ── 9. Leave Requests ────────────────────────────────────────────────
  await prisma.leaveRequest.upsert({
    where: { id: 'leave-demo-001' },
    update: {},
    create: {
      id:          'leave-demo-001',
      tenant_id:   tenant.id,
      employee_id: 'emp-demo-001',
      leave_type:  'SICK',
      start_date:  new Date(),
      end_date:    new Date(),
      days:        1,
      reason:      'ไม่สบาย มีไข้',
      status:      'PENDING',
    },
  })
  await prisma.leaveRequest.upsert({
    where: { id: 'leave-demo-002' },
    update: {},
    create: {
      id:          'leave-demo-002',
      tenant_id:   tenant.id,
      employee_id: 'emp-demo-002',
      leave_type:  'VACATION',
      start_date:  new Date(Date.now() + 3 * 86400000),
      end_date:    new Date(Date.now() + 5 * 86400000),
      days:        3,
      reason:      'ท่องเที่ยวพักผ่อน',
      status:      'PENDING',
    },
  })
  console.log(`✅ Leave Requests: 2 รายการ (PENDING)`)

  // ── 10. Dev user (Swagger UI) ────────────────────────────────────────
  const devPwd = await bcrypt.hash('netdev99', 10)
  const devUser = await prisma.user.upsert({
    where: { email: 'netdev' },
    update: { password: devPwd, is_active: true },
    create: {
      email:      'netdev',
      password:   devPwd,
      first_name: 'Net',
      last_name:  'Dev',
      role:       'SUPER_ADMIN',
      is_active:  true,
    },
  })
  console.log(`✅ Dev user: ${devUser.email} (SUPER_ADMIN)`)

  console.log('\n🎉 Seed เสร็จสิ้น!')
  console.log('─────────────────────────────────────────')
  console.log('Super Admin  : superadmin    / Password123!')
  console.log('Admin วงษ์หิรัญ: wonghi_admin / Password123!')
  console.log('Dev (Swagger): netdev        / netdev99')
  console.log('─────────────────────────────────────────')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
