import { useState } from 'react';
import { TextItem } from 'pdfjs-dist/types/src/display/api';
import * as pdfjs from "pdfjs-dist";
import { text } from 'stream/consumers';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;



interface IStyle {
  bold: boolean;
  italic: boolean;
}

interface IText {
  text: string;
  style: IStyle;
}

export const extractTextFromPDF = async (
  file: File, 
  setMessage: (text: string) => void
): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    const applyStyle = (text: string, prevStyle: IStyle | null, currStyle: IStyle) => {
      let styledText = "";
    
      // Eğer önceki stil farklıysa önce kapatma tagleri eklenir
      if (prevStyle && JSON.stringify(prevStyle) !== JSON.stringify(currStyle)) {
        if (prevStyle.bold) styledText += `</b>`;
        if (prevStyle.italic) styledText += `</i>`;
      }
    
      // Yeni stil açılır
      if (!prevStyle || JSON.stringify(prevStyle) !== JSON.stringify(currStyle)) {
        if (currStyle.italic) styledText += `<i>`;
        if (currStyle.bold) styledText += `<b>`;
      }
    
      styledText += text;
      return styledText;
    };
    

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      await page.getOperatorList();
      const textContent = await page.getTextContent();
      
      console.log(textContent.items);
      fullText += `${(pageNum > 1 ? '\n' : '')}--- Page ${pageNum} ---\n`;
      
      const items: IText[] = textContent.items.map((item: any) => {
        const textItem = item as TextItem;
        let styledText = textItem.str;
        styledText += textItem.hasEOL ? '\n' : '';

        const fontObj = page.commonObjs.has(textItem.fontName)
          ? page.commonObjs.get(textItem.fontName)
          : null;

        let style = {bold: false, italic: false}
        if (fontObj && fontObj.name) {
          const fontName = fontObj.name.toLowerCase();
          style.bold = fontName.includes("bold");
          style.italic = fontName.includes("italic");
        }
        
        return {
          text: styledText,
          style: style
        } 
        
      });

      fullText += ""
      let prevStyle: IStyle | null = null;
      for(const item of items){
        fullText += applyStyle(item.text, prevStyle, item.style);
        prevStyle = item.style; // Bir sonraki eleman için önceki stil güncellenir     
      }
      if (prevStyle) {
        if (prevStyle.bold) fullText += `</b>`;
        if (prevStyle.italic) fullText += `</i>`;
      }
      //sayfa sonu
    }

    // belge sonu

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
      {message && (
        <div className="mt-4 p-6 bg-white rounded-lg shadow-lg">
          <div 
            className="whitespace-pre-wrap font-sans text-gray-800 leading-relaxed"
            dangerouslySetInnerHTML={{ 
              __html: message.replace(/\n/g, '<br/>') 
            }} 
          />
        </div>
      )}
    </div>
  );
}
