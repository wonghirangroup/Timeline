// server/src/modules/billing/billing.service.ts
import { prisma } from '../../common/utils/prisma'

function toFlat(inv: { tenant: { name: string } } & Record<string, any>) {
  const { tenant, ...rest } = inv
  return { ...rest, tenant_name: tenant.name }
}

export async function listInvoices(tenantId?: string) {
  const invoices = await prisma.invoice.findMany({
    where: tenantId ? { tenant_id: tenantId } : {},
    include: { tenant: { select: { name: true } } },
    orderBy: { due_date: 'desc' },
  })
  return invoices.map(toFlat)
}

export async function createInvoice(data: {
  tenant_id: string
  plan: string
  amount: number
  due_date: string
  paid_date?: string | null
  status?: 'PAID' | 'PENDING' | 'OVERDUE' | 'CANCELLED'
  period_start: string
  period_end: string
  note?: string
}) {
  const invoice = await prisma.invoice.create({
    data: {
      tenant_id:    data.tenant_id,
      plan:         data.plan,
      amount:       data.amount,
      due_date:     new Date(data.due_date),
      paid_date:    data.paid_date ? new Date(data.paid_date) : null,
      status:       data.status ?? 'PENDING',
      period_start: new Date(data.period_start),
      period_end:   new Date(data.period_end),
      note:         data.note,
    },
    include: { tenant: { select: { name: true } } },
  })
  return toFlat(invoice)
}

export async function updateInvoice(id: string, data: {
  status?:       'PAID' | 'PENDING' | 'OVERDUE' | 'CANCELLED'
  paid_date?:    string | null
  period_end?:   string
  note?:         string
}) {
  const count = await prisma.invoice.updateMany({
    where: { id },
    data: {
      ...(data.status     !== undefined ? { status: data.status }                                   : {}),
      ...(data.paid_date  !== undefined ? { paid_date: data.paid_date ? new Date(data.paid_date) : null } : {}),
      ...(data.period_end !== undefined ? { period_end: new Date(data.period_end) }                  : {}),
      ...(data.note       !== undefined ? { note: data.note }                                        : {}),
    },
  })
  if (count.count === 0) return null
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { tenant: { select: { name: true } } },
  })
  return invoice ? toFlat(invoice) : null
}
