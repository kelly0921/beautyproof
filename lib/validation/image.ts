export interface ImageValidation {
  valid: boolean;
  width?: number;
  height?: number;
  shortSide?: number;
  code?: "INVALID_TYPE" | "FILE_TOO_LARGE" | "INVALID_IMAGE" | "IMAGE_TOO_SMALL";
  message?: string;
}

const allowedTypes = new Set(["image/jpeg", "image/png"]);
const maxBytes = 10 * 1024 * 1024;

function pngDimensions(bytes: Uint8Array) {
  if (bytes.length < 24 || bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4e || bytes[3] !== 0x47) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

function jpegDimensions(bytes: Uint8Array) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) { offset += 1; continue; }
    const marker = bytes[offset + 1];
    const length = (bytes[offset + 2] << 8) + bytes[offset + 3];
    if (length < 2) return null;
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { height: (bytes[offset + 5] << 8) + bytes[offset + 6], width: (bytes[offset + 7] << 8) + bytes[offset + 8] };
    }
    offset += length + 2;
  }
  return null;
}

export function readImageDimensions(bytes: Uint8Array, mimeType: string) {
  return mimeType === "image/png" ? pngDimensions(bytes) : mimeType === "image/jpeg" ? jpegDimensions(bytes) : null;
}

export function validateHdImage(file: { type: string; size: number }, bytes: Uint8Array): ImageValidation {
  if (!allowedTypes.has(file.type)) return { valid: false, code: "INVALID_TYPE", message: "Use a JPG or PNG image." };
  if (file.size >= maxBytes) return { valid: false, code: "FILE_TOO_LARGE", message: "Use an image smaller than 10 MB." };
  const dimensions = readImageDimensions(bytes, file.type);
  if (!dimensions) return { valid: false, code: "INVALID_IMAGE", message: "The image dimensions could not be read." };
  const shortSide = Math.min(dimensions.width, dimensions.height);
  if (shortSide < 1080) return { valid: false, ...dimensions, shortSide, code: "IMAGE_TOO_SMALL", message: `HD analysis needs a short side of at least 1080 px. This image is ${dimensions.width}×${dimensions.height}.` };
  return { valid: true, ...dimensions, shortSide };
}
