import { brand } from "@/lib/brand";

const PIN_MARKUP = `
  <span data-pin class="block size-10 transition-transform duration-150">
    <svg viewBox="0 0 64 64" aria-hidden="true" class="size-full">
      <path
        d="M32 6C22 6 14 14 14 24c0 12 12.4 21.6 16.8 31.4.8 1.8 2.4 1.8 3.2 0C38.4 45.6 51 36 51 24 51 14 42 6 32 6Z"
        fill="${brand.colors.campus}"
        stroke="${brand.colors.carbon}"
        stroke-width="3"
        stroke-linejoin="round"
      />
      <circle
        cx="32"
        cy="24"
        r="10"
        fill="${brand.colors.cream}"
        stroke="${brand.colors.carbon}"
        stroke-width="2.5"
      />
      <path
        d="M27 20v5c0 4 2.5 6.5 5 6.5s5-2.5 5-6.5v-5"
        fill="none"
        stroke="${brand.colors.carbon}"
        stroke-width="3"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="m32 19 1.2 2.6 2.8.3-2.1 1.9.6 2.8-2.5-1.4-2.5 1.4.6-2.8-2.1-1.9 2.8-.3Z"
        fill="${brand.colors.antojo}"
      />
    </svg>
  </span>
`;

export function createPlaceMarkerElement({
  name,
  id,
}: {
  name: string;
  id: string;
}) {
  const element = document.createElement("button");
  element.type = "button";
  element.setAttribute("data-testid", "map-marker");
  element.setAttribute("data-establishment-id", id);
  element.setAttribute("aria-label", `Ver ${name}`);
  element.dataset.selected = "false";
  element.className =
    "group flex size-11 cursor-pointer items-center justify-center border-0 bg-transparent p-0 outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-carbon";
  element.style.zIndex = "5";
  element.innerHTML = PIN_MARKUP;
  setPlaceMarkerSelected(element, false);
  return element;
}

export function setPlaceMarkerSelected(
  element: HTMLElement,
  selected: boolean,
) {
  element.dataset.selected = selected ? "true" : "false";
  element.style.zIndex = selected ? "15" : "5";
  const pin = element.querySelector<HTMLElement>("[data-pin]");
  if (!pin) return;
  pin.style.transform = selected ? "scale(1.18)" : "";
  pin.style.filter = selected
    ? `drop-shadow(3px 3px 0 ${brand.colors.carbon})`
    : `drop-shadow(1px 1px 0 ${brand.colors.carbon})`;
}

export function createBlockLabelElement(name: string) {
  const element = document.createElement("div");
  element.setAttribute("data-testid", "map-block-label");
  element.setAttribute("aria-hidden", "true");
  element.textContent = name;
  element.className =
    "pointer-events-none rounded-pill border border-carbon/25 bg-cream px-2 py-1 font-display text-[11px] leading-none font-semibold text-carbon/70";
  return element;
}

export function createUserMarkerElement() {
  const element = document.createElement("div");
  element.setAttribute("data-testid", "map-user-marker");
  element.setAttribute("role", "img");
  element.setAttribute("aria-label", "Tu ubicación");
  element.className = "relative flex size-6 items-center justify-center";
  element.innerHTML = `
    <span class="absolute size-6 animate-ping rounded-pill bg-antojo/40"></span>
    <span class="relative size-4 rounded-pill border-2 border-carbon bg-antojo"></span>
  `;
  return element;
}
