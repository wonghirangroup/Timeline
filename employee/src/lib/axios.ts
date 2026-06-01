// employee/src/lib/axios.ts
import axios from 'axios'
import liff from '@line/liff'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 15000,
})

// JWT เก็บใน memory (ไม่ใส่ localStorage เพราะ LIFF มีอายุสั้น)
let _jwt: string | null = null

export function setJwt(token: string) { _jwt = token }
export function getJwt() { return _jwt }

// Attach JWT ทุก request
api.interceptors.request.use(config => {
  if (_jwt) config.headers.set('Authorization', `Bearer ${_jwt}`)
  return config
})

// Exchange LIFF token → JWT (เรียกครั้งเดียวตอน boot)
export async function liffLogin(): Promise<{ employeeId: string; tenantId: string } | null> {
  try {
    if (!liff.isLoggedIn()) return null
    const profile  = await liff.getProfile()
    const idToken  = liff.getIDToken()
    if (!idToken) return null

    const channelId = import.meta.env.VITE_LINE_CHANNEL_ID as string

    const res = await axios.post(
      `${import.meta.env.VITE_API_URL}/employee/auth/liff`,
      { liff_token: idToken, line_user_id: profile.userId, line_channel_id: channelId },
    )

    const { token } = res.data.data
    setJwt(token)
    return { employeeId: res.data.data.employee.id, tenantId: '' }
  } catch {
    return null
  }
}
