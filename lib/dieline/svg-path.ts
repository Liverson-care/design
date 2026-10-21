import type { Pt } from "@/lib/types";

/**
 * Analyse un attribut SVG « d » et renvoie une liste de sous-chemins aplatis
 * (les courbes de Bézier et les arcs sont échantillonnés).
 */
export function parseSvgPath(d: string, curveSteps = 12): Pt[][] {
  const tokens = d.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g) ?? [];
  const paths: Pt[][] = [];
  let current: Pt[] = [];
  let i = 0;
  let cmd = "";
  let x = 0, y = 0, sx = 0, sy = 0;
  let lastCtrl: Pt | null = null;
  let lastCmd = "";

  const num = () => parseFloat(tokens[i++]);
  const hasNum = () => i < tokens.length && !/^[a-zA-Z]$/.test(tokens[i]);
  const push = (p: Pt) => current.push(p);
  const flush = () => {
    if (current.length > 1) paths.push(current);
    current = [];
  };

  while (i < tokens.length) {
    if (/^[a-zA-Z]$/.test(tokens[i])) cmd = tokens[i++];
    else if (!cmd) break;
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();

    switch (C) {
      case "M": {
        flush();
        x = (rel ? x : 0) + num();
        y = (rel ? y : 0) + num();
        sx = x; sy = y;
        push({ x, y });
        cmd = rel ? "l" : "L"; // coordonnées suivantes = lineto implicite
        lastCtrl = null;
        while (hasNum()) {
          x = (rel ? x : 0) + num();
          y = (rel ? y : 0) + num();
          push({ x, y });
        }
        break;
      }
      case "L":
        while (hasNum()) {
          x = (rel ? x : 0) + num();
          y = (rel ? y : 0) + num();
          push({ x, y });
        }
        lastCtrl = null;
        break;
      case "H":
        while (hasNum()) { x = (rel ? x : 0) + num(); push({ x, y }); }
        lastCtrl = null;
        break;
      case "V":
        while (hasNum()) { y = (rel ? y : 0) + num(); push({ x, y }); }
        lastCtrl = null;
        break;
      case "C":
      case "S":
        while (hasNum()) {
          let c1: Pt;
          if (C === "C") {
            c1 = { x: (rel ? x : 0) + num(), y: (rel ? y : 0) + num() };
          } else {
            c1 = lastCtrl && /[CS]/i.test(lastCmd) ? { x: 2 * x - lastCtrl.x, y: 2 * y - lastCtrl.y } : { x, y };
          }
          const c2 = { x: (rel ? x : 0) + num(), y: (rel ? y : 0) + num() };
          const e = { x: (rel ? x : 0) + num(), y: (rel ? y : 0) + num() };
          const s = { x, y };
          for (let k = 1; k <= curveSteps; k++) {
            const t = k / curveSteps, mt = 1 - t;
            push({
              x: mt ** 3 * s.x + 3 * mt * mt * t * c1.x + 3 * mt * t * t * c2.x + t ** 3 * e.x,
              y: mt ** 3 * s.y + 3 * mt * mt * t * c1.y + 3 * mt * t * t * c2.y + t ** 3 * e.y,
            });
          }
          lastCtrl = c2; lastCmd = C;
          x = e.x; y = e.y;
        }
        break;
      case "Q":
      case "T":
        while (hasNum()) {
          let c: Pt;
          if (C === "Q") c = { x: (rel ? x : 0) + num(), y: (rel ? y : 0) + num() };
          else c = lastCtrl && /[QT]/i.test(lastCmd) ? { x: 2 * x - lastCtrl.x, y: 2 * y - lastCtrl.y } : { x, y };
          const e = { x: (rel ? x : 0) + num(), y: (rel ? y : 0) + num() };
          const s = { x, y };
          for (let k = 1; k <= curveSteps; k++) {
            const t = k / curveSteps, mt = 1 - t;
            push({ x: mt * mt * s.x + 2 * mt * t * c.x + t * t * e.x, y: mt * mt * s.y + 2 * mt * t * c.y + t * t * e.y });
          }
          lastCtrl = c; lastCmd = C;
          x = e.x; y = e.y;
        }
        break;
      case "A":
        while (hasNum()) {
          const rx = Math.abs(num()), ry = Math.abs(num()), phi = (num() * Math.PI) / 180;
          const large = num() !== 0, sweep = num() !== 0;
          const ex = (rel ? x : 0) + num(), ey = (rel ? y : 0) + num();
          for (const p of arcPoints(x, y, rx, ry, phi, large, sweep, ex, ey, curveSteps * 2)) push(p);
          x = ex; y = ey;
          lastCtrl = null;
        }
        break;
      case "Z":
        x = sx; y = sy;
        push({ x, y });
        flush();
        current = [{ x, y }];
        lastCtrl = null;
        break;
      default:
        i++; // commande inconnue : on avance
    }
    if (C !== "C" && C !== "S" && C !== "Q" && C !== "T") lastCmd = C;
  }
  flush();
  return paths;
}

function arcPoints(x1: number, y1: number, rx: number, ry: number, phi: number, large: boolean, sweep: boolean, x2: number, y2: number, steps: number): Pt[] {
  if (rx === 0 || ry === 0) return [{ x: x2, y: y2 }];
  const cos = Math.cos(phi), sin = Math.sin(phi);
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
  const x1p = cos * dx + sin * dy, y1p = -sin * dx + cos * dy;
  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) { rx *= Math.sqrt(lambda); ry *= Math.sqrt(lambda); }
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  let coef = Math.sqrt(Math.max(0, num / den));
  if (large === sweep) coef = -coef;
  const cxp = (coef * rx * y1p) / ry, cyp = (-coef * ry * x1p) / rx;
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2, cy = sin * cxp + cos * cyp + (y1 + y2) / 2;
  const ang = (ux: number, uy: number, vx: number, vy: number) => {
    const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    return a;
  };
  const t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!sweep && dt > 0) dt -= 2 * Math.PI;
  if (sweep && dt < 0) dt += 2 * Math.PI;
  const pts: Pt[] = [];
  for (let k = 1; k <= steps; k++) {
    const t = t1 + (dt * k) / steps;
    pts.push({ x: cx + rx * Math.cos(t) * cos - ry * Math.sin(t) * sin, y: cy + rx * Math.cos(t) * sin + ry * Math.sin(t) * cos });
  }
  return pts;
}
