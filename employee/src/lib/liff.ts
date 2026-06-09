// employee/src/lib/liff.ts — STUBBED (LIFF removed temporarily)
// TODO: restore @line/liff when ready to connect LINE

export const initLiff = async () => {
  // no-op in mock mode
}

export const getLiffProfile = async () => ({
  lineUserId:  'mock-line-uid-001',
  displayName: 'สมชาย ใจดี',
  pictureUrl:  undefined as string | undefined,
  idToken:     'mock-id-token',
})

export const getChannelId = () => import.meta.env.VITE_LINE_CHANNEL_ID as string ?? 'mock-channel-id'
