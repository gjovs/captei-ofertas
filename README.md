# Captei Ofertas - SaaS de Afiliados com Telegram Bot

## Descrição

Sistema completo de afiliados com integração de Telegram Bot para gerenciamento de ofertas. O admin simplesmente envia um link no Telegram, e o sistema automaticamente extrai as informações e publica no site.

## Estrutura do Projeto

```
captei-ofertas/
├── prisma/
│   └── schema.prisma                 # Schema do banco de dados
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── telegram/
│   │   │       └── webhook/
│   │   │           └── route.ts      # Webhook do Telegram Bot
│   │   ├── blog/
│   │   │   ├── [slug]/
│   │   │   │   └── page.tsx          # Página individual do post
│   │   │   └── page.tsx              # Lista de posts do blog
│   │   ├── promocoes-do-dia/
│   │   │   ├── deals-client.tsx      # Cliente com filtros
│   │   │   └── page.tsx              # Página principal de ofertas
│   │   ├── globals.css               # Estilos globais
│   │   ├── layout.tsx                # Layout raiz
│   │   └── page.tsx                  # Homepage (redireciona)
│   ├── components/
│   │   ├── ui/                       # Componentes Shadcn/UI
│   │   │   ├── badge.tsx
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── toaster.tsx
│   │   │   └── use-toast.ts
│   │   ├── filter-sidebar.tsx        # Filtro de lojas/categorias
│   │   └── product-card.tsx          # Card do produto
│   └── lib/
│       ├── db.ts                     # Cliente Prisma
│       ├── scraper.ts                # Lógica de scraping
│       └── utils.ts                  # Funções utilitárias
├── .env.example                      # Template de variáveis de ambiente
├── .gitignore
├── next.config.mjs
├── package.json
├── postcss.config.js
├── tailwind.config.ts
└── tsconfig.json
```

## Tecnologias Utilizadas

- **Framework**: Next.js 14+ (App Router)
- **Linguagem**: TypeScript
- **Estilização**: Tailwind CSS + Shadcn/UI
- **Banco de Dados**: PostgreSQL (Supabase/Neon)
- **ORM**: Prisma
- **Bot**: Grammy.js
- **Scraping**: Cheerio
- **Deploy**: Vercel

## Instalação

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais:

```env
DATABASE_URL="postgresql://user:password@host:5432/database"
TELEGRAM_BOT_TOKEN="seu_token_do_bot"
TELEGRAM_WEBHOOK_SECRET="uma_string_aleatoria_segura"
ADMIN_TELEGRAM_ID="seu_id_do_telegram"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

### 3. Configurar o Banco de Dados

```bash
# Executar migrations
npx prisma migrate dev --name init

# Gerar o Prisma Client
npx prisma generate
```

### 4. Executar o Projeto Localmente

```bash
npm run dev
```

O site estará disponível em `http://localhost:3000`

## Como Configurar o Telegram Bot

### 1. Criar o Bot

1. Abra o Telegram e procure por [@BotFather](https://t.me/botfather)
2. Envie `/newbot`
3. Escolha um nome e username para o bot
4. Copie o token fornecido e adicione ao `.env`

### 2. Obter seu Telegram ID

1. Procure por [@userinfobot](https://t.me/userinfobot) no Telegram
2. Inicie uma conversa
3. O bot retornará seu ID
4. Adicione ao `.env` na variável `ADMIN_TELEGRAM_ID`

### 3. Configurar o Webhook

Após fazer o deploy no Vercel, execute:

```bash
curl -X POST "https://api.telegram.org/bot{SEU_TOKEN}/setWebhook?url=https://seu-dominio.vercel.app/api/telegram/webhook"
```

Substitua:
- `{SEU_TOKEN}` pelo token do bot
- `seu-dominio.vercel.app` pela URL do seu deploy

## Como Usar o Bot

### Adicionar Nova Oferta

1. Envie um link de produto para o bot
2. O bot tentará extrair automaticamente:
   - Título
   - Imagem
   - Preço
   - Descrição

3. O bot mostrará uma prévia com botões para:
   - ✏️ Editar Título
   - ✏️ Editar Preço
   - 💵 Adicionar Preço Original
   - 🎟️ Adicionar Cupom
   - 📂 Adicionar Categoria
   - 📸 Trocar Imagem
   - ✅ Publicar

4. Após publicar, a oferta aparece automaticamente no site

### Comandos do Bot

- `/start` - Iniciar o bot
- `/cancel` - Cancelar operação atual

## Deploy na Vercel

### 1. Conectar o Repositório

1. Faça push do código para o GitHub
2. Acesse [vercel.com](https://vercel.com)
3. Importe o repositório

### 2. Configurar Variáveis de Ambiente

Adicione todas as variáveis do `.env` no painel da Vercel:
- `DATABASE_URL`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `ADMIN_TELEGRAM_ID`
- `NEXT_PUBLIC_SITE_URL`

### 3. Deploy

A Vercel fará o deploy automaticamente.

### 4. Configurar o Webhook do Telegram

Após o deploy, execute o comando curl mencionado anteriormente.

## Banco de Dados

### Usar Supabase (Recomendado)

1. Crie uma conta em [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Vá em Settings → Database
4. Copie a Connection String (URI mode)
5. Adicione ao `.env` como `DATABASE_URL`

### Usar Neon

1. Crie uma conta em [neon.tech](https://neon.tech)
2. Crie um novo projeto
3. Copie a Connection String
4. Adicione ao `.env` como `DATABASE_URL`

## Features Principais

### ✅ Telegram Bot CMS
- Adicionar ofertas enviando links
- Scraping automático de dados
- Fallback manual se o scraping falhar
- Interface interativa com botões inline
- Edição de campos individuais
- Upload de imagens manualmente

### ✅ Frontend
- Grid responsivo de ofertas
- Filtros por loja e categoria
- Badge de desconto automático
- Botão de copiar cupom
- Timestamp de publicação
- ISR (Incremental Static Regeneration)

### ✅ SEO
- Metadata dinâmica
- Open Graph tags
- URLs amigáveis
- Blog para conteúdo adicional

## Próximos Passos (Melhorias Futuras)

- [ ] Admin panel web
- [ ] Sistema de afiliados (conversão de links)
- [ ] Notificações push para novos deals
- [ ] API pública
- [ ] Analytics de cliques
- [ ] Sistema de favoritos
- [ ] Busca avançada
- [ ] Categorias personalizadas
- [ ] Multi-admin

## Suporte

Para problemas ou dúvidas, abra uma issue no repositório.

## Licença

MIT
