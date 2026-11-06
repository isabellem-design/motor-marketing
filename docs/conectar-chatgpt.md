# Conectar o Motor ao ChatGPT

## Estado desta alteração

O GitHub fornece acesso ao código. Ele não conecta o ChatGPT ao Motor em execução.
Esta alteração prepara e testa a ponte local stdio. Não cria um plugin, túnel ou
hospedagem, e não declara a conexão com o ChatGPT concluída.

A ponte recebe somente mensagens MCP, ignora notificações sem resposta, preserva
os IDs dos erros e limita a espera pelo Motor a 30 segundos. A leitura retorna os
slides e a legenda para conferência após salvar. Um ID inexistente não seleciona
outra peça. A atualização MCP exige ID e uma lista não vazia de slides.

## Caminho para quem usa localhost:3005

Mantenha o Motor na máquina que contém seus dados. Não publique a porta 3005:
a aplicação inteira ainda não possui autenticação adequada para exposição pública.

A opção a avaliar é o Secure MCP Tunnel oficial da OpenAI, usando a ponte stdio:
`node C:\projetos\motor-marketing\mcp-server-eloss.mjs`.
O túnel exige configuração na conta, credencial de execução e um cliente rodando
no computador. A disponibilidade e as permissões devem ser verificadas na conta.
A autenticação de acesso remoto fica a cargo desse túnel; ela NÃO foi implementada
nesta rota. Não cole credenciais no chat, no código ou em commits.

Referência de configuração:
https://developers.openai.com/api/docs/guides/secure-mcp-tunnels

Antes de configurar, confirme onde o Motor roda atualmente. Se já estiver online,
verifique a hospedagem, autenticação de todas as rotas e persistência primeiro.
O store atual usa arquivo local e usa /tmp na Vercel. Cache em memória ou disco
temporário não comprova persistência. Esta alteração não migra o banco.

## Testes executados pelo desenvolvedor

- `npx vitest run tests/mcp-gpt.test.ts`: rotas com banco simulado.
- `node --test tests/bridge/mcp-stdio.test.mjs`: ponte com respostas HTTP simuladas.
- `npx tsc --noEmit`: tipos.

Os testes não acessam o Motor da usuária e não usam chaves de IA.
O teste antigo `tests/fase0-motor.test.ts:32` falha também no commit base 5ec3776:
espera `pronta_para_execucao`, mas recebe `aprovada`.

## Validação final, depois de conectar

1. Escolher uma peça de teste e guardar o conteúdo anterior.
2. Ler pelo ID exato usando `obter_contexto_peca_eloss`.
3. Enviar a lista COMPLETA de slides e a legenda para `atualizar_post_no_sistema_eloss`.
   A lista enviada substitui a lista anterior; não envie só um slide para edição parcial.
4. Reler o mesmo ID e comparar cada slide, legenda e horário de atualização.
5. Reabrir a peça na interface e reiniciar o Motor para conferir persistência real.

As duas ferramentas MCP não chamam uma API de geração de IA. Isso não torna todas
as outras funções do Motor gratuitas: há geração de conteúdo por APIs em outras rotas.
O transporte por túnel tem requisitos próprios; esta alteração não garante cobrança
ou disponibilidade do serviço de terceiros.
