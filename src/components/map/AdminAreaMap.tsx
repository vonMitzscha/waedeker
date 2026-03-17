'use client';

import { useEffect, useRef, useState } from 'react';
import type { WikiArticle } from '@/types';
import {
  MAP_STYLE_URL,
  selectionFillPaint,
  selectionLinePaint,
  articleDotsPaint,
  POPUP_OPTIONS,
  articlePopupHtml,
} from './mapStyles';
import { getLocaleView } from '@/lib/locale';

type AnyMap = {
  on: ((event: string, cb: (e: unknown) => void) => void) & ((event: string, layerId: string, cb: (e: unknown) => void) => void);
  addSource: (id: string, src: unknown) => void;
  addLayer: (layer: unknown) => void;
  addControl: (ctrl: unknown, pos: string) => void;
  getSource: (id: string) => { setData: (d: unknown) => void } | undefined;
  fitBounds: (bounds: unknown, opts: unknown) => void;
  getCanvas: () => HTMLCanvasElement;
  remove: () => void;
};

interface AdminAreaMapProps {
  polygon: [number, number][];
  bbox: [number, number, number, number];
  articles?: WikiArticle[];
  language?: string;
}

function markersGeoJSON(articles: WikiArticle[]) {
  return {
    type: 'FeatureCollection' as const,
    features: articles
      .filter((a) => a.coord)
      .map((a) => ({
        type: 'Feature' as const,
        properties: { label: a.label || a.title, title: a.title },
        geometry: { type: 'Point' as const, coordinates: a.coord! },
      })),
  };
}

export default function AdminAreaMap({ polygon, bbox, articles = [], language = 'de' }: AdminAreaMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<AnyMap | null>(null);
  const rawMapRef = useRef<import('maplibre-gl').Map | null>(null);
  const popupRef = useRef<import('maplibre-gl').Popup | null>(null);
  const initialized = useRef(false);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (initialized.current || !containerRef.current) return;
    initialized.current = true;

    let m: AnyMap | null = null;

    import('maplibre-gl').then((gl) => {
      if (!initialized.current || !containerRef.current) return;

      const map = new gl.Map({
        container: containerRef.current,
        style: MAP_STYLE_URL,
        center: getLocaleView().center,
        zoom: getLocaleView().zoom,
        interactive: false,
        attributionControl: false,
        preserveDrawingBuffer: true,
      } as unknown as never);

      rawMapRef.current = map;
      m = map as unknown as AnyMap;
      mapRef.current = m;

      m.addControl(new gl.AttributionControl({ compact: true }), 'bottom-right');

      m.on('load', () => {
        if (!m) return;

        // Polygon boundary: fill + dashed line only, no vertex dots
        m.addSource('admin-polygon', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: { type: 'Polygon', coordinates: [polygon] },
          },
        });
        m.addLayer({ id: 'admin-fill', type: 'fill', source: 'admin-polygon', paint: selectionFillPaint });
        m.addLayer({ id: 'admin-line', type: 'line', source: 'admin-polygon', paint: selectionLinePaint });

        // Article dots
        if (articles.length > 0) {
          m.addSource('articles', { type: 'geojson', data: markersGeoJSON(articles) });
          m.addLayer({ id: 'article-dots', type: 'circle', source: 'articles', paint: articleDotsPaint });

          m.on('mouseenter', 'article-dots', (e) => {
            const ev = e as { features: Array<{ properties: { label: string; title: string }; geometry: { coordinates: [number, number] } }> };
            m!.getCanvas().style.cursor = 'pointer';

            const props = ev.features?.[0]?.properties;
            const coords = ev.features?.[0]?.geometry.coordinates as [number, number];
            if (!props || !coords) return;

            const wikiUrl = `https://${language}.wikipedia.org/wiki/${encodeURIComponent(props.title)}`;
            popupRef.current?.remove();
            popupRef.current = new gl.Popup(POPUP_OPTIONS)
              .setLngLat(coords)
              .setHTML(articlePopupHtml(props.label, wikiUrl))
              .addTo(rawMapRef.current!);
          });

          m.on('mouseleave', 'article-dots', () => {
            m!.getCanvas().style.cursor = '';
            popupRef.current?.remove();
            popupRef.current = null;
          });

          m.on('click', 'article-dots', (e) => {
            const ev = e as { features: Array<{ properties: { label: string; title: string } }> };
            const props = ev.features?.[0]?.properties;
            if (props) {
              window.open(
                `https://${language}.wikipedia.org/wiki/${encodeURIComponent(props.title)}`,
                '_blank',
                'noopener,noreferrer',
              );
            }
          });
        }

        // Fit to bbox
        m.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], { padding: 24, animate: false });
        setMapReady(true);
      });
    });

    return () => {
      initialized.current = false;
      popupRef.current?.remove();
      popupRef.current = null;
      m?.remove();
      mapRef.current = null;
      rawMapRef.current = null;
      setMapReady(false);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update article markers when prop changes (e.g. after category filter re-query)
  useEffect(() => {
    if (!mapRef.current || !mapReady || !articles) return;
    const src = mapRef.current.getSource('articles');
    if (src) {
      src.setData(markersGeoJSON(articles));
    }
  }, [articles, mapReady]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
    </div>
  );
}
