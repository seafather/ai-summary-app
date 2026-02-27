const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

async function test() {
  // Set worker to absolute path of the bundled worker
  const workerPath = path.join(
    path.dirname(require.resolve('pdfjs-dist/package.json')),
    'build',
    'pdf.worker.min.mjs'
  );
  console.log('Worker path:', workerPath, 'exists:', fs.existsSync(workerPath));
  PDFParse.setWorker(workerPath);
  console.log('workerSrc after set:', PDFParse.setWorker());

  // Minimal valid PDF with text
  const pdfContent = [
    '%PDF-1.4',
    '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj',
    '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj',
    '3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj',
    '4 0 obj<</Length 44>>stream',
    'BT /F1 12 Tf 100 700 Td (Hello World) Tj ET',
    'endstream',
    'endobj',
    '5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj',
    'xref',
    '0 6',
    '0000000000 65535 f ',
    '0000000009 00000 n ',
    '0000000058 00000 n ',
    '0000000115 00000 n ',
    '0000000266 00000 n ',
    '0000000360 00000 n ',
    'trailer<</Size 6/Root 1 0 R>>',
    'startxref',
    '430',
    '%%EOF'
  ].join('\n');

  fs.writeFileSync('/tmp/test.pdf', pdfContent);
  const buf = fs.readFileSync('/tmp/test.pdf');

  console.log('Buffer length:', buf.length);
  try {
    const parser = new PDFParse({ data: new Uint8Array(buf) });
    const result = await parser.getText();
    console.log('Result text:', JSON.stringify(result.text));
    await parser.destroy();
    console.log('SUCCESS');
  } catch (e) {
    console.error('FAIL:', e.message);
    console.error('Stack:', e.stack);
  }
}

test();
