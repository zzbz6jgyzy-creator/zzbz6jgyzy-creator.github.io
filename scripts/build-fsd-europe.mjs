#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT=fileURLToPath(new URL('../',import.meta.url));
function modules(root){const ctx={window:{},URL,Intl,Date};vm.createContext(ctx);for(const file of ['fsd-europe-model.js','fsd-europe-view.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx);return ctx.window;}
function write(root,file,content,changed){const p=path.join(root,file);if(fs.existsSync(p)&&fs.readFileSync(p,'utf8')===content)return;fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,content);changed.push(file);}

export function buildFSDEurope(root=ROOT){
  const {SDFE:M,SDFEView:V}=modules(root),data=JSON.parse(fs.readFileSync(path.join(root,'data/fsd-europe.json'),'utf8'));M.validate(data);
  const changed=[],svg=fs.readFileSync(path.join(root,'assets/europe-fsd-v2.svg'),'utf8');let checks={};try{checks=JSON.parse(fs.readFileSync(path.join(root,'data/fsd-europe-source-checks.json'),'utf8'));}catch{}
  write(root,'fsd-europe-data.js','// Generated from data/fsd-europe.json by scripts/build-fsd-europe.mjs. Edit the JSON source.\nwindow.FSD_EUROPE = '+JSON.stringify(data,null,2)+';\n',changed);
  const htmlPath=path.join(root,'fsd-europe.html');let html=fs.readFileSync(htmlPath,'utf8');
  const re=/<!--snapshot:fsd-europe-->[\s\S]*?<!--\/snapshot:fsd-europe-->/;
  const prior=html.match(/id="fe-snapshot">([\s\S]*?)<\/script>/)?.[1];let previous=null;try{previous=JSON.parse(prior);}catch{}
  if(previous?.updated&&previous.updated>data.updated)throw Error('Refusing to replace a newer Europe snapshot');
  if(!re.test(html))throw Error('Missing FSD Europe snapshot mount');
  html=html.replace(re,()=>`<!--snapshot:fsd-europe-->${V.render(data,svg,{checks})}<!--/snapshot:fsd-europe-->`);
  write(root,'fsd-europe.html',html,changed);

  // Only publish substantive country profiles with manufacturer-listed availability.
  // Other country records remain readable in the atlas, without thin search pages.
  for(const c of data.countries.filter(c=>c.availability.status==='listed')){
    const canonical='https://superchargeddaily.com/fsd-europe/'+c.slug+'.html';
    const title='FSD in '+c.name+' | Supercharged Daily';
    const description='Tesla Assisted Driving / FSD (Supervised) in '+c.name+': national permission, Tesla listings and dated sources.';
    const metadata={"@context":"https://schema.org","@type":"WebPage",name:title,url:canonical,description,dateModified:data.updated,isPartOf:{"@type":"WebSite",name:'Supercharged Daily',url:'https://superchargeddaily.com/'}};
    const body=`<main id="main" class="fe country-leaf"><p class="eyebrow">FSD Europe · Country evidence</p><a class="link-button" href="/fsd-europe.html?country=${c.code}#overview">← Open ${M.esc(c.name)} in the interactive atlas</a><h1>FSD in ${M.esc(c.name)}</h1><p class="lead">National permission, customer availability and vehicle eligibility, kept separate.</p><p class="fine">Updated <time datetime="${data.updated}">${M.esc(M.day(data.updated))}</time>. Each source keeps its own date.</p><section class="panel inspector"><h2>Current country evidence</h2>${V.dossier(data,c).replace(/<a class="link-button" href="\/fsd-europe\/[^"]+\.html">[\s\S]*?<\/a>/,'').replace(/<div class="map-tools" data-js hidden>[\s\S]*?<\/div>/,'')}</section><section class="tool-section"><h2>Dated country records</h2>${V.changes(data,{country:c.code})}</section><section class="panel tool-section"><h2>Before using the system</h2><p>Active driver supervision is required. A market listing does not establish entitlement for every vehicle, registration country or software build. Check the Tesla app and manufacturer conditions for your own vehicle.</p><a href="/fsd-europe.html#guide">Understand the approval process →</a></section></main>`;
    let leaf=html.replace(/<main\b[\s\S]*?<\/main>/,()=>body).replace(/<title>[\s\S]*?<\/title>/,()=>'<title>'+M.esc(title)+'</title>');
    leaf=leaf.replace(/(<link\b[^>]*rel="canonical"[^>]*href=")[^"]*(")/,(_,a,b)=>a+canonical+b);
    leaf=leaf.replace(/(<meta\b[^>]*(?:name|property)="(?:description|og:description|twitter:description)"[^>]*content=")[^"]*(")/g,(_,a,b)=>a+M.esc(description)+b).replace(/(<meta\b[^>]*(?:name|property)="(?:og:title|twitter:title)"[^>]*content=")[^"]*(")/g,(_,a,b)=>a+M.esc(title)+b).replace(/(<meta\b[^>]*property="og:url"[^>]*content=")[^"]*(")/,(_,a,b)=>a+canonical+b);
    leaf=leaf.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g,'').replace('</head>',()=>'<script type="application/ld+json">'+JSON.stringify(metadata).replace(/</g,'\\u003c')+'</script>\n</head>');
    // Leaf pages need site navigation only, not a second copy of the atlas application.
    let core='/assets/js/core.bundle.5243ad45a9.js';try{core=JSON.parse(fs.readFileSync(path.join(root,'assets/js/manifest.json'),'utf8')).bundles.core.file;}catch{}
    leaf=leaf.replace(/<!--sd:bundles-->[\s\S]*?<!--\/sd:bundles-->/,()=>`<!--sd:bundles-->\n    <script defer src="${core}"></script>\n    <!--/sd:bundles-->`);
    const members=html.match(/<!--sd:members-->[\s\S]*?<!--\/sd:members-->/)?.[0];if(members){leaf=leaf.replace(/[ \t]*<!--sd:members-->[\s\S]*?<!--\/sd:members-->\n?/,'').replace(/\n[ \t]*<\/head>/,()=>`\n    ${members}\n  </head>`);}
    write(root,'fsd-europe/'+c.slug+'.html',leaf,changed);
  }

  // Keep the existing global file standalone for its other consumers and fixtures.
  // The Europe rows are generated from the same country records, never edited twice.
  let global=fs.readFileSync(path.join(root,'fsd-data.js'),'utf8');const ctx={window:{}};vm.runInNewContext(global,ctx);const current=ctx.window.FSD_GLOBAL;
  const old=new Map(current.countries.map(c=>[c.code,c]));
  const start=global.indexOf('  countries: ['),end=global.indexOf('\n  ],',start);if(start<0||end<0)throw Error('Missing global country mount');
  const existing=global.slice(start+'  countries: ['.length,end).replace(/\s*\/\/ fsd-europe:begin[\s\S]*?\/\/ fsd-europe:end/,'');
  const rows=existing.split('\n').filter(line=>!line.includes('region: "Europe"'));
  const generated=data.countries.map(c=>{const loc=old.get(c.code)||{lon:-19,lat:65};return {code:c.code,name:c.name,region:'Europe',status:c.availability.status==='listed'?'live':c.permission.status==='recorded'?'approved':'watch',date:c.availability.status==='listed'?c.availability.reviewedAt:c.permission.date,version:'Market-specific version not verified',hardware:'Vehicle eligibility applies',lon:loc.lon,lat:loc.lat,note:c.availability.note+' '+M.labels[c.permission.status]+'. Individual customer installation dates remain separate.',source:{label:'Tesla market availability and conditions',url:M.sources(data,c.availability.evidence)[0]?.url||'/fsd-europe.html'}};});
  global=global.slice(0,start)+'  countries: ['+rows.join('\n')+'\n    // fsd-europe:begin\n'+generated.map(c=>'    '+JSON.stringify(c)+',').join('\n')+'\n    // fsd-europe:end'+global.slice(end);
  global=global.replace(/updated: "\d{4}-\d{2}-\d{2}"/,`updated: "${[current.updated,data.updated].sort().at(-1)}"`).replace(/note:\s*\n\s*"[^\n]*",/,'note:\n    "Live describes sourced market availability, subject to vehicle eligibility. National recognition, manufacturer availability and individual delivery observations are separate. Driver supervision remains required.",');
  global=global.replace(/(region: "Europe",\s*hardware:) "[^"]*"/,'$1 "Hardware applicability not independently verified"').replace('The European stack. Same week as US 14.3.11, still on 14.2. Listed in Europe as Assisted Driving Basic.','Reported European build mapping. This does not establish hardware or national eligibility. Consult Tesla Assisted Driving conditions.').replace('label: "Czechia live"','label: "Czechia recognition"').replace('Transport ministry recognition; customer rollout under way the same day.','Transport ministry recognition; a separate first customer installation date is not established here.').replace('Eighth EU country. Tesla listed customer use by 1 October.','National recognition recorded. Tesla currently lists market availability; vehicle conditions apply.');
  write(root,'fsd-data.js',global,changed);
  return changed;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)console.log('FSD Europe generated:',buildFSDEurope().join(', ')||'unchanged');
