'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Filter } from 'lucide-react';

interface FilterSidebarProps {
  stores: string[];
  categories: string[];
  selectedStore: string | null;
  selectedCategory: string | null;
  onStoreChange: (store: string | null) => void;
  onCategoryChange: (category: string | null) => void;
}

export function FilterSidebar({
  stores,
  categories,
  selectedStore,
  selectedCategory,
  onStoreChange,
  onCategoryChange,
}: FilterSidebarProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filtros
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Store Filter */}
        <div>
          <h3 className="font-semibold mb-3 text-sm">Lojas</h3>
          <div className="flex flex-col gap-2">
            <Badge
              variant={selectedStore === null ? 'default' : 'outline'}
              className="cursor-pointer justify-start hover:bg-accent"
              onClick={() => onStoreChange(null)}
            >
              Todas as lojas
            </Badge>
            {stores.map((store) => (
              <Badge
                key={store}
                variant={selectedStore === store ? 'default' : 'outline'}
                className="cursor-pointer justify-start hover:bg-accent"
                onClick={() => onStoreChange(store)}
              >
                {store}
              </Badge>
            ))}
          </div>
        </div>

        {/* Category Filter */}
        {categories.length > 0 && (
          <div>
            <h3 className="font-semibold mb-3 text-sm">Categorias</h3>
            <div className="flex flex-col gap-2">
              <Badge
                variant={selectedCategory === null ? 'default' : 'outline'}
                className="cursor-pointer justify-start hover:bg-accent"
                onClick={() => onCategoryChange(null)}
              >
                Todas as categorias
              </Badge>
              {categories.map((category) => (
                <Badge
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  className="cursor-pointer justify-start hover:bg-accent"
                  onClick={() => onCategoryChange(category)}
                >
                  {category}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
