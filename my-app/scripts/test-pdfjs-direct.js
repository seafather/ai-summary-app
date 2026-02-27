// Test using pdfjs-dist directly without pdf-parse wrapper
// This bypasses the worker requirement by using useWorkerFetch: false / isEvalSupported: false
const fs = require('fs');
const path = require('path');

async function test() {
  // Approach: use pdfjs-dist directly, set workerSrc to absolute path
  const pdfjsLib = require('pdfjs-dist/build/pdf.mjs');

  // Set worker to the absolute path
  const workerPath = path.join(
    path.dirname(require.resolve('pdfjs-dist/package.json')),
    'build',
    'pdf.worker.min.mjs'
  );
  console.log('Worker path:', workerPath);
  console.log('Worker exists:', fs.existsSync(workerPath));

  // Try disabling workers entirely for Node.js environment
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath;

  // Create a minimal PDF for testing
  const testPdfPath = path.join(__dirname, 'test.pdf');
  if (!fs.existsSync(testPdfPath)) {
    console.log('No test.pdf found, creating a minimal one...');
    // Use a simple inline PDF
    const pdfContent = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj
4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
5 0 obj<</Length 44>>stream
BT /F1 24 Tf 100 700 Td (Hello World) Tj ET
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000266 00000 n 
0000000340 00000 n 
trailer<</Size 6/Root 1 0 R>>
startxref
434
%%EOF`;
    fs.writeFileSync(testPdfPath, pdfContent);
  }

  const data = new Uint8Array(fs.readFileSync(testPdfPath));

  console.log('\n--- Test 1: pdfjs-dist with worker path ---');
  try {
    const doc = await pdfjsLib.getDocument({ data }).promise;
    console.log('Pages:', doc.numPages);
    let fullText = '';
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str).join(' ');
      fullText += pageText + '\n';
    }
    console.log('Extracted text:', JSON.stringify(fullText.trim()));
    await doc.destroy();
    console.log('SUCCESS with worker path');
  } catch (err) {
    console.error('FAILED with worker path:', err.message);
  }

  console.log('\n--- Test 2: pdfjs-dist with worker disabled (workerPort: null trick) ---');
  try {
    // Some versions support disableWorker via getDocument options
    const doc = await pdfjsLib.getDocument({
      data,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    }).promise;
    console.log('Pages:', doc.numPages);
    let fullText = '';
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str).join(' ');
      fullText += pageText + '\n';
    }
    console.log('Extracted text:', JSON.stringify(fullText.trim()));
    await doc.destroy();
    console.log('SUCCESS with worker disabled');
  } catch (err) {
    console.error('FAILED with worker disabled:', err.message);
  }

  console.log('\n--- Test 3: pdf-parse with PDFParse.setWorker ---');
  try {
    const { PDFParse } = require('pdf-parse');
    PDFParse.setWorker(workerPath);
    const parser = new PDFParse({ data });
    const result = await parser.getText();
    console.log('Extracted text:', JSON.stringify(result.text?.trim()));
    await parser.destroy();
    console.log('SUCCESS with pdf-parse');
  } catch (err) {
    console.error('FAILED with pdf-parse:', err.message);
  }
}

test().catch(console.error);
