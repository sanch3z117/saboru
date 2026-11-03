"use client";

import { useActionState } from "react";

import { PhotoPlaceholder } from "@/components/catalog/photo-placeholder";
import { Button } from "@/components/ui/button";
import { useVendorFormFeedback } from "@/components/vendor/use-vendor-form-feedback";
import { initialVendorState } from "@/lib/vendor/form-state";
import {
  deletePhotoAction,
  uploadPhotoAction,
} from "@/server/actions/vendor";

type PhotoItem = { path: string; url: string };

export function PhotoManager({ photos }: { photos: PhotoItem[] }) {
  const [state, formAction, pending] = useActionState(
    uploadPhotoAction,
    initialVendorState,
  );
  useVendorFormFeedback(state, pending);

  return (
    <div className="mt-4">
      {photos.length === 0 ? (
        <PhotoPlaceholder
          className="aspect-[16/9] w-full"
          label="Sin fotos todavía"
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo, index) => (
            <li key={photo.path} className="flex flex-col gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={`Foto ${index + 1} de tu local`}
                className="aspect-square w-full border border-carbon/20 object-cover"
              />
              <DeletePhotoButton path={photo.path} />
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} className="mt-4 flex flex-col gap-2">
        <label htmlFor="photo" className="text-sm font-medium text-carbon">
          Agregar foto (JPEG, PNG o WebP; máximo 5 MB)
        </label>
        <input
          id="photo"
          name="file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          className="w-full border border-carbon bg-cream px-3 py-2 text-sm text-carbon file:mr-3 file:border-0 file:bg-carbon file:px-3 file:py-1 file:text-sm file:font-semibold file:text-cream"
        />
        <Button
          type="submit"
          variant="secondary"
          size="sm"
          disabled={pending}
          className="w-fit"
        >
          {pending ? "Subiendo…" : "Subir foto"}
        </Button>
      </form>

      {state.status === "error" ? (
        <p role="alert" className="mt-3 text-sm font-semibold text-carbon">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}

function DeletePhotoButton({ path }: { path: string }) {
  const [state, formAction, pending] = useActionState(
    deletePhotoAction,
    initialVendorState,
  );
  useVendorFormFeedback(state, pending);

  return (
    <form action={formAction}>
      <input type="hidden" name="path" value={path} />
      <Button type="submit" variant="link" size="sm" disabled={pending}>
        Eliminar foto
      </Button>
      {state.status === "error" ? (
        <p role="alert" className="text-xs font-semibold text-carbon">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
