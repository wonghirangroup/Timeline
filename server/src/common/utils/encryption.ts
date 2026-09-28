// server/src/common/utils/encryption.ts
// เข้ารหัสฟิลด์อ่อนไหวที่เก็บใน DB ตรงๆ (feedback 2026-09-28 — เจอตอนเขียนหน้า
// PDPA ว่า ENCRYPTION_KEY ตั้งไว้ใน .env แล้วแต่ไม่มีจุดไหนใช้จริง ทำให้
// Employee.id_card (เลขบัตรประชาชน) เก็บเป็น plain text อยู่) ใช้ AES-256-GCM
// (authenticated encryption — กันทั้งการอ่านและการปลอมแปลงข้อมูล) สุ่ม IV ทุก
// ครั้งที่เข้ารหัส (ไม่จำเป็นต้อง deterministic เพราะไม่มีจุดไหนในระบบ query
// หา employee ด้วย id_card ตรงๆ — เช็คแล้วมีแต่ create/update/อ่านทั้งแถวเท่านั้น)
import crypto from 'crypto'

const ALGO = 'aes-256-gcm'
const IV_LENGTH = 12  // มาตรฐานสำหรับ GCM (96 บิต)

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY ?? ''
  if (raw.length !== 32) {
    throw new Error('ENCRYPTION_KEY ต้องมีความยาวตรง 32 ตัวอักษร (ดู .env.example)')
  }
  return Buffer.from(raw, 'utf8')
}

// รูปแบบที่เก็บใน DB: "enc:v1:<iv-hex>:<authTag-hex>:<ciphertext-hex>" — มี prefix
// "enc:v1:" ชัดเจนเพื่อให้ decryptField แยกออกจากค่าเก่าที่ยังเป็น plain text
// (migrate มาก่อนมีระบบนี้) ได้แบบไม่ต้อง flag แยกในสคีมา
const PREFIX = 'enc:v1:'

export function encryptField(plain: string): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${PREFIX}${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`
}

// ค่าเก่าที่เข้ามาก่อนระบบนี้ (ไม่มี prefix "enc:v1:") ถือว่าเป็น plain text —
// คืนค่าตามเดิมแทนที่จะ throw ป้องกันพังตอนอ่าน record เก่าที่ยังไม่ได้ migrate
export function decryptField(stored: string | null | undefined): string | null {
  if (!stored) return stored ?? null
  if (!stored.startsWith(PREFIX)) return stored
  try {
    const [ivHex, authTagHex, ciphertextHex] = stored.slice(PREFIX.length).split(':')
    const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(ivHex, 'hex'))
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'))
    const plain = Buffer.concat([decipher.update(Buffer.from(ciphertextHex, 'hex')), decipher.final()])
    return plain.toString('utf8')
  } catch {
    // ถอดรหัสไม่ได้ (key เปลี่ยน/ข้อมูลเสีย) — คืน null แทนที่จะโยน error ทำให้
    // ทั้ง request พังไปด้วย (ฟิลด์นี้ไม่ critical ต่อการทำงานหลักของหน้าจอ)
    return null
  }
}
