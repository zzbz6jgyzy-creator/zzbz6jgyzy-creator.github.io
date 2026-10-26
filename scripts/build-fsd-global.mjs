#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),M=require('../fsd-global-model.js'),V=require('../fsd-global-view.js');
const ROOT=fileURLToPath(new URL('..',import.meta.url));
export function buildFSDGlobal(root=ROOT){
 const read=p=>fs.readFileSync(path.join(root,p),'utf8');
 const d=M.compose(JSON.parse(read('data/fsd-global.json')),JSON.parse(read('data/fsd-europe.json')));
 let html=read('fsd.html');
 const prior=html.match(/<script type="application\/json" id="fg-data">([\s\S]*?)<\/script>/)?.[1];
 if(prior&&JSON.parse(prior).reviewed>d.reviewed)throw Error('Refusing to roll back global market review');
 const newsletter=html.match(/<!--nl:start-->[\s\S]*?<!--nl:end-->/)?.[0];if(!newsletter)throw Error('Missing existing newsletter block');
 html=html.replace(/<main\b[\s\S]*?<\/main>/,()=>V.build(d,read('assets/world-countries.svg'),newsletter));
 const title='FSD Global Tracker — Country Availability, Software & Evidence | Supercharged Daily';
 const description='Explore Tesla FSD worldwide with an interactive country atlas, sourced market availability, software observations, country comparisons and vehicle eligibility guidance.';
 html=html.replace(/<title>[\s\S]*?<\/title>/,()=>'<title>'+M.esc(title)+'</title>');
 html=html.replace(/(<meta\s+(?:name|property)="(?:description|og:description|twitter:description)"\s+content=")[^"]*/g,(_,a)=>a+M.esc(description));
 html=html.replace(/(<meta\s+(?:name|property)="(?:og:title|twitter:title)"\s+content=")[^"]*/g,(_,a)=>a+M.esc(title));
 if(!html.includes('href="/fsd-global.css'))html=html.replace('    <!--sd:members-->','    <link rel="stylesheet" href="/fsd-global.css?v=20261026" />\n    <!--sd:members-->');
 const schema={'@context':'https://schema.org','@type':'CollectionPage','@id':'https://superchargeddaily.com/fsd.html#page',name:title,description,url:'https://superchargeddaily.com/fsd.html',dateModified:d.reviewed,isPartOf:{'@type':'WebSite',name:'Supercharged Daily',url:'https://superchargeddaily.com/'},hasPart:d.countries.map(c=>({'@type':'WebPageElement',name:'FSD in '+c.name,url:'https://superchargeddaily.com'+M.countryURL(c.code),description:M.labels[c.availability.status]+'. Vehicle eligibility remains configuration dependent.'}))};
 html=html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/,()=>'<script type="application/ld+json">'+JSON.stringify(schema).replace(/</g,'\\u003c')+'</script>');
 fs.writeFileSync(path.join(root,'fsd.html'),html);
 const pages=JSON.parse(read('data/pages.json')),own=p=>/^\/fsd\.html(?:#(?:map|countries|versions|compare|milestones|guide|sources))?$/.test(p.url),slot=pages.pages.findIndex(p=>p.url==='/fsd.html');
 pages.pages=pages.pages.filter(p=>!own(p));
 const entries=[{url:'/fsd.html',title:'FSD Global Tracker — Worldwide country atlas',tag:'Tesla',summary:description},...[
 ['map','FSD worldwide availability map','Explore dated Tesla market listings on an interactive world map with a searchable country directory.'],
 ['versions','FSD software by region and hardware','Understand FSD model names and firmware builds through dated independent software observations.'],
 ['compare','Compare FSD availability between countries','Compare market listings, permission evidence and software observations for two countries.'],
 ['milestones','FSD global rollout evidence trail','Read dated manufacturer statements, recognition records and software observations with sources.'],
 ['guide','FSD eligibility — What does my Tesla need?','Check the market, your installed driving computer, local package and delivered software.'],
 ['sources','FSD global tracker sources and methodology','Understand the difference between manufacturer listings, authority records and independent fleet samples.']
 ].map(([id,title,summary])=>({url:'/fsd.html#'+id,title,tag:'Tesla',summary}))];
 pages.pages.splice(slot<0?pages.pages.length:slot,0,...entries);fs.writeFileSync(path.join(root,'data/pages.json'),JSON.stringify(pages,null,2)+'\n');return d;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const d=buildFSDGlobal();console.log('Global FSD atlas built: '+d.countries.length+' markets, '+M.stats(d).listed+' Tesla-listed, '+d.events.length+' dated records.');}
