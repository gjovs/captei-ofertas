import { prisma } from '@/lib/db';

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

// Category emoji mapping
const CATEGORY_EMOJI: Record<string, string> = {
  'Eletronicos': '📱',
  'Moda': '👗',
  'Casa': '🏠',
  'Beleza': '💄',
  'Games': '🎮',
  'Esportes': '⚽',
  'Livros': '📚',
  'Brinquedos': '🧸',
  'Pet': '🐾',
  'Alimentos': '🍔',
};

function getCategoryEmoji(category: string | null): string {
  if (!category) return '🩷';
  return CATEGORY_EMOJI[category] || '🩷';
}

function formatPrice(price: number): string {
  return price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface Product {
  id: string;
  title: string;
  price: number;
  originalPrice: number | null;
  storeName: string;
  category: string | null;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
}

// Build product broadcast message
export function buildProductMessage(product: Product): string {
  const emoji = getCategoryEmoji(product.category);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://capteiofertas.com.br';
  
  let message = `${emoji} ${product.title}\n\n`;
  
  if (product.originalPrice && product.originalPrice > product.price) {
    message += `De: R$ ${formatPrice(product.originalPrice)}\n`;
  }
  
  message += `🔥 Por: R$ ${formatPrice(product.price)}\n\n`;
  message += `🛍 ${siteUrl}/oferta/${product.id}\n`;
  message += `Vendido por: ${product.storeName}`;
  
  return message;
}

// Build blog post broadcast message
export function buildBlogMessage(post: BlogPost): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://capteiofertas.com.br';
  
  let message = `📝 *Novo post no blog!*\n\n`;
  message += `*${post.title}*\n\n`;
  message += `📖 Leia: ${siteUrl}/blog/${post.slug}`;
  
  return message;
}

// Send message to a specific chat
async function sendMessage(chatId: bigint, text: string, parseMode: 'Markdown' | 'HTML' = 'Markdown'): Promise<boolean> {
  try {
    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId.toString(),
        text,
        parse_mode: parseMode,
        disable_web_page_preview: false,
      }),
    });
    
    const result = await response.json();
    
    if (!result.ok) {
      console.error(`Failed to send message to ${chatId}:`, result.description);
      
      // If bot was kicked/removed from group, delete the group record
      if (result.description?.includes('bot was kicked') || 
          result.description?.includes('bot is not a member') ||
          result.description?.includes('chat not found') ||
          result.description?.includes('Forbidden')) {
        await prisma.telegramGroup.delete({
          where: { chatId },
        }).catch(() => {});
        console.log(`Removed group ${chatId} from database (bot no longer member)`);
      }
      
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`Error sending message to ${chatId}:`, error);
    return false;
  }
}

// Broadcast product to all groups with notifyProducts enabled
export async function broadcastProduct(product: Product): Promise<{ success: number; failed: number }> {
  const groups = await prisma.telegramGroup.findMany({
    where: { notifyProducts: true },
  });
  
  if (groups.length === 0) {
    console.log('No groups to broadcast product to');
    return { success: 0, failed: 0 };
  }
  
  const message = buildProductMessage(product);
  let success = 0;
  let failed = 0;
  
  for (const group of groups) {
    const sent = await sendMessage(group.chatId, message, 'Markdown');
    if (sent) {
      success++;
    } else {
      failed++;
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`Product broadcast: ${success} success, ${failed} failed`);
  return { success, failed };
}

// Broadcast blog post to all groups with notifyBlog enabled
export async function broadcastBlogPost(post: BlogPost): Promise<{ success: number; failed: number }> {
  const groups = await prisma.telegramGroup.findMany({
    where: { notifyBlog: true },
  });
  
  if (groups.length === 0) {
    console.log('No groups to broadcast blog post to');
    return { success: 0, failed: 0 };
  }
  
  const message = buildBlogMessage(post);
  let success = 0;
  let failed = 0;
  
  for (const group of groups) {
    const sent = await sendMessage(group.chatId, message, 'Markdown');
    if (sent) {
      success++;
    } else {
      failed++;
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`Blog broadcast: ${success} success, ${failed} failed`);
  return { success, failed };
}

// Notify admins when bot is added/removed from a group
export async function notifyAdmins(message: string): Promise<void> {
  const adminIds = process.env.ADMIN_TELEGRAM_IDS?.split(',').map(id => id.trim()) || [];
  
  for (const adminId of adminIds) {
    try {
      await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: adminId,
          text: message,
          parse_mode: 'Markdown',
        }),
      });
    } catch (error) {
      console.error(`Failed to notify admin ${adminId}:`, error);
    }
  }
}

// Get all registered groups
export async function getGroups() {
  return prisma.telegramGroup.findMany({
    orderBy: { addedAt: 'desc' },
  });
}

// Toggle group notification settings
export async function toggleGroupSetting(
  chatId: bigint,
  setting: 'notifyProducts' | 'notifyBlog'
): Promise<boolean | null> {
  const group = await prisma.telegramGroup.findUnique({
    where: { chatId },
  });
  
  if (!group) return null;
  
  const newValue = !group[setting];
  
  await prisma.telegramGroup.update({
    where: { chatId },
    data: { [setting]: newValue },
  });
  
  return newValue;
}
