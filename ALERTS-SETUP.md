# SAFAST alerts — how they work

SAFAST asks for the user's location on first visit, refreshes it each time the app opens, and checks these sources for that exact spot every 5 minutes. **No API keys are needed.**

| Source | What it covers | Where |
|---|---|---|
| **GDACS** (UN / European Commission) | Tropical cyclones, earthquakes, floods, volcanoes, droughts and wildfires, rated Green / Orange / Red by expected impact on people. An event becomes an alert only when it is near the user (cyclones ~900 km, droughts ~500 km, earthquakes ~400 km, floods ~300 km, volcanoes ~150 km, wildfires ~120 km; wider for Orange and Red). All current events also feed "Happening now" on the Disasters page and the Worldwide map. | Worldwide |
| **NWS** (US National Weather Service) | Every official warning, watch and advisory for the user's point, plus civil emergency, evacuation and shelter-in-place messages NWS relays. Warning areas are drawn on the map. | US only |
| **FEMA Open Shelters** (with the American Red Cross) | Evacuation centers that are open now within 75 miles: name, address, capacity and headcount, hours, pets, wheelchair access. Shown as green pins and cards on the Map page with Directions. When none are open, the page says so and links to the Red Cross shelter finder. | US only |
| **USGS** | Earthquakes M2.5+ in the last 24 h near the user. If GDACS already lists the same quake, the GDACS one is shown. | Worldwide |

Alert levels: NWS Warning / GDACS Red → **Warning**, NWS Watch / GDACS Orange → **Watch**, everything else → **Advisory**.

The Map page has an "Alert sources" panel showing each source as connected or unavailable.

## Optional backup relay

NWS, GDACS and FEMA are called straight from the browser. If a browser ever blocks those requests (the sources panel will show "unavailable" while other sources work), deploy the relay in `/worker` — it needs no keys:

1. Cloudflare dashboard → Workers & Pages → Create Worker `safast-alerts` → paste `worker/alerts-relay.js` → Deploy.
2. Add a text variable `ALLOWED_ORIGINS` = `https://safast.app,https://www.safast.app`.
3. In `index.html` set `const ALERT_RELAY = 'https://safast-alerts.YOURNAME.workers.dev';`

## Notifications

"Notify me" shows a system notification when a new alert appears **while SAFAST is open** (including in a background tab). Notifications when the app is fully closed need push messaging (Firebase Cloud Messaging + a service worker); on iPhone that also requires adding SAFAST to the home screen.
