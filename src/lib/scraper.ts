import * as cheerio from 'cheerio';

export interface ScrapedData {
  title: string | null;
  image: string | null;
  description: string | null;
  price: number | null;
  originalPrice: number | null;
  success: boolean;
  error?: string;
}

// Main scrape function with store-specific handlers
export async function scrapeUrl(url: string): Promise<ScrapedData> {
  try {
    // First, follow redirects to get final URL
    const finalUrl = await followRedirects(url);
    
    // Detect store and use specific scraper
    if (isShopee(finalUrl)) {
      return await scrapeShopee(finalUrl);
    } else if (isAmazon(finalUrl)) {
      return await scrapeAmazon(finalUrl);
    } else if (isMercadoLivre(finalUrl)) {
      return await scrapeMercadoLivre(finalUrl);
    } else if (isMagalu(finalUrl)) {
      return await scrapeMagalu(finalUrl);
    }

    // Generic scraper for other sites
    return await scrapeGeneric(finalUrl);

  } catch (error) {
    return {
      title: null,
      image: null,
      description: null,
      price: null,
      originalPrice: null,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Follow redirects to get final URL
async function followRedirects(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    return response.url || url;
  } catch {
    return url;
  }
}

// Store detection functions
function isShopee(url: string): boolean {
  return url.includes('shopee.com') || url.includes('s.shopee');
}

function isAmazon(url: string): boolean {
  return url.includes('amazon.com') || url.includes('amzn.to') || url.includes('amzn.com');
}

function isMercadoLivre(url: string): boolean {
  return url.includes('mercadolivre.com') || url.includes('mercadolibre.com') || url.includes('mlstatic.com');
}

function isMagalu(url: string): boolean {
  return url.includes('magazineluiza.com') || url.includes('magalu.com');
}

// Shopee scraper - extract from URL params and HTML
async function scrapeShopee(url: string): Promise<ScrapedData> {
  try {
    // Extract shop_id and item_id from URL
    const urlMatch = url.match(/\/(\d+)\/(\d+)/);
    const shopId = urlMatch?.[1];
    const itemId = urlMatch?.[2];

    if (!shopId || !itemId) {
      // Try alternative patterns
      const itemMatch = url.match(/[?&]itemid=(\d+)/i);
      const shopMatch = url.match(/[?&]shopid=(\d+)/i);
      
      if (!itemMatch || !shopMatch) {
        return {
          title: null,
          image: null,
          description: null,
          price: null,
          originalPrice: null,
          success: false,
          error: 'Não foi possível extrair dados do link da Shopee. O link pode estar incorreto ou expirado.',
        };
      }
    }

    // Fetch HTML to try extracting any available data
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
      redirect: 'follow',
    });

    const html = await response.text();
    const $ = cheerio.load(html);

    // Try to extract from meta tags
    let title = $('meta[property="og:title"]').attr('content') ||
                $('meta[name="twitter:title"]').attr('content') ||
                $('title').text();
    
    let image = $('meta[property="og:image"]').attr('content') ||
                $('meta[name="twitter:image"]').attr('content');

    // Try to extract from initial state JSON in script tags
    const scripts = $('script').toArray();
    for (const script of scripts) {
      const content = $(script).html() || '';
      
      // Look for item data in JSON
      const itemNameMatch = content.match(/"item_basic":\s*\{[^}]*"name"\s*:\s*"([^"]+)"/);
      if (itemNameMatch) {
        title = itemNameMatch[1];
      }

      const priceMatch = content.match(/"price"\s*:\s*(\d+)/);
      const imageMatch = content.match(/"image"\s*:\s*"([^"]+)"/);
      
      if (imageMatch && !image) {
        const imgHash = imageMatch[1];
        if (!imgHash.startsWith('http')) {
          image = `https://down-br.img.susercontent.com/file/${imgHash}`;
        } else {
          image = imgHash;
        }
      }

      if (priceMatch) {
        const price = parseInt(priceMatch[1]) / 100000; // Shopee stores price in micro units
        return {
          title: title ? cleanTitle(title) : null,
          image: image || null,
          description: null,
          price: price > 0 ? price : null,
          originalPrice: null,
          success: true,
        };
      }
    }

    // Shopee requires JS to render, return partial data
    return {
      title: title ? cleanTitle(title) : null,
      image: image || null,
      description: null,
      price: null,
      originalPrice: null,
      success: true, // Partial success - let user fill in the rest
    };

  } catch (error) {
    return {
      title: null,
      image: null,
      description: null,
      price: null,
      originalPrice: null,
      success: false,
      error: 'Erro ao processar link da Shopee: ' + (error instanceof Error ? error.message : 'Unknown'),
    };
  }
}

// Amazon scraper - use mobile site for better scraping
async function scrapeAmazon(url: string): Promise<ScrapedData> {
  try {
    // Extract ASIN from URL
    const asinMatch = url.match(/\/dp\/([A-Z0-9]{10})/i) || 
                      url.match(/\/gp\/product\/([A-Z0-9]{10})/i) ||
                      url.match(/\/d\/([A-Z0-9]{10})/i);
    
    let finalUrl = url;
    if (asinMatch) {
      // Use mobile site which is easier to scrape
      finalUrl = `https://www.amazon.com.br/dp/${asinMatch[1]}`;
    }

    const response = await fetch(finalUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      // Amazon might be blocking - try to extract from original URL params
      return {
        title: null,
        image: null,
        description: null,
        price: null,
        originalPrice: null,
        success: false,
        error: 'Amazon bloqueou a requisição. Por favor, adicione os dados manualmente.',
      };
    }

    const html = await response.text();
    
    // Check for CAPTCHA
    if (html.includes('validateCaptcha') || html.includes('robot')) {
      return {
        title: null,
        image: null,
        description: null,
        price: null,
        originalPrice: null,
        success: false,
        error: 'Amazon exigiu CAPTCHA. Por favor, adicione os dados manualmente.',
      };
    }

    const $ = cheerio.load(html);

    // Extract title
    const title = $('#productTitle').text().trim() ||
                  $('meta[property="og:title"]').attr('content') ||
                  $('meta[name="title"]').attr('content') ||
                  $('title').text();

    // Extract image - multiple fallbacks
    let image = $('meta[property="og:image"]').attr('content') ||
                $('#landingImage').attr('src') ||
                $('#imgBlkFront').attr('src') ||
                $('img#landingImage').attr('data-old-hires') ||
                $('.a-dynamic-image').first().attr('src');

    // Try to get high-res image from data attribute
    const dynamicImageData = $('[data-a-dynamic-image]').attr('data-a-dynamic-image');
    if (dynamicImageData) {
      try {
        const imageObj = JSON.parse(dynamicImageData);
        const images = Object.keys(imageObj);
        if (images.length > 0) {
          // Get the largest image
          image = images.reduce((a, b) => {
            const sizeA = imageObj[a]?.[0] || 0;
            const sizeB = imageObj[b]?.[0] || 0;
            return sizeA > sizeB ? a : b;
          });
        }
      } catch {
        // Ignore JSON parse errors
      }
    }

    // Extract price
    let price: number | null = null;
    let originalPrice: number | null = null;

    // Try various price selectors
    const priceWhole = $('.a-price-whole').first().text();
    const priceFraction = $('.a-price-fraction').first().text();
    
    if (priceWhole) {
      const priceText = priceWhole.replace(/[^\d]/g, '') + '.' + (priceFraction || '00').replace(/[^\d]/g, '');
      price = parseFloat(priceText);
    }

    // Alternative price patterns
    if (!price) {
      const priceText = $('#priceblock_ourprice').text() ||
                        $('#priceblock_dealprice').text() ||
                        $('.a-price .a-offscreen').first().text() ||
                        $('[data-a-color="price"] .a-offscreen').first().text();
      
      if (priceText) {
        price = parsePrice(priceText);
      }
    }

    // Try to get original price (list price)
    const listPriceText = $('.a-text-price .a-offscreen').first().text() ||
                          $('#listPrice').text() ||
                          $('.a-price[data-a-strike="true"] .a-offscreen').first().text();
    
    if (listPriceText) {
      originalPrice = parsePrice(listPriceText);
    }

    // Try JSON-LD
    const jsonLd = $('script[type="application/ld+json"]').toArray();
    for (const script of jsonLd) {
      try {
        const data = JSON.parse($(script).html() || '');
        if (data['@type'] === 'Product') {
          if (!title && data.name) {
            // title is already set above
          }
          if (!image && data.image) {
            image = Array.isArray(data.image) ? data.image[0] : data.image;
          }
          if (!price && data.offers?.price) {
            price = parseFloat(data.offers.price);
          }
        }
      } catch {
        // Ignore JSON parse errors
      }
    }

    return {
      title: title ? cleanTitle(title) : null,
      image: image ? normalizeImageUrl(image, finalUrl) : null,
      description: null,
      price: price && price > 0 ? price : null,
      originalPrice: originalPrice && originalPrice > 0 ? originalPrice : null,
      success: true,
    };

  } catch (error) {
    return {
      title: null,
      image: null,
      description: null,
      price: null,
      originalPrice: null,
      success: false,
      error: 'Erro ao processar link da Amazon: ' + (error instanceof Error ? error.message : 'Unknown'),
    };
  }
}

// Mercado Livre scraper
async function scrapeMercadoLivre(url: string): Promise<ScrapedData> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      return {
        title: null,
        image: null,
        description: null,
        price: null,
        originalPrice: null,
        success: false,
        error: `HTTP ${response.status}`,
      };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract title
    const title = $('meta[property="og:title"]').attr('content') ||
                  $('h1.ui-pdp-title').text() ||
                  $('title').text();

    // Extract image
    let image = $('meta[property="og:image"]').attr('content') ||
                $('meta[name="twitter:image"]').attr('content') ||
                $('figure.ui-pdp-gallery__figure img').first().attr('src') ||
                $('img.ui-pdp-image').first().attr('src');

    // Extract price from aria-label (more reliable)
    let price: number | null = null;
    let originalPrice: number | null = null;

    // First try: aria-label with "Agora:" prefix (current price)
    const currentPriceLabel = $('[aria-label^="Agora:"]').first().attr('aria-label');
    if (currentPriceLabel) {
      price = parseAriaLabelPrice(currentPriceLabel);
    }

    // Second try: aria-label with "Antes:" prefix (original price)
    const originalPriceLabel = $('[aria-label^="Antes:"]').first().attr('aria-label');
    if (originalPriceLabel) {
      originalPrice = parseAriaLabelPrice(originalPriceLabel);
    }

    // Third try: standard selectors if aria-label didn't work
    if (!price) {
      const priceContainer = $('.andes-money-amount--cents-superscript').first();
      const fraction = priceContainer.find('.andes-money-amount__fraction').text();
      const cents = priceContainer.find('.andes-money-amount__cents').text();
      
      if (fraction) {
        const priceStr = fraction.replace(/\./g, '') + '.' + (cents || '00');
        price = parseFloat(priceStr);
      }
    }

    // Fourth try: meta tag or JSON
    if (!price) {
      const priceFromMeta = $('meta[itemprop="price"]').attr('content');
      if (priceFromMeta) {
        price = parseFloat(priceFromMeta);
      }
    }

    // Fifth try: any aria-label with "reais" (fallback)
    if (!price) {
      const anyPriceLabel = $('[aria-label*="reais"]').not('[aria-label^="Antes:"]').first().attr('aria-label');
      if (anyPriceLabel) {
        price = parseAriaLabelPrice(anyPriceLabel);
      }
    }

    // Try JSON-LD
    const jsonLd = $('script[type="application/ld+json"]').toArray();
    for (const script of jsonLd) {
      try {
        const data = JSON.parse($(script).html() || '');
        if (data['@type'] === 'Product' && data.offers) {
          if (!price && data.offers.price) {
            price = parseFloat(data.offers.price);
          }
          if (!image && data.image) {
            image = Array.isArray(data.image) ? data.image[0] : data.image;
          }
        }
      } catch {
        // Ignore JSON parse errors
      }
    }

    return {
      title: title ? cleanTitle(title) : null,
      image: image ? normalizeImageUrl(image, url) : null,
      description: null,
      price: price && price > 0 ? price : null,
      originalPrice: originalPrice && originalPrice > 0 ? originalPrice : null,
      success: true,
    };

  } catch (error) {
    return {
      title: null,
      image: null,
      description: null,
      price: null,
      originalPrice: null,
      success: false,
      error: 'Erro ao processar link do Mercado Livre: ' + (error instanceof Error ? error.message : 'Unknown'),
    };
  }
}

// Parse Mercado Livre aria-label format: "Agora: 78 reais com 90 centavos" or "175 reais"
function parseAriaLabelPrice(label: string): number | null {
  if (!label) return null;

  // Remove prefix like "Agora: " or "Antes: "
  const cleanLabel = label.replace(/^(Agora|Antes):\s*/i, '');
  
  // Pattern: "78 reais com 90 centavos" or "78 reais"
  const match = cleanLabel.match(/(\d+)\s*reais(?:\s+com\s+(\d+)\s+centavos)?/i);
  
  if (match) {
    const reais = parseInt(match[1]);
    const centavos = match[2] ? parseInt(match[2]) : 0;
    return reais + (centavos / 100);
  }

  return null;
}

// Magazine Luiza scraper
async function scrapeMagalu(url: string): Promise<ScrapedData> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
      redirect: 'follow',
    });

    const html = await response.text();
    const $ = cheerio.load(html);

    const title = $('meta[property="og:title"]').attr('content') ||
                  $('h1[data-testid="heading-product-title"]').text() ||
                  $('title').text();

    const image = $('meta[property="og:image"]').attr('content') ||
                  $('meta[name="twitter:image"]').attr('content');

    let price: number | null = null;

    // Try to extract price from data attributes or scripts
    const priceText = $('[data-testid="price-value"]').text() ||
                      $('.price-template__text').first().text();

    if (priceText) {
      price = parsePrice(priceText);
    }

    // Try JSON-LD
    const jsonLd = $('script[type="application/ld+json"]').toArray();
    for (const script of jsonLd) {
      try {
        const data = JSON.parse($(script).html() || '');
        if (data['@type'] === 'Product' && data.offers?.price) {
          price = parseFloat(data.offers.price);
          break;
        }
      } catch {
        // Ignore JSON parse errors
      }
    }

    return {
      title: title ? cleanTitle(title) : null,
      image: image ? normalizeImageUrl(image, url) : null,
      description: null,
      price: price && price > 0 ? price : null,
      originalPrice: null,
      success: true,
    };

  } catch (error) {
    return {
      title: null,
      image: null,
      description: null,
      price: null,
      originalPrice: null,
      success: false,
      error: 'Erro ao processar link da Magalu: ' + (error instanceof Error ? error.message : 'Unknown'),
    };
  }
}

// Generic scraper for other sites
async function scrapeGeneric(url: string): Promise<ScrapedData> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      return {
        title: null,
        image: null,
        description: null,
        price: null,
        originalPrice: null,
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
      title: title ? cleanTitle(title) : null,
      image: image ? normalizeImageUrl(image, url) : null,
      description: description ? description.trim() : null,
      price,
      originalPrice: null,
      success: true,
    };

  } catch (error) {
    return {
      title: null,
      image: null,
      description: null,
      price: null,
      originalPrice: null,
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
    '.andes-money-amount__fraction',
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
    /R\$\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/gi,
    /BRL\s*(\d+[.,]\d{2})/gi,
    /"price":\s*(\d+\.?\d*)/gi,
    /"amount":\s*(\d+\.?\d*)/gi,
    /"salePrice":\s*(\d+\.?\d*)/gi,
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

// Clean up product titles
function cleanTitle(title: string): string {
  return title
    .replace(/\s*\|\s*.*$/, '') // Remove everything after |
    .replace(/\s*-\s*(Amazon|Shopee|Mercado Livre|Magazine Luiza).*$/i, '') // Remove store names
    .replace(/\s*\(\d+ avalia[çc][õo]es?\).*$/i, '') // Remove review counts
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .substring(0, 200); // Limit length
}
