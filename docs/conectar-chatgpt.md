# Conectar o Motor de Marketing ao ChatGPT (Persistência Supabase + Autenticação Bearer)

## 1. Arquitetura Implementada

A integração entre o **Motor de Marketing da Eloss** e o **ChatGPT** foi unificada sobre a tabela real `pecas` do **Supabase** (`qjcnlwlptcglxahtlmpd`, empresa `00000000-0000-0000-0000-000000000001`):

1. **Fonte Única de Dados (`src/lib/store/supabase-pecas.ts`):**
   - A interface (`/api/contexto` e `/api/ciclo-editorial`) e o endpoint de integração (`/api/mcp-gpt`) leem e gravam na mesma tabela `pecas` do Supabase.
   - Os IDs das peças na aplicação correspondem diretamente ao `pecas.id` (UUID) no Supabase:
     - `T5` (Carrossel): `5884ba23-863b-41d8-98aa-b34c445209bd`
     - `T7` (Carrossel): `cbf6f513-ff0f-4599-8dea-845c93557fc0` | (Blog): `5fe6af87-64d4-4d21-96b4-c040da9453e2`
     - `T25` (Carrossel): `5bb4fb94-91f3-427b-92e8-7ac4bc62a463` | (Blog): `dff6260d-97d2-41ef-bc2b-786be49f8f92`
     - `T2` (Carrossel): `bf9445ca-ecc2-453f-af16-048ff851eeda` | (Blog): `9480e0e0-5be0-4b59-a47b-609212905067`
     - Rascunho exclusivo de teste MCP: `00000000-0000-4000-8000-00000000e105`
   - Nenhuma operação de salvamento usa `/tmp` ou cache em memória como confirmação de persistência: o endpoint exige resposta `HTTP 200` com representação confirmada pelo Supabase (`PATCH /rest/v1/pecas` com `Prefer: return=representation`).
   - Todos os campos preexistentes do JSON `pecas.conteudo` e de cada slide (`prompt_fundo`, `componentes`, `imagens`, etc.) são preservados durante atualizações.
   - Suporta detecção de conflito de edição via `esperado_atualizado_em` (`HTTP 409` / `isError: true` quando o registro foi alterado por outro processo).

2. **Autenticação e Segurança (`src/lib/engine/mcp-auth.ts`):**
   - O endpoint `/api/mcp-gpt` exige autenticação `Authorization: Bearer <ELOSS_MCP_TOKEN>` (ou cabeçalho `x-eloss-mcp-token`) em todas as operações de leitura e escrita (`GET` e `POST`).
   - A validação utiliza comparação em tempo constante (`crypto.timingSafeEqual` sobre hash SHA-256) contra `process.env.ELOSS_MCP_TOKEN` ou contra o hash SHA-256 (`mcp_token_sha256`) gravado em `integracoes.config` no Supabase da empresa `00000000-0000-0000-0000-000000000001`.
   - Toda consulta e escrita fica restrita exclusivamente a `empresa_id = '00000000-0000-0000-0000-000000000001'`.
   - RLS está ativo na tabela `pecas` no Supabase (acesso anônimo bloqueado).

3. **Zero Chamadas Adicionais a APIs de IA na Consulta e Salvamento:**
   - As operações `obter_contexto_peca_eloss` (`obterContextoPecaEloss`), `atualizar_post_no_sistema_eloss` (`atualizarPostNoSistemaEloss`) e `rodarChecagensMalha` são determinísticas e **não** disparam chamadas para OpenAI ou Anthropic.

---

## 2. Como Conectar no ChatGPT (Endpoint Remoto HTTPS)

O endpoint remoto HTTPS está preparado em:
- **URL Base:** `https://motor-marketing-five.vercel.app`
- **Endpoint MCP / Action:** `https://motor-marketing-five.vercel.app/api/mcp-gpt`
- **Schema OpenAPI 3.1.0:** `https://motor-marketing-five.vercel.app/api/mcp-gpt?schema=openapi`

### Opção A — Custom GPT Actions (ChatGPT Plus / Team / Pro na Web)
1. Acesse `https://chatgpt.com/gpts/editor` (ou edite seu GPT da Eloss).
2. Na aba **Configure**, role até **Actions** e clique em **Create new action**.
3. Em **Authentication**, clique na engrenagem:
   - Selecione **API Key**.
   - Em **Auth Type**, selecione **Bearer**.
   - Em **API Key**, cole o valor de `ELOSS_MCP_TOKEN` (disponível no arquivo local `.env.local`) e clique em **Save**.
4. Em **Schema**, clique em **Import from URL**, informe:
   `https://motor-marketing-five.vercel.app/api/mcp-gpt?schema=openapi`
   e clique em **Import**.
5. As duas ações aparecerão prontas:
   - `obterContextoPecaEloss` (`GET /api/mcp-gpt?demanda_id=...`)
   - `atualizarPostNoSistemaEloss` (`POST /api/mcp-gpt`)

### Opção B — Ponte Local MCP Stdio (`mcp-server-eloss.mjs`)
Para clientes MCP que utilizam transporte `stdio` local ou túnel privado autenticado:
```bash
ELOSS_MOTOR_URL="https://motor-marketing-five.vercel.app/api/mcp-gpt" \
ELOSS_MCP_TOKEN="<SEU_ELOSS_MCP_TOKEN>" \
node c:\projetos\motor-marketing\mcp-server-eloss.mjs
```

---

## 3. Verificações e Testes Executados

- `npx vitest run tests/mcp-gpt.test.ts`: 9 testes aprovados (rejeição 401 sem token/token inválido, schema OpenAPI 3.1 com Bearer, `initialize`/`tools/list`/`ping`, notificações 202, rejeição 404 para ID inexistente, gravação e releitura de 8 slides + legenda preservando campos extras, detecção de conflito de edição `esperado_atualizado_em`, rejeição de payload sem slides).
- `node --test tests/bridge/mcp-stdio.test.mjs`: 4 testes aprovados (incluindo envio de cabeçalho `Authorization: Bearer`).
- `npx tsc --noEmit`: 0 erros de tipagem.
- **Falha preexistente registrada separadamente:** `tests/fase0-motor.test.ts:32` já falhava no commit base `5ec3776` (espera `pronta_para_execucao`, mas `buildSixStepsForFormato` define a etapa 1 como `aprovada`).
