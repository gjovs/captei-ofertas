import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { MobileMenu } from '@/components/mobile-menu';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Captei Ofertas - Promocoes e Cupons de Desconto',
  description: 'Encontre as melhores promocoes, cupons de desconto e ofertas do dia nas maiores lojas do Brasil.',
  keywords: ['promocoes', 'cupons', 'desconto', 'ofertas', 'amazon', 'shopee', 'magalu'],
  authors: [{ name: 'Captei Ofertas' }],
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://capteiofertas.com.br'),
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: 'https://capteiofertas.com.br',
    siteName: 'Captei Ofertas',
    title: 'Captei Ofertas - Promocoes e Cupons de Desconto',
    description: 'Encontre as melhores promocoes, cupons de desconto e ofertas do dia.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Captei Ofertas - Promocoes e Cupons de Desconto',
    description: 'Encontre as melhores promocoes, cupons de desconto e ofertas do dia.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <a href="/" className="text-2xl font-bold text-orange-600">
                Captei Ofertas
              </a>
              
              {/* Desktop Navigation */}
              <nav className="hidden md:block">
                <ul className="flex gap-6">
                  <li>
                    <a href="/promocoes-do-dia" className="text-gray-700 hover:text-orange-600 font-medium transition-colors">
                      Promocoes do Dia
                    </a>
                  </li>
                  <li>
                    <a href="/blog" className="text-gray-700 hover:text-orange-600 font-medium transition-colors">
                      Blog
                    </a>
                  </li>
                </ul>
              </nav>
              
              {/* Mobile Navigation */}
              <MobileMenu />
            </div>
          </div>
        </header>
        
        {children}
        
        <footer className="bg-gray-900 text-white mt-16">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center">
              <p className="text-lg font-bold mb-2">Captei Ofertas</p>
              <p className="text-gray-400 text-sm">
                As melhores promocoes e cupons de desconto em um so lugar.
              </p>
              <p className="text-gray-500 text-xs mt-4">
                © {new Date().getFullYear()} Captei Ofertas. Todos os direitos reservados.
              </p>
            </div>
          </div>
        </footer>
        
        <Toaster />
      </body>
    </html>
  );
}
