// Receives extracted text and returns a token count via js-tiktoken.
// PDF extraction is handled by a separate pdfWorker.js.

self.onmessage = async ({ data }) => {
  if (data.status !== 'COUNT') return;

  const { text } = data;

  try {
    const { getEncoding } = await import('js-tiktoken');
    const enc = getEncoding('o200k_base');
    const tokenCount = enc.encode(text).length;

    self.postMessage({ workerName: 'TokenWorker', status: 'DONE', tokenCount });
  } catch (err) {
    self.postMessage({
      workerName: 'TokenWorker',
      status: 'ERROR',
      message: `Token counting failed: ${err.message}`,
    });
  }
};
