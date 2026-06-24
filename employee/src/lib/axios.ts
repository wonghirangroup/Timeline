// employee/src/lib/axios.ts
import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL as string

export const api = axios.create({
  baseURL: BASE,
  timeout: 15000,
  headers: { 'ngrok-skip-browser-warning': 'true' },
})

// JWT เก็บใน memory (ไม่ใส่ localStorage เพราะ LIFF มีอายุสั้น)
let _jwt: string | null = null

export function setJwt(token: string) { _jwt = token || null }
export function getJwt() { return _jwt }

// Attach JWT ทุก request
api.interceptors.request.use(config => {
  if (_jwt) config.headers.set('Authorization', `Bearer ${_jwt}`)
  return config
})

// Exchange LIFF idToken → JWT (ใช้ใน production LIFF)
export async function liffLogin(params: {
  liff_token: string
  line_user_id: string
  line_channel_id: string
}): Promise<{ token: string; employee: { id: string; first_name: string; last_name: string; employee_code: string; branch: { id: string; name: string } } }> {
  const res = await axios.post(
    `${BASE}/employee/auth/liff`,
    params,
    { headers: { 'ngrok-skip-browser-warning': 'true' } },
  )
  const { token, employee } = res.data.data
  setJwt(token)
  return { token, employee }
}

// Dev mode: ใช้ Admin JWT เพื่อเรียก employee endpoints (tenant_id ตรงกัน)
export async function devLogin(): Promise<{ token: string; tenant_id: string }> {
  const username = import.meta.env.VITE_DEV_EMAIL    ?? 'wonghi_admin'
  const password = import.meta.env.VITE_DEV_PASSWORD ?? 'Password123!'
  const res = await axios.post(
    `${BASE}/auth/login`,
    { username, password },
    { headers: { 'ngrok-skip-browser-warning': 'true' } },
  )
  const { accessToken, user } = res.data.data
  setJwt(accessToken)
  return { token: accessToken, tenant_id: user.tenant_id }
}
