// admin/src/components/shared/ReportLineChart.tsx
// กราฟเส้นแนวโน้ม ใช้ร่วมกันในหน้ารายงาน — คู่กับ ReportBarChart/ReportPieChart
// (feedback 2026-10-01 "กราฟรวมแต่ละรายงาน เช่น pie แท่ง โดนัท แนวโน้ม")
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export interface ReportLineSeries { key: string; label: string; color: string }

interface ReportLineChartProps {
  data: Record<string, any>[]
  xKey: string
  series: ReportLineSeries[]
  height?: number
  emptyLabel?: string
}

export default function ReportLineChart({ data, xKey, series, height = 280, emptyLabel = 'ไม่มีข้อมูลให้แสดงกราฟ' }: ReportLineChartProps) {
  if (data.length === 0) {
    return (
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', textAlign: 'center', padding: '50px 0', color: '#94a3b8', fontSize: '0.85rem' }}>{emptyLabel}</div>
    )
  }
  const angled = data.length > 10
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', padding: '16px 12px 8px' }}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 4, right: 12, left: -16, bottom: angled ? 8 : 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E6ECF4" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#64748b' }} interval={angled ? 'preserveStartEnd' : 0}
            angle={angled ? -30 : 0} textAnchor={angled ? 'end' : 'middle'} height={angled ? 52 : 26} />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
          <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {series.map(s => (
            <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2.5} dot={{ r: 2.5 }} activeDot={{ r: 5 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
