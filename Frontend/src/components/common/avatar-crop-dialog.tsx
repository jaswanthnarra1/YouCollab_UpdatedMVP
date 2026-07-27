import { Button } from "@/components/common/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/common/dialog";
import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";

interface AvatarCropDialogProps {
  file: File | null;
  onCancel: () => void;
  onCropped: (blob: Blob) => void;
}

async function cropToBlob(imageSrc: string, crop: Area): Promise<Blob> {
  const image = new Image();
  image.src = imageSrc;
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
  });

  const canvas = document.createElement("canvas");
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unsupported");

  ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Crop failed"))), "image/jpeg", 0.92);
  });
}

export function AvatarCropDialog({ file, onCancel, onCropped }: AvatarCropDialogProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!file) {
      setImageSrc(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onCropComplete = useCallback((_: Area, pixels: Area) => setCroppedArea(pixels), []);

  const confirm = async () => {
    if (!imageSrc || !croppedArea) return;
    setBusy(true);
    try {
      onCropped(await cropToBlob(imageSrc, croppedArea));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!file} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-md rounded-sm">
        <DialogHeader>
          <DialogTitle>Crop your photo</DialogTitle>
        </DialogHeader>

        <div className="relative h-64 w-full bg-black rounded-sm overflow-hidden">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-[12px] text-muted-foreground">Zoom</label>
          <input
            type="range" min={1} max={3} step={0.05} value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-primary"
            aria-label="Zoom"
          />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} className="h-8 text-[12px] rounded-sm">
            Cancel
          </Button>
          <Button size="sm" onClick={confirm} disabled={busy || !croppedArea} className="h-8 text-[12px] rounded-sm">
            {busy ? "Saving…" : "Save photo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
