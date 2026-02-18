'use client';

import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink, Clock, Tag } from 'lucide-react';
import { formatPrice, calculateDiscount, getTimeElapsed } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

interface ProductCardProps {
  id: string;
  title: string;
  image: string;
  price: number;
  originalPrice?: number | null;
  couponCode?: string | null;
  storeName: string;
  affiliateLink: string;
  createdAt: Date;
}

export function ProductCard({
  id,
  title,
  image,
  price,
  originalPrice,
  couponCode,
  storeName,
  affiliateLink,
  createdAt,
}: ProductCardProps) {
  const { toast } = useToast();
  const discount = originalPrice ? calculateDiscount(originalPrice, price) : 0;
  const timeElapsed = getTimeElapsed(createdAt);

  const handleCopyCoupon = async () => {
    if (couponCode) {
      try {
        await navigator.clipboard.writeText(couponCode);
        toast({
          title: 'Cupom copiado!',
          description: `Código ${couponCode} copiado para área de transferência.`,
        });
      } catch (error) {
        toast({
          title: 'Erro ao copiar',
          description: 'Não foi possível copiar o cupom.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleGetDeal = () => {
    window.open(affiliateLink, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <div className="relative">
        {/* Product Image */}
        <div className="relative aspect-square w-full overflow-hidden bg-gray-100">
          <Image
            src={image}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>

        {/* Discount Badge */}
        {discount > 0 && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1 text-base">
              -{discount}%
            </Badge>
          </div>
        )}

        {/* Store Badge */}
        <div className="absolute top-2 left-2">
          <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm">
            {storeName}
          </Badge>
        </div>
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Title */}
        <h3 className="font-semibold text-base line-clamp-2 min-h-[3rem]">
          {title}
        </h3>

        {/* Price Section */}
        <div className="space-y-1">
          {originalPrice && originalPrice > price && (
            <p className="text-sm text-gray-500 line-through">
              {formatPrice(originalPrice)}
            </p>
          )}
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-green-600">
              {formatPrice(price)}
            </span>
          </div>
        </div>

        {/* Coupon Section */}
        {couponCode && (
          <div className="bg-yellow-50 border-2 border-dashed border-yellow-400 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-yellow-800">
              <Tag className="h-4 w-4" />
              <span>Cupom disponível</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-white px-3 py-2 rounded border border-yellow-300 font-mono text-sm font-bold text-yellow-900">
                {couponCode}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyCoupon}
                className="shrink-0"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Action Button */}
        <Button
          onClick={handleGetDeal}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold"
          size="lg"
        >
          Pegar Promoção
          <ExternalLink className="ml-2 h-4 w-4" />
        </Button>

        {/* Timestamp */}
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Clock className="h-3 w-3" />
          <span>{timeElapsed}</span>
        </div>
      </CardContent>
    </Card>
  );
}
