"use client";
import dynamic from "next/dynamic";

const HeroPreview = dynamic(() => import("@/components/HeroPreview").then((m) => m.HeroPreview), {
  ssr: false,
  loading: () => <div className="skeleton aspect-[5/4] w-full" />,
});

export function HeroLoader() {
  return <HeroPreview />;
}
