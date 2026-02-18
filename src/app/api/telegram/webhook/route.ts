import { Bot, Context, InlineKeyboard, webhookCallback } from 'grammy';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { scrapeUrl } from '@/lib/scraper';
import { getStoreName } from '@/lib/utils';
import { revalidatePath } from 'next/cache';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not set');

const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID;

const bot = new Bot(token);

// Bot session states
enum BotState {
  IDLE = 'IDLE',
  WAITING_PRICE = 'WAITING_PRICE',
  WAITING_ORIGINAL_PRICE = 'WAITING_ORIGINAL_PRICE',
  WAITING_TITLE = 'WAITING_TITLE',
  WAITING_COUPON = 'WAITING_COUPON',
  WAITING_CATEGORY = 'WAITING_CATEGORY',
  WAITING_IMAGE = 'WAITING_IMAGE',
  WAITING_MANUAL_DATA = 'WAITING_MANUAL_DATA',
}

interface SessionData {
  url?: string;
  title?: string;
  image?: string;
  price?: number;
  originalPrice?: number;
  couponCode?: string;
  storeName?: string;
  category?: string;
  affiliateLink?: string;
  editField?: string;
}

// Check if user is admin
function isAdmin(ctx: Context): boolean {
  if (!ADMIN_TELEGRAM_ID) {
    // If ADMIN_TELEGRAM_ID is not set, allow all users (development mode)
    console.warn('ADMIN_TELEGRAM_ID not set - bot is open to all users');
    return true;
  }
  const userId = ctx.from?.id?.toString();
  return userId === ADMIN_TELEGRAM_ID;
}

// Middleware to check admin access
async function checkAdmin(ctx: Context, next: () => Promise<void>) {
  if (!isAdmin(ctx)) {
    await ctx.reply(
      '⛔ Acesso negado.\n\n' +
      'Este bot e restrito apenas para administradores.\n' +
      'Se voce e o administrador, verifique se seu ADMIN_TELEGRAM_ID esta configurado corretamente.'
    );
    return;
  }
  await next();
}

// Apply admin middleware to all updates
bot.use(checkAdmin);

// Helper to get/update session
async function getSession(chatId: number) {
  const session = await prisma.botSession.findUnique({
    where: { chatId: BigInt(chatId) },
  });
  return session;
}

async function updateSession(chatId: number, state: BotState, data: SessionData) {
  await prisma.botSession.upsert({
    where: { chatId: BigInt(chatId) },
    update: { state, data: data as object },
    create: { chatId: BigInt(chatId), state, data: data as object },
  });
}

async function clearSession(chatId: number) {
  await prisma.botSession.delete({
    where: { chatId: BigInt(chatId) },
  }).catch(() => {});
}

// Start command
bot.command('start', async (ctx) => {
  await ctx.reply(
    '👋 Ola! Sou o bot de cadastro de ofertas.\n\n' +
    'Envie um link de produto e eu vou extrair as informacoes automaticamente!\n\n' +
    'Comandos disponiveis:\n' +
    '/start - Iniciar o bot\n' +
    '/cancel - Cancelar operacao atual\n' +
    '/help - Ver ajuda'
  );
});

// Help command
bot.command('help', async (ctx) => {
  await ctx.reply(
    '📖 *Como usar o bot:*\n\n' +
    '1️⃣ Envie um link de produto (Amazon, Shopee, Magalu, etc.)\n' +
    '2️⃣ O bot vai extrair as informacoes automaticamente\n' +
    '3️⃣ Edite os campos se necessario usando os botoes\n' +
    '4️⃣ Clique em "Publicar" para adicionar ao site\n\n' +
    '*Comandos:*\n' +
    '/start - Iniciar o bot\n' +
    '/cancel - Cancelar operacao atual\n' +
    '/help - Ver esta mensagem',
    { parse_mode: 'Markdown' }
  );
});

// Cancel command
bot.command('cancel', async (ctx) => {
  const chatId = ctx.chat?.id;
  if (chatId) {
    await clearSession(chatId);
  }
  await ctx.reply('❌ Operacao cancelada. Envie um novo link para comecar.');
});

// Handle URLs
bot.hears(/https?:\/\/[^\s]+/, async (ctx) => {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const url = ctx.match[0];
  
  await ctx.reply('🔍 Analisando o link... Por favor, aguarde.');

  try {
    const scrapedData = await scrapeUrl(url);
    const storeName = getStoreName(url);

    if (!scrapedData.success) {
      // Scraping failed completely
      await ctx.reply(
        `❌ Nao consegui ler este link.\n\nErro: ${scrapedData.error}\n\n` +
        '📸 Envie uma foto do produto e depois eu peco os detalhes manualmente.'
      );
      await updateSession(chatId, BotState.WAITING_IMAGE, { url, storeName });
      return;
    }

    // Store initial data
    const sessionData: SessionData = {
      url,
      title: scrapedData.title || undefined,
      image: scrapedData.image || undefined,
      price: scrapedData.price || undefined,
      storeName,
      affiliateLink: url, // You can add affiliate conversion logic here
    };

    await updateSession(chatId, BotState.IDLE, sessionData);

    // Build preview message
    let message = '📦 *Dados encontrados:*\n\n';
    message += `🏪 Loja: ${storeName}\n`;
    message += `📝 Titulo: ${scrapedData.title || '❌ Nao encontrado'}\n`;
    message += `💰 Preco: ${scrapedData.price ? `R$ ${scrapedData.price.toFixed(2)}` : '❌ Nao encontrado'}\n`;
    message += `🖼️ Imagem: ${scrapedData.image ? '✅ Encontrada' : '❌ Nao encontrada'}\n\n`;
    message += 'Voce pode editar os campos ou publicar diretamente:';

    // Create inline keyboard
    const keyboard = new InlineKeyboard();
    
    if (!scrapedData.title) keyboard.text('✏️ Adicionar Titulo', 'edit_title');
    else keyboard.text('✏️ Editar Titulo', 'edit_title');
    
    keyboard.row();
    
    if (!scrapedData.price) keyboard.text('✏️ Adicionar Preco', 'edit_price');
    else keyboard.text('✏️ Editar Preco', 'edit_price');
    
    keyboard.row();
    keyboard.text('💵 Preco Original', 'edit_original_price');
    keyboard.row();
    keyboard.text('🎟️ Adicionar Cupom', 'add_coupon');
    keyboard.row();
    keyboard.text('📂 Adicionar Categoria', 'add_category');
    keyboard.row();
    
    if (!scrapedData.image) keyboard.text('📸 Enviar Imagem', 'edit_image');
    else keyboard.text('📸 Trocar Imagem', 'edit_image');
    
    keyboard.row();
    keyboard.text('✅ Publicar', 'publish').text('❌ Cancelar', 'cancel');

    // Send preview with image if available
    if (scrapedData.image) {
      try {
        await ctx.replyWithPhoto(scrapedData.image, {
          caption: message,
          parse_mode: 'Markdown',
          reply_markup: keyboard,
        });
      } catch {
        // If image fails, send text only
        await ctx.reply(message, {
          parse_mode: 'Markdown',
          reply_markup: keyboard,
        });
      }
    } else {
      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      });
    }

  } catch (error) {
    console.error('Error processing URL:', error);
    await ctx.reply(
      '❌ Ocorreu um erro ao processar o link. Tente novamente ou envie /cancel.'
    );
  }
});

// Handle photo uploads
bot.on('message:photo', async (ctx) => {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const session = await getSession(chatId);
  
  if (!session || session.state !== BotState.WAITING_IMAGE) {
    await ctx.reply('Por favor, envie um link primeiro ou use /start.');
    return;
  }

  const photo = ctx.message.photo[ctx.message.photo.length - 1];
  const fileId = photo.file_id;
  const file = await ctx.api.getFile(fileId);
  const imageUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;

  const data = session.data as SessionData;
  data.image = imageUrl;

  await updateSession(chatId, BotState.WAITING_MANUAL_DATA, data);
  await ctx.reply('✅ Foto recebida! Agora me envie o *titulo do produto*:', {
    parse_mode: 'Markdown',
  });
});

// Handle callback queries (inline buttons)
bot.on('callback_query:data', async (ctx) => {
  const chatId = ctx.chat?.id;
  if (!chatId) {
    await ctx.answerCallbackQuery({ text: 'Erro: chat nao encontrado.' });
    return;
  }

  const action = ctx.callbackQuery.data;
  const session = await getSession(chatId);
  
  if (!session) {
    await ctx.answerCallbackQuery({ text: 'Sessao expirada. Envie um novo link.' });
    return;
  }

  const data = session.data as SessionData;

  switch (action) {
    case 'edit_title':
      await updateSession(chatId, BotState.WAITING_TITLE, data);
      await ctx.reply('✏️ Digite o novo titulo do produto:');
      await ctx.answerCallbackQuery();
      break;

    case 'edit_price':
      await updateSession(chatId, BotState.WAITING_PRICE, data);
      await ctx.reply('💰 Digite o preco (ex: 99.90):');
      await ctx.answerCallbackQuery();
      break;

    case 'edit_original_price':
      await updateSession(chatId, BotState.WAITING_ORIGINAL_PRICE, data);
      await ctx.reply('💵 Digite o preco original (antes do desconto, ex: 199.90):');
      await ctx.answerCallbackQuery();
      break;

    case 'add_coupon':
      await updateSession(chatId, BotState.WAITING_COUPON, data);
      await ctx.reply('🎟️ Digite o codigo do cupom:');
      await ctx.answerCallbackQuery();
      break;

    case 'add_category':
      await updateSession(chatId, BotState.WAITING_CATEGORY, data);
      const categoryKeyboard = new InlineKeyboard()
        .text('📱 Eletronicos', 'cat_eletronicos').row()
        .text('👕 Moda', 'cat_moda').row()
        .text('🏠 Casa', 'cat_casa').row()
        .text('🎮 Games', 'cat_games').row()
        .text('📚 Livros', 'cat_livros').row()
        .text('💄 Beleza', 'cat_beleza').row()
        .text('🍽️ Alimentos', 'cat_alimentos').row()
        .text('⚽ Esportes', 'cat_esportes');
      
      await ctx.reply('📂 Escolha a categoria:', { reply_markup: categoryKeyboard });
      await ctx.answerCallbackQuery();
      break;

    case 'edit_image':
      await updateSession(chatId, BotState.WAITING_IMAGE, data);
      await ctx.reply('📸 Envie a imagem do produto:');
      await ctx.answerCallbackQuery();
      break;

    case 'publish':
      await publishProduct(ctx, data);
      await clearSession(chatId);
      await ctx.answerCallbackQuery({ text: '✅ Publicado!' });
      break;

    case 'cancel':
      await clearSession(chatId);
      await ctx.reply('❌ Cancelado. Envie um novo link para comecar.');
      await ctx.answerCallbackQuery();
      break;

    default:
      // Handle category selection
      if (action.startsWith('cat_')) {
        const categories: Record<string, string> = {
          cat_eletronicos: 'Eletronicos',
          cat_moda: 'Moda',
          cat_casa: 'Casa',
          cat_games: 'Games',
          cat_livros: 'Livros',
          cat_beleza: 'Beleza',
          cat_alimentos: 'Alimentos',
          cat_esportes: 'Esportes',
        };
        
        data.category = categories[action];
        await updateSession(chatId, BotState.IDLE, data);
        await ctx.reply(`✅ Categoria definida: ${data.category}`);
        await ctx.answerCallbackQuery();
      }
      break;
  }
});

// Handle text messages (for manual input)
bot.on('message:text', async (ctx) => {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const session = await getSession(chatId);
  
  if (!session || session.state === BotState.IDLE) {
    return; // Ignore or already handled by URL handler
  }

  const data = session.data as SessionData;
  const text = ctx.message.text;

  switch (session.state) {
    case BotState.WAITING_TITLE:
      data.title = text;
      await updateSession(chatId, BotState.IDLE, data);
      await ctx.reply('✅ Titulo atualizado!');
      break;

    case BotState.WAITING_PRICE:
      const price = parseFloat(text.replace(/[^\d.,]/g, '').replace(',', '.'));
      if (isNaN(price)) {
        await ctx.reply('❌ Preco invalido. Digite novamente (ex: 99.90):');
        return;
      }
      data.price = price;
      await updateSession(chatId, BotState.IDLE, data);
      await ctx.reply(`✅ Preco atualizado: R$ ${price.toFixed(2)}`);
      break;

    case BotState.WAITING_ORIGINAL_PRICE:
      const originalPrice = parseFloat(text.replace(/[^\d.,]/g, '').replace(',', '.'));
      if (isNaN(originalPrice)) {
        await ctx.reply('❌ Preco invalido. Digite novamente (ex: 199.90):');
        return;
      }
      data.originalPrice = originalPrice;
      await updateSession(chatId, BotState.IDLE, data);
      await ctx.reply(`✅ Preco original atualizado: R$ ${originalPrice.toFixed(2)}`);
      break;

    case BotState.WAITING_COUPON:
      data.couponCode = text.toUpperCase();
      await updateSession(chatId, BotState.IDLE, data);
      await ctx.reply(`✅ Cupom adicionado: ${data.couponCode}`);
      break;

    case BotState.WAITING_MANUAL_DATA:
      // First input after image upload is the title
      data.title = text;
      await updateSession(chatId, BotState.WAITING_PRICE, data);
      await ctx.reply('✅ Titulo salvo! Agora me envie o *preco* (ex: 99.90):', {
        parse_mode: 'Markdown',
      });
      break;
  }
});

async function publishProduct(ctx: Context, data: SessionData) {
  try {
    // Validation
    if (!data.title || !data.price || !data.image || !data.url) {
      await ctx.reply(
        '❌ Dados incompletos! Certifique-se de ter:\n' +
        '• Titulo\n' +
        '• Preco\n' +
        '• Imagem\n' +
        '• Link'
      );
      return;
    }

    // Save to database
    const product = await prisma.product.create({
      data: {
        title: data.title,
        affiliateLink: data.affiliateLink || data.url,
        originalLink: data.url,
        image: data.image,
        price: data.price,
        originalPrice: data.originalPrice || null,
        couponCode: data.couponCode || null,
        storeName: data.storeName || 'Loja',
        category: data.category || null,
      },
    });

    // Revalidate the homepage
    revalidatePath('/');
    revalidatePath('/promocoes-do-dia');

    let message = '✅ *Produto publicado com sucesso!*\n\n';
    message += `📝 ${data.title}\n`;
    message += `💰 R$ ${data.price.toFixed(2)}\n`;
    if (data.originalPrice) {
      const discount = Math.round(((data.originalPrice - data.price) / data.originalPrice) * 100);
      message += `🔥 ${discount}% OFF\n`;
    }
    if (data.couponCode) message += `🎟️ Cupom: ${data.couponCode}\n`;
    message += `\n🔗 ID: ${product.id}`;

    await ctx.reply(message, { parse_mode: 'Markdown' });

  } catch (error) {
    console.error('Error publishing product:', error);
    await ctx.reply('❌ Erro ao publicar o produto. Tente novamente.');
  }
}

// Export webhook handler for Next.js API route
export const POST = webhookCallback(bot, 'std/http');
