# GW Painel Suspensos

Painel administrativo para gestao de suspensos.

## Requisitos
- Node.js 18+ (ou 20+ recomendado)
- npm

## Instalacao
npm install

## Desenvolvimento
npm run dev

## Build e start
npm run build
npm run start

## Lint
npm run lint

## Variaveis de ambiente
Crie um arquivo .env com as variaveis necessarias.

### Logs e diagnostico
- `LOG_LEVEL=debug` para exibir todo o fluxo (API + CITSMART) no terminal.
- `LOG_LEVEL=info` para logs essenciais (padrao).
- `CITSMART_REQUEST_TIMEOUT_MS=20000` timeout por request no CITSMART.
- `CITSMART_REQUEST_RETRIES=2` tentativas extras em falha de rede.
