/*
 * Carregamento e indexação do mapa-múndi.
 * O JSON é gerado por scripts/build-map.cjs (países, províncias e adjacências).
 */

let MAP = null;
let loading = null;

export async function loadMap() {
  if (MAP) return MAP;
  if (loading) return loading;
  loading = fetch(new URL('../data/worldmap.json', import.meta.url)).then((r) => r.json()).then((data) => {
 MAP = indexMap(data);
 return MAP;
    });
  return loading;
}

export function setMap(data) {
  MAP = indexMap(data);
  return MAP;
}

export function getMap() {
  return MAP;
}

function indexMap(data) {
  const countries = data.countries.map((c, i) => {
    const pts = (c.outline || '').match(/-?\d+(\.\d+)?/g) || [];
    return {...c, i, provinces: [] };
  });

  const provinceOfCountry = new Map();

  const provinces = data.provinces.map((p, i) => {
    const prov = {
 i,
 id: p.id,
 name: p.n,
 country: p.c,
 path: p.p,
 x: p.x,
 y: p.y,
 bbox: p.b,
 area: p.a,
 capital:!!p.cap,
 neighbors: [],
    };
    countries[p.c].provinces.push(i);
    if (!provinceOfCountry.has(p.c)) provinceOfCountry.set(p.c, []);
    provinceOfCountry.get(p.c).push(i);
    return prov;
  });

  for (const [a, b] of data.adj) {
    if (provinces[a] && provinces[b]) {
 provinces[a].neighbors.push(b);
 provinces[b].neighbors.push(a);
    }
  }

  // países vizinhos (derivados das províncias)
  const countryNeighbors = countries.map(() => new Set());
  for (const prov of provinces) {
    for (const n of prov.neighbors) {
 const other = provinces[n].country;
 if (other!== prov.country) {
 countryNeighbors[prov.country].add(other);
 countryNeighbors[other].add(prov.country);
 }
    }
  }

  // ordena vizinhos por ângulo (útil para escolher alvos)
  for (const prov of provinces) {
    prov.neighbors.sort((a, b) => provinces[a].x - provinces[b].x);
  }

  return {
    width: data.width,
    height: data.height,
    countries,
    provinces,
    countryNeighbors: countryNeighbors.map((s) => [...s]),
    provinceOfCountry,
    totals: {
 provinces: provinces.length,
 countries: countries.length,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Geometria auxiliar */
/* ------------------------------------------------------------------ */

export function pointInProvince(map, prov, x, y) {
  const [x0, y0, x1, y1] = prov.bbox;
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  try {
    const ctx = scratchCtx();
    const path = path2d(prov);
    if (!ctx || !path || typeof ctx.isPointInPath !== 'function') throw new Error('sem canvas');
    return ctx.isPointInPath(path, x, y);
  } catch (e) {
    return true; // ambientes sem canvas (testes): usa a bbox
  }
}

let _ctx = null;
let _paths = new WeakMap();

function scratchCtx() {
  if (!_ctx) {
    const canvas = typeof OffscreenCanvas!== 'undefined'? new OffscreenCanvas(1, 1): document.createElement('canvas');
    _ctx = canvas.getContext('2d');
  }
  return _ctx;
}

export function path2d(prov) {
  if (typeof Path2D === 'undefined') return null;
  let p = _paths.get(prov);
  if (!p) {
    p = new Path2D(prov.path);
    _paths.set(prov, p);
  }
  return p;
}

export function findProvinceAt(map, x, y) {
  // busca por bbox, do menor para o maior (províncias pequenas primeiro)
  let best = null;
  let bestArea = Infinity;
  for (const prov of map.provinces) {
    const [x0, y0, x1, y1] = prov.bbox;
    if (x < x0 || x > x1 || y < y0 || y > y1) continue;
    if (prov.area < bestArea && pointInProvince(map, prov, x, y)) {
 best = prov;
 bestArea = prov.area;
    }
  }
  return best;
}

export function provinceCenter(map, i) {
  const p = map.provinces[i];
  return { x: p.x, y: p.y };
}
