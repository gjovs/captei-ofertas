'use client';

import { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { ProductCard } from '@/components/product-card';
import { FilterSidebar } from '@/components/filter-sidebar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Product } from '@prisma/client';

interface DealsClientProps {
  products: Product[];
  stores: string[];
  categories: string[];
}

export function DealsClient({ products, stores, categories }: DealsClientProps) {
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // Filter by store
      if (selectedStore && product.storeName !== selectedStore) return false;
      // Filter by category
      if (selectedCategory && product.category !== selectedCategory) return false;
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = product.title.toLowerCase().includes(query);
        const matchesStore = product.storeName.toLowerCase().includes(query);
        const matchesCoupon = product.couponCode?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesStore && !matchesCoupon) return false;
      }
      return true;
    });
  }, [products, selectedStore, selectedCategory, searchQuery]);

  const clearFilters = () => {
    setSelectedStore(null);
    setSelectedCategory(null);
    setSearchQuery('');
  };

  const hasActiveFilters = selectedStore || selectedCategory || searchQuery;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Promocoes do Dia
          </h1>
          <p className="text-gray-600">
            {filteredProducts.length} {filteredProducts.length === 1 ? 'oferta encontrada' : 'ofertas encontradas'}
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar por produto, loja ou cupom..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 h-12 text-base"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <div className="mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="text-orange-600 border-orange-600 hover:bg-orange-50"
            >
              <X className="h-4 w-4 mr-1" />
              Limpar filtros
            </Button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="lg:w-64 shrink-0">
            <div className="sticky top-24">
              <FilterSidebar
                stores={stores}
                categories={categories}
                selectedStore={selectedStore}
                selectedCategory={selectedCategory}
                onStoreChange={setSelectedStore}
                onCategoryChange={setSelectedCategory}
              />
            </div>
          </aside>

          {/* Products Grid */}
          <main className="flex-1">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <Search className="h-12 w-12 mx-auto" />
                </div>
                <p className="text-gray-500 text-lg mb-2">
                  Nenhuma promocao encontrada
                </p>
                <p className="text-gray-400 text-sm">
                  Tente ajustar os filtros ou buscar por outro termo.
                </p>
                {hasActiveFilters && (
                  <Button
                    variant="link"
                    onClick={clearFilters}
                    className="mt-4 text-orange-600"
                  >
                    Limpar todos os filtros
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    id={product.id}
                    title={product.title}
                    image={product.image}
                    price={product.price}
                    originalPrice={product.originalPrice}
                    couponCode={product.couponCode}
                    storeName={product.storeName}
                    affiliateLink={product.affiliateLink}
                    createdAt={product.createdAt}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
