// employee/src/lib/liff.ts
import liff from '@line/liff'

export const initLiff = async () => {
  await liff.init({ liffId: import.meta.env.VITE_LIFF_ID })
  if (!liff.isLoggedIn()) liff.login()
}

export const getLiffProfile = async () => {
  const profile = await liff.getProfile()
  const idToken = liff.getIDToken() ?? ''
  return {
    lineUserId:  profile.userId,
    displayName: profile.displayName,
    pictureUrl:  profile.pictureUrl,
    idToken,
  }
}

export const getChannelId = () => import.meta.env.VITE_LINE_CHANNEL_ID as string
