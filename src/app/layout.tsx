import type { Metadata } from 'next';
import { Hind_Siliguri, Inter } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const bangla = Hind_Siliguri({ subsets: ['bengali'], weight: ['400', '500', '600'], variable: '--font-bangla', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Admin · Doctor Platform', template: '%s · Doctor Platform Admin' },
  description: 'Doctor appointment & telemedicine platform — admin dashboard',
  robots: { index: false, follow: false },
};

// Applies the saved/OS theme before first paint so there is no light/dark flash.
const themeScript = `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${bangla.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
