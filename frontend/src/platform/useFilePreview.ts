import { useEffect, useState } from "react";

export function useFilePreview(file: File | null): string | null {
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null);

  useEffect(() => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPreview({ file, url: String(reader.result) });
    reader.readAsDataURL(file);
    return () => reader.abort();
  }, [file]);

  return preview?.file === file ? preview.url : null;
}
