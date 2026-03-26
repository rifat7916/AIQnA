export function exportToWord(content: string, filename: string) {
  const header = `
    <html xmlns:v="urn:schemas-microsoft-com:vml"
          xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns:m="http://schemas.microsoft.com/office/2004/12/omml"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset='utf-8'>
      <title>Export HTML to Word Document</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        body { font-family: 'Kalpurush', 'Siyam Rupali', 'Arial', sans-serif; font-size: 12pt; line-height: 1.5; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 12pt; }
        td, th { padding: 4pt; vertical-align: top; border: none; width: 50%; }
        h1 { font-size: 18pt; font-weight: bold; margin-bottom: 12pt; text-align: center; }
        h2 { font-size: 16pt; font-weight: bold; margin-bottom: 10pt; }
        h3 { font-size: 14pt; font-weight: bold; margin-bottom: 8pt; }
        p { margin-top: 0; margin-bottom: 8pt; }
      </style>
    </head>
    <body>
  `;
  const footer = "</body></html>";
  
  // Protect tables: extract them, replace newlines in the rest, then put them back
  const tables: string[] = [];
  let processedContent = content.replace(/<table[\s\S]*?<\/table>/g, (match) => {
    // Inject inline styles for Word compatibility
    let styledTable = match.replace(/<table/g, '<table style="width: 100%; border-collapse: collapse; margin-bottom: 12pt;"');
    styledTable = styledTable.replace(/<td/g, '<td style="width: 50%; padding: 4pt; vertical-align: top; border: none;"');
    tables.push(styledTable);
    return `__TABLE_PLACEHOLDER_${tables.length - 1}__`;
  });

  // Basic markdown to HTML conversion for Word
  processedContent = processedContent
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/### (.*?)(?:\n|$)/g, '<h3>$1</h3>')
    .replace(/## (.*?)(?:\n|$)/g, '<h2>$1</h2>')
    .replace(/# (.*?)(?:\n|$)/g, '<h1>$1</h1>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  // Wrap in initial paragraph
  processedContent = `<p>${processedContent}</p>`;

  // Restore tables
  processedContent = processedContent.replace(/__TABLE_PLACEHOLDER_(\d+)__/g, (_, index) => {
    return `</p>${tables[parseInt(index)]}<p>`;
  });

  // Clean up empty paragraphs
  processedContent = processedContent.replace(/<p>\s*<\/p>/g, '');

  const sourceHTML = header + processedContent + footer;
  
  const blob = new Blob(['\ufeff', sourceHTML], {
    type: 'application/msword'
  });
  
  const url = URL.createObjectURL(blob);
  const fileDownload = document.createElement("a");
  document.body.appendChild(fileDownload);
  fileDownload.href = url;
  fileDownload.download = `${filename}.doc`;
  fileDownload.click();
  document.body.removeChild(fileDownload);
  URL.revokeObjectURL(url);
}
