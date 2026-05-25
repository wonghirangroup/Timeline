// employee/src/lib/axios.ts
import axios from 'axios'
import { getLiffProfile, getChannelId, initLiff } from './liff'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000,
})

// Attach LIFF headers when available. Fall back gracefully for local dev.
api.interceptors.request.use(async (config) => {
  try {
    // initLiff may throw if not configured; ignore errors in dev
    await initLiff()
    const { lineUserId, idToken } = await getLiffProfile()
    if (idToken) config.headers = { ...(config.headers || {}), 'x-liff-token': idToken }
    if (lineUserId) config.headers = { ...(config.headers || {}), 'x-line-user-id': lineUserId }
    const channelId = getChannelId()
    if (channelId) config.headers = { ...(config.headers || {}), 'x-line-channel-id': channelId }
  } catch (err) {
    // Not running inside LIFF or missing env — continue without LIFF headers
  }

  return config
})
