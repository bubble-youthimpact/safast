/**
 * SAFAST alerts relay — Cloudflare Worker (optional)
 *
 * SAFAST calls NWS and GDACS straight from the browser. This relay is a backup
 * route for browsers that block those requests. It needs no API keys.
 *
 *   GET /nws?point=LAT,LON                 → NWS active alerts for a US point
 *   GET /gdacs?eventlist=…&fromDate=…      → GDACS event search (same query as the GDACS API)
 *   GET /gdacs-geometry?eventtype=…&eventid=…&episodeid=…  → GDACS affected-area polygons
 *   GET /fema-shelters?<ArcGIS query>      → FEMA open evacuation shelters
 *
 * Vars (wrangler.toml): ALLOWED_ORIGINS, e.g. "https://safast.app,https://www.safast.app"
 */

const UA = '(safast.app, staff.SAFAST@gmail.com)';
const GDACS = 'https://www.gdacs.org/gdacsapi/api';

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const allowed = (env.ALLOWED_ORIGINS || 'https://safast.app').split(',').map(s => s.trim());
    const origin = req.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0],
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Vary': 'Origin',
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'GET') return new Response('Method not allowed', { status: 405, headers: cors });

    let upstream, ttl;
    if (url.pathname === '/nws') {
      const point = (url.searchParams.get('point') || '').match(/^-?\d{1,2}(\.\d+)?,-?\d{1,3}(\.\d+)?$/);
      if (!point) return new Response('Bad point', { status: 400, headers: cors });
      upstream = `https://api.weather.gov/alerts/active?point=${point[0]}`;
      ttl = 60;
    } else if (url.pathname === '/gdacs') {
      const p = url.searchParams;
      const types = (p.get('eventlist') || 'TC;EQ;FL;VO;DR;WF').replace(/[^A-Z;]/g, '');
      const levels = (p.get('alertlevel') || 'Green;Orange;Red').replace(/[^A-Za-z;]/g, '');
      const date = v => /^\d{4}-\d{2}-\d{2}$/.test(v || '') ? v : null;
      const from = date(p.get('fromDate')), to = date(p.get('toDate'));
      if (!from || !to) return new Response('Bad dates', { status: 400, headers: cors });
      upstream = `${GDACS}/events/geteventlist/SEARCH?eventlist=${types}&alertlevel=${levels}&fromDate=${from}&toDate=${to}`;
      ttl = 600;
    } else if (url.pathname === '/gdacs-geometry') {
      const p = url.searchParams;
      const type = (p.get('eventtype') || '').replace(/[^A-Z]/g, '').slice(0, 2);
      const id = (p.get('eventid') || '').replace(/\D/g, '');
      const ep = (p.get('episodeid') || '').replace(/\D/g, '');
      if (!type || !id) return new Response('Bad event', { status: 400, headers: cors });
      upstream = `${GDACS}/polygons/getgeometry?eventtype=${type}&eventid=${id}${ep ? `&episodeid=${ep}` : ''}`;
      ttl = 1800;
    } else if (url.pathname === '/fema-shelters') {
      // FEMA Open Shelters (ArcGIS query) — the query string is passed through unchanged
      upstream = `https://gis.fema.gov/arcgis/rest/services/NSS/OpenShelters/FeatureServer/0/query${url.search}`;
      ttl = 300;
    } else {
      return new Response('Not found', { status: 404, headers: cors });
    }

    const r = await fetch(upstream, {
      headers: { 'User-Agent': UA, Accept: 'application/geo+json, application/json' },
      cf: { cacheTtl: ttl, cacheEverything: true },
    });
    const out = new Response(r.body, r);
    for (const [k, v] of Object.entries(cors)) out.headers.set(k, v);
    out.headers.set('Cache-Control', `public, max-age=${ttl}`);
    return out;
  },
};
