#!/usr/bin/env node
import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import{fileURLToPath}from'node:url';import{createRequire}from'node:module';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url),M=require('../starship-studio-model.js'),V=require('../starship-studio-view.js');
export function buildStarshipStudio(root=ROOT){
 const ctx={window:{}};for(const f of ['starship-data.js','starship-lab-data.js'])vm.runInNewContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
 const data=M.normalize(ctx.window.STARSHIP,ctx.window.STARSHIP_LAB),file=path.join(root,'starship.html');let html=fs.readFileSync(file,'utf8');
 if(!html.includes('<!--ss:studio-->'))throw Error('Missing Starship studio marker');
 html=html.replace(/<!--ss:studio-->[\s\S]*?<!--\/ss:studio-->/,'<!--ss:studio-->\n'+V.render(data)+'\n<!--/ss:studio-->');
 html=html.replace(/<script type="application\/json" id="ss-studio-data">[\s\S]*?<\/script>/,'<script type="application/json" id="ss-studio-data">'+JSON.stringify(data).replace(/</g,'\\u003c')+'</script>');
 html=html.replace(/(<span id="ss-hero-next">)[\s\S]*?(<\/span>)/,'$1FLIGHT '+data.next.number+'$2').replace(/(<span id="ss-source-date">)[\s\S]*?(<\/span>)/,'$1Source snapshot '+M.date(data.updated)+'$2');
 fs.writeFileSync(file,html);fs.writeFileSync(path.join(root,'data/starship-studio.json'),JSON.stringify(data,null,1)+'\n');return data;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const d=buildStarshipStudio();console.log('Starship observatory saved: '+d.flights.length+' flights, next F'+d.next.number+'; source '+d.updated);}
