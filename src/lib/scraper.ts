import * as cheerio from 'cheerio';

export interface ScrapedData {
  title: string | null;
  image: string | null;
  description: string | null;
  price: number | null;
  success: boolean;
  error?: string;
}

export async function scrapeUrl(url: string): Promise<ScrapedData> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      return {
        title: null,
        image: null,
        description: null,
        price: null,
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract Open Graph data
    const title = 
      $('meta[property="og:title"]').attr('content') ||
      $('meta[name="twitter:title"]').attr('content') ||
      $('title').text() ||
      $('h1').first().text() ||
      null;

    const image = 
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content') ||
      $('img').first().attr('src') ||
      null;

    const description = 
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      $('meta[name="twitter:description"]').attr('content') ||
      null;

    // Try to extract price using various patterns
    const price = extractPrice($, html);

    return {
      title: title ? title.trim() : null,
      image: image ? normalizeImageUrl(image, url) : null,
      description: description ? description.trim() : null,
      price,
      success: true,
    };

  } catch (error) {
    return {
      title: null,
      image: null,
      description: null,
      price: null,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function extractPrice($: cheerio.CheerioAPI, html: string): number | null {
  // Common price selectors
  const priceSelectors = [
    '.price',
    '.a-price-whole',
    '[data-price]',
    '.price-tag',
    '.product-price',
    '.sale-price',
    '[itemprop="price"]',
    '.current-price',
  ];

  for (const selector of priceSelectors) {
    const element = $(selector).first();
    if (element.length) {
      const priceText = element.text() || element.attr('content') || element.attr('data-price');
      if (priceText) {
        const price = parsePrice(priceText);
        if (price) return price;
      }
    }
  }

  // Try regex patterns on the entire HTML
  const pricePatterns = [
    /R\$\s*(\d+[.,]\d{2})/gi,
    /BRL\s*(\d+[.,]\d{2})/gi,
    /\"price\":\s*(\d+\.?\d*)/gi,
    /\"amount\":\s*(\d+\.?\d*)/gi,
  ];

  for (const pattern of pricePatterns) {
    const matches = html.match(pattern);
    if (matches && matches.length > 0) {
      for (const match of matches) {
        const price = parsePrice(match);
        if (price && price > 0 && price < 1000000) {
          return price;
        }
      }
    }
  }

  return null;
}

function parsePrice(text: string): number | null {
  // Remove currency symbols and extract numbers
  const cleaned = text
    .replace(/R\$/gi, '')
    .replace(/BRL/gi, '')
    .replace(/[^\d.,]/g, '')
    .trim();

  if (!cleaned) return null;

  // Handle Brazilian format (1.234,56) and US format (1,234.56)
  let number: number;
  
  if (cleaned.includes(',') && cleaned.includes('.')) {
    // If both exist, determine which is decimal separator
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    
    if (lastComma > lastDot) {
      // Brazilian format: 1.234,56
      number = parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
    } else {
      // US format: 1,234.56
      number = parseFloat(cleaned.replace(/,/g, ''));
    }
  } else if (cleaned.includes(',')) {
    // Could be decimal separator or thousands separator
    const commaPos = cleaned.indexOf(',');
    const afterComma = cleaned.substring(commaPos + 1);
    
    if (afterComma.length === 2) {
      // Likely decimal: 123,45
      number = parseFloat(cleaned.replace(',', '.'));
    } else {
      // Likely thousands: 1,234
      number = parseFloat(cleaned.replace(',', ''));
    }
  } else {
    number = parseFloat(cleaned);
  }

  return isNaN(number) ? null : number;
}

function normalizeImageUrl(imageUrl: string, baseUrl: string): string {
  try {
    // If already absolute URL, return as is
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }

    // If protocol-relative URL
    if (imageUrl.startsWith('//')) {
      return 'https:' + imageUrl;
    }

    // If relative URL, make it absolute
    const base = new URL(baseUrl);
    if (imageUrl.startsWith('/')) {
      return base.origin + imageUrl;
    } else {
      return base.origin + '/' + imageUrl;
    }
  } catch {
    return imageUrl;
  }
}
