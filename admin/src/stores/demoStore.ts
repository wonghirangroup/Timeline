// admin/src/stores/demoStore.ts
// Demo Mode — ข้อมูลทั้งหมดเก็บใน localStorage ไม่ยิง API จริง
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  MOCK_EMPLOYEES, MOCK_BRANCHES, MOCK_DEPARTMENTS,
  MOCK_LEAVE_REQUESTS, MOCK_OT_REQUESTS, MOCK_SHIFTS,
  MOCK_ANNOUNCEMENTS, MOCK_LEAVE_BALANCES, MOCK_TODAY_ATTENDANCE,
  MOCK_WEEKLY_OFF_BOOKINGS, MOCK_SHIFT_ASSIGNMENTS,
} from '../lib/mock'
import type {
  Employee, Branch, Department, LeaveRequest, OtRequest,
  ShiftDef, AnnouncementItem, LeaveBalance, AttendanceRow, WeeklyOffBooking,
  ShiftAssignment,
} from '../types'

interface DemoState {
  employees:           Employee[]
  branches:            Branch[]
  departments:         Department[]
  leaveRequests:       LeaveRequest[]
  otRequests:          OtRequest[]
  shifts:              ShiftDef[]
  announcements:       AnnouncementItem[]
  leaveBalances:       LeaveBalance[]
  attendance:          AttendanceRow[]
  weeklyOffBookings:   WeeklyOffBooking[]
  shiftAssignments:    ShiftAssignment[]

  // ── Weekly Off ───────────────────────────────────────
  addWeeklyOff:        (w: WeeklyOffBooking) => void
  updateWeeklyOff:     (id: string, patch: Partial<WeeklyOffBooking>) => void
  deleteWeeklyOff:     (id: string) => void

  // ── Shift Assignments ────────────────────────────────
  upsertShiftAssignment: (a: ShiftAssignment) => void
  deleteShiftAssignment: (id: string) => void

  // ── Employee CRUD ────────────────────────────────────
  addEmployee:    (emp: Employee) => void
  updateEmployee: (id: string, patch: Partial<Employee>) => void
  deleteEmployee: (id: string) => void

  // ── Branch CRUD ──────────────────────────────────────
  addBranch:    (b: Branch) => void
  updateBranch: (id: string, patch: Partial<Branch>) => void
  deleteBranch: (id: string) => void

  // ── Department CRUD ──────────────────────────────────
  addDepartment:    (d: Department) => void
  updateDepartment: (id: string, patch: Partial<Department>) => void
  deleteDepartment: (id: string) => void

  // ── Leave Request ────────────────────────────────────
  addLeaveRequest:    (lr: LeaveRequest) => void
  approveLeave:       (id: string) => void
  rejectLeave:        (id: string) => void

  // ── OT Request ───────────────────────────────────────
  addOtRequest:  (ot: OtRequest) => void
  approveOt:     (id: string) => void
  rejectOt:      (id: string) => void

  // ── Shift CRUD ───────────────────────────────────────
  addShift:    (s: ShiftDef) => void
  updateShift: (id: string, patch: Partial<ShiftDef>) => void
  deleteShift: (id: string) => void

  // ── Announcement ─────────────────────────────────────
  addAnnouncement:    (a: AnnouncementItem) => void
  deleteAnnouncement: (id: string) => void

  // ── Reset ────────────────────────────────────────────
  resetDemo: () => void
}

const initialState = {
  employees:          MOCK_EMPLOYEES,
  branches:           MOCK_BRANCHES,
  departments:        MOCK_DEPARTMENTS,
  leaveRequests:      MOCK_LEAVE_REQUESTS,
  otRequests:         MOCK_OT_REQUESTS,
  shifts:             MOCK_SHIFTS,
  announcements:      MOCK_ANNOUNCEMENTS,
  leaveBalances:      MOCK_LEAVE_BALANCES,
  attendance:         MOCK_TODAY_ATTENDANCE,
  weeklyOffBookings:  MOCK_WEEKLY_OFF_BOOKINGS,
  shiftAssignments:   MOCK_SHIFT_ASSIGNMENTS,
}

export const useDemoStore = create<DemoState>()(
  persist(
    (set) => ({
      ...initialState,

      // ── Weekly Off ───────────────────────────────────
      addWeeklyOff: (w) =>
        set((s) => ({ weeklyOffBookings: [...s.weeklyOffBookings, w] })),
      updateWeeklyOff: (id, patch) =>
        set((s) => ({ weeklyOffBookings: s.weeklyOffBookings.map((w) => w.id === id ? { ...w, ...patch } : w) })),
      deleteWeeklyOff: (id) =>
        set((s) => ({ weeklyOffBookings: s.weeklyOffBookings.filter((w) => w.id !== id) })),

      // ── Shift Assignments ────────────────────────────
      upsertShiftAssignment: (a) =>
        set((s) => {
          const exists = s.shiftAssignments.find(x => x.employee_id === a.employee_id && x.date === a.date)
          if (exists) {
            return { shiftAssignments: s.shiftAssignments.map(x => x.employee_id === a.employee_id && x.date === a.date ? { ...x, ...a } : x) }
          }
          return { shiftAssignments: [...s.shiftAssignments, a] }
        }),
      deleteShiftAssignment: (id) =>
        set((s) => ({ shiftAssignments: s.shiftAssignments.filter(x => x.id !== id) })),

      // ── Employee ──────────────────────────────────────
      addEmployee: (emp) =>
        set((s) => ({ employees: [...s.employees, emp] })),
      updateEmployee: (id, patch) =>
        set((s) => ({ employees: s.employees.map((e) => e.id === id ? { ...e, ...patch } : e) })),
      deleteEmployee: (id) =>
        set((s) => ({ employees: s.employees.filter((e) => e.id !== id) })),

      // ── Branch ───────────────────────────────────────
      addBranch: (b) =>
        set((s) => ({ branches: [...s.branches, b] })),
      updateBranch: (id, patch) =>
        set((s) => ({ branches: s.branches.map((b) => b.id === id ? { ...b, ...patch } : b) })),
      deleteBranch: (id) =>
        set((s) => ({ branches: s.branches.filter((b) => b.id !== id) })),

      // ── Department ───────────────────────────────────
      addDepartment: (d) =>
        set((s) => ({ departments: [...s.departments, d] })),
      updateDepartment: (id, patch) =>
        set((s) => ({ departments: s.departments.map((d) => d.id === id ? { ...d, ...patch } : d) })),
      deleteDepartment: (id) =>
        set((s) => ({ departments: s.departments.filter((d) => d.id !== id) })),

      // ── Leave ────────────────────────────────────────
      addLeaveRequest: (lr) =>
        set((s) => ({ leaveRequests: [...s.leaveRequests, lr] })),
      approveLeave: (id) =>
        set((s) => ({ leaveRequests: s.leaveRequests.map((r) => r.id === id ? { ...r, status: 'APPROVED' as const } : r) })),
      rejectLeave: (id) =>
        set((s) => ({ leaveRequests: s.leaveRequests.map((r) => r.id === id ? { ...r, status: 'REJECTED' as const } : r) })),

      // ── OT ───────────────────────────────────────────
      addOtRequest: (ot) =>
        set((s) => ({ otRequests: [...s.otRequests, ot] })),
      approveOt: (id) =>
        set((s) => ({ otRequests: s.otRequests.map((r) => r.id === id ? { ...r, status: 'APPROVED' as const } : r) })),
      rejectOt: (id) =>
        set((s) => ({ otRequests: s.otRequests.map((r) => r.id === id ? { ...r, status: 'REJECTED' as const } : r) })),

      // ── Shift ────────────────────────────────────────
      addShift: (s_) =>
        set((s) => ({ shifts: [...s.shifts, s_] })),
      updateShift: (id, patch) =>
        set((s) => ({ shifts: s.shifts.map((sh) => sh.id === id ? { ...sh, ...patch } : sh) })),
      deleteShift: (id) =>
        set((s) => ({ shifts: s.shifts.filter((sh) => sh.id !== id) })),

      // ── Announcement ─────────────────────────────────
      addAnnouncement: (a) =>
        set((s) => ({ announcements: [a, ...s.announcements] })),
      deleteAnnouncement: (id) =>
        set((s) => ({ announcements: s.announcements.filter((a) => a.id !== id) })),

      // ── Reset — คืนข้อมูล demo เริ่มต้น ──────────────
      resetDemo: () => set(initialState),
    }),
    {
      name: 'timeline-demo-db',   // key ใน localStorage
      version: 2,                 // bump: added shiftAssignments + Employee.employment_type
    },
  ),
)
