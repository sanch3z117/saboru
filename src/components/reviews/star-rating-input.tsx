"use client";

import { Star } from "lucide-react";
import { useState } from "react";

export function StarRatingInput({
  name,
  label,
  defaultValue = 0,
  required = false,
}: {
  name: string;
  label: string;
  defaultValue?: number;
  required?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);

  return (
    <fieldset className="rounded-panel border border-carbon/20 p-3">
      <legend className="px-1 text-sm font-medium text-carbon">{label}</legend>
      <div className="mt-1 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((rating) => (
          <label
            key={rating}
            className="relative inline-flex cursor-pointer items-center justify-center rounded-sm p-0.5 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-carbon"
          >
            <input
              type="radio"
              name={name}
              value={rating}
              required={required}
              checked={value === rating}
              onChange={() => setValue(rating)}
              className="absolute inset-0 z-10 size-full cursor-pointer opacity-0"
            />
            <Star
              aria-hidden="true"
              className={
                rating <= value
                  ? "size-7 fill-antojo text-antojo"
                  : "size-7 fill-transparent text-carbon/25"
              }
            />
            <span className="sr-only">
              {rating} de 5 para {label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
