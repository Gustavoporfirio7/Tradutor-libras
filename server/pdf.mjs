export async function parseReferencePdf(bytes){
  const {PDFParse}=await import('pdf-parse');
  const parser=new PDFParse({data:bytes});
  try {const result=await parser.getText();return {text:result.text,pages:result.total};}
  finally {await parser.destroy();}
}
