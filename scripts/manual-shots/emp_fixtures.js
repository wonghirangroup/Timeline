module.exports = (EMP, iso, today) => {
  const y = today.getFullYear(), m = today.getMonth()
  const day = n => new Date(y, m, n, 12)
  const ymd = n => iso(new Date(Date.UTC(y, m, n)))
  const att = []
  for (let n = 13; n >= 1; n--) {
    const dow = day(n).getDay(); if (dow === 0 || dow === 6) continue
    const late = n === 6 || n === 9
    const inH = late ? 9 : 8, inM = late ? 14 + n : 40 + (n % 15)
    att.push({ id: 'a' + n, date: ymd(n), check_in_at: new Date(y, m, n, inH, inM).toISOString(), check_out_at: new Date(y, m, n, 18, 3).toISOString(), is_late: late, late_minutes: late ? 14 + n - 0 : 0, is_absent: false, fine: '0', carried_fine: '0', is_outside_area: false, shift: { name: 'กะเช้า', start_time: '09:00', fine_mode: 'TIER' } })
  }
  const leaves = [
    { id: 'l1', leave_type: 'SICK', start_date: ymd(8), end_date: ymd(8), days: 1, reason: 'ไข้หวัด', status: 'APPROVED', reviewed_at: ymd(8), reject_note: null, leave_period: 'FULL' },
    { id: 'l2', leave_type: 'VACATION', start_date: ymd(22), end_date: ymd(23), days: 2, reason: 'ไปเที่ยวต่างจังหวัด', status: 'PENDING', reviewed_at: null, reject_note: null, leave_period: 'FULL' },
  ]
  const balances = [
    { leave_type: 'SICK', leave_type_code: 'SICK', total_days: 30, used_days: 1 },
    { leave_type: 'PERSONAL', leave_type_code: 'PERSONAL', total_days: 6, used_days: 0 },
    { leave_type: 'VACATION', leave_type_code: 'VACATION', total_days: 8, used_days: 2 },
  ]
  return (key, u) => {
    if (key === 'POST /auth/login') return { accessToken: 'x', user: { tenant_id: 't1' } }
    if (key === 'GET /admin/employees/e1') return EMP
    if (key === 'GET /employee/attendance/history') return att
    if (key === 'GET /employee/attendance/today') return null
    if (key === 'GET /employee/leave-requests') return leaves
    if (key === 'GET /employee/leave-balances') return balances
    if (key === 'GET /employee/holidays') return [{ date: ymd(23) + 'T00:00:00.000Z', name: 'วันปิยมหาราช' }]
    if (key === 'GET /employee/weekly-off') return []
    if (key === 'GET /employee/offsite-checkins') return []
    if (key === 'GET /employee/vacation-progress') return { eligible: false, reason: 'UNDER_1_YEAR', years: 0, entitlement: 0, eligible_on: '2026-10-26', probation_end: null, next_step_on: null, next_entitlement: null }
    if (key === 'GET /employee/leave-types') return []
    return undefined
  }
}
