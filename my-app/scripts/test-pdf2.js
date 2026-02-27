const path = require("path");
const fs = require("fs");

async function test() {
  const pdfjsLib = require("pdfjs-dist/build/pdf.mjs");
  const workerPath = path.join(
    path.dirname(require.resolve("pdfjs-dist/package.json")),
    "build", "pdf.worker.min.mjs"
  );
  console.log("Worker exists:", fs.existsSync(workerPath));
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath;

  // Simple Hello World PDF
  const pdfBytes = Buffer.from(
    "JVBERi0xLjQKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRvYmoK" +
    "MiAwIG9iago8PC9UeXBlL1BhZ2VzL0tpZHNbMyAwIFJdL0NvdW50IDE+PgplbmRvYmoKMyAw" +
    "IG9iago8PC9UeXBlL1BhZ2UvTWVkaWFCb3hbMCAwIDYxMiA3OTJdL1BhcmVudCAyIDAgUi9S" +
    "ZXNvdXJjZXM8PC9Gb250PDwvRjEgNCAwIFI+Pj4+L0NvbnRlbnRzIDUgMCBSPj4KZW5kb2Jq" +
    "CjQgMCBvYmoKPDwvVHlwZS9Gb250L1N1YnR5cGUvVHlwZTEvQmFzZUZvbnQvSGVsdmV0aWNh" +
    "Pj4KZW5kb2JqCjUgMCBvYmoKPDwvTGVuZ3RoIDQ0Pj5zdHJlYW0KQlQgL0YxIDI0IFRmIDEw" +
    "MCA3MDAgVGQgKEhlbGxvIFdvcmxkKSBUaiBFVAplbmRzdHJlYW0KZW5kb2JqCnhyZWYKMCA2" +
    "CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAwOSAwMDAwMCBuIAowMDAwMDAwMDU4IDAw" +
    "MDAwIG4gCjAwMDAwMDAxMTUgMDAwMDAgbiAKMDAwMDAwMDI2NiAwMDAwMCBuIAowMDAwMDAw" +
    "MzQwIDAwMDAwIG4gCnRyYWlsZXI8PC9TaXplIDYvUm9vdCAxIDAgUj4+CnN0YXJ0eHJlZgo0" +
    "MzQKJSVFT0Y=",
    "base64"
  );

  const data = new Uint8Array(pdfBytes);

  // Test 1: pdfjs-dist direct with worker path
  console.log("\n--- Test 1: pdfjs-dist direct with workerSrc ---");
  try {
    const doc = await pdfjsLib.getDocument({ data }).promise;
    console.log("Pages:", doc.numPages);
    const page = await doc.getPage(1);
    const content = await page.getTextContent();
    const text = content.items.map(function(i) { return i.str; }).join(" ");
    console.log("Text:", JSON.stringify(text));
    await doc.destroy();
    console.log("SUCCESS");
  } catch (err) {
    console.error("FAILED:", err.message);
  }

  // Test 2: pdf-parse with setWorker
  console.log("\n--- Test 2: pdf-parse with setWorker ---");
  try {
    const { PDFParse } = require("pdf-parse");
    PDFParse.setWorker(workerPath);
    const parser = new PDFParse({ data });
    const result = await parser.getText();
    console.log("Text:", JSON.stringify(result.text && result.text.trim()));
    await parser.destroy();
    console.log("SUCCESS");
  } catch (err) {
    console.error("FAILED:", err.message);
  }

  process.exit(0);
}

test().catch(function(e) { console.error(e); process.exit(1); });
