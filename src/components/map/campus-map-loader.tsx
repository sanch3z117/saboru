"use client";

import dynamic from "next/dynamic";

import type { CampusMapProps } from "./campus-map";
import { MapSkeleton } from "./map-skeleton";

const CampusMap = dynamic<CampusMapProps>(
  () => import("./campus-map").then((module) => module.CampusMap),
  {
    ssr: false,
    loading: () => <MapSkeleton />,
  },
);

export function CampusMapLoader(props: CampusMapProps) {
  return <CampusMap {...props} />;
}
