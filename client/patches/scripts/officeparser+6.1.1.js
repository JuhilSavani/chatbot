import fs from 'fs';
import path from 'path';

console.log('🔧 Patching officeparser for browser...');

const nodeModulesPath = path.join(process.cwd(), 'node_modules', 'officeparser');

// ─── Patch 1 & 2 & 3: officeparser.browser.mjs ───────────────────────────────
const browserBundlePath = path.join(nodeModulesPath, 'dist', 'officeparser.browser.mjs');
if (fs.existsSync(browserBundlePath)) {
  let content = fs.readFileSync(browserBundlePath, 'utf8');

  // Patch 1: fix setImmediate shim to work outside window (e.g. Web Workers)
  const p1Old = 'window.setImmediate = function(callback) { return setTimeout(callback, 0); };';
  const p1New = 'globalThis.setImmediate = function(callback) { return setTimeout(callback, 0); };';
  if (content.includes(p1Old)) {
    content = content.replace(p1Old, p1New);
    console.log('✅ officeparser.browser.mjs - patched setImmediate');
  } else if (content.includes(p1New)) {
    console.log('ℹ️  officeparser.browser.mjs - setImmediate already patched');
  } else {
    console.warn('⚠️  officeparser.browser.mjs - setImmediate pattern not found');
  }

  // Patch 2: use native dynamic import instead of qw() wrapper for file-type
  const p2Old = `return Kc?Promise.resolve().then(()=>(J1(),Q1)):qw("file-type")`;
  const p2New = `return Kc?Promise.resolve().then(()=>(J1(),Q1)):import("file-type")`;
  if (content.includes(p2Old)) {
    content = content.replace(p2Old, p2New);
    console.log('✅ officeparser.browser.mjs - patched file-type import');
  } else if (content.includes(p2New)) {
    console.log('ℹ️  officeparser.browser.mjs - file-type import already patched');
  } else {
    console.warn('⚠️  officeparser.browser.mjs - file-type import pattern not found');
  }

  // Patch 3: always build image AST nodes regardless of extractAttachments flag
  const p3Old = `if(t.extractAttachments){let bt=nt(ht,"w:drawing")`;
  const p3New = `{let bt=nt(ht,"w:drawing")`;
  if (content.includes(p3Old)) {
    content = content.replace(p3Old, p3New);
    console.log('✅ officeparser.browser.mjs - patched image AST guard');
  } else if (content.includes(p3New)) {
    console.log('ℹ️  officeparser.browser.mjs - image AST guard already patched');
  } else {
    console.warn('⚠️  officeparser.browser.mjs - image AST guard pattern not found');
  }

  fs.writeFileSync(browserBundlePath, content, 'utf8');
} else {
  console.warn('⚠️  Could not find officeparser.browser.mjs');
}

// ─── Patch 4: WordParser.js (Node environment) ───────────────────────────────
const WordParserPath = path.join(nodeModulesPath, 'dist', 'parsers', 'WordParser.js');
if (fs.existsSync(WordParserPath)) {
  let content = fs.readFileSync(WordParserPath, 'utf8');

  const p4Old = `// Images/Drawings
                if (config.extractAttachments) {`;
  const p4New = `// Images/Drawings — always build image AST nodes from the .rels map so
                // metadata.attachmentName is populated even when extractAttachments: false.
                // Binary data loading is handled separately below and stays gated.
                {`;

  if (content.includes(p4Old)) {
    content = content.replace(p4Old, p4New);
    fs.writeFileSync(WordParserPath, content, 'utf8');
    console.log('✅ WordParser.js - patched image AST guard');
  } else if (content.includes(p4New)) {
    console.log('ℹ️  WordParser.js - already patched');
  } else {
    console.warn('⚠️  WordParser.js - could not find the exact pattern to patch');
  }
} else {
  console.warn('⚠️  Could not find WordParser.js');
}

console.log('🎉 All patches applied!');