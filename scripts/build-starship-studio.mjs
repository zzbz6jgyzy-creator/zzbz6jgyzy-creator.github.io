#!/usr/bin/env node
import {preserveResponsiveImages} from './preserve-responsive-images.mjs';
import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import{fileURLToPath}from'node:url';import{createRequire}from'node:module';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url),M=require('../starship-studio-model.js'),V=require('../starship-studio-view.js');
export function buildStarshipStudio(root=ROOT){
 const ctx={window:{}};for(const f of ['starship-data.js','starship-lab-data.js'])vm.runInNewContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
 const data=M.normalize(ctx.window.STARSHIP,ctx.window.STARSHIP_LAB),file=path.join(root,'starship.html');let html=fs.readFileSync(file,'utf8');
 // Each hook must appear exactly once. A renamed or moved hook would otherwise be skipped silently and
 // leave a stale flight number, window or source date on the page. Function replacements keep any "$"
 // in rendered text literal.
 const put=(name,re,value)=>{const found=(html.match(new RegExp(re.source,'g'))||[]).length;if(found!==1)throw Error('starship.html: expected one '+name+', found '+found);html=html.replace(re,()=>value);};
 put('ss:studio block',/<!--ss:studio-->[\s\S]*?<!--\/ss:studio-->/,'<!--ss:studio-->\n'+preserveResponsiveImages(html,V.render(data))+'\n<!--/ss:studio-->');
 put('ss-studio-data script',/<script type="application\/json" id="ss-studio-data">[\s\S]*?<\/script>/,'<script type="application/json" id="ss-studio-data">'+JSON.stringify(data).replace(/</g,'\\u003c')+'</script>');
 put('ss-hero-next span',/<span id="ss-hero-next">[\s\S]*?<\/span>/,'<span id="ss-hero-next">FLIGHT '+data.next.number+'</span>');
 put('ss-hero-window span',/<span id="ss-hero-window">[\s\S]*?<\/span>/,'<span id="ss-hero-window">'+M.esc(M.windowHero(data.next))+'</span>');
 put('ss-source-date span',/<span id="ss-source-date">[\s\S]*?<\/span>/,'<span id="ss-source-date">Source snapshot '+M.date(data.updated)+'</span>');
 fs.writeFileSync(file,html);fs.writeFileSync(path.join(root,'data/starship-studio.json'),JSON.stringify(data,null,1)+'\n');return data;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const d=buildStarshipStudio();console.log('Starship observatory saved: '+d.flights.length+' flights, next F'+d.next.number+'; source '+d.updated);}
