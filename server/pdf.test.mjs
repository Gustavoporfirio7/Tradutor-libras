import test from 'node:test';
import assert from 'node:assert/strict';
import {parseReferencePdf} from './pdf.mjs';
test('extrai texto de um PDF selecionável válido',async()=>{
  const stream='BT /F1 12 Tf 36 700 Td (EFATA reference example) Tj ET';
  const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  let text='%PDF-1.4\n';const offsets=[0];
  objects.forEach((object,index)=>{offsets.push(Buffer.byteLength(text));text+=`${index+1} 0 obj\n${object}\nendobj\n`;});
  const start=Buffer.byteLength(text);text+='xref\n0 6\n0000000000 65535 f \n';
  offsets.slice(1).forEach(offset=>{text+=`${String(offset).padStart(10,'0')} 00000 n \n`;});
  text+=`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
  const result=await parseReferencePdf(Buffer.from(text));assert.equal(result.pages,1);assert.match(result.text,/EFATA reference example/);
});
