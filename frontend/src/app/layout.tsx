import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/navigation/Navbar';
import Footer from '@/components/navigation/Footer';

export const metadata: Metadata = {
  title: 'YOUR-PRINTS | Digital Footprint Intelligence',
  description: 'An open, evidence-based digital footprint intelligence platform. Discover, normalize, and forensically map public digital traces.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-[#FBFBFA] text-[#111110]">
      <body className="min-h-screen flex flex-col font-sans selection:bg-[#C8FF00] selection:text-[#111110]">
        <Navbar />
        <main className="flex-1 flex flex-col">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
