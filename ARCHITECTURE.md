# ARCHITECTURE & WORKFLOW

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER EXPERIENCE                          │
│                                                                   │
│  👤 Website Visitor                    🛠️  Admin (You)           │
│     │                                       │                     │
│     │ Browses deals                         │ Sends product link  │
│     │ Filters by store                      │                     │
│     │ Copies coupons                        ▼                     │
│     │                                  📱 TELEGRAM BOT            │
│     │                                       │                     │
│     │                                       │ 1. Receives URL     │
│     │                                       │ 2. Scrapes data     │
│     │                                       │ 3. Shows preview    │
│     │                                       │ 4. Awaits approval  │
│     │                                       │ 5. Saves to DB      │
│     │                                       │                     │
│     ▼                                       ▼                     │
│  🌐 NEXT.JS APP ◄─────────────────► 💾 POSTGRESQL DATABASE      │
│     │                                       │                     │
│     │ • ISR (revalidates)                   │ • Products          │
│     │ • SEO optimized                       │ • Blog posts        │
│     │ • Responsive design                   │ • Bot sessions      │
│     │                                       │                     │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow: Adding a New Product

```
1️⃣  ADMIN SENDS LINK
    │
    ▼
    📱 Telegram Bot receives: 
    "https://amazon.com.br/product/..."
    │
    │
2️⃣  BOT SCRAPES THE PAGE
    │
    ▼
    🕷️  Scraper extracts:
    • og:title → "Smartphone XYZ 128GB"
    • og:image → "https://..."
    • og:description → "..."
    • price → R$ 1.299,00
    │
    │
3️⃣  BOT SHOWS PREVIEW
    │
    ▼
    📸 Telegram message:
    ┌─────────────────────────────┐
    │   [Product Image]           │
    ├─────────────────────────────┤
    │ 🏪 Loja: Amazon             │
    │ 📝 Título: Smartphone...    │
    │ 💰 Preço: R$ 1.299,00       │
    │ 🖼️ Imagem: ✅ Encontrada    │
    ├─────────────────────────────┤
    │ [✏️ Editar Título]          │
    │ [✏️ Editar Preço]           │
    │ [💵 Preço Original]         │
    │ [🎟️ Adicionar Cupom]        │
    │ [📂 Categoria]              │
    │ [✅ Publicar] [❌ Cancelar] │
    └─────────────────────────────┘
    │
    │
4️⃣  ADMIN EDITS (OPTIONAL)
    │
    ▼
    Admin clicks: "💵 Preço Original"
    Bot asks: "Digite o preço original"
    Admin types: "1999.90"
    │
    Admin clicks: "🎟️ Adicionar Cupom"
    Bot asks: "Digite o código"
    Admin types: "DESCONTO20"
    │
    │
5️⃣  ADMIN PUBLISHES
    │
    ▼
    Admin clicks: "✅ Publicar"
    │
    │
6️⃣  SAVED TO DATABASE
    │
    ▼
    💾 PostgreSQL:
    INSERT INTO Product (
      title: "Smartphone XYZ 128GB",
      price: 1299.00,
      originalPrice: 1999.90,
      couponCode: "DESCONTO20",
      image: "https://...",
      storeName: "Amazon",
      affiliateLink: "https://...",
      createdAt: NOW()
    )
    │
    │
7️⃣  SITE UPDATES AUTOMATICALLY
    │
    ▼
    🌐 Next.js ISR revalidates
    │
    │
8️⃣  LIVE ON WEBSITE!
    │
    ▼
    👤 Visitor sees the new deal:
    ┌─────────────────────────────┐
    │   [Product Image]           │
    │   🏪 Amazon    🔥 -35%      │
    │                             │
    │   Smartphone XYZ 128GB      │
    │                             │
    │   ~~R$ 1.999,90~~           │
    │   💚 R$ 1.299,00            │
    │                             │
    │   ┌─────────────────────┐   │
    │   │ 🎟️ Cupom: DESCONTO20│   │
    │   │ [DESCONTO20] [📋]   │   │
    │   └─────────────────────┘   │
    │                             │
    │   [🛒 Pegar Promoção]       │
    │                             │
    │   🕐 2 minutos atrás        │
    └─────────────────────────────┘
```

## Fallback Flow (When Scraping Fails)

```
1️⃣  ADMIN SENDS LINK
    │
    ▼
2️⃣  SCRAPER FAILS (403, blocked, etc.)
    │
    ▼
    Bot: "❌ Não consegui ler este link.
          📸 Envie uma foto do produto"
    │
    ▼
3️⃣  ADMIN SENDS PHOTO
    │
    ▼
    Bot: "✅ Foto recebida!
          📝 Digite o título:"
    │
    ▼
4️⃣  ADMIN TYPES TITLE
    │
    ▼
    Bot: "💰 Digite o preço:"
    │
    ▼
5️⃣  ADMIN TYPES PRICE
    │
    ▼
    Bot: "✅ Dados completos!
          [✅ Publicar]"
    │
    ▼
6️⃣  PUBLISHED!
```

## Tech Stack Layers

```
┌─────────────────────────────────────────────┐
│              PRESENTATION LAYER              │
│  • Next.js 14 App Router                    │
│  • React Server Components                  │
│  • Tailwind CSS + Shadcn/UI                 │
│  • Responsive Grid Layout                   │
└─────────────────────────────────────────────┘
                    ▲
                    │
┌─────────────────────────────────────────────┐
│              APPLICATION LAYER               │
│  • Grammy.js Bot Framework                  │
│  • Cheerio Web Scraper                      │
│  • ISR (Incremental Static Regeneration)    │
│  • Server Actions                           │
└─────────────────────────────────────────────┘
                    ▲
                    │
┌─────────────────────────────────────────────┐
│                 DATA LAYER                   │
│  • Prisma ORM                               │
│  • PostgreSQL Database                      │
│  • Type-safe queries                        │
└─────────────────────────────────────────────┘
                    ▲
                    │
┌─────────────────────────────────────────────┐
│            INFRASTRUCTURE LAYER              │
│  • Vercel (Edge Network)                    │
│  • Supabase/Neon (Database)                 │
│  • Telegram API (Bot)                       │
└─────────────────────────────────────────────┘
```

## Database Schema

```
┌──────────────────────────────────────────────────┐
│                    Product                        │
├──────────────────────────────────────────────────┤
│ id              String (cuid)    PK              │
│ title           String                           │
│ affiliateLink   String                           │
│ originalLink    String                           │
│ image           String                           │
│ price           Float                            │
│ originalPrice   Float?           NULLABLE        │
│ couponCode      String?          NULLABLE        │
│ storeName       String           INDEXED         │
│ category        String?          INDEXED         │
│ createdAt       DateTime         INDEXED         │
│ updatedAt       DateTime                         │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│                      Post                         │
├──────────────────────────────────────────────────┤
│ id              String (cuid)    PK              │
│ title           String                           │
│ slug            String           UNIQUE, INDEXED │
│ content         Text                             │
│ published       Boolean          INDEXED         │
│ createdAt       DateTime                         │
│ updatedAt       DateTime                         │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│                   BotSession                      │
├──────────────────────────────────────────────────┤
│ id              String (cuid)    PK              │
│ chatId          BigInt           UNIQUE, INDEXED │
│ state           String           (FSM state)     │
│ data            Json             (temp data)     │
│ createdAt       DateTime                         │
│ updatedAt       DateTime                         │
└──────────────────────────────────────────────────┘
```

## API Routes

```
📁 src/app/api/
│
└── telegram/
    └── webhook/
        └── route.ts
            │
            ├── POST /api/telegram/webhook
            │   • Receives updates from Telegram
            │   • Processes bot commands
            │   • Handles inline buttons
            │   • Manages conversation state
            │   • Saves products to database
            │
            └── Authentication: 
                • Verifies webhook secret (optional)
                • Checks admin Telegram ID
```

## Page Routes

```
📁 src/app/
│
├── page.tsx
│   └── GET /
│       • Redirects to /promocoes-do-dia
│
├── promocoes-do-dia/
│   └── page.tsx
│       └── GET /promocoes-do-dia
│           • Server-side rendering
│           • ISR (revalidate: 60s)
│           • Fetches products from DB
│           • Client-side filtering
│
└── blog/
    ├── page.tsx
    │   └── GET /blog
    │       • Lists all published posts
    │       • ISR (revalidate: 300s)
    │
    └── [slug]/
        └── page.tsx
            └── GET /blog/[slug]
                • Dynamic route
                • Static generation
                • Individual post page
```

## Component Hierarchy

```
RootLayout
│
├── Header
│   ├── Logo
│   └── Navigation
│       ├── Link: Promoções do Dia
│       └── Link: Blog
│
├── Page Content
│   │
│   ├── PromocoesDoDialPage (Server Component)
│   │   └── DealsClient (Client Component)
│   │       ├── FilterSidebar
│   │       │   ├── Store Filters
│   │       │   └── Category Filters
│   │       │
│   │       └── Products Grid
│   │           └── ProductCard (multiple)
│   │               ├── Image
│   │               ├── Store Badge
│   │               ├── Discount Badge
│   │               ├── Title
│   │               ├── Prices
│   │               ├── Coupon (if exists)
│   │               ├── "Pegar Promoção" Button
│   │               └── Timestamp
│   │
│   └── BlogPage (Server Component)
│       └── Post Cards Grid
│           └── PostCard (multiple)
│
├── Footer
│   └── Copyright
│
└── Toaster (for notifications)
```

## Performance Optimizations

1. **ISR (Incremental Static Regeneration)**
   - Deals page: revalidate every 60 seconds
   - Blog page: revalidate every 300 seconds
   - Best of both worlds: static + fresh

2. **Image Optimization**
   - next/image with automatic optimization
   - Remote patterns allowed
   - Lazy loading

3. **Database Indexes**
   - createdAt (for sorting)
   - storeName (for filtering)
   - category (for filtering)
   - chatId (for bot sessions)

4. **Client-side Filtering**
   - useMemo for filtered products
   - No server requests for filter changes

## Security Considerations

1. **Environment Variables**
   - All secrets in .env
   - Never committed to git
   - Verified on build

2. **Bot Authentication** (Optional enhancement)
   - Verify ADMIN_TELEGRAM_ID
   - Reject unauthorized users

3. **Database**
   - Prisma prevents SQL injection
   - Type-safe queries

4. **API Routes**
   - Webhook secret verification (recommended)
   - Rate limiting (Vercel provides this)

## Monitoring & Debugging

```
Vercel Dashboard:
• Real-time logs
• Function invocations
• Error tracking
• Performance metrics

Prisma Studio:
npx prisma studio
• Visual database browser
• Edit records
• View relationships

Telegram Bot Logs:
• Bot responses
• Scraper results
• Database operations
```

---

This architecture provides:
✅ Scalability
✅ Type safety
✅ SEO optimization
✅ Developer experience
✅ Production-ready
✅ Easy deployment
