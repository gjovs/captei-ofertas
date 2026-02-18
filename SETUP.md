# SETUP GUIDE - Captei Ofertas

## Quick Start (5 minutos)

### Passo 1: Instalar dependencias
```bash
pnpm install
# ou
npm install
```

### Passo 2: Criar arquivo .env
```bash
cp .env.example .env
```

Edite `.env` e configure:
```env
DATABASE_URL="postgresql://..."  # Seu PostgreSQL (Neon)
TELEGRAM_BOT_TOKEN="123456:ABC..." # Do @BotFather
TELEGRAM_WEBHOOK_SECRET="random_secret_here"
ADMIN_TELEGRAM_ID="123456789" # Seu ID do Telegram (OBRIGATORIO)
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

### Passo 3: Setup do banco de dados
```bash
npx prisma migrate dev --name init
npx prisma generate
```

### Passo 4: Rodar o projeto
```bash
pnpm dev
# ou
npm run dev
```

Acesse: http://localhost:3000

---

## Como obter as credenciais

### 1. TOKEN DO TELEGRAM BOT

1. Abra o Telegram
2. Procure por: @BotFather
3. Envie: `/newbot`
4. Siga as instrucoes
5. Copie o token fornecido

### 2. SEU TELEGRAM ID

1. Procure por: @userinfobot
2. Inicie conversa
3. Copie o numero que aparece
4. **IMPORTANTE**: Este ID e usado para autenticacao - apenas voce pode usar o bot

### 3. BANCO DE DADOS (Neon - GRATIS)

1. Acesse: https://neon.tech
2. Crie uma conta (pode usar GitHub/Google)
3. Clique em "Create Project"
4. Nome: `captei-ofertas`
5. Apos criar, copie a "Connection String"
6. Cole no .env como DATABASE_URL

**Exemplo de connection string:**
```
postgresql://username:password@ep-xxx-yyy-123456.us-east-1.aws.neon.tech/neondb?sslmode=require
```

---

## Deploy na Vercel (GRATIS)

### 1. Criar repositorio no GitHub

```bash
# Inicializar git (se ainda nao fez)
git init
git add .
git commit -m "Initial commit"

# Criar repositorio no GitHub e fazer push
gh repo create captei-ofertas --public --push
# ou manualmente via github.com
```

### 2. Deploy na Vercel

1. Acesse: https://vercel.com
2. Faca login com sua conta GitHub
3. Clique em "Add New Project"
4. Selecione o repositorio `captei-ofertas`
5. Configure as variaveis de ambiente:

| Variavel | Valor |
|----------|-------|
| `DATABASE_URL` | Sua connection string do Neon |
| `TELEGRAM_BOT_TOKEN` | Token do @BotFather |
| `TELEGRAM_WEBHOOK_SECRET` | Uma string aleatoria |
| `ADMIN_TELEGRAM_ID` | Seu ID do Telegram |
| `NEXT_PUBLIC_SITE_URL` | `https://capteiofertas.com.br` |

6. Clique em "Deploy"
7. Aguarde o deploy finalizar

### 3. Configurar dominio personalizado (capteiofertas.com.br)

#### Na Vercel:
1. Va em Settings → Domains
2. Adicione: `capteiofertas.com.br`
3. Adicione tambem: `www.capteiofertas.com.br`

#### No Registro.br:
1. Acesse: https://registro.br
2. Entre na gestao do dominio `capteiofertas.com.br`
3. Va em "DNS" → "Editar zona"
4. Adicione os seguintes registros:

| Tipo | Nome | Valor |
|------|------|-------|
| A | @ | `76.76.21.21` |
| CNAME | www | `cname.vercel-dns.com.` |

5. Salve e aguarde a propagacao (pode levar ate 48h, geralmente 1-2h)

### 4. Rodar migrations no banco de producao

Apos o primeiro deploy, rode as migrations:

```bash
# Defina a DATABASE_URL de producao temporariamente
export DATABASE_URL="sua_connection_string_neon"

# Rode as migrations
npx prisma migrate deploy
```

### 5. Configurar webhook do Telegram

**IMPORTANTE**: So faca isso APOS o dominio estar funcionando.

```bash
curl -X POST "https://api.telegram.org/bot{SEU_TOKEN}/setWebhook?url=https://capteiofertas.com.br/api/telegram/webhook"
```

Substitua `{SEU_TOKEN}` pelo token do seu bot.

**Verificar se o webhook esta ativo:**
```bash
curl "https://api.telegram.org/bot{SEU_TOKEN}/getWebhookInfo"
```

---

## Usando o Bot

### Adicionar uma oferta:

1. Abra seu bot no Telegram
2. Envie: `/start`
3. Cole um link de produto (ex: link da Amazon)
4. O bot vai extrair os dados automaticamente
5. Use os botoes para editar o que precisar
6. Clique em "Publicar"
7. A oferta aparece no site INSTANTANEAMENTE!

### Comandos disponiveis:

| Comando | Descricao |
|---------|-----------|
| `/start` | Iniciar o bot |
| `/help` | Ver ajuda |
| `/cancel` | Cancelar operacao atual |

### Se o scraping falhar:

O bot vai pedir os dados manualmente:
1. Envie a foto do produto
2. Digite o titulo
3. Digite o preco
4. Confirme e publique

---

## Checklist de Deploy

- [ ] Conta criada no Neon
- [ ] Banco de dados criado
- [ ] Connection string copiada
- [ ] Bot criado no @BotFather
- [ ] Token do bot copiado
- [ ] Seu Telegram ID obtido
- [ ] Projeto no GitHub
- [ ] Projeto na Vercel
- [ ] Variaveis de ambiente configuradas
- [ ] Deploy realizado com sucesso
- [ ] Dominio configurado na Vercel
- [ ] DNS configurado no Registro.br
- [ ] Migrations rodadas em producao
- [ ] Webhook do Telegram configurado
- [ ] Teste: enviar link para o bot
- [ ] Teste: verificar produto no site

---

## Estrutura de Pastas

```
captei-ofertas/
│
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── api/
│   │   │   └── telegram/webhook/     # Webhook do Bot
│   │   ├── promocoes-do-dia/         # Pagina principal
│   │   ├── blog/                     # Blog para SEO
│   │   ├── layout.tsx                # Layout global
│   │   └── page.tsx                  # Homepage
│   │
│   ├── components/                   # Componentes React
│   │   ├── ui/                       # Shadcn/UI components
│   │   ├── mobile-menu.tsx           # Menu hamburger mobile
│   │   ├── product-card.tsx          # Card do produto
│   │   ├── product-skeleton.tsx      # Loading skeleton
│   │   └── filter-sidebar.tsx        # Filtros
│   │
│   └── lib/                          # Logica do backend
│       ├── db.ts                     # Prisma Client
│       ├── scraper.ts                # Web Scraper
│       └── utils.ts                  # Funcoes utilitarias
│
├── prisma/
│   └── schema.prisma                 # Schema do DB
│
├── .env                              # Configuracoes
└── README.md                         # Documentacao
```

---

## Troubleshooting

### Erro: "Cannot find module '@prisma/client'"
```bash
npx prisma generate
```

### Erro: "Webhook is not set"
Execute o comando curl de configuracao do webhook novamente.

### Erro: "Database connection failed"
Verifique se o DATABASE_URL esta correto no .env

### Bot nao responde
1. Verifique se o TELEGRAM_BOT_TOKEN esta correto
2. Confirme que o webhook foi configurado
3. Veja os logs no Vercel Dashboard
4. Verifique se seu ADMIN_TELEGRAM_ID esta correto

### Bot diz "Acesso negado"
- Verifique se o ADMIN_TELEGRAM_ID no .env corresponde ao seu ID real
- Use @userinfobot para confirmar seu ID

### DNS nao propaga
- Aguarde ate 48 horas
- Use https://dnschecker.org para verificar
- Confirme que os registros estao corretos no Registro.br

---

## Features Implementadas

- [x] Telegram Bot CMS completo
- [x] Autenticacao de admin no bot
- [x] Scraping automatico com fallback manual
- [x] Grid responsivo de ofertas
- [x] Menu mobile hamburger
- [x] Campo de busca de produtos
- [x] Loading skeletons
- [x] Filtros por loja e categoria
- [x] Calculo automatico de desconto
- [x] Botao de copiar cupom
- [x] SEO otimizado
- [x] Blog para conteudo
- [x] ISR (revalidacao incremental)
- [x] Deploy pronto para Vercel

---

## Proximos Passos (Opcionais)

1. Adicionar mais lojas no scraper
2. Implementar deep linking de afiliados
3. Criar dashboard admin web
4. Adicionar analytics
5. Sistema de notificacoes push
6. API publica
7. Multi-usuarios

---

## Suporte

- Documentacao Next.js: https://nextjs.org/docs
- Documentacao Prisma: https://www.prisma.io/docs
- Documentacao Grammy: https://grammy.dev
- Documentacao Vercel: https://vercel.com/docs
- Neon: https://neon.tech/docs

Boa sorte com seu projeto!
