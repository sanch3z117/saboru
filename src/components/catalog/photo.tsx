"use client";

import Image from "next/image";
import { useState } from "react";

import { photoSrc } from "@/lib/photos";
import { cn } from "@/lib/utils";

import { PhotoPlaceholder } from "./photo-placeholder";

export function Photo({
  path,
  alt,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  priority = false,
  className,
  imageClassName,
  placeholderLabel = "Sin foto",
}: {
  path: string | null | undefined;
  alt: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
  placeholderLabel?: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = photoSrc(path);

  if (!src || failed) {
    return (
      <PhotoPlaceholder
        className={cn("absolute inset-0 border-0", className)}
        label={placeholderLabel}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={cn("object-cover", imageClassName)}
      onError={() => setFailed(true)}
    />
  );
}
