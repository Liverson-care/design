import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function make(paths: string, displayName: string) {
  const C = ({ size = 18, ...props }: P) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      {paths.split("|").map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
  C.displayName = displayName;
  return C;
}

export const IconUpload = make("M12 16V4|M7 9l5-5 5 5|M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3", "IconUpload");
export const IconSparkles = make("M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z|M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z|M5 2l.6 1.4L7 4l-1.4.6L5 6l-.6-1.4L3 4l1.4-.6z", "IconSparkles");
export const IconBox = make("M21 8l-9-5-9 5 9 5 9-5z|M3 8v8l9 5 9-5V8|M12 13v8", "IconBox");
export const IconLayers = make("M12 3l9 5-9 5-9-5 9-5z|M3 13l9 5 9-5|M3 17.5l9 5 9-5", "IconLayers");
export const IconDownload = make("M12 4v12|M7 11l5 5 5-5|M4 20h16", "IconDownload");
export const IconLock = make("M6 11h12v10H6z|M8 11V7a4 4 0 0 1 8 0v4", "IconLock");
export const IconCheck = make("M5 12.5l4.5 4.5L19 7.5", "IconCheck");
export const IconAlert = make("M12 3l10 18H2L12 3z|M12 10v5|M12 18h.01", "IconAlert");
export const IconX = make("M6 6l12 12|M18 6L6 18", "IconX");
export const IconZoom = make("M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z|M21 21l-5-5|M11 8v6|M8 11h6", "IconZoom");
export const IconCompare = make("M12 3v18|M4 6h5v12H4z|M15 6h5v12h-5z", "IconCompare");
export const IconEdit = make("M4 20h4L19 9l-4-4L4 16v4z|M14 6l4 4", "IconEdit");
export const IconGrid = make("M4 4h7v7H4z|M13 4h7v7h-7z|M4 13h7v7H4z|M13 13h7v7h-7z", "IconGrid");
export const IconCrown = make("M3 8l4 4 5-7 5 7 4-4-2 11H5L3 8z", "IconCrown");
export const IconChevronRight = make("M9 6l6 6-6 6", "IconChevronRight");
export const IconChevronLeft = make("M15 6l-6 6 6 6", "IconChevronLeft");
export const IconType = make("M5 6V4h14v2|M12 4v16|M9 20h6", "IconType");
export const IconImage = make("M4 5h16v14H4z|M4 16l5-5 4 4 3-3 4 4|M15 9h.01", "IconImage");
export const IconPalette = make("M12 21a9 9 0 1 1 9-9c0 2-1.5 3-3.5 3H15a2 2 0 0 0-1.5 3.3A1.6 1.6 0 0 1 12 21z|M7.5 11h.01|M10 7h.01|M15 7h.01", "IconPalette");
export const IconUndo = make("M9 14L4 9l5-5|M4 9h10a6 6 0 0 1 0 12h-3", "IconUndo");
export const IconRedo = make("M15 14l5-5-5-5|M20 9H10a6 6 0 0 0 0 12h3", "IconRedo");
export const IconTrash = make("M4 7h16|M10 11v6|M14 11v6|M6 7l1 13h10l1-13|M9 7V4h6v3", "IconTrash");
export const IconPlus = make("M12 5v14|M5 12h14", "IconPlus");
export const IconEye = make("M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z|M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "IconEye");
export const IconSave = make("M5 4h11l3 3v13H5z|M8 4v5h7V4|M8 14h8v6H8z", "IconSave");
export const IconLibrary = make("M4 4h4v16H4z|M10 4h4v16h-4z|M16 5l3.5-1 2.5 15-3.5 1z", "IconLibrary");
export const IconFolder = make("M3 6h6l2 2h10v11H3z", "IconFolder");
export const IconShield = make("M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z|M9 12l2 2 4-4", "IconShield");
export const IconRuler = make("M3 17L17 3l4 4L7 21z|M7 13l2 2|M10 10l2 2|M13 7l2 2", "IconRuler");
export const IconShape = make("M4 4h8v8H4z|M17 21a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "IconShape");
export const IconFront = make("M4 4h10v10H4z|M10 10h10v10H10z", "IconFront");
export const IconRotate = make("M20 11a8 8 0 1 0-2.3 5.7|M20 4v7h-7", "IconRotate");
export const IconUser = make("M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z|M4 21a8 8 0 0 1 16 0", "IconUser");
export const IconStore = make("M3 9l2-5h14l2 5|M3 9h18v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z|M5 13v8h14v-8", "IconStore");
