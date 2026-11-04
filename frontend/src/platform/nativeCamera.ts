import { Capacitor } from '@capacitor/core';
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';

/**
 * The phone app, where the camera stands in for the file picker. Also true when
 * `birdie-phone-app` is `1` in localStorage, so a browser can open that picker
 * when the flag is set before boot.
 */
export function isNative(): boolean {
  return phoneAppRequested() || Capacitor.isNativePlatform();
}

function phoneAppRequested(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem('birdie-phone-app') === '1';
  } catch {
    return false;
  }
}

export async function pickImageNative(source: 'camera' | 'photos'): Promise<File | null> {
  try {
    const photo = await CapacitorCamera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
    });

    if (!photo.dataUrl) return null;

    const res = await fetch(photo.dataUrl);
    const blob = await res.blob();
    const ext = photo.format === 'png' ? 'png' : 'jpg';
    return new File([blob], `scorecard.${ext}`, {
      type: blob.type || (photo.format === 'png' ? 'image/png' : 'image/jpeg'),
    });
  } catch {
    // User cancelled or permission denied — not an error
    return null;
  }
}
