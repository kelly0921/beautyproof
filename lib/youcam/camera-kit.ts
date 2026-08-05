"use client";

interface CameraKitImage { phase: number; image: string; width: number; height: number }
interface CameraKitCapture { mode: string; images: CameraKitImage[] }
interface YmkGlobal {
  init(options: { faceDetectionMode: "hdskincare"; imageFormat: "blob" | "base64"; language: "enu" }): void;
  addEventListener(name: "faceDetectionCaptured", callback: (result: CameraKitCapture) => void): void;
  openCameraKit(): void;
  close(): void;
}

declare global { interface Window { YMK?: YmkGlobal } }

export class CameraKitAdapter {
  available() { return typeof window !== "undefined" && Boolean(window.YMK); }
  async capture() {
    if (!window.YMK) throw new Error("CameraKit is unavailable. Use high-resolution upload or the preloaded demo image.");
    return new Promise<CameraKitImage>((resolve) => {
      window.YMK!.init({ faceDetectionMode: "hdskincare", imageFormat: "base64", language: "enu" });
      window.YMK!.addEventListener("faceDetectionCaptured", (result) => {
        const image = result.images[0];
        window.YMK!.close();
        resolve(image);
      });
      window.YMK!.openCameraKit();
    });
  }
}
