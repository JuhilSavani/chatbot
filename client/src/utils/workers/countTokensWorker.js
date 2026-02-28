// Web Worker for token counting only.
// Uses js-tiktoken (pure JS, no WASM) to count tokens off the main thread.

self.addEventListener('message', async (e) => {
  console.log('[TokenWorker] Received message from main thread');
  try {
    const { text } = e.data;
    if (!text) {
      throw new Error('No text provided for token counting.');
    }

    console.log(`[TokenWorker] Text length: ${text.length}. Importing js-tiktoken...`);
    const { getEncoding } = await import('js-tiktoken');
    console.log('[TokenWorker] js-tiktoken imported, encoding text...');

    const enc = getEncoding('o200k_base');
    const tokens = enc.encode(text);
    const tokenCount = tokens.length;
    console.log(`[TokenWorker] Token count: ${tokenCount}`);

    self.postMessage({ success: true, tokenCount });
  } catch (error) {
    console.error('[TokenWorker] Error:', error);
    self.postMessage({
      success: false,
      error: error.message || 'Unknown error during token counting',
    });
  }
});
