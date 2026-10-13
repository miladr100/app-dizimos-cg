# Dízimos e Ofertas — PWA Next.js

Aplicativo mobile-first com duas telas: **Lançamento** e **Membros**, armazenamento direto no Google Sheets e cadastro/consulta/edição/exclusão em ambas as áreas.

## Compatibilidade da planilha

Foi preparado para o arquivo **Lançamendo Dízimos e Ofertas APP.xlsx**, com as abas:

- **Dizimos**: `DATA | NOME | REFERÊNCIA | VALOR | CATEGORIA | FORMA DE PAGAMENTO`
- **Membros**: `NOME | CATEGORIA` (Indivíduo, Casal, Família)

O aplicativo mantém exatamente essas colunas na ordem original. Para acompanhar linhas com segurança ao editar/excluir, **acrescenta uma coluna auxiliar `_APP_ID` na coluna G de `Dizimos` e na coluna C de `Membros`**. Elas são ocultadas automaticamente quando a conta Google tiver permissão de formatação. Não exclua esses IDs, pois são necessários às operações de edição/exclusão. Se a planilha tiver filtros, ordene a linha inteira (incluindo o ID), e não apenas as seis primeiras colunas.

Não existe coluna mensal nem geração automática de totais. A categoria do membro não altera a categoria dos lançamentos. Editar/excluir um membro **não altera os lançamentos antigos**.

## 1. Preparar o Google Sheets

A planilha definida pelo usuário:

https://docs.google.com/spreadsheets/d/[id_da_planilha]

Confira os nomes das abas: `Dizimos` (sem acento) e `Membros` (com M maiúsculo), e os cabeçalhos na linha 1. A planilha deve estar configurada com localidade **Brasil** para interpretar datas `dd/mm/aaaa` corretamente.

## 2. Criar conta de serviço Google

1. Entre no Google Cloud Console, crie ou selecione um projeto.
2. Ative **Google Sheets API**.
3. Abra **IAM e administrador → Contas de serviço**, crie uma conta de serviço.
4. Em **Chaves**, crie uma chave JSON privada (manuseie-a como uma senha).
5. Copie `client_email` e `private_key` do JSON para `.env.local` (a partir de `.env.example`).
6. Na planilha Google, clique **Compartilhar**, adicione o e-mail da conta de serviço e conceda **Editor**.

Não torne a chave pública, não coloque a chave em repositórios Git e nunca crie variáveis `NEXT_PUBLIC_` com credenciais.

## 3. Instalar e iniciar

Requisitos: Node.js 20 ou 22 e npm.

```bash
npm install
cp .env.example .env.local
# Edite .env.local e configure GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY
npm run dev
```

Abra http://localhost:3000.

Para produção:

```bash
npm run build
npm start
```

Configure as três variáveis do `.env.example` no serviço de hospedagem (Vercel, VPS etc.). É obrigatório HTTPS em produção para instalação e funcionamento do service worker; localhost funciona para desenvolvimento.

## 4. Instalar no celular

Abra a URL HTTPS no Chrome Android → **Instalar aplicativo** (ou **Adicionar à tela inicial**). No Safari iPhone → **Compartilhar** → **Adicionar à Tela de Início**.

O PWA oferece a interface instalável e cache básico da interface. **Cadastrar, listar, editar e excluir exigem internet**; operações offline não são enfileiradas para evitar lançamentos duplicados.

## Segurança e limitações

- O aplicativo não tem login, conforme solicitado. **Qualquer pessoa que conheça a URL pública pode ver/alterar/apagar os registros**, independentemente de as credenciais estarem protegidas no servidor. Se a exposição não for aceitável, restrinja o acesso na hospedagem (VPN, acesso privado, autenticação no proxy) ou adicione autenticação.
- Há validação dos dados, confirmação de exclusão e limite de requisições por processo, mas essas medidas não equivalem a controle de acesso ou limitação distribuída.
- Operações em Google Sheets não oferecem transações nem controle completo de concorrência. Evite duas pessoas editando/ordenando simultaneamente durante operações sensíveis. Faça backups periódicos via histórico de versões do Google Sheets.
- A exclusão remove a linha de fato (não vai para uma lixeira do app). Em caso de exclusão acidental, use **Arquivo → Histórico de versões** no Google Sheets.
- Se houver `Oferta pessoa X` como nome em lançamentos já existentes, eles não serão renomeados automaticamente.
- Lista completa de lançamentos é carregada para uso simples. Para grandes volumes, será conveniente introduzir paginação.

## Estrutura

```text
src/app/page.tsx                  UI responsiva e fluxos CRUD
src/app/api/members/route.ts     API cadastro de membros
src/app/api/entries/route.ts     API lançamentos
src/lib/sheets.ts                Google Sheets API, IDs auxiliares, leitura/escrita
src/lib/schemas.ts               Validação dos formulários
src/app/globals.css              Design mobile-first
public/sw.js                     Service worker básico
public/icons/                    Ícones PWA
```

## Checklist para publicação

- [ ] Compartilhar a planilha com a conta de serviço como Editor
- [ ] Configurar `.env.local` ou variáveis do host
- [ ] Executar `npm install`, `npm run typecheck`, `npm run build`
- [ ] Abrir, cadastrar um membro de teste, editar e excluir
- [ ] Registrar lançamento de teste, editar e excluir
- [ ] Verificar que o Google Sheets mostra `VALOR` numérico e `DATA` como data na localidade Brasil
- [ ] Instalar o PWA no Android ou iPhone
- [ ] Fazer cópia da planilha antes da primeira utilização real
