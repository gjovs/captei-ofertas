import { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { DealsClient } from './deals-client';

export const metadata: Metadata = {
  title: 'Promoções do Dia | Captei Ofertas',
  description: 'Encontre as melhores promoções e cupons de desconto do dia nas maiores lojas do Brasil. Amazon, Shopee, Magalu e muito mais!',
  openGraph: {
    title: 'Promoções do Dia | Captei Ofertas',
    description: 'Encontre as melhores promoções e cupons de desconto do dia.',
    type: 'website',
  },
};

export const revalidate = 60; // ISR: Revalidate every 60 seconds

async function getProducts() {
  const products = await prisma.product.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  });

  return products;
}

async function getFilters() {
  const products = await prisma.product.findMany({
    select: {
      storeName: true,
      category: true,
    },
  });

  const stores = Array.from(new Set(products.map(p => p.storeName))).sort();
  const categories = Array.from(
    new Set(products.map(p => p.category).filter((c): c is string => c !== null))
  ).sort();

  return { stores, categories };
}

export default async function PromocoesDoDialPage() {
  const [products, filters] = await Promise.all([
    getProducts(),
    getFilters(),
  ]);

  return (
    <DealsClient
      products={products}
      stores={filters.stores}
      categories={filters.categories}
    />
  );
}
