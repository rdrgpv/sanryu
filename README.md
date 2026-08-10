# San·Ryu Dojo — Morganti Ju-Jitsu

Site institucional e painel administrativo do San·Ryu Dojo, dedicado ao Método
Morganti Ju-Jitsu. Monorepo com API em Node.js/Express/Sequelize (SQLite/MySQL)
e frontend em React/Vite.

## Estrutura

```
sanryu/
├── backend/     # API REST (Express + Sequelize + SQLite)
└── frontend/    # Site público + painel admin (React + Vite)
```

## Pré-requisitos

- Node.js 18+ (recomendado) e npm

## Como rodar

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run seed     # popula o banco com admin + dados de exemplo
npm run dev       # http://localhost:4000
```

Edite `.env` para trocar `JWT_SECRET` e as credenciais padrão de admin antes de
rodar `npm run seed`. A credencial fixa do Gatame (`GATAME_URL`/`GATAME_EMAIL`/
`GATAME_SENHA`, usada para consultar a API de carteirinha na inscrição
pública) fica na tabela de Configurações, editável em `/admin/configuracoes`
sem precisar reiniciar o servidor — se as variáveis equivalentes existirem no
`.env` no momento do `npm run seed`, elas só são usadas para pré-popular essa
tabela na primeira vez. A cidade usada no QR code Pix fica no próprio
cadastro da conta em `/admin/bancos`.

### Frontend

Em outro terminal:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev       # http://localhost:5173
```

O frontend consome a API a partir de `VITE_API_URL` (definida em
`frontend/.env`, padrão `http://localhost:4000/api`).

## Login padrão

Após rodar `npm run seed`, use as credenciais definidas em `backend/.env`
(`ADMIN_DEFAULT_USER` / `ADMIN_DEFAULT_PASSWORD`) para entrar em
`/login` e acessar o painel `/admin`.

## Scripts disponíveis

**backend/**
- `npm run dev` — sobe a API com reload automático (nodemon)
- `npm start` — sobe a API em modo produção
- `npm run seed` — popula o banco (idempotente, só cria o que faltar)

**frontend/**
- `npm run dev` — sobe o site em modo desenvolvimento
- `npm run build` — gera build de produção em `frontend/dist`
- `npm run preview` — serve o build de produção localmente

## API

Ver detalhes completos dos modelos e endpoints nos arquivos de rotas em
`backend/src/routes/`. Resumo:

- `GET /api/turmas`, `GET /api/instrutores`, `POST /api/contato` — públicos
- `GET /api/eventos`, `GET /api/eventos/:id/publico` — listagem/detalhe de
  eventos publicados
- `POST /api/eventos/:id/consulta`, `POST /api/eventos/:id/inscricoes` —
  fluxo público de inscrição em evento (consulta a API de carteirinha e
  geração do QR code Pix)
- `POST /api/auth/login` — autenticação, retorna JWT
- `/api/admin/*` — protegidas por JWT (`Authorization: Bearer <token>`);
  CRUD de alunos, turmas, instrutores, matrículas, faixas, tipos de evento,
  eventos (+ listagem de inscrições), configuração de conta Pix e
  configurações gerais (tabela chave/valor, ex.: credencial do Gatame), além
  de `GET /api/admin/dashboard` com contadores gerais

## Banco de dados

SQLite em arquivo único (`backend/database.sqlite`), criado automaticamente
na primeira execução — não requer instalação de servidor de banco.
