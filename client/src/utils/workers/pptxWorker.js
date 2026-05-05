/**
 * pptxWorker.js
 *
 * Web Worker that extracts text from PPTX files using officeparser's patched browser bundle.
 *
 * Incoming messages from main thread:
 *   { status: 'PROCESS', buffer: ArrayBuffer, filename: string }
 *
 * Outgoing messages to main thread:
 *   { workerName: 'PptxWorker', status: 'SUCCESS', markdown: string, filename: string, nodes: Node[], meta: object }
 *   { workerName: 'PptxWorker', status: 'ERROR',   reason: 'EMPTY_DOCUMENT' | 'EXTRACTION_FAILED', message: string }
 */

import { OfficeParser } from 'officeparser';

self.onmessage = async ({ data }) => {
  if (data.status !== 'PROCESS') return;

  const { buffer, filename = '' } = data;

  if (!(buffer instanceof ArrayBuffer)) {
    self.postMessage({
      workerName: 'PptxWorker',
      status: 'ERROR',
      reason: 'EXTRACTION_FAILED',
      message: 'Expected an ArrayBuffer in `buffer`.',
    });
    return;
  }

  try {
    const ast = await OfficeParser.parseOffice(buffer, {
      extractAttachments: false,
      ocr: false,
      ignoreNotes: false,
      putNotesAtLast: true,
      includeRawContent: false,
    });

    const nodes    = collectNodes(ast.content ?? []);
    const markdown = nodesToMarkdown(nodes) || (typeof ast.toText === 'function' ? ast.toText() : '');

    if (!markdown.trim()) {
      self.postMessage({
        workerName: 'PptxWorker',
        status: 'ERROR',
        reason: 'EMPTY_DOCUMENT',
        message: 'No extractable text found in this presentation.',
      });
      return;
    }

    const { author, title, created, modified, customProperties } = ast.metadata ?? {};

    self.postMessage({
      workerName: 'PptxWorker',
      status: 'SUCCESS',
      markdown,
      filename,
      meta: { author, title, created, modified, customProperties },
    });
  } catch (err) {
    console.error('[pptxWorker] Extraction error:', err);
    self.postMessage({
      workerName: 'PptxWorker',
      status: 'ERROR',
      reason: 'EXTRACTION_FAILED',
      message: `Failed to parse presentation: ${err?.message ?? String(err)}`,
    });
  }
};

// ── Node collector ────────────────────────────────────────────────────────────

function collectNodes(nodes, output = []) {
  let slideNumber = 0;

  for (const node of nodes) {
    if (node.type === 'slide') {
      slideNumber++;
      output.push({ type: 'slide-separator', slideNumber });
      collectNodesInner(node.children ?? [], output);
    } else {
      collectNodesInner([node], output);
    }
  }
  return output;
}

function collectNodesInner(nodes, output) {
  for (const node of nodes) {
    switch (node.type) {
      case 'heading': {
        const level = node.metadata?.level ?? 1;
        const text  = node.text?.trim();
        if (text) output.push({ type: 'heading', level, text });
        collectNodesInner((node.children ?? []).filter(c => c.type !== 'text'), output);
        break;
      }

      case 'paragraph': {
        const text = node.text?.trim();
        if (text) output.push({ type: 'paragraph', text });
        collectNodesInner((node.children ?? []).filter(c => c.type !== 'text'), output);
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

      case 'note': {
        const text = node.text?.trim();
        if (text) output.push({ type: 'note', text });
        break;
      }

      default: {
        const text = node.text?.trim();
        if (text) output.push({ type: node.type || 'unknown', text });
        if (node.children?.length) collectNodesInner(node.children, output);
      }
    }
  }
}

// ── Markdown renderer ─────────────────────────────────────────────────────────

function nodesToMarkdown(nodes) {
  const lines = [];
  let slideNumber = 0;

  for (const node of nodes) {
    if (node.type === 'slide-separator') {
      slideNumber++;
      lines.push('');
      lines.push(`--- Slide ${slideNumber} ---`);
      lines.push('');
      continue;
    }

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
      case 'note': {
        lines.push(`> **Speaker Note:** ${node.text}`);
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