# Outreach Dashboard (Mar de Leads - China)

Dashboard comercial para enriquecimento e prospecção de leads, integrado com HubSpot e n8n.

## Tecnologias

- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL (Supabase) via Prisma ORM
- **Styling**: Tailwind CSS
- **Icons**: Lucide React

## Requisitos

- Node.js 18+
- PostgreSQL Database URL (Supabase recommended)

## Setup Local

1.  **Instalar dependências**:
    ```bash
    npm install
    ```

2.  **Configurar Variáveis de Ambiente**:
    Crie um arquivo `.env` na raiz do projeto com a seguinte variável:
    ```env
    DATABASE_URL="postgresql://user:password@host:port/database?pgbouncer=true"
    ```
    *Nota: Se usar Supabase com Transaction Mode (pgbouncer), adicione `?pgbouncer=true` ao final da URL.*

3.  **Gerar Client do Prisma**:
    ```bash
    npx prisma generate
    ```

4.  **Rodar Aplicação**:
    ```bash
    npm run dev
    ```
    Acesse: `http://localhost:3000`

## Deploy no Vercel

1.  Faça o push deste repositório para o GitHub/GitLab.
2.  Importe o projeto no Vercel.
3.  Nas configurações do projeto no Vercel, adicione a variável de ambiente:
    -   `DATABASE_URL`: A mesma string de conexão do seu banco de dados (Production String).
4.  O Vercel detectará automaticamente o Next.js e fará o build.
    -   *Build Command*: `next build` (Padrão)
    -   *Install Command*: `npm install` (Padrão)

## Funcionalidades

-   **Dashboard**: Visualização de empresas e contatos.
-   **Filtros**: Por Dono (Vanessa/Débora), Status e Senioridade.
-   **Busca**: Pesquisa em tempo real.
-   **Ações**: Copiar e-mail/telefone, Link direto para WhatsApp e LinkedIn.
-   **Integração HubSpot**: Envia leads qualificados para o CRM via Webhook n8n.
