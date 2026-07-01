// server/src/modules/line/line.route.ts
import { FastifyInstance } from 'fastify'
import crypto from 'crypto'
import { prisma } from '../../common/utils/prisma'

function verifySignature(body: string, secret: string, signature: string): boolean {
  const hash = crypto.createHmac('sha256', secret).update(body).digest('base64')
  return hash === signature
}

export async function lineRoutes(app: FastifyInstance) {
  // LINE Webhook — ต้องตอบ 200 ทันที
  app.post('/webhook', {
    config: { rawBody: true },
    schema: {
      tags: ['Line'],
      summary: 'LINE Webhook endpoint (รับ events จาก LINE Platform)',
    },
  }, async (req: any, reply) => {
    reply.status(200).send('OK')

    const signature = req.headers['x-line-signature'] as string
    if (!signature) return

    const rawBody = (req.rawBody as Buffer | undefined)?.toString('utf-8') ?? JSON.stringify(req.body)

    try {
      const { events, destination } = req.body as { events: any[]; destination: string }
      if (!events?.length) return

      // หา tenant จาก destination (line_user_id ของ OA)
      const lineConfig = await prisma.tenantLineConfig.findFirst({
        where: { deleted_at: null },
        select: { tenant_id: true, line_channel_secret: true },
      })
      if (!lineConfig) return

      // verify signature
      if (!verifySignature(rawBody, lineConfig.line_channel_secret, signature)) return

      // process events (placeholder — extend per feature)
      for (const event of events) {
        if (event.type === 'follow') {
          // พนักงานกด Add เพื่อน OA
          console.log(`[LINE] follow: ${event.source?.userId}`)
        }
        if (event.type === 'message') {
          console.log(`[LINE] message from ${event.source?.userId}: ${event.message?.text}`)
        }
      }
    } catch (e) {
      console.error('[LINE webhook error]', e)
    }
  })
}
