import {spawn} from 'node:child_process';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const children=[
  spawn(process.execPath,[resolve(root,'server/index.mjs')],{cwd:root,stdio:'inherit',windowsHide:true}),
  spawn(process.execPath,[resolve(root,'node_modules/react-scripts/scripts/start.js')],{cwd:root,stdio:'inherit',windowsHide:true,env:{...process.env,PORT:'3000',HOST:'127.0.0.1',BROWSER:'none'}})
];
let stopping=false;
const stop=()=>{if(stopping)return;stopping=true;children.forEach(child=>child.kill());};
for(const child of children){child.on('error',error=>{console.error(error.message);stop();process.exitCode=1;});child.on('exit',code=>{if(!stopping){stop();process.exitCode=code||0;}});}
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,stop);
