#!/usr/bin/env node
/*
 * Gera o mapa-múndi do NationZero (províncias + países + adjacências).
 *
 * Entrada : world-atlas (TopoJSON), world-countries, country-json
 * Saída   : www/src/data/worldmap.json
 *
 * Uso: npm run build:map
 */

const fs = require('node:fs');
const path = require('node:path');
const topojson = require('topojson-client');
const { geoNaturalEarth1, geoPath } = require('d3-geo');
const pc = require('polygon-clipping');
const wc = require('world-countries');
const pops = require('country-json/src/country-by-population.json');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'www', 'src', 'data', 'worldmap.json');
const WIDTH = 2000;
const HEIGHT = 1000;
const CELL = 20; // tamanho da célula da grade que recorta as províncias (px)

/* ------------------------------------------------------------------ */
/* Metadados dos países                                                */
/* ------------------------------------------------------------------ */

const byCcn3 = new Map();
for (const c of wc) if (c.ccn3) byCcn3.set(String(Number(c.ccn3)), c);

const popByName = new Map(pops.map((p) => [p.country.toLowerCase(), p.population]));

// PIB per capita aproximado (US$) para calibrar o índice de desenvolvimento
const GDPC = {
  USA: 76000, CAN: 55000, MEX: 11500, BRA: 8900, ARG: 13700, CHL: 15400, COL: 6600, PER: 7100,
  VEN: 3500, ECU: 6400, BOL: 3700, PRY: 5900, URY: 20200, GUY: 9000, SUR: 7000,
  GBR: 46000, FRA: 44000, DEU: 51000, ITA: 35000, ESP: 30000, PRT: 24500, NLD: 57000,
  BEL: 51000, CHE: 92000, AUT: 52000, SWE: 56000, NOR: 87000, DNK: 68000, FIN: 53000,
  IRL: 103000, POL: 18000, CZE: 27000, HUN: 18700, ROU: 15800, GRC: 20800, BGR: 13500,
  SRB: 9500, HRV: 18500, SVN: 29000, SVK: 21000, UKR: 4800, BLR: 7300, RUS: 12000,
  TUR: 10600, ISR: 55000, SAU: 32000, ARE: 49000, QAT: 84000, KWT: 32000, IRN: 4400,
  IRQ: 5900, SYR: 1200, JOR: 4600, LBN: 3800, YEM: 650, OMN: 23000, AZE: 5400,
  GEO: 6600, ARM: 7000, KAZ: 11200, UZB: 2300, TKM: 8500, KGZ: 1600, TJK: 1100,
  AFG: 400, PAK: 1600, IND: 2400, BGD: 2700, LKA: 3800, NPL: 1300, BTN: 3700,
  CHN: 12700, JPN: 34000, KOR: 33000, PRK: 700, TWN: 33000, MNG: 4400, VNM: 4200,
  THA: 7300, MYS: 12000, SGP: 82000, IDN: 4800, PHL: 3600, KHM: 1800, LAO: 2600,
  MMR: 1200, AUS: 64000, NZL: 48000, PNG: 2700, FJI: 5300, SLB: 2300, VUT: 3000,
  NCL: 34000, ZAF: 6800, NGA: 2100, EGY: 4300, DZA: 4300, MAR: 3700, TUN: 4200,
  LBY: 6300, SDN: 800, ETH: 1000, KEN: 2100, TZA: 1200, UGA: 900, GHA: 2400,
  CIV: 2500, CMR: 1600, SEN: 1700, MLI: 900, NER: 600, TCD: 700, SOM: 500,
  MOZ: 500, ZMB: 1300, ZWE: 1700, AGO: 2400, COD: 650, COG: 2300, GAB: 8000,
  GNQ: 7000, BWA: 7700, NAM: 5000, ZAF2: 0, MDG: 500, MWI: 500, RWA: 800,
  ISL: 74000, LUX: 126000, MLT: 33000, CYP: 32000, EST: 27000, LVA: 21000, LTU: 24000,
  ALB: 6800, MKD: 6700, BIH: 7600, MNE: 9500, MDA: 5700, KOS: 5000,
  CUB: 9500, DOM: 10200, HTI: 1700, JAM: 6000, PRI: 35000, GTM: 5000, HND: 2800,
  SLV: 4600, NIC: 2200, CRI: 16000, PAN: 17000, BHS: 33000, BRB: 20000, TTO: 17000,
  GRD: 12000, LCA: 12000, VCT: 12000, ATG: 18000, DMA: 9000, BLZ: 6000,
  TLS: 1600, BRN: 31000, MDV: 13000, PNG2: 0, NRU: 12000, PLW: 14000, FSM: 3500,
  MHL: 4000, KIR: 1700, TON: 5000, WSM: 4000, TUV: 4500, STP: 2000, CPV: 3600,
  COM: 1400, MUS: 11000, SYC: 15000, DJI: 3000, ERI: 600, GMB: 800, GNB: 800,
  SLE: 500, LBR: 700, TGO: 900, BEN: 1300, BFA: 900, GIN: 1200, CAF: 500,
  SSD: 400, LSO: 1200, SWZ: 4000, NAM2: 0, GAB2: 0, BDI: 250, ETH2: 0, ESH: 1600,
};

const REGION_DEV = {
  Europe: 62, 'Northern America': 72, 'South America': 42, 'Central America': 38,
  Caribbean: 36, Asia: 44, 'South-Eastern Asia': 40, Africa: 26, Oceania: 50,
  Americas: 45,
};

const REGION_PT = {
  Europe: 'Europa',
  'Northern America': 'América do Norte',
  'South America': 'América do Sul',
  'Central America': 'América Central',
  Caribbean: 'Caribe',
  Asia: 'Ásia',
  'South-Eastern Asia': 'Sudeste Asiático',
  Africa: 'África',
  Oceania: 'Oceania',
  Americas: 'Américas',
  Antarctica: 'Antártida',
};

function devIndex(c) {
  const gdpc = GDPC[c.cca3];
  if (gdpc) return Math.max(5, Math.min(100, Math.round(12 + Math.log10(gdpc) * 20 - 20)));
  const base = REGION_DEV[c.subregion] ?? REGION_DEV[c.region] ?? 35;
  return Math.max(8, Math.min(90, base));
}

/* ------------------------------------------------------------------ */
/* Topologia                                                           */
/* ------------------------------------------------------------------ */

const topo = require('world-atlas/countries-110m.json');
const geo = topojson.feature(topo, topo.objects.countries);
const neighbors = topojson.neighbors(topo.objects.countries.geometries);

const features = geo.features
  .map((f, i) => ({ f, i }))
  .filter(({ f }) => String(f.id) !== '010') // sem Antártida
  .filter(({ f }) => f.geometry); // sem geometria vazia

const idxMap = new Map(features.map(({ i }, k) => [i, k]));

const projection = geoNaturalEarth1().fitExtent(
  [[12, 12], [WIDTH - 12, HEIGHT - 12]],
  { type: 'FeatureCollection', features: features.map((x) => x.f) }
);
const pathGen = geoPath(projection);

/* ------------------------------------------------------------------ */
/* Províncias por recorte da grade                                     */
/* ------------------------------------------------------------------ */

const round = (n) => Math.round(n * 10) / 10;

function ringToPath(rings) {
  let d = '';
  for (const ring of rings) {
    ring.forEach((pt, i) => {
      d += `${i === 0 ? 'M' : 'L'}${round(pt[0])} ${round(pt[1])}`;
      // fecha automaticamente no fim
    });
    d += 'Z';
  }
  return d;
}

function areaOf(rings) {
  // área aproximada (shoelace) do anel externo
  let a = 0;
  const r = rings[0];
  for (let i = 0; i < r.length; i++) {
    const [x1, y1] = r[i];
    const [x2, y2] = r[(i + 1) % r.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a / 2);
}

function polyBBox(rings) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const ring of rings) for (const [x, y] of ring) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return [minX, minY, maxX, maxY];
}

const provinces = [];
const countries = [];

features.forEach(({ f }) => {
  const meta = byCcn3.get(String(Number(f.id))) || {};
  // ignora territórios sem soberania reconhecida (sem ISO ou sem nome)
  if (!meta.cca2 && !meta.name?.common) return;
  if (/antarctica/i.test(meta.name?.common || '')) return;
  const iso2 = meta.cca2 || '';
  const iso3 = meta.cca3 || '';
  const namePt = meta.translations?.por?.common || meta.name?.common || `Região ${f.id}`;
  const pop = popByName.get((meta.name?.common || '').toLowerCase()) || 0;

  // geometria em coordenadas de tela
  const polys = [];
  if (f.geometry.type === 'Polygon') polys.push(f.geometry.coordinates);
  else if (f.geometry.type === 'MultiPolygon') polys.push(...f.geometry.coordinates);

  const projected = polys.map((poly) => poly.map((ring) => ring.map((pt) => projection(pt)).filter(Boolean)));

  const bbox = polyBBox(projected.flat());
  const [bx0, by0, bx1, by1] = bbox;

  // número de células proporcional ao tamanho, mínimo 1
  const w = bx1 - bx0;
  const h = by1 - by0;
  const cellsX = Math.max(1, Math.round(w / CELL));
  const cellsY = Math.max(1, Math.round(h / CELL));

  const cid = String(Number(f.id));
  const countryProvs = [];

  for (let gy = 0; gy < cellsY; gy++) {
    for (let gx = 0; gx < cellsX; gx++) {
      const x0 = bx0 + (w * gx) / cellsX;
      const x1 = bx0 + (w * (gx + 1)) / cellsX;
      const y0 = by0 + (h * gy) / cellsY;
      const y1 = by0 + (h * (gy + 1)) / cellsY;
      const clipBox = [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]];

      let clipped = null;
      try {
        clipped = pc.intersection(projected, clipBox);
      } catch (err) {
        clipped = null;
      }
      if (!clipped || !clipped.length) continue;

      for (const poly of clipped) {
        const outer = poly[0];
        if (!outer || outer.length < 4) continue;
        const area = areaOf(poly);
        if (area < 7) continue; // descarta lascas minúsculas
        const bb = polyBBox(poly);
        const cx = (bb[0] + bb[2]) / 2;
        const cy = (bb[1] + bb[3]) / 2;
        countryProvs.push({
          cid, name: namePt, iso2, iso3, region: meta.region || '',
          sub: meta.subregion || '',
          path: ringToPath(poly),
          x: round(cx), y: round(cy),
          b: [round(bb[0]), round(bb[1]), round(bb[2]), round(bb[3])],
          a: Math.round(area),
        });
      }
    }
  }

  // Se o recorte falhou (país minúsculo), usa o polígono inteiro como 1 província
  if (!countryProvs.length) {
    for (const poly of projected) {
      const bb = polyBBox(poly);
      countryProvs.push({
        cid, name: namePt, iso2, iso3, region: meta.region || '', sub: meta.subregion || '',
        path: ringToPath(poly), x: round((bb[0] + bb[2]) / 2), y: round((bb[1] + bb[3]) / 2),
        b: bb.map(round), a: Math.round(areaOf(poly)),
      });
    }
  }

  countryProvs.forEach((p, i) => {
    provinces.push({
      ...p,
      pid: `${cid}-${i}`,
      capital: i === 0,
    });
  });

  countries.push({
    cid, iso2, iso3,
    name: namePt,
    nameEn: meta.name?.common || namePt,
    region: meta.region || '',
    regionPt: REGION_PT[meta.subregion] || REGION_PT[meta.region] || '—',
    sub: meta.subregion || '',
    pop: Math.max(60000, pop),
    area: meta.area || 0,
    dev: devIndex(meta),
    ll: meta.latlng || [0, 0],
    provinces: countryProvs.length,
    bbox: bbox.map(round),
    // contorno do país (para bordas)
    outline: pathGen(f),
  });
});

/* ------------------------------------------------------------------ */
/* Adjacência                                                          */
/* ------------------------------------------------------------------ */

const provIndex = new Map(provinces.map((p, i) => [p.pid, i]));
const adj = new Set();
const addAdj = (a, b) => {
  if (a === b) return;
  const k = a < b ? `${a},${b}` : `${b},${a}`;
  adj.add(k);
};

// 1) províncias do mesmo país: vizinhas por proximidade de bbox
const byCountry = new Map();
provinces.forEach((p, i) => {
  if (!byCountry.has(p.cid)) byCountry.set(p.cid, []);
  byCountry.get(p.cid).push(i);
});

const near = (a, b, tol) =>
  a.b[0] - tol <= b.b[2] && b.b[0] - tol <= a.b[2] &&
  a.b[1] - tol <= b.b[3] && b.b[1] - tol <= a.b[3];

for (const list of byCountry.values()) {
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = provinces[list[i]];
      const b = provinces[list[j]];
      if (near(a, b, 4)) addAdj(list[i], list[j]);
    }
  }
}

// 2) países vizinhos (topojson): conecta as províncias mais próximas das fronteiras
const countryProvs = new Map();
provinces.forEach((p, i) => {
  if (!countryProvs.has(p.cid)) countryProvs.set(p.cid, []);
  countryProvs.get(p.cid).push(i);
});

features.forEach(({ f, i }) => {
  const cidA = String(Number(f.id));
  for (const ni of neighbors[i]) {
    if (!idxMap.has(ni)) continue;
    const cidB = String(Number(geo.features[ni].id));
    if (cidA >= cidB) continue;
    const listA = countryProvs.get(cidA) || [];
    const listB = countryProvs.get(cidB) || [];
    // pega até 6 pares de províncias fronteiriças mais próximas
    const pairs = [];
    for (const ia of listA) {
      for (const ib of listB) {
        const a = provinces[ia];
        const b = provinces[ib];
        if (!near(a, b, 26)) continue;
        const d = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
        pairs.push([d, ia, ib]);
      }
    }
    pairs.sort((x, y) => x[0] - y[0]);
    const take = Math.min(8, Math.max(1, Math.floor(Math.min(listA.length, listB.length))));
    for (const [, ia, ib] of pairs.slice(0, take)) addAdj(ia, ib);
  }
});

// 3) vizinhança marítima: países sem fronteira com vizinhos recebem os 2 países mais próximos
const hasAdj = new Set();
for (const k of adj) {
  const [a] = k.split(',').map(Number);
  hasAdj.add(provinces[a].cid);
}
const cidList = [...byCountry.keys()];
for (const cid of cidList) {
  const list = byCountry.get(cid);
  const anyBorder = list.some((i) => [...adj].some((k) => {
    const [a, b] = k.split(',').map(Number);
    return (a === i && provinces[b].cid !== cid) || (b === i && provinces[a].cid !== cid);
  }));
  if (anyBorder) continue;
  const center = { x: provinces[list[0]].x, y: provinces[list[0]].y };
  const others = cidList
    .filter((o) => o !== cid)
    .map((o) => {
      const p = provinces[byCountry.get(o)[0]];
      return { o, d: (p.x - center.x) ** 2 + (p.y - center.y) ** 2 };
    })
    .sort((a, b) => a.d - b.d)
    .slice(0, 3);
  for (const { o } of others) addAdj(list[0], byCountry.get(o)[0]);
}

/* ------------------------------------------------------------------ */
/* Saída                                                               */
/* ------------------------------------------------------------------ */

const out = {
  width: WIDTH,
  height: HEIGHT,
  generatedAt: new Date().toISOString(),
  countries: countries.map((c, i) => ({ ...c, i })),
  provinces: provinces.map((p, i) => ({
    i,
    id: p.pid,
    c: countries.findIndex((x) => x.cid === p.cid),
    n: p.name,
    p: p.path,
    x: p.x,
    y: p.y,
    b: p.b,
    a: p.a,
    cap: p.capital,
  })),
  adj: [...adj].map((k) => k.split(',').map(Number)),
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out));

const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
console.log(`Mapa gerado: ${out.provinces.length} províncias, ${out.countries.length} países, ${out.adj.length} conexões — ${kb} KB`);
console.log(`→ ${path.relative(ROOT, OUT)}`);
