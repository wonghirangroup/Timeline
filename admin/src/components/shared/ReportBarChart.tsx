// admin/src/components/shared/ReportBarChart.tsx
// กราฟแท่งใช้ร่วมกันในหน้ารายงาน — มุมมองที่ 3 ถัดจากการ์ด/ตาราง (v189)
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export interface ReportBarSeries { key: string; label: string; color: string }

interface ReportBarChartProps {
  data: Record<string, any>[]
  xKey: string
  series: ReportBarSeries[]
  height?: number
  emptyLabel?: string
}

export default function ReportBarChart({ data, xKey, series, height = 320, emptyLabel = 'ไม่มีข้อมูลให้แสดงกราฟ' }: ReportBarChartProps) {
  if (data.length === 0) {
    return (
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', textAlign: 'center', padding: '50px 0', color: '#94a3b8', fontSize: '0.85rem' }}>{emptyLabel}</div>
    )
  }
  const angled = data.length > 6
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', padding: '16px 12px 8px' }}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 4, right: 12, left: -16, bottom: angled ? 8 : 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E6ECF4" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#64748b' }} interval={0}
            angle={angled ? -30 : 0} textAnchor={angled ? 'end' : 'middle'} height={angled ? 52 : 26} />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
          <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {series.map(s => (
            <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={36} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
