"use client";

import avatarFrame from "@/modules/avatar-creator/assets/avatar-frame.png";
import { Button2 } from "@/modules/common/components/Button2";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_SCALING_MULTIPLIER = 0.65;
const CANVAS_SIZE = 512;
const CENTER_Y_OFFSET = 25;
const CLIP_MASK_RADIUS = 0.32;

const getFrameCircle = (width: number, height: number) => {
  const radius = Math.min(width, height) * CLIP_MASK_RADIUS;
  return {
    centerX: width / 2,
    centerY: height / 2 + CENTER_Y_OFFSET,
    radius,
  };
};

const calculateFitScale = (
  image: HTMLImageElement,
  width: number,
  height: number,
) => {
  const imageWidth = image.naturalWidth || image.width;
  const imageHeight = image.naturalHeight || image.height;

  if (!imageWidth || !imageHeight) {
    return 1;
  }

  return Math.max(width / imageWidth, height / imageHeight);
};

const drawFrameToCanvas = (
  ctx: CanvasRenderingContext2D,
  frame: HTMLImageElement | null,
  width: number,
  height: number,
) => {
  if (frame) {
    ctx.drawImage(frame, 0, 0, width, height);
  }
};

const drawUserImageToCanvas = (
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  width: number,
  height: number,
  options?: {
    readonly fitScale: number | null;
    readonly scaleMultiplier: number;
    readonly offset: { readonly x: number; readonly y: number };
  },
) => {
  if (!image) {
    return;
  }

  const imageWidth = image.naturalWidth || image.width;
  const imageHeight = image.naturalHeight || image.height;

  if (imageWidth && imageHeight) {
    const fitScale =
      options?.fitScale ?? Math.max(width / imageWidth, height / imageHeight);
    const scale = fitScale * (options?.scaleMultiplier ?? 1);
    const drawWidth = imageWidth * scale;
    const drawHeight = imageHeight * scale;
    const offsetX = (width - drawWidth) / 2 + (options?.offset.x ?? 0);
    const offsetY =
      (height - drawHeight) / 2 + CENTER_Y_OFFSET + (options?.offset.y ?? 0);

    const {
      centerX,
      centerY,
      radius: frameRadius,
    } = getFrameCircle(width, height);
    const imageRadius = Math.min(drawWidth, drawHeight) / 2;
    const clipRadius = Math.min(frameRadius, imageRadius);

    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, clipRadius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
    ctx.restore();
  }
};

type BackgroundOption = "transparent" | "black" | "white" | "custom";
type LayeringOption = "frameFront" | "frameBehind";

interface Props {
  readonly className?: string;
}

export const AvatarCreatorClient = ({ className }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [frameImage, setFrameImage] = useState<HTMLImageElement | null>(null);
  const [userImage, setUserImage] = useState<HTMLImageElement | null>(null);
  const [canvasSize, setCanvasSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [backgroundOption, setBackgroundOption] =
    useState<BackgroundOption>("transparent");
  const [customBackground, setCustomBackground] = useState<string>("#000000");
  const [layering, setLayering] = useState<LayeringOption>("frameFront");
  const [scaleMultiplier, setScaleMultiplier] = useState<number>(
    DEFAULT_SCALING_MULTIPLIER,
  );
  const [imageOffset, setImageOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const hasUserAdjustedRef = useRef(false);
  const pointerStateRef = useRef<{
    isDragging: boolean;
    lastX: number;
    lastY: number;
  }>({ isDragging: false, lastX: 0, lastY: 0 });

  const baseFitScale = useMemo(() => {
    if (!userImage) {
      return DEFAULT_SCALING_MULTIPLIER;
    }

    const targetWidth =
      canvasSize?.width ?? frameImage?.naturalWidth ?? userImage.naturalWidth;
    const targetHeight =
      canvasSize?.height ??
      frameImage?.naturalHeight ??
      userImage.naturalHeight;

    return calculateFitScale(userImage, targetWidth, targetHeight);
  }, [canvasSize, frameImage, userImage]);

  useEffect(() => {
    const img = new Image();
    const src = typeof avatarFrame === "string" ? avatarFrame : avatarFrame.src;
    img.src = src;
    img.decoding = "async";
    img.onload = () => {
      setFrameImage(img);
      setCanvasSize({ width: img.naturalWidth, height: img.naturalHeight });
    };
  }, []);

  const backgroundColor = useMemo<string | null>(() => {
    if (backgroundOption === "transparent") return null;
    if (backgroundOption === "black") return "#000000";
    if (backgroundOption === "white") return "#FFFFFF";
    return customBackground || "#000000";
  }, [backgroundOption, customBackground]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvasSize?.width ?? frameImage?.naturalWidth ?? CANVAS_SIZE;
    const height =
      canvasSize?.height ?? frameImage?.naturalHeight ?? CANVAS_SIZE;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    ctx.clearRect(0, 0, width, height);
    if (backgroundColor) {
      const { centerX, centerY, radius } = getFrameCircle(width, height);
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fillStyle = backgroundColor;
      ctx.fill();
      ctx.restore();
    }

    if (layering === "frameBehind") {
      drawFrameToCanvas(ctx, frameImage, width, height);
      drawUserImageToCanvas(ctx, userImage, width, height, {
        fitScale: userImage ? baseFitScale : null,
        scaleMultiplier,
        offset: imageOffset,
      });
    } else {
      drawUserImageToCanvas(ctx, userImage, width, height, {
        fitScale: userImage ? baseFitScale : null,
        scaleMultiplier,
        offset: imageOffset,
      });
      drawFrameToCanvas(ctx, frameImage, width, height);
    }
  }, [
    backgroundColor,
    canvasSize,
    frameImage,
    baseFitScale,
    imageOffset,
    layering,
    scaleMultiplier,
    userImage,
  ]);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        setUserImage(null);
        setScaleMultiplier(DEFAULT_SCALING_MULTIPLIER);
        setImageOffset({ x: 0, y: 0 });
        hasUserAdjustedRef.current = false;
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result !== "string") return;
        const img = new Image();
        img.src = reader.result;
        img.decoding = "async";
        img.onload = () => {
          setUserImage(img);
          hasUserAdjustedRef.current = false;
          if (!canvasSize && frameImage) {
            setCanvasSize({
              width: frameImage.naturalWidth,
              height: frameImage.naturalHeight,
            });
          }
          if (!canvasSize && !frameImage) {
            setCanvasSize({
              width: img.naturalWidth,
              height: img.naturalHeight,
            });
          }

          setScaleMultiplier(DEFAULT_SCALING_MULTIPLIER);
          setImageOffset({ x: 0, y: 0 });
        };
      };
      reader.readAsDataURL(file);
    },
    [canvasSize, frameImage],
  );

  const handleScaleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setScaleMultiplier(parseFloat(event.target.value));
    hasUserAdjustedRef.current = true;
  };

  const handleResetTransform = () => {
    if (!userImage) {
      return;
    }

    setScaleMultiplier(DEFAULT_SCALING_MULTIPLIER);
    setImageOffset({ x: 0, y: 0 });
    hasUserAdjustedRef.current = false;
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!userImage) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    pointerStateRef.current = {
      isDragging: true,
      lastX: (event.clientX - rect.left) * scaleX,
      lastY: (event.clientY - rect.top) * scaleY,
    };

    canvas.setPointerCapture(event.pointerId);
    hasUserAdjustedRef.current = true;
    event.preventDefault();
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!pointerStateRef.current.isDragging) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const currentX = (event.clientX - rect.left) * scaleX;
    const currentY = (event.clientY - rect.top) * scaleY;
    const deltaX = currentX - pointerStateRef.current.lastX;
    const deltaY = currentY - pointerStateRef.current.lastY;

    pointerStateRef.current.lastX = currentX;
    pointerStateRef.current.lastY = currentY;

    setImageOffset((prev) => ({
      x: prev.x + deltaX,
      y: prev.y + deltaY,
    }));
  };

  const endPointerInteraction = (
    event: React.PointerEvent<HTMLCanvasElement>,
  ) => {
    const canvas = canvasRef.current;
    if (canvas && pointerStateRef.current.isDragging) {
      canvas.releasePointerCapture(event.pointerId);
    }
    pointerStateRef.current = { isDragging: false, lastX: 0, lastY: 0 };
  };

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const triggerDownload = (dataUrl: string) => {
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = "avatar.png";
      link.click();
    };

    if (canvas.toBlob) {
      canvas.toBlob((blob) => {
        if (!blob) {
          return;
        }
        const url = URL.createObjectURL(blob);
        triggerDownload(url);
        URL.revokeObjectURL(url);
      }, "image/png");
      return;
    }

    triggerDownload(canvas.toDataURL("image/png"));
  }, []);

  return (
    <div
      className={clsx(
        "flex flex-col items-center md:flex-row justify-center md:items-start gap-4",
        className,
      )}
    >
      <div className="w-80 background-secondary rounded-primary p-4 flex flex-col gap-6">
        <div className="overflow-hidden">
          <label
            className="block text-sm font-bold mb-2"
            htmlFor="avatar-upload"
          >
            Dein Avatar
          </label>

          <input
            id="avatar-upload"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="truncate"
          />
        </div>

        <fieldset>
          <legend className="text-sm font-bold mb-2">Hintergrundfarbe</legend>

          <div className="flex flex-col gap-2 text-sm text-neutral-300">
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="background"
                  value="transparent"
                  checked={backgroundOption === "transparent"}
                  onChange={() => setBackgroundOption("transparent")}
                />
                Transparent
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="background"
                  value="black"
                  checked={backgroundOption === "black"}
                  onChange={() => setBackgroundOption("black")}
                />
                Schwarz
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="background"
                  value="white"
                  checked={backgroundOption === "white"}
                  onChange={() => setBackgroundOption("white")}
                />
                Weiß
              </label>
            </div>

            <div className="flex gap-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="background"
                  value="custom"
                  checked={backgroundOption === "custom"}
                  onChange={() => setBackgroundOption("custom")}
                />
                Benutzerdefiniert
              </label>

              <input
                type="color"
                value={customBackground}
                onChange={(event) => setCustomBackground(event.target.value)}
                disabled={backgroundOption !== "custom"}
                className="h-8 w-12 cursor-pointer rounded border border-neutral-700 bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-bold mb-2">Reihenfolge</legend>

          <div className="flex flex-wrap gap-4 text-sm text-neutral-300">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="layering"
                value="frameFront"
                checked={layering === "frameFront"}
                onChange={() => setLayering("frameFront")}
              />
              Rahmen vorne
            </label>

            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="layering"
                value="frameBehind"
                checked={layering === "frameBehind"}
                onChange={() => setLayering("frameBehind")}
              />
              Rahmen hinten
            </label>
          </div>
        </fieldset>

        <div>
          <div className="flex items-center justify-between text-sm">
            <label className="font-bold" htmlFor="avatar-scale">
              Skalierung
            </label>

            <Button2
              type="button"
              variant="secondary"
              onClick={handleResetTransform}
              className="rounded border border-neutral-700/60 px-2 py-1 text-xs transition hover:border-neutral-500 hover:text-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!userImage}
            >
              Zurücksetzen
            </Button2>
          </div>

          <input
            id="avatar-scale"
            type="range"
            min="0.1"
            max="3"
            step="0.01"
            value={scaleMultiplier}
            onChange={handleScaleChange}
            disabled={!userImage}
            className="w-full"
          />

          <p className="text-xs text-neutral-500">
            Per Drag and Drop kannst du deinen Avatar innerhalb des Rahmens
            verschieben.
          </p>
        </div>
      </div>

      <div className="w-80">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endPointerInteraction}
          onPointerLeave={endPointerInteraction}
          className="size-80 touch-none rounded-primary border border-neutral-700/40"
        />

        <div className="mt-2 flex items-center justify-end gap-2">
          <Button2 type="button" variant="primary" onClick={handleDownload}>
            Herunterladen
          </Button2>
        </div>
      </div>
    </div>
  );
};
