/**
 * docxWorker.js
 *
 * Web Worker that extracts text from office files (docx, pptx, xlsx, …)
 * using officeparser's patched browser bundle.
 * Token counting is handled by a separate tokenWorker.js.
 *
 * Incoming messages from main thread:
 *   { status: 'PROCESS', buffer: ArrayBuffer, filename: string }
 *
 * Outgoing messages to main thread:
 *   { workerName: 'DocxWorker', status: 'SUCCESS', markdown: string, filename: string, nodes: Node[], meta: object }
 *   { workerName: 'DocxWorker', status: 'ERROR',   reason: 'EMPTY_DOCUMENT' | 'EXTRACTION_FAILED', message: string }
 */

import { OfficeParser } from 'officeparser';

self.onmessage = async ({ data }) => {
  if (data.status !== 'PROCESS') return;

  const { buffer, filename = '' } = data;

  if (!(buffer instanceof ArrayBuffer)) {
    self.postMessage({
      workerName: 'DocxWorker',
      status: 'ERROR',
      reason: 'EXTRACTION_FAILED',
      message: 'Expected an ArrayBuffer in `buffer`.',
    });
    return;
  }

  try {
    const ast = await OfficeParser.parseOffice(buffer, {
      extractAttachments: true,
      ocr: false,
      includeRawContent: false,
    });

    const nodes    = collectNodes(ast.content ?? []);
    const markdown = nodesToMarkdown(nodes) || (typeof ast.toText === 'function' ? ast.toText() : '');

    if (!markdown.trim()) {
      self.postMessage({
        workerName: 'DocxWorker',
        status: 'ERROR',
        reason: 'EMPTY_DOCUMENT',
        message: 'No extractable text found in this document.',
      });
      return;
    }

    const { author, title, created, modified, customProperties } = ast.metadata ?? {};

    self.postMessage({
      workerName: 'DocxWorker',
      status: 'SUCCESS',
      markdown,
      filename,
      nodes,
      meta: { author, title, created, modified, customProperties },
    });
  } catch (err) {
    console.error('[docxWorker] Extraction error:', err);
    self.postMessage({
      workerName: 'DocxWorker',
      status: 'ERROR',
      reason: 'EXTRACTION_FAILED',
      message: `Failed to parse document: ${err?.message ?? String(err)}`,
    });
  }
};

// ── Node collector ────────────────────────────────────────────────────────────

function collectNodes(nodes, output = []) {
  for (const node of nodes) {
    switch (node.type) {
      case 'heading': {
        const level = node.metadata?.level ?? 1;
        const text  = node.text?.trim();
        if (text) output.push({ type: 'heading', level, text });
        collectNodes((node.children ?? []).filter(c => c.type !== 'text'), output);
        break;
      }

      case 'paragraph': {
        const text = node.text?.trim();
        if (text) output.push({ type: 'paragraph', text });
        collectNodes((node.children ?? []).filter(c => c.type !== 'text'), output);
        break;
      }

      case 'list': {
        const text = node.text?.trim();
        if (text) {
          output.push({
            type:      'list',
            indent:    node.metadata?.indentation || 0,
            listType:  node.metadata?.listType === 'ordered' ? 'ordered' : 'unordered',
            itemIndex: node.metadata?.itemIndex ?? 0,
            text,
          });
        }
        break;
      }

      case 'table': {
        if (node.children?.length > 0) {
          const rows = node.children.map(row =>
            (row.children ?? []).map(cell => cell.text?.trim() || '')
          );
          output.push({ type: 'table', rows });
        }
        break;
      }

      case 'image': {
        const name    = node.metadata?.attachmentName ?? 'unnamed';
        const ocrText = (node.ocrText || node.text)?.trim() || null;
        output.push({ type: 'image', name, ocrText });
        break;
      }

      default: {
        const text = node.text?.trim();
        if (text) output.push({ type: node.type || 'unknown', text });
        if (node.children?.length) collectNodes(node.children, output);
      }
    }
  }
  return output;
}

// ── Markdown renderer ─────────────────────────────────────────────────────────

function nodesToMarkdown(nodes) {
  const lines = [];

  for (const node of nodes) {
    switch (node.type) {
      case 'heading': {
        lines.push(`${'#'.repeat(Math.min(node.level, 6))} ${node.text}`);
        lines.push('');
        break;
      }
      case 'paragraph': {
        lines.push(node.text);
        lines.push('');
        break;
      }
      case 'list': {
        const prefix = node.listType === 'ordered' ? `${node.itemIndex + 1}. ` : '- ';
        const indent = '  '.repeat(node.indent);
        lines.push(`${indent}${prefix}${node.text}`);
        break;
      }
      case 'table': {
        if (node.rows.length > 0) {
          lines.push('| ' + node.rows[0].join(' | ') + ' |');
          lines.push('|' + node.rows[0].map(() => '---').join('|') + '|');
          for (let i = 1; i < node.rows.length; i++) {
            lines.push('| ' + node.rows[i].join(' | ') + ' |');
          }
          lines.push('');
        }
        break;
      }
      case 'image': {
        lines.push(`![${node.name}]()`);
        if (node.ocrText) lines.push(`> ${node.ocrText}`);
        lines.push('');
        break;
      }
      default: {
        if (node.text) {
          lines.push(node.text);
          lines.push('');
        }
      }
    }
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
