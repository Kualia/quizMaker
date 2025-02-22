import { useState } from 'react';
import { TextItem } from 'pdfjs-dist/types/src/display/api';
import * as pdfjs from "pdfjs-dist";
import { text } from 'stream/consumers';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

export const extractTextFromPDF = async (
  file: File, 
  setMessage: (text: string) => void
): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    
    const applyStyle = (text: string, style: { bold: boolean; italic: boolean }) => {
      if (style.bold && style.italic) return `<i><b>${text}</b></i>`;
      if (style.bold) return `<b>${text}</b>`;
      if (style.italic) return `<i>${text}</i>`;
      return text;
    };
    
    let fullText = '';
    let lastText = '';
    let lastStyle = { bold: false, italic: false };
    let currentStyle = { ...lastStyle };

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      await page.getOperatorList();
      const textContent = await page.getTextContent();
      
      console.log(textContent.items);
      fullText += `${(pageNum > 1 ? '\n' : '')}--- Page ${pageNum} ---\n`;
      
      textContent.items.forEach((item: any, index: number) => {
        const textItem = item as TextItem;
        let styledText = textItem.str;

        const fontObj = page.commonObjs.has(textItem.fontName)
          ? page.commonObjs.get(textItem.fontName)
          : null;

        if (fontObj && fontObj.name) {
          const fontName = fontObj.name.toLowerCase();
          currentStyle.bold = fontName.includes("bold");
          currentStyle.italic = fontName.includes("italic");
        }

        if(index > 1 &&
           currentStyle.bold === lastStyle.bold &&
           currentStyle.italic === lastStyle.italic &&
          !textItem.hasEOL
          ) {
          lastText += styledText;
        } else {
          fullText += applyStyle(lastText, lastStyle);
          fullText += textItem.hasEOL ? '\n' : '';
          lastText = styledText;
          lastStyle = currentStyle;
        }

        
      });

      //sayfa sonu
    }

    // belge sonu
    fullText += applyStyle(lastText, lastStyle);


    console.log(fullText);
    setMessage(fullText);
    return fullText.trim();
  } catch (error) {
    console.error('PDF işleme hatası:', error);
    throw new Error('PDF işlenirken bir hata oluştu');
  }
};


export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [jsonOutput, setJsonOutput] = useState<any>(null);
  const [message, setMessage] = useState<string>('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      console.log(event.target.files);
      setFile(event.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      alert('Please upload a PDF file first!');
      return;
    }

    try {
      const response = await extractTextFromPDF(file, setMessage);
      setJsonOutput(response);
    } catch (error) {
      console.error('Error processing PDF:', error);
    }
  };

  return (
    <div className="container mx-auto p-5">
      <h1 className="text-xl font-bold mb-4">Upload a PDF to Extract Styling Information</h1>
      <input type="file" onChange={handleFileChange} className="mb-4" />
      <button onClick={handleSubmit} className="bg-blue-500 text-white px-4 py-2 rounded">
        Process PDF
      </button>
      {jsonOutput && (
        <pre className="mt-4 p-3 bg-gray-100 rounded">{JSON.stringify(jsonOutput, null, 2)}</pre>
      )}
    </div>
  );
}
