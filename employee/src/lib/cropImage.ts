// employee/src/lib/cropImage.ts
// ตัดรูปตามพื้นที่ที่ผู้ใช้เลือกใน PhotoCropModal (react-easy-crop คืนพิกัด
// พิกเซลของพื้นที่ crop บนรูปต้นฉบับ — ฟังก์ชันนี้วาดลง canvas แล้วส่งออกเป็น
// Blob จริง)
export interface PixelCrop { x: number; y: number; width: number; height: number }

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

export async function getCroppedImageBlob(imageSrc: string, crop: PixelCrop, outputSize = 640): Promise<Blob> {
  const img = await loadImage(imageSrc)
  const canvas = document.createElement('canvas')
  canvas.width = outputSize
  canvas.height = outputSize
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, outputSize, outputSize)
  return new Promise((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('crop failed'))), 'image/jpeg', 0.88)
  })
}
