import * as fs from 'fs';
const pdfParse = require('pdf-parse');


export default class PdfReader {

    static async readPdfText(filePath: string): Promise<string> {
    const buffer = fs.readFileSync(filePath);
    const results = await pdfParse(buffer);

    return results.text;
  }

}
