# Motor de Produção de Marketing — Fase 0 (Piloto Manual-Assistido)

Sistema próprio e dedicado à produção contínua de marketing, desacoplado do Painel ELOSS, operando o ciclo completo do **Briefing à Peça Pronta** com rastreabilidade de ponta a ponta.

## Princípios Estruturais Implementados na Fase 0

1. **`marca_id` como unidade atômica:** Todo registro e operação do motor (`bases_conhecimento_marca`, `demandas`, `tarefas_fluxo`, `entregas`, `historico_decisoes`, `trilha_proveniencia`) é estritamente escopado por `marca_id`.
2. **Base de Conhecimento Viva (Sem Cache):** A abstração `getLiveBrandKnowledge(marcaId)` roteia automaticamente entre **Supabase** (marcas internas como `Eloss`, `Trampô Space`, `Agentfaz`) e **Notion** (clientes externos), lendo sempre ao vivo no template único de 6 categorias.
3. **Execução em 3 Camadas + Relé de Artefato:**
   - **Camada 1:** Método Universal versionado e agnóstico de marca
   - **Camada 2:** Base de Conhecimento Viva da Marca
   - **Camada 3:** Exceções Documentadas daquela Marca para o Método
   - **Relé de Estado:** A saída estruturada aprovada de uma frente alimenta a entrada da próxima, sem negociação ou chat livre entre agentes.
4. **Piso de Compliance Fixo (Fundação Agentfaz):** Travas obrigatórias nos gates (`sem promessa de resultado financeiro`, `sem urgência artificial`, `sem claim absoluta sem evidência`) que nunca se tornam automáticas em nenhum nível da escada de automação.
5. **Relógio Explícito e Cadeia de Proveniência:** Timestamps oficiais injetados pelo motor (`src/lib/clock.ts`) em cada prompt compilado, entrega e decisão de gate.

## Como Executar

```bash
npm install
npm run dev
```

Acesse `http://localhost:3005`.

## Rodando os Testes Automatizados do Motor (Ciclo Completo 6 Etapas)

```bash
npm test
```
