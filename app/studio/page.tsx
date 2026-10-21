import type { Metadata } from "next";
import { StudioLoader } from "./StudioLoader";

export const metadata: Metadata = { title: "Studio" };

export default function StudioPage() {
  return <StudioLoader />;
}
