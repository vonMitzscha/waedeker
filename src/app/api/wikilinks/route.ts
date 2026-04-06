import { NextRequest, NextResponse } from 'next/server';

// Persistent in-memory cache per Vercel function instance.
// Key: `${lang}:${title}`, Value: array of linked titles.
const cache = new Map<string, string[]>();

const BATCH_SIZE = 50;
const MAX_PAGES = 10; // max pagination steps per batch (~5 000 links/article)
const USER_AGENT = 'Waedeker/1.0 (https://waedeker.netzgewoelbe.com; bot-traffic@wikimedia.org)';

async function fetchBatch(
  batch: string[],
  lang: string,
  result: Map<string, string[]>,
): Promise<void> {
  let plcontinue: string | undefined;
  let step = 0;
  do {
    const params = new URLSearchParams({
      action: 'query',
      prop: 'links',
      plnamespace: '0',
      pllimit: '500',
      titles: batch.join('|'),
      format: 'json',
    });
    if (plcontinue) params.set('plcontinue', plcontinue);

    const res = await fetch(`https://${lang}.wikipedia.org/w/api.php?${params}`, {
      headers: { 'User-Agent': USER_AGENT },
      next: { revalidate: 86400 }, // allow Next.js fetch cache for 24 h
    });

    if (res.status === 429) {
      const wait = parseInt(res.headers.get('Retry-After') ?? '10', 10);
      await new Promise((r) => setTimeout(r, wait * 1000));
      continue; // retry, don't increment step
    }
    if (!res.ok) break;

    const data = await res.json();
    const pages = (data.query?.pages ?? {}) as Record<string, { title: string; links?: { title: string }[] }>;
    for (const page of Object.values(pages)) {
      if (page.links?.length) {
        const existing = result.get(page.title) ?? [];
        result.set(page.title, existing.concat(page.links.map((l) => l.title)));
      }
    }
    plcontinue = data.continue?.plcontinue;
    step++;
  } while (plcontinue && step < MAX_PAGES);
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { titles: string[]; lang: string };
  const { titles, lang } = body;

  if (!Array.isArray(titles) || typeof lang !== 'string' || titles.length === 0) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // Split into cached and uncached titles
  const uncached = titles.filter((t) => !cache.has(`${lang}:${t}`));
  const result = new Map<string, string[]>();

  // Fetch uncached titles from Wikipedia in batches (sequentially to be kind to the API)
  for (let i = 0; i < uncached.length; i += BATCH_SIZE) {
    const batch = uncached.slice(i, i + BATCH_SIZE);
    await fetchBatch(batch, lang, result);
  }

  // Write new results into the cache
  for (const [title, links] of result) {
    cache.set(`${lang}:${title}`, links);
  }

  // Build response: cached + freshly fetched
  const out: Record<string, string[]> = {};
  for (const title of titles) {
    const links = cache.get(`${lang}:${title}`);
    if (links?.length) out[title] = links;
  }

  return NextResponse.json({ links: out });
}
