import { Bot, Context, InlineKeyboard, webhookCallback } from 'grammy';
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
  // Blog states
  WAITING_BLOG_TITLE = 'WAITING_BLOG_TITLE',
  WAITING_BLOG_CONTENT = 'WAITING_BLOG_CONTENT',
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
  // Blog data
  blogTitle?: string;
  blogContent?: string;
  blogSlug?: string;
}

// Check if user is admin
function isAdmin(ctx: Context): boolean {
  if (!ADMIN_TELEGRAM_ID) {
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

// Generate slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens
    .trim();
}

// Start command
bot.command('start', async (ctx) => {
  await ctx.reply(
    '👋 Ola! Sou o bot de cadastro de ofertas e blog.\n\n' +
    '*Ofertas:*\n' +
    'Envie um link de produto para cadastrar uma oferta.\n\n' +
    '*Blog:*\n' +
    '/newpost - Criar novo post\n' +
    '/posts - Listar posts\n\n' +
    '*Outros:*\n' +
    '/help - Ver todos os comandos\n' +
    '/cancel - Cancelar operacao atual',
    { parse_mode: 'Markdown' }
  );
});

// Help command
bot.command('help', async (ctx) => {
  await ctx.reply(
    '📖 *Comandos disponiveis:*\n\n' +
    '*Ofertas:*\n' +
    '• Envie um link de produto para cadastrar\n' +
    '• O bot extrai os dados automaticamente\n' +
    '• Edite e publique com os botoes\n\n' +
    '*Blog:*\n' +
    '/newpost - Criar novo post no blog\n' +
    '/posts - Listar todos os posts\n' +
    '/publish\\_post\\_ID - Publicar post (ex: /publish\\_post\\_abc123)\n' +
    '/delete\\_post\\_ID - Deletar post\n\n' +
    '*Geral:*\n' +
    '/start - Menu inicial\n' +
    '/cancel - Cancelar operacao\n' +
    '/help - Esta mensagem',
    { parse_mode: 'Markdown' }
  );
});

// Cancel command
bot.command('cancel', async (ctx) => {
  const chatId = ctx.chat?.id;
  if (chatId) {
    await clearSession(chatId);
  }
  await ctx.reply('❌ Operacao cancelada.');
});

// ==================== BLOG COMMANDS ====================

// New post command
bot.command('newpost', async (ctx) => {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  await updateSession(chatId, BotState.WAITING_BLOG_TITLE, {});
  await ctx.reply(
    '📝 *Criar novo post no blog*\n\n' +
    'Digite o *titulo* do post:',
    { parse_mode: 'Markdown' }
  );
});

// List posts command
bot.command('posts', async (ctx) => {
  const posts = await prisma.post.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  if (posts.length === 0) {
    await ctx.reply('📭 Nenhum post encontrado.\n\nUse /newpost para criar um.');
    return;
  }

  let message = '📚 *Ultimos posts:*\n\n';
  for (const post of posts) {
    const status = post.published ? '✅' : '📝';
    message += `${status} *${post.title}*\n`;
    message += `   ID: \`${post.id}\`\n`;
    message += `   Slug: /${post.slug}\n`;
    message += `   ${post.published ? 'Publicado' : 'Rascunho'}\n\n`;
  }

  message += '_Comandos:_\n';
  message += '/publish\\_post\\_ID - Publicar\n';
  message += '/delete\\_post\\_ID - Deletar';

  await ctx.reply(message, { parse_mode: 'Markdown' });
});

// Publish post command
bot.hears(/^\/publish_post_(.+)$/, async (ctx) => {
  const postId = ctx.match[1];

  try {
    const post = await prisma.post.update({
      where: { id: postId },
      data: { published: true },
    });

    revalidatePath('/blog');
    revalidatePath(`/blog/${post.slug}`);

    await ctx.reply(
      `✅ Post publicado!\n\n*${post.title}*\n\nAcesse: /blog/${post.slug}`,
      { parse_mode: 'Markdown' }
    );
  } catch {
    await ctx.reply('❌ Post nao encontrado. Verifique o ID.');
  }
});

// Delete post command
bot.hears(/^\/delete_post_(.+)$/, async (ctx) => {
  const postId = ctx.match[1];

  try {
    const post = await prisma.post.delete({
      where: { id: postId },
    });

    revalidatePath('/blog');

    await ctx.reply(`🗑️ Post deletado: *${post.title}*`, { parse_mode: 'Markdown' });
  } catch {
    await ctx.reply('❌ Post nao encontrado. Verifique o ID.');
  }
});

// ==================== PRODUCT HANDLERS ====================

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
      await ctx.reply(
        `❌ Nao consegui ler este link.\n\nErro: ${scrapedData.error}\n\n` +
        '📸 Envie uma foto do produto e depois eu peco os detalhes manualmente.'
      );
      await updateSession(chatId, BotState.WAITING_IMAGE, { url, storeName });
      return;
    }

    const sessionData: SessionData = {
      url,
      title: scrapedData.title || undefined,
      image: scrapedData.image || undefined,
      price: scrapedData.price || undefined,
      originalPrice: scrapedData.originalPrice || undefined,
      storeName,
      affiliateLink: url,
    };

    await updateSession(chatId, BotState.IDLE, sessionData);

    let message = '📦 *Dados encontrados:*\n\n';
    message += `🏪 Loja: ${storeName}\n`;
    message += `📝 Titulo: ${scrapedData.title || '❌ Nao encontrado'}\n`;
    message += `💰 Preco: ${scrapedData.price ? `R$ ${scrapedData.price.toFixed(2)}` : '❌ Nao encontrado'}\n`;
    if (scrapedData.originalPrice) {
      const discount = Math.round(((scrapedData.originalPrice - (scrapedData.price || 0)) / scrapedData.originalPrice) * 100);
      message += `💵 Preco Original: R$ ${scrapedData.originalPrice.toFixed(2)} (${discount}% OFF)\n`;
    }
    message += `🖼️ Imagem: ${scrapedData.image ? '✅ Encontrada' : '❌ Nao encontrada'}\n\n`;
    message += 'Voce pode editar os campos ou publicar diretamente:';

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

    if (scrapedData.image) {
      try {
        await ctx.replyWithPhoto(scrapedData.image, {
          caption: message,
          parse_mode: 'Markdown',
          reply_markup: keyboard,
        });
      } catch {
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
    return;
  }

  const data = session.data as SessionData;
  const text = ctx.message.text;

  switch (session.state) {
    // Product states
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
      data.title = text;
      await updateSession(chatId, BotState.WAITING_PRICE, data);
      await ctx.reply('✅ Titulo salvo! Agora me envie o *preco* (ex: 99.90):', {
        parse_mode: 'Markdown',
      });
      break;

    // Blog states
    case BotState.WAITING_BLOG_TITLE:
      data.blogTitle = text;
      data.blogSlug = generateSlug(text);
      await updateSession(chatId, BotState.WAITING_BLOG_CONTENT, data);
      await ctx.reply(
        `✅ Titulo: *${text}*\n` +
        `📎 Slug: \`${data.blogSlug}\`\n\n` +
        'Agora digite o *conteudo* do post:\n\n' +
        '_Dica: Voce pode usar varias mensagens. Quando terminar, envie /done_',
        { parse_mode: 'Markdown' }
      );
      break;

    case BotState.WAITING_BLOG_CONTENT:
      if (text === '/done') {
        // Save blog post
        if (!data.blogTitle || !data.blogContent) {
          await ctx.reply('❌ Titulo ou conteudo vazio. Use /newpost para comecar novamente.');
          await clearSession(chatId);
          return;
        }

        try {
          const post = await prisma.post.create({
            data: {
              title: data.blogTitle,
              slug: data.blogSlug || generateSlug(data.blogTitle),
              content: data.blogContent,
              published: false,
            },
          });

          await clearSession(chatId);
          
          const keyboard = new InlineKeyboard()
            .text('✅ Publicar agora', `publish_blog_${post.id}`)
            .text('📝 Manter rascunho', 'keep_draft');

          await ctx.reply(
            `✅ *Post criado com sucesso!*\n\n` +
            `📝 *${post.title}*\n` +
            `📎 Slug: \`${post.slug}\`\n` +
            `📊 Status: Rascunho\n\n` +
            `ID: \`${post.id}\``,
            { parse_mode: 'Markdown', reply_markup: keyboard }
          );
        } catch (error: any) {
          if (error.code === 'P2002') {
            await ctx.reply('❌ Ja existe um post com esse slug. Tente outro titulo.');
          } else {
            await ctx.reply('❌ Erro ao criar post. Tente novamente.');
          }
        }
      } else {
        // Append content
        data.blogContent = data.blogContent ? data.blogContent + '\n\n' + text : text;
        await updateSession(chatId, BotState.WAITING_BLOG_CONTENT, data);
        await ctx.reply('✅ Conteudo adicionado. Continue escrevendo ou envie /done para finalizar.');
      }
      break;
  }
});

// Handle blog publish from inline button
bot.on('callback_query:data', async (ctx) => {
  const action = ctx.callbackQuery.data;

  if (action.startsWith('publish_blog_')) {
    const postId = action.replace('publish_blog_', '');
    
    try {
      const post = await prisma.post.update({
        where: { id: postId },
        data: { published: true },
      });

      revalidatePath('/blog');
      revalidatePath(`/blog/${post.slug}`);

      await ctx.editMessageText(
        `✅ *Post publicado!*\n\n` +
        `📝 *${post.title}*\n` +
        `🔗 /blog/${post.slug}`,
        { parse_mode: 'Markdown' }
      );
      await ctx.answerCallbackQuery({ text: 'Post publicado!' });
    } catch {
      await ctx.answerCallbackQuery({ text: 'Erro ao publicar.' });
    }
  } else if (action === 'keep_draft') {
    await ctx.editMessageText(
      ctx.callbackQuery.message?.text + '\n\n_Mantido como rascunho. Use /posts para ver._',
      { parse_mode: 'Markdown' }
    );
    await ctx.answerCallbackQuery({ text: 'Mantido como rascunho.' });
  }
});

async function publishProduct(ctx: Context, data: SessionData) {
  try {
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
