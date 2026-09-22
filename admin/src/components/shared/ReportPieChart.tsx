// admin/src/components/shared/ReportPieChart.tsx
// กราฟโดนัทใช้ร่วมกันในหน้ารายงาน — สัดส่วนตามหมวด (v189)
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export interface ReportPieSlice { key: string; label: string; value: number; color: string }

interface ReportPieChartProps {
  data: ReportPieSlice[]
  height?: number
  emptyLabel?: string
  valueSuffix?: string
}

export default function ReportPieChart({ data, height = 300, emptyLabel = 'ไม่มีข้อมูลให้แสดงกราฟ', valueSuffix = '' }: ReportPieChartProps) {
  if (data.length === 0) {
    return (
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', textAlign: 'center', padding: '50px 0', color: '#94a3b8', fontSize: '0.85rem' }}>{emptyLabel}</div>
    )
  }
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', padding: '16px 12px 8px' }}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="label" innerRadius="50%" outerRadius="80%" paddingAngle={2}>
            {data.map(d => <Cell key={d.key} fill={d.color} />)}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12 }} formatter={(v: number) => [`${v.toLocaleString()}${valueSuffix}`, '']} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
