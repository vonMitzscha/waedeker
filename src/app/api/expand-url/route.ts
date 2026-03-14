import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) return Response.json({ error: 'Missing url' }, { status: 400 });
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GeoZIMWizard/1.0)' },
    });
    return Response.json({ expanded: res.url });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
