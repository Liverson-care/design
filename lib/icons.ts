// Pictogrammes vectoriels (repère 24 × 24) utilisables dans l'éditeur.
export interface IconDef {
  id: string;
  label: string;
  data: string;
}

export const ICONS: IconDef[] = [
  { id: "feuille", label: "Bio / naturel", data: "M5 21c0-9 6-15 16-16-1 10-7 16-16 16zm0 0c3-4 6-7 10-9" },
  { id: "flocon", label: "Surgelé", data: "M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7M9 4l3 2 3-2M9 20l3-2 3 2M4 10.5l3.5-.5L6 7M18 7l-1.5 3 3.5.5M4 13.5l3.5.5L6 17M18 17l-1.5-3 3.5-.5" },
  { id: "four", label: "Cuisson four", data: "M3 4h18v16H3zM3 8h18M7 6h.01M10 6h.01M7 12h10v5H7z" },
  { id: "micro-ondes", label: "Micro-ondes", data: "M2 5h20v14H2zM5 8h11v8H5zM19 9v.01M19 12v.01M19 15h.01" },
  { id: "poele", label: "Poêle", data: "M3 12a7 7 0 0 0 14 0H3zm14 0h5" },
  { id: "france", label: "Origine France", data: "M3 5h6v14H3zM9 5h6v14H9zM15 5h6v14h-6z" },
  { id: "etoile", label: "Qualité", data: "M12 2l3 6.5 7 .8-5.2 4.8 1.5 7-6.3-3.6-6.3 3.6 1.5-7L2 9.3l7-.8z" },
  { id: "coeur", label: "Recette aimée", data: "M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6-8 11-8 11z" },
  { id: "poisson", label: "Pêche durable", data: "M2 12c4-6 11-6 16 0-5 6-12 6-16 0zm16 0l4-4v8zM7 11h.01" },
  { id: "ble", label: "Céréales", data: "M12 22V8M12 8c-2-1-3-3-3-6 2 1 3 3 3 6zm0 0c2-1 3-3 3-6-2 1-3 3-3 6zM12 13c-2-1-4-1-5-3 2 0 4 1 5 3zm0 0c2-1 4-1 5-3-2 0-4 1-5 3zM12 18c-2-1-4-1-5-3 2 0 4 1 5 3zm0 0c2-1 4-1 5-3-2 0-4 1-5 3z" },
  { id: "chef", label: "Recette du chef", data: "M6 13a4 4 0 0 1 1-7.9A5 5 0 0 1 17 5a4 4 0 0 1 1 8v7H6zM6 17h12" },
  { id: "recyclage", label: "Recyclable", data: "M7 19H4l3-5M17 19h3l-3-5M9.5 5.5L12 2l2.5 3.5M7 14l-3 5h6M17 14l3 5h-6M10 8l2-3 2 3M8 12l-1 2M16 12l1 2" },
  { id: "flamme", label: "Grillé", data: "M12 22c4 0 7-3 7-7 0-5-5-7-5-12-3 2-5 5-5 8-1-1-2-2-2-4-2 2-2 5-2 8 0 4 3 7 7 7z" },
  { id: "horloge", label: "Prêt en 10 min", data: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2" },
  { id: "enfant", label: "Enfants", data: "M12 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM7 22l1-8-3-3 3-2h8l3 2-3 3 1 8" },
  { id: "muscle", label: "Riche en protéines", data: "M4 15c2-6 5-9 8-9l2 2-3 2c2 0 5 1 7 4 1 2 0 5-3 5H8c-3 0-5-2-4-4z" },
];

export function icon(id: string): IconDef {
  return ICONS.find((i) => i.id === id) ?? ICONS[0];
}
