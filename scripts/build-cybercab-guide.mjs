// Builds cybercab-guide.html (main content, title, meta, JSON-LD) and its search records from data/cybercab-guide.json.
// The shell (nav, footer, bundle tags) lives in the page itself; bots never rewrite this page.
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {car} from './cybercab-art.mjs';
const require=createRequire(import.meta.url), M=require('../cybercab-guide-model.js'), e=M.esc;
const promises=JSON.parse(fs.readFileSync('data/promises.json','utf8')).promises;
const d=M.validate(JSON.parse(fs.readFileSync('data/cybercab-guide.json','utf8')),promises.map(p=>p.id));
const URL_='https://superchargeddaily.com/cybercab-guide.html',TITLE='Cybercab guide: specs and promises | Supercharged Daily';
const DESC='What Tesla has disclosed about the Cybercab, what is only reported, and what remains a target. Every number sourced and dated.';
const OG='https://superchargeddaily.com/assets/og-cybercab-guide.jpg';
const OG_ALT='Share card: Cybercab, checked. Rides in Austin since 3 Sep 2026 and more than 125,000 a year installed capacity are disclosed by Tesla; customer cars by end of 2026 is a target. Our own illustration, not Tesla CAD.';
const fmt=(v,o={day:'numeric',month:'short',year:'numeric'})=>new Intl.DateTimeFormat('en-GB',{...o,timeZone:'UTC'}).format(new Date(v+'T12:00:00Z')).replace('Sept','Sep');
const src=id=>d.sources.find(s=>s.id===id);
const cites=x=>[x.source,...(x.also||[])].map(cite).join(' · ');
const cite=id=>`<a class="cg-cite" href="${e(src(id).url)}" rel="noopener">${e(src(id).outlet)}, ${fmt(src(id).date)} →</a>`;
const chip=s=>`<span class="cg-chip cg-chip-${s}">${e(M.status[s])}</span>`;
const head=(id,n,title,text)=>`<header class="cg-head"><p class="cg-kicker">${n}</p><h2 id="${id}-h">${title}</h2><p>${text}</p></header>`;
const section=(id,n,title,text,body,cls='')=>`<section class="cg-section ${cls}" id="${id}" aria-labelledby="${id}-h">${head(id,n,title,text)}${body}</section>`;

const legend=`<ul class="cg-legend">${Object.entries({disclosed:'Tesla or a regulator said it in a document we opened.',target:'A stated aim or date. Not a result.',reported:'A journalist’s or reviewer’s finding. Tesla has not confirmed it.'}).map(([k,t])=>`<li>${chip(k)} <span>${t}</span></li>`).join('')}</ul>`;

const metrics=`${legend}<div class="cg-metrics">${d.metrics.map(m=>`<article class="cg-metric"><p class="cg-metric-label">${e(m.label)}</p><p class="cg-metric-value">${e(m.value)}<small>${e(m.unit)}</small></p><p class="cg-metric-detail">${e(m.detail)}</p><p class="cg-metric-foot">${chip(m.status)} <span>As of ${fmt(m.asOf)}</span> ${cites(m)}</p></article>`).join('')}</div>`;

const cols=d.versions.columns;
const table=`<div class="cg-table-wrap" tabindex="0" role="region" aria-label="Cybercab versions compared, scrolls sideways on small screens"><table class="cg-versions"><thead><tr><th scope="col"><span class="cg-sr">Feature</span></th>${cols.map(c=>`<th scope="col">${e(c.name)}<small>${e(c.when)}</small></th>`).join('')}</tr></thead><tbody>${d.versions.rows.map(r=>`<tr><th scope="row">${e(r.label)}</th>${cols.map(c=>{const x=r.cells[c.id];return x?`<td><span class="cg-val">${e(x.value)}</span><span class="cg-meta">${chip(x.status)} ${cites(x)}</span></td>`:`<td class="cg-none">Not published</td>`;}).join('')}</tr>`).join('')}</tbody></table></div><p class="cg-note">“Not published” means we found no figure from Tesla or a credible report, not that none exists. Tesla has not released a Cybercab spec sheet.</p>`;

const years=[...new Set(d.timeline.map(t=>t.date.slice(0,4)))];
const timeline=`<div class="cg-filters" data-filters hidden role="group" aria-label="Filter timeline by kind"><button type="button" data-type="all" aria-pressed="true">All</button>${Object.entries(M.types).filter(([k])=>d.timeline.some(t=>t.type===k)).map(([k,v])=>`<button type="button" data-type="${k}" aria-pressed="false">${v}</button>`).join('')}</div><ol class="cg-timeline">${years.map(y=>`<li class="cg-year"><h3>${y}</h3><ol>${d.timeline.filter(t=>t.date.startsWith(y)).map(t=>`<li class="cg-event" id="${e(t.id)}" data-type="${t.type}"><p class="cg-date"><time datetime="${t.date}">${e(t.display||fmt(t.date))}</time> <span class="cg-type">${M.types[t.type]}</span></p><h4>${e(t.title)}</h4><p>${e(t.text)}</p><p class="cg-event-foot">${cite(t.source)}</p></li>`).join('')}</ol></li>`).join('')}</ol>`;

const tally={};
const rows=d.promises.map(x=>({x,p:promises.find(p=>p.id===x.id)}));
rows.forEach(({p})=>tally[p.status]=(tally[p.status]||0)+1);
const slug=s=>s.toLowerCase().replace(/[^a-z]+/g,'-');
const promisesHtml=`<ul class="cg-tally" aria-label="Tally of these promises by outcome">${Object.entries(tally).map(([k,v])=>`<li class="cg-s-${slug(k)}"><strong>${v}</strong> ${e(k)}</li>`).join('')}</ul><ol class="cg-promises">${rows.map(({x,p})=>{const last=p.evidence[p.evidence.length-1];return `<li class="cg-promise cg-s-${slug(p.status)}" id="p-${e(p.id)}"><div class="cg-promise-top"><h3>${e(p.title)}</h3><span class="cg-status">${e(p.status)}</span></div><p class="cg-span">Said <time datetime="${p.said_on}">${fmt(p.said_on)}</time> by ${e(p.person)}. Due <time datetime="${p.deadline}">${fmt(p.deadline)}</time>.</p><blockquote><p>“${e(p.quote)}”</p></blockquote><p class="cg-promise-note">${e(x.note)}</p>${last?`<p class="cg-promise-ev"><strong>Latest evidence:</strong> ${e(last.text)} <a class="cg-cite" href="${e(last.source.url)}" rel="noopener">${e(last.source.outlet)}, ${fmt(last.date)} →</a></p>`:''}<p class="cg-promise-foot"><a class="cg-cite" href="${e(p.source.url)}" rel="noopener">Said at: ${e(p.source.outlet)} →</a> <span>Ledger last verified ${fmt(p.last_verified)}</span></p></li>`;}).join('')}</ol><p class="cg-note">Wording, status and evidence come from our <a href="/promise-tracker.html">promise tracker</a>, so a correction there appears here.</p>`;

const evidence=d.evidence.map(v=>`<article class="cg-evidence"><h3>${e(v.title)}</h3><p>${e(v.text)}</p><figure class="figure-embed"><blockquote class="twitter-tweet"><p lang="en" dir="ltr">${e(v.embed.text).replace(/\n\n/g,'<br><br>')}</p>&mdash; ${e(v.embed.name)} (@${e(v.embed.user)}) <a href="https://x.com/${e(v.embed.user)}/status/${e(v.embed.id)}">${e(v.embed.date)}</a></blockquote></figure><p class="cg-event-foot">${cite(v.source)}</p></article>`).join('');

const faq=`<div class="cg-faq">${d.faqs.map(f=>`<details><summary>${e(f.q)}</summary><p>${e(f.a)}</p><p class="cg-event-foot">${f.sources.map(cite).join(' · ')}</p></details>`).join('')}</div>`;
const changes=`<ol class="cg-changes">${d.changes.map(c=>`<li><time datetime="${c.date}">${fmt(c.date)}</time> <span class="cg-kind cg-kind-${c.kind}">${c.kind==='correction'?'Correction':'Update'}</span> ${e(c.text)}</li>`).join('')}</ol>`;
const ledger=`<ul class="cg-ledger">${d.sources.map(s=>`<li><a href="${e(s.url)}" rel="noopener">${e(s.title)}</a> <span>${e(s.outlet)} · ${fmt(s.date)} · opened ${fmt(s.checked)}</span></li>`).join('')}</ul>`;


const anatomy=`<div class="cg-anatomy"><figure class="cg-figure">${car(d.parts)}<figcaption>Our illustration, drawn from public descriptions. It is not Tesla CAD or a photograph, and proportions are approximate. Numbers match the list.</figcaption></figure><ol class="cg-parts">${d.parts.map((x,i)=>`<li data-part="${x.id}"><span class="cg-pn" aria-hidden="true">${i+1}</span><div><h3>${e(x.label)} ${chip(x.status)}</h3><p>${e(x.text)}</p><p class="cg-event-foot">${cites(x)}</p></div></li>`).join('')}</ol></div><h3 class="cg-sub">Known, but not placed</h3><ul class="cg-unplaced">${d.partsUnplaced.map(x=>`<li><h4>${e(x.label)} ${chip(x.status)}</h4><p>${e(x.text)}</p><p class="cg-event-foot">${cite(x.source)}</p></li>`).join('')}</ul>`;

const cap=d.capacity,nf=n=>n.toLocaleString('en-GB');
const capacity=`<div class="cg-cap" data-cap data-yearly="${cap.yearly}" data-target="${cap.target}"><p class="cg-cap-fact"><strong>More than ${nf(cap.yearly)} a year</strong> is what Tesla says Giga Texas is <em>set up</em> to build ${chip('disclosed')} ${cite(cap.source)}. Tesla says that is not the current production rate, and has published no Cybercab-specific output. The <strong>${cap.fleet.value}+</strong> cars serving Austin are a fleet count ${chip('disclosed')} ${cite(cap.fleet.source)}, not output.</p>
<div class="cg-cap-control" data-cap-control hidden><label for="cg-weekly">Cars built per week: <output id="cg-out" for="cg-weekly">500</output></label><input id="cg-weekly" type="range" min="50" max="2500" step="50" value="500"><p class="cg-cap-read" aria-live="polite" data-cap-read></p></div>
<div class="cg-table-wrap" tabindex="0" role="region" aria-label="What a weekly build rate adds up to"><table class="cg-captable"><thead><tr><th scope="col">If Tesla built</th><th scope="col">That is per year</th><th scope="col">Share of ${nf(cap.yearly)}</th><th scope="col">Weeks to ${nf(cap.target)} cars</th></tr></thead><tbody>${cap.steps.map(w=>{const r=M.plan(w,cap);return `<tr><th scope="row">${nf(r.weekly)} a week</th><td>${nf(r.yearly)}</td><td>${r.pct}%</td><td>${nf(r.weeks)}</td></tr>`;}).join('')}</tbody></table></div>
<p class="cg-note">An illustration of arithmetic, not a forecast: no one outside Tesla knows its weekly output. ${nf(cap.yearly)} a year is about ${nf(Math.round(cap.yearly/52))} a week, and Tesla’s figure is a floor. ${e(cap.note)}</p></div>`;

const rv=d.rivals,rivals=`<div class="cg-table-wrap" tabindex="0" role="region" aria-label="Robotaxi operators compared, scrolls sideways on small screens"><table class="cg-versions cg-rivals"><thead><tr><th scope="col"><span class="cg-sr">Measure</span></th>${rv.columns.map(c=>`<th scope="col">${e(c.name)}</th>`).join('')}</tr></thead><tbody>${rv.rows.map(r=>`<tr><th scope="row">${e(r.label)}</th>${rv.columns.map(c=>{const x=r.cells[c.id];return x?`<td><span class="cg-val">${e(x.value)}</span><span class="cg-meta">${chip(x.status)} ${cites(x)}</span></td>`:`<td class="cg-none">Not covered in this table</td>`;}).join('')}</tr>`).join('')}</tbody></table></div><p class="cg-note">${e(rv.note)} “Unsupervised” (Tesla) and “fully autonomous” (Waymo) are each company’s own wording; the miles are not like for like.</p>`;

const sec=[
 ['status','State of play','Six numbers that matter, each with its label, date and source.',metrics,'cg-status-s'],
 ['anatomy','The car, as far as it is known','Only features whose position is public are drawn. Everything else is listed below the picture.',anatomy],
 ['versions','Versions compared','The 2024 reveal against the car in Austin today, with a blank column for the version customers might get.',table],
 ['capacity','What “more than 125,000 a year” means','Installed capacity is not output. This table is arithmetic you can move, not a forecast.',capacity],
 ['timeline','Timeline','From the reveal to the open regulator question, newest last.',timeline],
 ['promises','Promises versus reality','What Tesla and Musk said about robotaxis and the Cybercab, and what happened.',promisesHtml],
 ['rivals','Against the other operators','Tesla, Waymo and Zoox in their own published figures.',rivals],
 ['evidence','Watch and read','Primary material and walkthroughs, shown as text first. The video loads only when you ask.',evidence],
 ['questions','Questions','Buying, price, range, charging and legality, answered from the sources.',faq],
 ['changes','What changed','Corrections are shown here, never silently rewritten.',changes],
 ['sources','Sources','Everything cited above, with the date we opened it.',ledger]
].map(([id,title,text,body,cls],i)=>section(id,String(i+1).padStart(2,'0'),title,text,body,cls)).join('\n');

const reviewed=fmt(d.reviewed);
const main=`<main id="main" class="cg">
<header class="cg-hero"><p class="cg-crumb"><a href="/tesla.html">Tesla</a> / Cybercab guide</p><h1>Cybercab, <span>checked against the sources</span></h1><p class="cg-lede">Per NHTSA, Tesla’s purpose-built robotaxi lacks a permanently attached steering wheel and pedals. By Tesla’s own deck it started carrying Austin riders on 3 September 2026. This guide separates what Tesla has disclosed from what has only been reported and what is still a target.</p><p class="cg-hero-meta">Reviewed ${reviewed} · <a href="/cybercab.html">Live fleet counters and cities →</a></p><nav class="cg-jump" aria-label="On this page">${sec.match(/id="([a-z]+)" aria-labelledby/g).map(m=>m.match(/id="([a-z]+)"/)[1]).map(id=>`<a href="#${id}">${id[0].toUpperCase()+id.slice(1)}</a>`).join('')}</nav></header>
${sec}
</main>`;

const ld={"@context":"https://schema.org","@graph":[
 {"@type":"WebPage","name":TITLE,"description":DESC,"url":URL_,"dateModified":d.reviewed,"about":{"@type":"Thing","name":"Tesla Cybercab"},"publisher":{"@type":"Organization","name":"Supercharged Daily","url":"https://superchargeddaily.com/"}},
 {"@type":"BreadcrumbList","itemListElement":[["Home","https://superchargeddaily.com/"],["Tesla","https://superchargeddaily.com/tesla.html"],["Cybercab guide",URL_]].map(([name,item],i)=>({"@type":"ListItem","position":i+1,name,item}))},
 {"@type":"FAQPage","mainEntity":d.faqs.map(f=>({"@type":"Question","name":f.q,"acceptedAnswer":{"@type":"Answer","text":f.a}}))}]};

let html=fs.readFileSync('cybercab-guide.html','utf8');
const meta=`<title>${e(TITLE)}</title>
    <meta name="description" content="${e(DESC)}" />
    <link rel="canonical" href="${URL_}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Supercharged Daily" />
    <meta property="og:title" content="${e(TITLE)}" />
    <meta property="og:description" content="${e(DESC)}" />
    <meta property="og:url" content="${URL_}" />
    <meta property="og:image" content="${OG}" />
    <meta property="og:image:alt" content="${e(OG_ALT)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@ALJR86" />
    <meta name="twitter:creator" content="@ALJR86" />
    <meta name="twitter:title" content="${e(TITLE)}" />
    <meta name="twitter:description" content="${e(DESC)}" />
    <meta name="twitter:image" content="${OG}" />
    <meta name="twitter:image:alt" content="${e(OG_ALT)}" />
    `;
html=html.replace(/<title>[\s\S]*?(?=<link rel="icon" href="\/favicon\.ico")/,meta)
 .replace(/<!-- seo:ld -->[\s\S]*?<!-- \/seo:ld -->/,`<!-- seo:ld -->\n    <script type="application/ld+json">${JSON.stringify(ld)}</script>\n    <!-- /seo:ld -->`)
 .replace(/<main\b[\s\S]*?<\/main>/,()=>main);
fs.writeFileSync('cybercab-guide.html',html);

// Search records, added without touching unrelated entries.
const indexPath='data/pages.json',index=JSON.parse(fs.readFileSync(indexPath,'utf8'));
const recs=[{url:'/cybercab-guide.html',title:'Tesla Cybercab guide',tag:'Cybercab',summary:'What Tesla has disclosed about the Cybercab, what is only reported and what is a target: specs, timeline, promises and regulator questions.'},
 ...[['status','Cybercab state of play','Production, capacity, Austin fleet, NHTSA audit and delivery aim, each labelled by source.'],['versions','Cybercab versions compared','The 2024 reveal against the production car: controls, charging, battery, range and cost.'],['timeline','Cybercab timeline','From the October 2024 reveal to the NHTSA deadline and planned Dallas launch.'],['anatomy','Cybercab anatomy','Illustrated side view with doors, seats, controls, light bar and motor, each labelled by source.'],['capacity','Cybercab capacity arithmetic','What more than 125,000 a year of installed capacity adds up to at different weekly build rates.'],['promises','Cybercab promises vs reality','Tesla and Musk robotaxi and Cybercab commitments, checked.'],['rivals','Tesla Robotaxi vs Waymo and Zoox','Driverless miles, places and vehicle type in each company’s own figures.'],['questions','Cybercab questions','Price, range, charging, legality and when customers can buy one.']].map(([id,title,summary])=>({url:'/cybercab-guide.html#'+id,title,tag:'Cybercab',summary}))];
const first=index.pages.findIndex(x=>x.url==='/cybercab.html');
index.pages=index.pages.filter(x=>!x.url.startsWith('/cybercab-guide.html'));
const at=first<0?index.pages.length:first+1;
index.pages.splice(at,0,...recs);
if(!index.updated||index.updated<d.reviewed)index.updated=d.reviewed;
fs.writeFileSync(indexPath,JSON.stringify(index,null,2)+'\n');
