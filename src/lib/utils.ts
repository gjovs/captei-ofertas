import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format price in Brazilian Real
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(price);
}

/**
 * Calculate discount percentage
 */
export function calculateDiscount(originalPrice: number, currentPrice: number): number {
  if (originalPrice <= 0 || currentPrice >= originalPrice) return 0;
  return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
}

/**
 * Get store name from URL
 */
export function getStoreName(url: string): string {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    
    const storeMap: Record<string, string> = {
      'amazon.com.br': 'Amazon',
      'amazon.com': 'Amazon',
      'shopee.com.br': 'Shopee',
      'magazineluiza.com.br': 'Magalu',
      'magazinevoce.com.br': 'Magalu',
      'mercadolivre.com.br': 'Mercado Livre',
      'americanas.com.br': 'Americanas',
      'casasbahia.com.br': 'Casas Bahia',
      'kabum.com.br': 'KaBuM!',
      'aliexpress.com': 'AliExpress',
      'pt.aliexpress.com': 'AliExpress',
      'terabyteshop.com.br': 'Terabyte',
      'pichau.com.br': 'Pichau',
      'carrefour.com.br': 'Carrefour',
      'extra.com.br': 'Extra',
      'pontofrio.com.br': 'Ponto Frio',
      'submarino.com.br': 'Submarino',
      'fastshop.com.br': 'Fast Shop',
      'samsung.com.br': 'Samsung',
      'apple.com.br': 'Apple',
      'apple.com': 'Apple',
    };

    for (const [domain, name] of Object.entries(storeMap)) {
      if (hostname.includes(domain)) {
        return name;
      }
    }

    // Extract main domain name as fallback
    const parts = hostname.replace('www.', '').split('.');
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  } catch {
    return 'Loja';
  }
}

/**
 * Get time elapsed in human readable format (Portuguese)
 */
export function getTimeElapsed(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'Agora mesmo';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} ${diffMinutes === 1 ? 'minuto' : 'minutos'} atras`;
  } else if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'hora' : 'horas'} atras`;
  } else if (diffDays < 7) {
    return `${diffDays} ${diffDays === 1 ? 'dia' : 'dias'} atras`;
  } else {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(date));
  }
}
