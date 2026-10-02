// แปลงรายการเช็คอินของวันหนึ่ง → หมุดบนแผนที่ (ใช้ร่วมกันระหว่างหน้า "เช็คอิน" มุมมองแผนที่ กับมินิแมพในหน้า Dashboard)
//  - มี GPS จริง → ปักที่จุดเช็คอิน (source 'gps')
//  - แอดมินลงเวลาแทน (ไม่มี GPS) → ปักที่พิกัดสาขาของกะที่ลงให้ (source 'branch')
//  - นอกนั้น → ไม่มีพิกัด (source 'none') พร้อมเหตุผล
import type { MapPerson, MapBranch } from './AttendanceMap'
import { avatarUrl } from '../../lib/upload'

export const METHOD_LABEL: Record<string, string> = {
  LIFF: 'LINE App', QR: 'QR', ADMIN: 'Admin', WEB_FALLBACK: 'Web', SELFIE: 'Selfie', OFFSITE: 'Offsite',
}

export interface MapSourceRecord {
  check_in_at: string | null
  gps_lat?: number | string | null
  gps_lng?: number | string | null
  check_in_method?: string | null
  is_outside_area?: boolean
  shift?: { branch_id?: string | null } | null
}
export interface MapSourceRow {
  key: string
  name: string
  nickname?: string | null
  code: string
  photoUrl?: string | null
  employeeBranchName?: string
  statusLabel: string
  color: string
  record: MapSourceRecord | null
}
export interface MapSourceBranch { id: string; name: string; lat?: number | string | null; lng?: number | string | null; gps_radius?: number | null }

function validLL(la: unknown, lo: unknown): [number, number] | null {
  const a = Number(la), o = Number(lo)
  return la != null && lo != null && Number.isFinite(a) && Number.isFinite(o) && !(a === 0 && o === 0) ? [a, o] : null
}

export function buildMapData(rows: MapSourceRow[], branches: MapSourceBranch[], fmtTime: (iso: string) => string) {
  const branchById = new Map(branches.map(b => [b.id, b]))
  const usedBranches = new Map<string, MapBranch>()
  const people: MapPerson[] = []
  for (const row of rows) {
    const rec = row.record
    if (!rec?.check_in_at) continue
    let lat: number | null = null, lng: number | null = null
    let source: MapPerson['source'] = 'none'
    const gps = validLL(rec.gps_lat, rec.gps_lng)
    const shiftBranch = branchById.get(rec.shift?.branch_id ?? '')
    const bll = shiftBranch ? validLL(shiftBranch.lat, shiftBranch.lng) : null
    if (gps) { [lat, lng] = gps; source = 'gps' }
    else if (rec.check_in_method === 'ADMIN' && bll) { [lat, lng] = bll; source = 'branch' }
    if (shiftBranch && bll) {
      usedBranches.set(shiftBranch.id, { id: shiftBranch.id, name: shiftBranch.name, lat: bll[0], lng: bll[1], radius: Number(shiftBranch.gps_radius) || 200 })
    }
    people.push({
      photo: avatarUrl(row.photoUrl, 96), key: row.key, name: row.name, nickname: row.nickname, code: row.code,
      branchName: shiftBranch?.name ?? row.employeeBranchName ?? '', statusLabel: row.statusLabel, color: row.color,
      time: fmtTime(rec.check_in_at), method: METHOD_LABEL[rec.check_in_method ?? ''] ?? METHOD_LABEL.LIFF,
      lat, lng, source, outsideArea: rec.is_outside_area, shiftBranchName: shiftBranch?.name,
      reason: source === 'none' ? (rec.check_in_method === 'ADMIN' ? 'admin-branch-no-coord' : 'no-gps') : undefined,
    })
  }
  return { people, branches: [...usedBranches.values()] }
}
