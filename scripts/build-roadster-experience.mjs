#!/usr/bin/env node
// Builds roadster-preview.html (the hidden, noindex preview of the rebuilt Roadster page) from
// data/roadster-experience.json (new facts and chapters) and data/roadster-studio.json (the shared editorial record).
// The live roadster.html and its builder are not touched until the preview is approved and swapped in.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const load=f=>{const c={};vm.createContext(c);vm.runInContext(read(f),c);return c;};
const S=load('roadster-studio-model.js').RoadsterStudio,M=createRequire(import.meta.url)('../roadster-experience-model.js'),e=M.esc;
const studio=S.validate(JSON.parse(read('data/roadster-studio.json')));
const d=M.validate(JSON.parse(read('data/roadster-experience.json')),studio.sources);
const URL_='https://superchargeddaily.com/roadster-preview.html',OG='https://superchargeddaily.com/assets/roadster-studio/finale-1920w.webp';

const fmt=(v,o={day:'numeric',month:'short',year:'numeric'})=>new Intl.DateTimeFormat('en-GB',{...o,timeZone:'UTC'}).format(new Date(String(v).slice(0,10)+'T12:00:00Z')).replace('Sept','Sep');
const all=new Map([...studio.sources.map(s=>[s.id,{id:s.id,label:s.label,outlet:s.label,url:s.url,kind:/^manufacturer/i.test(s.kind)?'manufacturer':'reporting',kindLabel:s.kind,note:s.note,checked:s.checked,date:null,studio:true}]),...d.sources.map(s=>[s.id,s])]);
const cite=id=>{const s=all.get(id);return `<a class="rx-cite" href="${e(s.url)}" target="_blank" rel="noopener">${e(s.outlet)}<span aria-hidden="true"> ↗</span></a>`;};
const cites=ids=>ids.map(cite).join('');
const chip=s=>`<span class="rx-chip rx-chip-${s}">${e(M.status[s])}</span>`;
const foot=x=>`<p class="rx-foot">${chip(x.status)}${x.sources?.length?`<span class="rx-cites">${cites(x.sources)}</span>`:''}</p>`;

// Responsive pictures from the two image folders. Reveal stills live in assets/roadster, studio shots in assets/roadster-studio.
function picture(id,alt,{folder='roadster',hero=false,cls='',sizes='100vw'}={}){
 const widths=folder==='roadster'?[960,1600,1920]:[640,1280,1920],u=(w,f)=>`/assets/${folder}/${id}-${w}w.${f}`;
 for(const w of widths)for(const f of['avif','webp'])if(!fs.existsSync(path.join(ROOT,u(w,f).slice(1))))throw Error('Missing image '+u(w,f));
 return `<picture${cls?` class="${cls}"`:''}><source type="image/avif" srcset="${widths.map(w=>u(w,'avif')+' '+w+'w').join(', ')}" sizes="${sizes}"/><img src="${u(widths[0],'webp')}" srcset="${widths.map(w=>u(w,'webp')+' '+w+'w').join(', ')}" sizes="${sizes}" alt="${e(alt)}" width="1920" height="1080" ${hero?'fetchpriority="high" loading="eager"':'loading="lazy"'} decoding="async"/></picture>`;
}
const head=(kicker,title,lead,cls='')=>`<header class="rx-head ${cls}"><p class="rx-kicker">${kicker}</p><h2>${title}</h2><p class="rx-lead">${lead}</p></header>`;

// ---- Hero and the four-fact strip
const strip=d.facts.filter(f=>f.strip).map(f=>`<article class="rx-fact"><p class="rx-fact-label">${e(f.label)}</p><p class="rx-fact-value">${e(f.value)}</p><p class="rx-fact-detail">${e(f.detail)}</p>${foot(f)}</article>`).join('');
const hero=`<header class="rx-hero" data-rx-chapter="top">
<div class="rx-hero-media" aria-hidden="true"><img src="/assets/roadster/hero-poster.webp" srcset="/assets/roadster/hero-poster-720.webp 720w, /assets/roadster/hero-poster.webp 1280w" sizes="100vw" alt="" width="1280" height="720" fetchpriority="high" loading="eager" decoding="async"/><video class="rx-clip" data-rx-clip muted loop playsinline preload="none" tabindex="-1"><source src="/assets/roadster/hero-loop.webm" type="video/webm"/><source src="/assets/roadster/hero-loop.mp4" type="video/mp4"/></video></div>
<div class="rx-hero-scrim"></div>
<div class="rx-hero-body"><p class="rx-kicker">Tesla / The definitive guide</p><h1><span class="visually-hidden">Tesla </span>ROADSTER</h1><p class="rx-hero-line">It flew.<br>Here is what is real.</p><p class="rx-hero-sub">Tesla's next-generation Roadster drove upside down, lifted over a line of Teslas on cold-gas thrusters and claimed 0 to 60 mph in 0.81 seconds. Production is targeted for 2028. Every number below says who said it.</p><div class="rx-hero-actions"><a class="rx-btn rx-btn-solid" href="#video">Watch the reveal</a><a class="rx-btn" href="#money">Reservation terms</a></div></div>
<a class="rx-scroll" href="#facts" aria-label="Scroll to the key facts">Scroll<span aria-hidden="true"></span></a></header>
<div class="rx-strip" id="facts"><div class="rx-wrap rx-strip-grid">${strip}</div></div>`;

// ---- The reveal: a pinned stage whose picture changes with each step
const layers=d.reveal.steps.map((s,i)=>`<div class="rx-layer${i===0?' is-active':''}" data-rx-layer="${s.id}">${picture(s.image,s.alt)}</div>`).join('');
const steps=d.reveal.steps.map(s=>`<article class="rx-step" data-rx-step="${s.id}"><div class="rx-step-card"><p class="rx-kicker">${s.number} / ${e(s.id==='run'?'The run':s.id==='gap'?'The gap':s.id==='hop'?'The hop':s.id==='flip'?'The flip':'The ramp')}</p><h3>${e(s.title)}</h3><p>${e(s.text)}</p>${foot(s)}</div></article>`).join('');
const film=studio.film;
const chaptersFilm=film.chapters.map(c=>`<button type="button" data-rx-chapter-time="${c.start}"><span>${S.stamp(c.start)}</span>${e(c.title)}</button>`).join('');
const reveal=`<section class="rx-stage" id="video" data-rx-chapter="video" aria-labelledby="video-h">
<div class="rx-stage-media" aria-hidden="true">${layers}<div class="rx-stage-scrim"></div></div>
<div class="rx-steps"><div class="rx-step rx-step-intro"><div class="rx-step-card"><p class="rx-kicker">${d.reveal.kicker}</p><h2 id="video-h">${d.reveal.title}</h2><p class="rx-lead">${e(d.reveal.lead)}</p></div></div>${steps}</div></section>
<section class="rx-film rx-wrap" aria-labelledby="film-h"><header class="rx-head"><p class="rx-kicker">The film</p><h2 id="film-h">The Roadster,<br>in motion.</h2><p class="rx-lead">${e(film.description)}</p></header>
<div class="rx-film-frame"><video id="rx-film" data-version="${e(film.mediaVersion)}" playsinline preload="none" poster="/assets/roadster-studio/world-1280w.webp" aria-label="Roadster, A New Dimension: an editorial film"><track kind="captions" src="/assets/roadster-studio/film-captions.vtt" srclang="en" label="English descriptions"/><track kind="chapters" src="/assets/roadster-studio/film-chapters.vtt" srclang="en" label="Chapters"/></video><button type="button" id="rx-film-cover" class="rx-film-cover"><span class="rx-play" aria-hidden="true"></span><span class="rx-film-cover-text">Play the film<small>00:50 / Tesla imagery / Supercharged Daily edit</small></span></button></div>
<div class="rx-film-bar"><p id="rx-film-status" role="status">The film loads when you press play. Sound is optional.</p><label for="rx-film-quality">Quality <select id="rx-film-quality"><option value="720">720p</option><option value="1080">1080p</option></select></label><button type="button" class="rx-link-button" id="rx-film-sound" aria-pressed="false">Soundtrack: off</button><a href="/assets/roadster-studio/roadster-film-720.mp4?v=${e(film.mediaVersion)}" download>Save the film ↓</a></div>
<div class="rx-film-chapters" aria-label="Film chapters">${chaptersFilm}</div>
<p class="rx-note"><a href="${e(film.music.source)}" target="_blank" rel="noopener">“${e(film.music.title)}” by ${e(film.music.composer)}</a>, released under <a href="${e(film.music.licenseUrl)}" target="_blank" rel="noopener">${e(film.music.license)}</a>. ${e(film.music.changes)} Effects are editorial sound design, not recorded vehicle audio. Footage is not an independent performance test.</p>
<div class="rx-replay"><div class="rx-replay-frame" id="rx-replay"><img src="/assets/roadster/stage-side-960w.webp" alt="" width="960" height="540" loading="lazy" decoding="async"/><button type="button" class="rx-replay-btn" data-rx-replay="qt5p-_tE8d0"><span class="rx-play" aria-hidden="true"></span><span>Watch Tesla's full event<small>YouTube, loads only when you press play</small></span></button></div><p class="rx-note">Tesla's own upload of the event. Nothing is requested from YouTube until you press play. ${cite('replay')}</p></div>
<noscript><video class="rx-nojs-film" controls playsinline preload="none" poster="/assets/roadster-studio/world-1280w.webp" src="/assets/roadster-studio/roadster-film-720.mp4?v=${e(film.mediaVersion)}"><track kind="captions" src="/assets/roadster-studio/film-captions.vtt" srclang="en" label="English descriptions"/></video><p class="rx-note"><a href="/assets/roadster-studio/roadster-film-720.mp4?v=${e(film.mediaVersion)}">Play the film directly</a> · <a href="${e(all.get('replay').url)}">Watch Tesla's full event on YouTube</a></p><style>.rx-film-frame,.rx-film-bar,.rx-film-chapters,.rx-replay-frame{display:none!important}</style></noscript></section>`;

// ---- Money, questions, evidence
const v=d.reservation;
const money=`<section class="rx-read" id="money" data-rx-chapter="money" aria-labelledby="money-h"><div class="rx-wrap">${head(e(v.kicker),v.title.replace('<br>','<br>'),e(v.lead)).replace('<h2>','<h2 id="money-h">')}
<div class="rx-cards">${v.cards.map(c=>`<article class="rx-card"><p class="rx-card-label">${e(c.label)}</p><p class="rx-card-value">${e(c.value)}</p><p>${e(c.detail)}</p>${foot(c)}</article>`).join('')}</div>
<ul class="rx-terms">${v.terms.map(t=>`<li><p>${e(t.text)}</p>${foot(t)}</li>`).join('')}</ul><p class="rx-note">${e(v.note)}</p></div></section>`;
const faq=`<section class="rx-read" id="faq" data-rx-chapter="faq" aria-labelledby="faq-h"><div class="rx-wrap">${head('Questions people ask','Straight<br>answers.','Short answers, each with the source behind it. Where a figure is a claim or a target, the answer says so.').replace('<h2>','<h2 id="faq-h">')}
<div class="rx-faq">${d.faq.map(q=>`<details><summary>${e(q.q)}</summary><p>${e(q.a)}</p><p class="rx-cites">${cites(q.sources)}</p></details>`).join('')}</div></div></section>`;
const ledger=[...all.values()].map(s=>`<li><a href="${e(s.url)}" target="_blank" rel="noopener">${e(s.label)}</a><span>${e(s.studio?s.kindLabel:s.outlet)}${s.date?' · '+fmt(s.date):''} · checked ${fmt(s.checked)}</span>${s.note?`<small>${e(s.note)}</small>`:''}</li>`).join('');
const changes=`<ol class="rx-changes">${d.changes.map(c=>`<li><time datetime="${c.date}">${fmt(c.date)}</time><span class="rx-kind rx-kind-${c.kind}">${c.kind==='correction'?'Correction':'Update'}</span> ${e(c.text)}</li>`).join('')}</ol>`;
const legend=`<ul class="rx-legend">${Object.entries({demo:'Tesla showed it happen at the event.',claim:'Tesla said it. Not independently verified.',target:'An aim or a date, not a result.',reported:'An outlet or our own report said it, and we opened the source.',analysis:'Our reading of the facts.'}).map(([k,t])=>`<li>${chip(k)}<span>${t}</span></li>`).join('')}</ul>`;
const evidence=`<section class="rx-read" id="evidence" data-rx-chapter="evidence" aria-labelledby="evidence-h"><div class="rx-wrap">${head('Evidence','Follow the<br>sources.','Every number on this page carries one of these labels, a source and a date. Tesla\'s own Roadster page blocks our fetcher, so anything we could not open is attributed to the outlet that reported it.').replace('<h2>','<h2 id="evidence-h">')}
${legend}<div class="rx-split"><div><h3>Sources</h3><ul class="rx-ledger">${ledger}</ul></div><div><h3>What changed on this page</h3>${changes}<p class="rx-note">Reviewed ${fmt(d.reviewed)}. Corrections are shown here, never silently rewritten.</p></div></div>
<p class="rx-credit">Images and reveal footage © Tesla, credited to the original sources. Film edit and additional sound design: Supercharged Daily. Music: “Legacy” by Scott Buckley (CC BY 4.0). Independent editorial coverage, not affiliated with Tesla or SpaceX. No final vehicle pricing or performance certification is implied.</p></div></section>`;

const rail=`<nav class="rx-rail" aria-label="Roadster chapters"><ol>${d.chapters.map(c=>`<li><a href="#${c.id}" data-rx-rail="${c.id}"><span>${e(c.label)}</span></a></li>`).join('')}</ol></nav><div class="rx-progress" aria-hidden="true"><i></i></div>`;
const motion=`<button type="button" class="rx-motion" id="rx-motion" aria-pressed="false"><span class="rx-motion-icon" aria-hidden="true"></span><span class="rx-motion-label">Pause motion</span></button>`;

const nl=(read('roadster-preview.html').match(/<!--nl:start-->[\s\S]*?<!--nl:end-->/)||[''])[0];
const main=`<main id="main" class="rx" data-rx>
${rail}${hero}
${reveal}
${money}
${faq}
${evidence}
${motion}${nl?'\n        '+nl:''}
</main>`;

const ld={'@context':'https://schema.org','@graph':[
 {'@type':'WebPage','@id':URL_+'#page',url:URL_,name:d.page.title,description:d.page.description,dateModified:d.reviewed,about:{'@type':'Thing',name:'Tesla Roadster (second generation)'},publisher:{'@type':'Organization',name:'Supercharged Daily',url:'https://superchargeddaily.com/'}},
 {'@type':'BreadcrumbList',itemListElement:[['Home','https://superchargeddaily.com/'],['Tesla','https://superchargeddaily.com/tesla.html'],['Roadster',URL_]].map(([name,item],i)=>({'@type':'ListItem',position:i+1,name,item}))}]};
const meta=`<title>${e(d.page.title)}</title>
    <meta name="description" content="${e(d.page.description)}" />
    <link rel="canonical" href="${URL_}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Supercharged Daily" />
    <meta property="og:title" content="${e(d.page.title)}" />
    <meta property="og:description" content="${e(d.page.description)}" />
    <meta property="og:url" content="${URL_}" />
    <meta property="og:image" content="${OG}" />
    <meta property="og:image:alt" content="Silver Tesla Roadster in a dark studio, front three-quarter view. Tesla imagery." />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@ALJR86" />
    <meta name="twitter:creator" content="@ALJR86" />
    <meta name="twitter:title" content="${e(d.page.title)}" />
    <meta name="twitter:description" content="${e(d.page.description)}" />
    <meta name="twitter:image" content="${OG}" />
    <script type="application/ld+json">${JSON.stringify(ld).replace(/</g,'\\u003c')}</script>
    `;
let html=read('roadster-preview.html');
html=html.replace(/<title>[\s\S]*?(?=<link rel="icon" href="\/favicon\.ico")/,meta).replace(/<main\b[\s\S]*?<\/main>/,()=>main);
fs.writeFileSync(path.join(ROOT,'roadster-preview.html'),html);
console.log(`Roadster preview: ${d.facts.length} facts, ${d.reveal.steps.length} reveal steps, ${d.faq.length} questions, ${all.size} sources; reviewed ${d.reviewed}`);
