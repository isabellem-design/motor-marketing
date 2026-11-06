import { test } from 'node:test';
import assert from 'node:assert/strict';
import { forwardMessage } from '../../mcp-server-eloss.mjs';
const request = JSON.stringify({ jsonrpc: '2.0', id: 0, method: 'ping' });
test('notifications do not call upstream or write stdout', async () => {
  assert.equal(await forwardMessage('{"jsonrpc":"2.0","method":"notifications/initialized"}', {
    fetchImpl: () => { throw new Error('must not call'); }
  }), null);
});
test('HTTP and malformed upstream failures preserve original id', async () => {
  for (const fetchImpl of [async () => new Response('', { status: 500 }), async () => Response.json({ ok: true }), async () => { throw new Error('offline'); }]) {
    const result = await forwardMessage(request, { fetchImpl });
    assert.equal(result.id, 0); assert.equal(result.error.code, -32603);
  }
});
test('valid response is forwarded unchanged', async () => {
  const response = { jsonrpc: '2.0', id: 0, result: {} };
  assert.deepEqual(await forwardMessage(request, { fetchImpl: async () => Response.json(response) }), response);
});
test('invalid JSON and non-MCP actions are rejected', async () => {
  assert.equal((await forwardMessage('{')).error.code, -32700);
  assert.equal((await forwardMessage('{"acao":"sincronizar_json_chatgpt"}')).error.code, -32600);
});
