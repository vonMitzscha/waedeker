/**
 * Privacy-friendly initial map view derived from the browser's timezone.
 * No network request, no permission dialog, no personal data transmitted.
 */

interface LocaleView {
  center: [number, number]; // [lng, lat]
  zoom: number;
}

// Timezone → country center + zoom
// Zoom 3–4 = continent, 5–6 = large country, 7 = small country
const TIMEZONE_MAP: Record<string, LocaleView> = {
  // Germany
  'Europe/Berlin':        { center: [10.45, 51.16], zoom: 5 },
  'Europe/Busingen':      { center: [10.45, 51.16], zoom: 5 },
  // Austria
  'Europe/Vienna':        { center: [14.55, 47.52], zoom: 6 },
  // Switzerland
  'Europe/Zurich':        { center: [8.23, 46.80], zoom: 7 },
  // France
  'Europe/Paris':         { center: [2.21, 46.23], zoom: 5 },
  // UK & Ireland
  'Europe/London':        { center: [-2.00, 54.00], zoom: 5 },
  'Europe/Dublin':        { center: [-8.00, 53.00], zoom: 6 },
  // Benelux
  'Europe/Amsterdam':     { center: [5.30, 52.37], zoom: 7 },
  'Europe/Brussels':      { center: [4.47, 50.50], zoom: 7 },
  'Europe/Luxembourg':    { center: [6.13, 49.82], zoom: 8 },
  // Scandinavia
  'Europe/Copenhagen':    { center: [10.00, 56.00], zoom: 6 },
  'Europe/Stockholm':     { center: [15.00, 62.00], zoom: 4 },
  'Europe/Oslo':          { center: [14.00, 65.00], zoom: 4 },
  'Europe/Helsinki':      { center: [26.00, 64.00], zoom: 4 },
  // Southern Europe
  'Europe/Madrid':        { center: [-3.70, 40.00], zoom: 5 },
  'Europe/Lisbon':        { center: [-8.22, 39.40], zoom: 6 },
  'Europe/Rome':          { center: [12.50, 42.50], zoom: 5 },
  'Europe/Athens':        { center: [21.82, 39.07], zoom: 6 },
  // Central & Eastern Europe
  'Europe/Warsaw':        { center: [20.00, 52.00], zoom: 5 },
  'Europe/Prague':        { center: [15.50, 50.00], zoom: 6 },
  'Europe/Budapest':      { center: [19.50, 47.16], zoom: 6 },
  'Europe/Bratislava':    { center: [19.70, 48.67], zoom: 7 },
  'Europe/Ljubljana':     { center: [14.99, 46.15], zoom: 7 },
  'Europe/Zagreb':        { center: [15.97, 45.10], zoom: 6 },
  'Europe/Bucharest':     { center: [24.97, 45.94], zoom: 5 },
  'Europe/Sofia':         { center: [25.49, 42.73], zoom: 6 },
  'Europe/Belgrade':      { center: [21.00, 44.02], zoom: 6 },
  'Europe/Sarajevo':      { center: [17.68, 44.00], zoom: 7 },
  'Europe/Skopje':        { center: [21.74, 41.61], zoom: 7 },
  'Europe/Tirane':        { center: [20.17, 41.15], zoom: 7 },
  'Europe/Podgorica':     { center: [19.37, 42.71], zoom: 7 },
  'Europe/Riga':          { center: [25.00, 57.00], zoom: 6 },
  'Europe/Tallinn':       { center: [25.30, 58.60], zoom: 6 },
  'Europe/Vilnius':       { center: [24.00, 55.50], zoom: 6 },
  'Europe/Kaliningrad':   { center: [20.50, 54.70], zoom: 7 },
  'Europe/Kyiv':          { center: [31.17, 48.38], zoom: 5 },
  'Europe/Minsk':         { center: [27.95, 53.71], zoom: 6 },
  'Europe/Moscow':        { center: [40.00, 58.00], zoom: 4 },
  'Europe/Istanbul':      { center: [35.24, 38.96], zoom: 5 },
  // Americas
  'America/New_York':     { center: [-98.58, 39.83], zoom: 3 },
  'America/Chicago':      { center: [-98.58, 39.83], zoom: 3 },
  'America/Denver':       { center: [-105.78, 39.32], zoom: 3 },
  'America/Los_Angeles':  { center: [-119.42, 37.16], zoom: 4 },
  'America/Phoenix':      { center: [-111.09, 34.05], zoom: 5 },
  'America/Anchorage':    { center: [-153.37, 64.20], zoom: 4 },
  'Pacific/Honolulu':     { center: [-157.50, 21.50], zoom: 7 },
  'America/Toronto':      { center: [-96.80, 56.13], zoom: 3 },
  'America/Vancouver':    { center: [-96.80, 56.13], zoom: 3 },
  'America/Winnipeg':     { center: [-96.80, 56.13], zoom: 3 },
  'America/Halifax':      { center: [-96.80, 56.13], zoom: 3 },
  'America/Mexico_City':  { center: [-102.55, 23.63], zoom: 4 },
  'America/Bogota':       { center: [-74.30, 4.57], zoom: 5 },
  'America/Lima':         { center: [-75.02, -9.19], zoom: 5 },
  'America/Santiago':     { center: [-71.54, -35.68], zoom: 4 },
  'America/Sao_Paulo':    { center: [-51.93, -14.24], zoom: 3 },
  'America/Argentina/Buenos_Aires': { center: [-63.62, -38.42], zoom: 4 },
  'America/Caracas':      { center: [-66.59, 6.42], zoom: 5 },
  // Asia
  'Asia/Tokyo':           { center: [138.25, 36.20], zoom: 4 },
  'Asia/Seoul':           { center: [127.77, 35.91], zoom: 5 },
  'Asia/Shanghai':        { center: [104.19, 35.86], zoom: 3 },
  'Asia/Hong_Kong':       { center: [114.18, 22.32], zoom: 8 },
  'Asia/Singapore':       { center: [103.82, 1.36], zoom: 9 },
  'Asia/Taipei':          { center: [121.00, 23.70], zoom: 6 },
  'Asia/Bangkok':         { center: [100.99, 15.87], zoom: 5 },
  'Asia/Jakarta':         { center: [117.00, -2.55], zoom: 4 },
  'Asia/Kolkata':         { center: [78.96, 20.59], zoom: 4 },
  'Asia/Karachi':         { center: [67.00, 30.00], zoom: 5 },
  'Asia/Dhaka':           { center: [90.36, 23.68], zoom: 6 },
  'Asia/Colombo':         { center: [80.77, 7.87], zoom: 7 },
  'Asia/Kathmandu':       { center: [84.12, 28.39], zoom: 7 },
  'Asia/Kabul':           { center: [67.71, 33.93], zoom: 5 },
  'Asia/Tehran':          { center: [53.69, 32.43], zoom: 5 },
  'Asia/Baghdad':         { center: [43.68, 33.22], zoom: 5 },
  'Asia/Riyadh':          { center: [45.08, 23.89], zoom: 5 },
  'Asia/Dubai':           { center: [53.85, 23.42], zoom: 6 },
  'Asia/Jerusalem':       { center: [34.85, 31.05], zoom: 7 },
  'Asia/Beirut':          { center: [35.86, 33.89], zoom: 7 },
  'Asia/Almaty':          { center: [67.50, 48.02], zoom: 4 },
  'Asia/Tashkent':        { center: [63.95, 41.38], zoom: 5 },
  'Asia/Yekaterinburg':   { center: [60.00, 57.00], zoom: 4 },
  // Africa
  'Africa/Johannesburg':  { center: [25.08, -29.00], zoom: 4 },
  'Africa/Cairo':         { center: [30.80, 26.82], zoom: 5 },
  'Africa/Lagos':         { center: [8.68, 9.08], zoom: 5 },
  'Africa/Nairobi':       { center: [37.91, 0.02], zoom: 5 },
  'Africa/Casablanca':    { center: [-7.09, 31.79], zoom: 5 },
  'Africa/Accra':         { center: [-1.02, 7.95], zoom: 5 },
  'Africa/Addis_Ababa':   { center: [40.49, 9.15], zoom: 5 },
  'Africa/Dar_es_Salaam': { center: [34.89, -6.37], zoom: 5 },
  // Oceania
  'Australia/Sydney':     { center: [134.49, -25.73], zoom: 3 },
  'Australia/Melbourne':  { center: [134.49, -25.73], zoom: 3 },
  'Australia/Brisbane':   { center: [134.49, -25.73], zoom: 3 },
  'Australia/Perth':      { center: [122.25, -25.05], zoom: 4 },
  'Australia/Adelaide':   { center: [134.49, -25.73], zoom: 3 },
  'Pacific/Auckland':     { center: [174.89, -40.90], zoom: 5 },
};

const DEFAULT_VIEW: LocaleView = { center: [10.45, 51.16], zoom: 3 };

export function getLocaleView(): LocaleView {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (TIMEZONE_MAP[tz]) return TIMEZONE_MAP[tz];

    // Fallback: match by region prefix (e.g. "America/Indiana/..." → America)
    const region = tz.split('/')[0];
    if (region === 'America') return { center: [-80.00, 40.00], zoom: 3 };
    if (region === 'Asia')    return { center: [90.00, 35.00], zoom: 3 };
    if (region === 'Africa')  return { center: [20.00, 5.00], zoom: 3 };
    if (region === 'Pacific') return { center: [160.00, -20.00], zoom: 3 };
    if (region === 'Europe')  return { center: [10.45, 51.16], zoom: 4 };
    if (region === 'Australia') return { center: [134.49, -25.73], zoom: 3 };
  } catch { /* SSR or unsupported */ }

  return DEFAULT_VIEW;
}
