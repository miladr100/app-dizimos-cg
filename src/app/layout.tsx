import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ServiceWorker } from '@/components/ServiceWorker';

export const metadata: Metadata = {
  title: 'Dízimos & Ofertas',
  description: 'Registro de dízimos, ofertas e membros',
  applicationName: 'Dízimos & Ofertas',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Dízimos',
  },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0c1713',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <ServiceWorker />
        {children}
      </body>
    </html>
  );
}
