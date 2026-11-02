import type { Metadata } from 'next';
import { Anton, Roboto, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '../lib/store/auth-context';
import { CartProvider } from '../lib/store/cart-context';

const anton = Anton({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-anton',
  display: 'swap',
  preload: false,
});

const roboto = Roboto({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-roboto',
  display: 'swap',
  preload: false,
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  preload: false,
});

export const metadata: Metadata = {
  title: 'BakeConnect — Authentic Indian Bakery in Pune | Direct & Wholesale',
  description:
    'Fresh morning ladi pav, pure butter khari, Irani mawa cakes, and dependable wholesale delivery for Pune cafes, chai points, and grocers.',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${anton.variable} ${roboto.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen flex flex-col bg-[#FFF7EB] text-[#342421] font-sans selection:bg-[#FF7836] selection:text-white">
        <AuthProvider>
          <CartProvider>
            {children}
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
