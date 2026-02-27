const path = require("path");

async function test() {
  const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.mjs");

  // Simple Hello World PDF (base64)
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

  // Test A: legacy build WITHOUT setting workerSrc (fake worker / main thread)
  console.log("--- Test A: legacy build, NO workerSrc ---");
  try {
    const doc = await pdfjsLib.getDocument({ data: data }).promise;
    console.log("Pages:", doc.numPages);
    const page = await doc.getPage(1);
    const content = await page.getTextContent();
    var text = "";
    for (var i = 0; i < content.items.length; i++) text += content.items[i].str;
    console.log("Text:", JSON.stringify(text));
    await doc.destroy();
    console.log("SUCCESS A");
  } catch (err) {
    console.error("FAILED A:", err.message);
  }

  // Test B: legacy build WITH workerSrc set
  console.log("\n--- Test B: legacy build, WITH workerSrc ---");
  try {
    const workerPath = path.join(
      path.dirname(require.resolve("pdfjs-dist/package.json")),
      "legacy", "build", "pdf.worker.min.mjs"
    );
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath;
    const doc2 = await pdfjsLib.getDocument({ data: data }).promise;
    console.log("Pages:", doc2.numPages);
    const page2 = await doc2.getPage(1);
    const content2 = await page2.getTextContent();
    var text2 = "";
    for (var j = 0; j < content2.items.length; j++) text2 += content2.items[j].str;
    console.log("Text:", JSON.stringify(text2));
    await doc2.destroy();
    console.log("SUCCESS B");
  } catch (err) {
    console.error("FAILED B:", err.message);
  }

  process.exit(0);
}

test().catch(function(e) { console.error(e); process.exit(1); });
