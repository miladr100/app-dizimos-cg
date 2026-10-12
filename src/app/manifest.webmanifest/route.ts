import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json({
    name: 'Dízimos e Ofertas CG-MS',
    short_name: 'Dízimos',
    description: 'Lançamentos de dízimos e ofertas dos membros de Campo Grande - MS',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#0c1713',
    theme_color: '#0c1713',
    lang: 'pt-BR',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
  });
}
