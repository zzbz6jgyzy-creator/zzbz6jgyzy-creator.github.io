// Builds fsd-tracker.html (main content, title, meta, JSON-LD) and its search records from data/fsd-tracker.json.
// The shell (nav, footer, bundle tags) lives in the page itself. This page is separate from fsd.html on purpose:
// the owner can compare the two and keep either.
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {adoptionBars,adoptionList,attachSteps} from './fsd-tracker-charts.mjs';
const require=createRequire(import.meta.url),M=require('../fsd-tracker-model.js'),e=M.esc;
const d=M.validate(JSON.parse(fs.readFileSync('data/fsd-tracker.json','utf8')));
const global=JSON.parse(fs.readFileSync('data/fsd-global.json','utf8'));
const URL_='https://superchargeddaily.com/fsd-tracker.html',TITLE='FSD by the numbers: adoption and rollout | Supercharged Daily';
const DESC='How big Tesla FSD is and how fast it is growing: subscriptions, attach rate, markets and software, each number sourced and dated.';
const OG='https://superchargeddaily.com/assets/og-v2.jpg';
const fmt=(v,o={day:'numeric',month:'short',year:'numeric'})=>new Intl.DateTimeFormat('en-GB',{...o,timeZone:'UTC'}).format(new Date(v+'T12:00:00Z')).replace('Sept','Sep');
const nf=(n,x=2)=>n.toLocaleString('en-GB',{minimumFractionDigits:x,maximumFractionDigits:x});
const src=id=>d.sources.find(s=>s.id===id);
const cite=id=>`<a class="ft-cite" href="${e(src(id).url)}" rel="noopener">${e(src(id).outlet)}, ${fmt(src(id).date)} →</a>`;
const chip=s=>`<span class="ft-chip ft-chip-${s}">${e(M.status[s])}</span>`;
const section=(id,n,title,text,body,cls='')=>`<section class="ft-section ${cls}" id="${id}" aria-labelledby="${id}-h"><header class="ft-head"><p class="ft-kicker">${n}</p><h2 id="${id}-h">${title}</h2><p>${text}</p></header>${body}</section>`;

// Markets come from the global tracker's data so the two pages cannot disagree.
const listed=global.listed.length,wsrc=global.sources.find(s=>s.id==='tesla-world');
const kpiHtml=d.kpis.map(k=>{
  if(k.computed==='markets')return `<article class="ft-kpi"><p class="ft-kpi-label">${e(k.label)}</p><p class="ft-kpi-value">${listed}<small>${e(k.unit)}</small></p><p class="ft-kpi-detail">Tesla's own list, checked ${fmt(wsrc.checked)}. A listing is not a legal approval and does not mean every car can use it. <a href="/fsd.html">Country by country →</a></p><p class="ft-kpi-foot">${chip('disclosed')} <span>As of ${fmt(wsrc.checked)}</span> <a class="ft-cite" href="${e(wsrc.url)}" rel="noopener">Tesla, checked ${fmt(wsrc.checked)} →</a></p></article>`;
  return `<article class="ft-kpi"><p class="ft-kpi-label">${e(k.label)}</p><p class="ft-kpi-value">${e(k.value)}<small>${e(k.unit)}</small></p><p class="ft-kpi-detail">${e(k.detail)}</p><p class="ft-kpi-foot">${chip(k.status)} <span>As of ${fmt(k.asOf)}</span> ${cite(k.source)}</p></article>`;
}).join('');

const pts=d.adoption.points,first=pts[0],last=pts.at(-1),yoy=pts.find(p=>p.end===`${+last.end.slice(0,4)-1}${last.end.slice(4)}`);
const adoption=`<div class="ft-split"><figure class="ft-card ft-fig"><div class="ft-desk">${adoptionBars(pts)}</div><div class="ft-phone">${adoptionList(pts)}</div><figcaption>Active FSD subscriptions, millions, at the end of each quarter. ${cite('q3-update')} · ${cite('q1-update')}</figcaption></figure>
<aside class="ft-card"><h3>Who takes it with the car</h3><p class="ft-muted">Share of new deliveries in North America that include FSD (Supervised).</p>${attachSteps(d.adoption.attach)}<p class="ft-event-foot">${chip('disclosed')} ${d.adoption.attach.map(a=>cite(a.source)).filter((v,i,a)=>a.indexOf(v)===i).join(' · ')}</p></aside></div>
<p class="ft-takeaway"><strong>${nf(last.subs)} million</strong> active subscriptions in ${e(last.label)}${yoy?`, up from ${nf(yoy.subs)} million a year earlier (${Math.round((last.subs/yoy.subs-1)*100)}%)`:''}. Our own ratio of subscriptions per 100 cars ever delivered rose from ${nf(M.ratio(first),1)} to ${nf(M.ratio(last),1)} over the period shown.</p>
<details class="ft-table-view"><summary>View the numbers as a table</summary><div class="ft-table-wrap" tabindex="0" role="region" aria-label="Adoption table"><table class="ft-table"><thead><tr><th scope="col">Quarter end</th><th scope="col">Active subscriptions (M)</th><th scope="col">Cars delivered, all time (M)</th><th scope="col">Subscriptions per car (our ratio)</th><th scope="col">Source</th></tr></thead><tbody>${pts.map(p=>`<tr><th scope="row">${e(p.label)} <small>${fmt(p.end)}</small></th><td>${nf(p.subs)}</td><td>${nf(p.deliveries,1)}</td><td>${nf(M.ratio(p),1)}% ${chip('estimate')}</td><td>${cite(p.source)}</td></tr>`).join('')}</tbody></table></div></details>
<p class="ft-note">${e(d.adoption.caveat)}</p>`;

const legend=`<ul class="ft-legend">${[['disclosed','Tesla or a regulator said it in a document we opened.'],['reported','A journalist, analyst or tracker found it. Tesla has not confirmed it.'],['estimate','Our own arithmetic on disclosed numbers. Shown dashed or marked.'],['approx','Read off a chart Tesla published without exact labels.'],['target','A stated aim or date. Not a result.']].map(([k,t])=>`<li>${chip(k)} <span>${t}</span></li>`).join('')}</ul>`;
const changes=`<ol class="ft-changes">${d.changes.map(c=>`<li><time datetime="${c.date}">${fmt(c.date)}</time> <span class="ft-kind ft-kind-${c.kind}">${c.kind==='correction'?'Correction':'Update'}</span> ${e(c.text)}</li>`).join('')}</ol>`;
const ledger=`<ul class="ft-ledger">${d.sources.map(s=>`<li><a href="${e(s.url)}" rel="noopener">${e(s.title)}</a> <span>${e(s.outlet)} · ${fmt(s.date)} · opened ${fmt(s.checked)}</span></li>`).join('')}</ul>`;

const sec=[
 ['adoption','How big, and growing','Subscriptions per quarter and how many new cars come with FSD. Tesla publishes these in its shareholder decks.',adoption],
 ['labels','How to read the numbers','Every figure on this page carries one of these labels, a date and a source.',legend],
 ['changes','What changed','Corrections are shown here, never silently rewritten.',changes],
 ['sources','Sources','Everything cited above, with the date we opened it.',ledger]
].map(([id,title,text,body,cls],i)=>section(id,String(i+1).padStart(2,'0'),title,text,body,cls)).join('\n');
const jump=['adoption','labels','changes','sources'].map(id=>`<a href="#${id}">${id[0].toUpperCase()+id.slice(1)}</a>`).join('');
const main=`<main id="main" class="ft">
<header class="ft-hero"><p class="ft-crumb"><a href="/tesla.html">Tesla</a> / FSD by the numbers</p><h1>FSD, by the numbers.<br><span>Sourced, dated, plain.</span></h1><p class="ft-lede">How big Tesla's Full Self-Driving (Supervised) is, how fast it is growing and where it works. Every number says who published it and when, and where Tesla has not published one we say so.</p><p class="ft-hero-meta">Reviewed ${fmt(d.reviewed)} · <a href="/fsd.html">Country-by-country tracker →</a> · <a href="/fsd-europe.html">Europe →</a> · <a href="/updates.html">Software →</a></p><div class="ft-kpis">${kpiHtml}</div><nav class="ft-jump" aria-label="On this page">${jump}</nav></header>
${sec}
</main>`;

const ld={"@context":"https://schema.org","@graph":[
 {"@type":"WebPage","name":TITLE,"description":DESC,"url":URL_,"dateModified":d.reviewed,"about":{"@type":"Thing","name":"Tesla Full Self-Driving (Supervised)"},"publisher":{"@type":"Organization","name":"Supercharged Daily","url":"https://superchargeddaily.com/"}},
 {"@type":"BreadcrumbList","itemListElement":[["Home","https://superchargeddaily.com/"],["Tesla","https://superchargeddaily.com/tesla.html"],["FSD by the numbers",URL_]].map(([name,item],i)=>({"@type":"ListItem","position":i+1,name,item}))}]};
let html=fs.readFileSync('fsd-tracker.html','utf8');
const meta=`<title>${e(TITLE)}</title>
    <meta name="description" content="${e(DESC)}" />
    <link rel="canonical" href="${URL_}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Supercharged Daily" />
    <meta property="og:title" content="${e(TITLE)}" />
    <meta property="og:description" content="${e(DESC)}" />
    <meta property="og:url" content="${URL_}" />
    <meta property="og:image" content="${OG}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@ALJR86" />
    <meta name="twitter:creator" content="@ALJR86" />
    <meta name="twitter:title" content="${e(TITLE)}" />
    <meta name="twitter:description" content="${e(DESC)}" />
    <meta name="twitter:image" content="${OG}" />
    `;
html=html.replace(/<title>[\s\S]*?(?=<link rel="icon" href="\/favicon\.ico")/,meta)
 .replace(/<!-- seo:ld -->[\s\S]*?<!-- \/seo:ld -->/,`<!-- seo:ld -->\n    <script type="application/ld+json">${JSON.stringify(ld)}</script>\n    <!-- /seo:ld -->`)
 .replace(/<main\b[\s\S]*?<\/main>/,()=>main);
fs.writeFileSync('fsd-tracker.html',html);

// Search records, added without touching unrelated entries.
const indexPath='data/pages.json',index=JSON.parse(fs.readFileSync(indexPath,'utf8'));
const recs=[{url:'/fsd-tracker.html',title:'FSD by the numbers',tag:'FSD',summary:'How big Tesla FSD is and how fast it is growing: subscriptions, attach rate, markets and software, each number sourced and dated.'},
 {url:'/fsd-tracker.html#adoption',title:'FSD adoption: subscriptions and attach rate',tag:'FSD',summary:'Active FSD subscriptions per quarter from Tesla’s decks and the North America attach rate on new deliveries.'}];
index.pages=index.pages.filter(x=>!x.url.startsWith('/fsd-tracker.html'));
// After the last /fsd.html entry, so the global tracker's builder (which keeps its own records in one block) never reorders ours.
const at=index.pages.reduce((k,x,i)=>/^\/fsd\.html(#|$)/.test(x.url)?i:k,-1);
index.pages.splice(at<0?index.pages.length:at+1,0,...recs);
if(!index.updated||index.updated<d.reviewed)index.updated=d.reviewed;
fs.writeFileSync(indexPath,JSON.stringify(index,null,2)+'\n');
