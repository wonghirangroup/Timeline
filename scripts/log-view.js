#!/usr/bin/env node
/**
 * log-view.js — อ่าน brain/daily/*.txt ทั้งหมด แล้ว generate brain/_LOG_VIEW.txt
 * รันด้วย: node scripts/log-view.js
 */

const fs = require('fs')
const path = require('path')

const DAILY_DIR = path.join(__dirname, '../brain/daily')
const OUTPUT_FILE = path.join(__dirname, '../brain/_LOG_VIEW.txt')

// ── parser ──────────────────────────────────────────────

function parseDailyFile(filepath) {
  const content = fs.readFileSync(filepath, 'utf8')
  const lines = content.split('\n')
  const sessions = []
  let current = null

  for (const line of lines) {
    const trimmed = line.trim()

    // session header: === HH:MM session ===
    const sessionMatch = trimmed.match(/^===\s*(\d{1,2}:\d{2})\s*session\s*===$/i)
    if (sessionMatch) {
      if (current) sessions.push(current)
      current = { time: sessionMatch[1], goal: '', tasks: [], files: [], notes: [], section: '' }
      continue
    }

    if (!current) continue

    if (trimmed.startsWith('Goal:')) {
      current.goal = trimmed.replace('Goal:', '').trim()
      current.section = ''
      continue
    }
    if (trimmed === 'Tasks:') { current.section = 'tasks'; continue }
    if (trimmed === 'Files changed:') { current.section = 'files'; continue }
    if (trimmed === 'Notes:') { current.section = 'notes'; continue }

    if (current.section === 'tasks' && (trimmed.startsWith('[/]') || trimmed.startsWith('[...]') || trimmed.startsWith('[x]'))) {
      current.tasks.push(trimmed)
    } else if (current.section === 'files' && trimmed.startsWith('-')) {
      current.files.push(trimmed.replace(/^-\s*/, ''))
    } else if (current.section === 'notes' && trimmed.startsWith('-')) {
      current.notes.push(trimmed.replace(/^-\s*/, ''))
    }
  }

  if (current) sessions.push(current)
  return sessions
}

// ── render ──────────────────────────────────────────────

function renderTask(task) {
  if (task.startsWith('[/]'))   return '  ✅  ' + task.replace('[/]', '').trim()
  if (task.startsWith('[...]')) return '  ⏳  ' + task.replace('[...]', '').trim()
  if (task.startsWith('[x]'))   return '  ❌  ' + task.replace('[x]', '').trim()
  return '      ' + task
}

function divider(char = '─', len = 56) {
  return char.repeat(len)
}

// ── main ─────────────────────────────────────────────────

function main() {
  if (!fs.existsSync(DAILY_DIR)) {
    console.error('ไม่พบ brain/daily/')
    process.exit(1)
  }

  const files = fs.readdirSync(DAILY_DIR)
    .filter(f => f.endsWith('.txt') && !f.startsWith('_'))
    .sort()  // เรียงตามวันที่ (filename = YYYY-MM-DD.txt)

  const lines = []
  let versionCounter = 1

  const now = new Date().toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  })

  // ── header ──
  lines.push('╔' + '═'.repeat(54) + '╗')
  lines.push('║' + '  SESSION LOG — TimeLine HR'.padEnd(54) + '║')
  lines.push('╚' + '═'.repeat(54) + '╝')
  lines.push('')
  lines.push('  Updated : ' + now)
  lines.push('  Vault   : brain/daily/')
  lines.push('  Legend  : ✅ ทำแล้ว  ⏳ ค้างอยู่  ❌ ไม่สำเร็จ')
  lines.push('')

  if (files.length === 0) {
    lines.push('  (ยังไม่มี session log — รัน /log ใน Claude Code)')
    lines.push('')
  }

  // ── sessions ──
  for (const file of files) {
    const date = file.replace('.txt', '')
    const filepath = path.join(DAILY_DIR, file)
    const sessions = parseDailyFile(filepath)

    for (const session of sessions) {
      const tag = `v${String(versionCounter).padStart(3, '0')}`
      lines.push(divider())
      lines.push(`${tag}  │  ${date}  │  ${session.time}`)
      lines.push(divider())

      if (session.goal) {
        lines.push(`  Goal: ${session.goal}`)
        lines.push('')
      }

      if (session.tasks.length > 0) {
        lines.push('  Tasks:')
        for (const t of session.tasks) lines.push(renderTask(t))
        lines.push('')
      }

      // งานค้าง highlight
      const pending = session.tasks.filter(t => t.startsWith('[...]'))
      const failed  = session.tasks.filter(t => t.startsWith('[x]'))
      if (pending.length > 0 || failed.length > 0) {
        lines.push('  ⚠  ต้องติดตาม:')
        for (const t of pending) lines.push('     › ' + t.replace('[...]', '').trim())
        for (const t of failed)  lines.push('     ✗ ' + t.replace('[x]', '').trim())
        lines.push('')
      }

      if (session.files.length > 0) {
        lines.push('  Files:')
        for (const f of session.files) lines.push('    · ' + f)
        lines.push('')
      }

      if (session.notes.length > 0) {
        lines.push('  Notes:')
        for (const n of session.notes) lines.push('    » ' + n)
        lines.push('')
      }

      versionCounter++
    }
  }

  lines.push(divider('═'))
  lines.push(`  Total: ${versionCounter - 1} session(s) จาก ${files.length} วัน`)
  lines.push(divider('═'))

  // ── write ──
  fs.writeFileSync(OUTPUT_FILE, lines.join('\n'), 'utf8')
  console.log(`✅ เขียนแล้ว: brain/_LOG_VIEW.txt (${versionCounter - 1} sessions)`)
}

main()
