// employee/src/lib/liff.ts
import liff from '@line/liff'

const LIFF_ID = import.meta.env.VITE_LIFF_ID as string

let _initialized = false

export async function initLiff(): Promise<void> {
  if (_initialized) return
  await liff.init({ liffId: LIFF_ID })
  _initialized = true
}

export async function getLiffProfile(): Promise<{
  lineUserId: string
  displayName: string
  pictureUrl?: string
  idToken: string
}> {
  if (!liff.isLoggedIn()) {
    liff.login({ redirectUri: window.location.href })
    // login() navigates away — suspend execution until redirect returns
    await new Promise(() => {})
  }

  const profile    = await liff.getProfile()
  const idToken    = liff.getIDToken() ?? ''

  return {
    lineUserId:  profile.userId,
    displayName: profile.displayName,
    pictureUrl:  profile.pictureUrl,
    idToken,
  }
}

export function getChannelId(): string {
  return import.meta.env.VITE_LINE_CHANNEL_ID as string
}

export function isInLiff(): boolean {
  return liff.isInClient()
}
