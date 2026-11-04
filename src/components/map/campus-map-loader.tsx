"use client";

import dynamic from "next/dynamic";

import { MapSkeleton } from "./map-skeleton";

const CampusMap = dynamic(
  () => import("./campus-map").then((module) => module.CampusMap),
  {
    ssr: false,
    loading: () => <MapSkeleton />,
  },
);

export function CampusMapLoader() {
  return <CampusMap />;
}
