/**
 * 1-export-firebase.js
 * รัน: node src/scripts/1-export-firebase.js
 */

const { initializeApp, cert } = require('firebase-admin/app')
const { getFirestore }         = require('firebase-admin/firestore')
const fs   = require('fs')
const path = require('path')

const SERVICE_ACCOUNT = path.join(__dirname, '../../firebase-service-account.json')
const OUT_DIR         = path.join(__dirname, '../../firebase-export')

if (!fs.existsSync(SERVICE_ACCOUNT)) {
  console.error('❌ ไม่พบ firebase-service-account.json ใน folder server/')
  console.error('   Firebase Console → Project Settings → Service accounts → Generate new private key')
  process.exit(1)
}

initializeApp({ credential: cert(SERVICE_ACCOUNT) })
const db = getFirestore()

async function exportCollection(name) {
  console.log(`📦 export ${name}...`)
  const snap = await db.collection(name).get()
  const docs = snap.docs.map(d => ({ _id: d.id, ...d.data() }))
  const file = path.join(OUT_DIR, `${name}.json`)
  fs.writeFileSync(file, JSON.stringify(docs, null, 2), 'utf8')
  console.log(`   ✅ ${docs.length} records → firebase-export/${name}.json`)
  return docs.length
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  console.log('🚀 เริ่ม export จาก Firebase\n')

  await exportCollection('employees')
  await exportCollection('employee_checkin')
  await exportCollection('employee_leave')
  await exportCollection('public_holidays')
  await exportCollection('branches')

  console.log('\n🎉 export เสร็จ — ไฟล์อยู่ใน server/firebase-export/')
  console.log('   ขั้นตอนถัดไป: npx ts-node src/scripts/2-import-to-mysql.ts')
}

main().catch(e => { console.error(e); process.exit(1) })
