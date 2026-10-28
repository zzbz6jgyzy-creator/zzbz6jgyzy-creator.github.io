#!/usr/bin/env node
// Builds roadster-preview.html (the hidden, noindex preview of the rebuilt Roadster page) from
// data/roadster-experience.json (new facts and chapters) and data/roadster-studio.json (the shared editorial record).
// The live roadster.html and its builder are not touched until the preview is approved and swapped in.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {anatomy} from './roadster-experience-art.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const load=f=>{const c={};vm.createContext(c);vm.runInContext(read(f),c);return c;};
const S=load('roadster-studio-model.js').RoadsterStudio,M=createRequire(import.meta.url)('../roadster-experience-model.js'),e=M.esc;
const studio=S.validate(JSON.parse(read('data/roadster-studio.json')));
const clips=JSON.parse(read('data/roadster-clips.json')),clipById=Object.fromEntries(clips.clips.map(c=>[c.id,c]));
const d=M.validate(JSON.parse(read('data/roadster-experience.json')),studio.sources,clips.clips.map(c=>c.id));
const tint=JSON.parse(read('data/roadster-colors.json'));
const URL_='https://superchargeddaily.com/roadster-preview.html',OG='https://superchargeddaily.com/assets/og-roadster.jpg';

const fmt=(v,o={day:'numeric',month:'short',year:'numeric'})=>new Intl.DateTimeFormat('en-GB',{...o,timeZone:'UTC'}).format(new Date(String(v).slice(0,10)+'T12:00:00Z')).replace('Sept','Sep');
const all=new Map([...studio.sources.map(s=>[s.id,{id:s.id,label:s.label,outlet:s.label,url:s.url,kind:/^manufacturer/i.test(s.kind)?'manufacturer':'reporting',kindLabel:s.kind,note:s.note,checked:s.checked,date:null,studio:true}]),...d.sources.map(s=>[s.id,s])]);
const cite=id=>{const s=all.get(id);return `<a class="rx-cite" href="${e(s.url)}" target="_blank" rel="noopener">${e(s.outlet)}<span aria-hidden="true"> ↗</span></a>`;};
const cites=ids=>ids.map(cite).join('');
const chip=s=>`<span class="rx-chip rx-chip-${s}">${e(M.status[s])}</span>`;
const foot=x=>`<p class="rx-foot">${chip(x.status)}${x.sources?.length?`<span class="rx-cites">${cites(x.sources)}</span>`:''}</p>`;

// Responsive pictures from the two image folders. Reveal stills live in assets/roadster, studio shots in assets/roadster-studio.
function picture(id,alt,{folder='roadster',hero=false,eager=false,cls='',sizes='100vw'}={}){
 const widths=folder==='roadster'?[960,1600,1920]:[640,1280,1920],u=(w,f)=>`/assets/${folder}/${id}-${w}w.${f}`;
 for(const w of widths)for(const f of['avif','webp'])if(!fs.existsSync(path.join(ROOT,u(w,f).slice(1))))throw Error('Missing image '+u(w,f));
 return `<picture${cls?` class="${cls}"`:''}><source type="image/avif" srcset="${widths.map(w=>u(w,'avif')+' '+w+'w').join(', ')}" sizes="${sizes}"/><img src="${u(widths[0],'webp')}" srcset="${widths.map(w=>u(w,'webp')+' '+w+'w').join(', ')}" sizes="${sizes}" alt="${e(alt)}" width="1920" height="1080" ${hero?'fetchpriority="high" loading="eager"':eager?'loading="eager"':'loading="lazy"'} decoding="async"/></picture>`;
}
const head=(kicker,title,lead,cls='')=>`<header class="rx-head ${cls}"><p class="rx-kicker">${kicker}</p><h2>${title}</h2><p class="rx-lead">${lead}</p></header>`;

// ---- Hero and the four-fact strip
const strip=d.facts.filter(f=>f.strip).map(f=>`<article class="rx-fact"><p class="rx-fact-label">${e(f.label)}</p><p class="rx-fact-value"${/^\$?\d[\d,]*(\.\d+)?[+ a-z]*$/i.test(f.value)&&!/^\d{4}$/.test(f.value)?' data-rx-count':''}>${e(f.value)}</p><p class="rx-fact-detail">${e(f.detail)}</p>${foot(f)}</article>`).join('');
const hero=`<header class="rx-hero" data-rx-chapter="top">
<div class="rx-hero-media" aria-hidden="true">${picture('world','',{folder:'roadster-studio',hero:true,sizes:'100vw'})}<video class="rx-clip" data-rx-clip muted loop playsinline preload="none" tabindex="-1"><source src="/assets/roadster/hero-loop.webm" type="video/webm"/><source src="/assets/roadster/hero-loop.mp4" type="video/mp4"/></video></div>
<div class="rx-hero-scrim"></div><div class="rx-grain" aria-hidden="true"></div>
<div class="rx-hero-body"><p class="rx-kicker">Tesla / The definitive guide</p><h1><span class="visually-hidden">Tesla </span>ROADSTER</h1><p class="rx-hero-line">It flew.<br>Here is what is real.</p><p class="rx-hero-sub">Tesla's next-generation Roadster drove upside down, lifted over a line of Teslas on cold-gas thrusters and claimed 0 to 60 mph in 0.81 seconds. Production is targeted for 2028. Every number below says who said it.</p><div class="rx-hero-actions"><a class="rx-btn rx-btn-solid" href="#video">Watch the reveal</a><a class="rx-btn" href="#money">Reservation terms</a></div></div>
<a class="rx-scroll" href="#facts" aria-label="Scroll to the key facts">Scroll<span aria-hidden="true"></span></a></header>
<div class="rx-strip" id="facts"><div class="rx-wrap rx-strip-grid">${strip}</div></div>`;

// ---- The reveal: a pinned stage whose picture changes with each step
// A loop for a layer: WebM first (smaller), MP4 as the fallback, 720 px for phones. preload=none: nothing downloads until the layer is near.
const clipVideo=id=>{const u=(w,x)=>{const f=`/assets/roadster-clips/${id}-${w}.${x}`;if(!fs.existsSync(path.join(ROOT,f.slice(1))))throw Error('Missing clip '+f);return f;};
 return `<video class="rx-clip" data-rx-clip muted loop playsinline preload="none" disablepictureinpicture tabindex="-1" aria-hidden="true"><source media="(max-width: 700px)" src="${u(720,'webm')}" type="video/webm"/><source media="(max-width: 700px)" src="${u(720,'mp4')}" type="video/mp4"/><source src="${u(1280,'webm')}" type="video/webm"/><source src="${u(1280,'mp4')}" type="video/mp4"/></video>`;};
const layers=d.reveal.steps.map((s,i)=>`<div class="rx-layer${i===0?' is-active':''}" data-rx-layer="${s.id}" style="--c:${tint[s.image]||'#15171a'}">${picture(s.image,s.alt)}${s.clip?clipVideo(s.clip):''}</div>`).join('');
const steps=d.reveal.steps.map(s=>`<article class="rx-step" data-rx-step="${s.id}"><div class="rx-step-card"><span class="rx-step-num" aria-hidden="true">${s.number}</span><p class="rx-kicker">${s.number} / ${e(s.kicker)}</p><h3>${e(s.title)}</h3><p>${e(s.text)}</p>${foot(s)}</div></article>`).join('');
const film=studio.film;
const chaptersFilm=film.chapters.map(c=>`<button type="button" data-rx-chapter-time="${c.start}"><span>${S.stamp(c.start)}</span>${e(c.title)}</button>`).join('');
const reveal=`<section class="rx-stage" id="video" data-rx-chapter="video" aria-labelledby="video-h">
<div class="rx-stage-media" aria-hidden="true">${layers}<div class="rx-stage-scrim"></div><div class="rx-grain"></div><div class="rx-stage-prog" aria-hidden="true">${d.reveal.steps.map(()=>'<i></i>').join('')}<b></b></div></div>
<div class="rx-steps"><div class="rx-step rx-step-intro"><div class="rx-step-card"><p class="rx-kicker">${e(d.reveal.kicker)}</p><h2 id="video-h">${d.reveal.title}</h2><p class="rx-lead">${e(d.reveal.lead)}</p></div></div>${steps}</div></section>
<p class="rx-stage-credit rx-wrap">Stage footage: silent excerpts of Tesla's Roadster Event livestream, faded in and out and credited to Tesla. <a href="${e(clips.source.original)}" target="_blank" rel="noopener">Watch the original ↗</a></p>
<section class="rx-film rx-wrap" aria-labelledby="film-h"><header class="rx-head"><p class="rx-kicker">The film</p><h2 id="film-h">The Roadster,<br>in motion.</h2><p class="rx-lead">${e(film.description)}</p></header>
<div class="rx-film-frame"><video id="rx-film" data-version="${e(film.mediaVersion)}" playsinline preload="none" poster="/assets/roadster-studio/world-1280w.webp" aria-label="Roadster, A New Dimension: an editorial film"><track kind="captions" src="/assets/roadster-studio/film-captions.vtt" srclang="en" label="English descriptions"/><track kind="chapters" src="/assets/roadster-studio/film-chapters.vtt" srclang="en" label="Chapters"/></video><button type="button" id="rx-film-cover" class="rx-film-cover"><span class="rx-play" aria-hidden="true"></span><span class="rx-film-cover-text">Play the film<small>00:50 / Tesla imagery / Supercharged Daily edit</small></span></button></div>
<div class="rx-film-bar"><p id="rx-film-status" role="status">The film loads when you press play. Sound is optional.</p><label for="rx-film-quality">Quality <select id="rx-film-quality"><option value="720">720p</option><option value="1080">1080p</option></select></label><button type="button" class="rx-link-button" id="rx-film-sound">Soundtrack: off</button><a href="/assets/roadster-studio/roadster-film-720.mp4?v=${e(film.mediaVersion)}" download>Save the film ↓</a></div>
<div class="rx-film-chapters" role="group" aria-label="Film chapters">${chaptersFilm}</div>
<p class="rx-note"><a href="${e(film.music.source)}" target="_blank" rel="noopener">“${e(film.music.title)}” by ${e(film.music.composer)}</a>, released under <a href="${e(film.music.licenseUrl)}" target="_blank" rel="noopener">${e(film.music.license)}</a>. ${e(film.music.changes)} Effects are editorial sound design, not recorded vehicle audio. Footage is not an independent performance test.</p>
<div class="rx-replay"><div class="rx-replay-frame" id="rx-replay"><img src="/assets/roadster/stage-side-960w.webp" alt="" width="960" height="540" loading="lazy" decoding="async"/><button type="button" class="rx-replay-btn" data-rx-replay="qt5p-_tE8d0"><span class="rx-play" aria-hidden="true"></span><span>Watch Tesla's full event<small>YouTube, loads only when you press play</small></span></button></div><p class="rx-note">Tesla's own upload of the event. Nothing is requested from YouTube until you press play. ${cite('replay')}</p></div>
<noscript><video class="rx-nojs-film" controls playsinline preload="none" poster="/assets/roadster-studio/world-1280w.webp" src="/assets/roadster-studio/roadster-film-720.mp4?v=${e(film.mediaVersion)}"><track kind="captions" src="/assets/roadster-studio/film-captions.vtt" srclang="en" label="English descriptions"/></video><p class="rx-note"><a href="/assets/roadster-studio/roadster-film-720.mp4?v=${e(film.mediaVersion)}">Play the film directly</a> · <a href="${e(all.get('replay').url)}">Watch Tesla's full event on YouTube</a></p></noscript></section>`;

// ---- Money, questions, evidence
const v=d.reservation;
const money=`<section class="rx-read" id="money" data-rx-chapter="money" aria-labelledby="money-h"><div class="rx-wrap">${head(e(v.kicker),v.title,e(v.lead)).replace('<h2>','<h2 id="money-h">')}
<div class="rx-cards">${v.cards.map(c=>`<article class="rx-card"><p class="rx-card-label">${e(c.label)}</p><p class="rx-card-value">${e(c.value)}</p><p>${e(c.detail)}</p>${foot(c)}</article>`).join('')}</div>
<ul class="rx-terms">${v.terms.map(t=>`<li><p>${e(t.text)}</p>${foot(t)}</li>`).join('')}</ul><p class="rx-note">${e(v.note)}</p></div></section>`;
const faq=`<section class="rx-read" id="faq" data-rx-chapter="faq" aria-labelledby="faq-h"><div class="rx-wrap">${head('Questions people ask','Straight<br>answers.','Short answers, each with the source behind it. Where a figure is a claim or a target, the answer says so.').replace('<h2>','<h2 id="faq-h">')}
<div class="rx-faq">${d.faq.map(q=>`<details><summary>${e(q.q)}</summary><p>${e(q.a)}</p><p class="rx-cites">${cites(q.sources)}</p></details>`).join('')}</div></div></section>`;
const cited=new Set([...JSON.stringify(d).matchAll(/"sources":\s*\[([^\]]*)\]/g)].flatMap(m=>[...m[1].matchAll(/"([a-z0-9-]+)"/g)].map(x=>x[1])));cited.add('replay');
const ledger=[...all.values()].filter(s=>cited.has(s.id)).map(s=>`<li><a href="${e(s.url)}" target="_blank" rel="noopener">${e(s.label)}</a><span>${e(s.studio?s.kindLabel:s.outlet)}${s.date?' · '+fmt(s.date):''} · checked ${fmt(s.checked)}</span>${s.note?`<small>${e(s.note)}</small>`:''}</li>`).join('');
const changes=`<ol class="rx-changes">${d.changes.map(c=>`<li><time datetime="${c.date}">${fmt(c.date)}</time><span class="rx-kind rx-kind-${c.kind}">${c.kind==='correction'?'Correction':'Update'}</span> ${e(c.text)}</li>`).join('')}</ol>`;
const legend=`<ul class="rx-legend">${Object.entries({demo:'Tesla showed it happen at the event.',claim:'Tesla said it. Not independently verified.',target:'An aim or a date, not a result.',reported:'An outlet or our own report said it, and we opened the source.',analysis:'Our reading of the facts.'}).map(([k,t])=>`<li>${chip(k)}<span>${t}</span></li>`).join('')}</ul>`;
const evidence=`<section class="rx-read" id="evidence" data-rx-chapter="evidence" aria-labelledby="evidence-h"><div class="rx-wrap">${head('Evidence','Follow the<br>sources.','Every number on this page carries one of these labels, a source and a date. Tesla\'s own Roadster page blocks our fetcher, so anything we could not open is attributed to the outlet that reported it.').replace('<h2>','<h2 id="evidence-h">')}
${legend}<div class="rx-sources"><h3>Sources</h3><ul class="rx-ledger">${ledger}</ul></div></div></section>`;
// The changes log and the credit close the page, outside the chapter tabs, so a corrected figure is never hidden in a tab.
const closing=`<section class="rx-read rx-closing" id="changes" aria-labelledby="changes-h"><div class="rx-wrap"><header class="rx-head rx-head-sub"><p class="rx-kicker">Changes</p><h2 id="changes-h">What changed<br>on this page.</h2></header>
${changes}<p class="rx-note">Reviewed ${fmt(d.reviewed)}. Corrections are shown here, never silently rewritten.</p>
<p class="rx-credit">Images and reveal footage © Tesla, credited to the original sources. Film edit and additional sound design: Supercharged Daily. Music: “Legacy” by Scott Buckley (CC BY 4.0). Independent editorial coverage, not affiliated with Tesla or SpaceX. No final vehicle pricing or performance certification is implied.</p></div></section>`;


// ---- Every angle: a horizontal reel of the pictures, with collections and a full-screen viewer
const groupName={exterior:'Exterior',interior:'Interior',engineering:'Engineering',reveal:'The reveal'};
const photo=(g,i)=>picture(g.id,g.alt,{folder:g.legacy?'roadster':'roadster-studio',eager:i<2,sizes:'(max-width: 700px) 88vw, 70vw'});
const shots=studio.gallery.map((g,i)=>`<li class="rx-shot" data-rx-group="${g.group}"><a class="rx-shot-link" href="/assets/${g.legacy?'roadster':'roadster-studio'}/${g.id}-1920w.webp" data-rx-photo="${i}" style="--c:${tint[g.id]||'#202226'}" aria-label="Open ${e(g.title)} full screen">${photo(g,i)}<span class="rx-shot-open" aria-hidden="true">Open</span></a><div class="rx-shot-cap"><p class="rx-kicker">${e(groupName[g.group])} / ${String(i+1).padStart(2,'0')}</p><h3>${e(g.title)}</h3><p>${e(g.description)}</p><small>${e(g.credit)} · ${cite(g.source)}</small></div></li>`).join('');
const social=d.social,xHtml=`<section class="rx-social" id="on-x" aria-labelledby="on-x-h"><div class="rx-wrap">${head(e(social.kicker),social.title,e(social.lead)).replace('<h2>','<h2 id="on-x-h">')}<div class="rx-social-grid">${social.posts.map(q=>`<figure class="figure-embed"><blockquote class="twitter-tweet" data-media-max-width="720" data-dnt="true" data-theme="dark"><p lang="en" dir="ltr">${e(q.text)}</p>— ${e(q.author)} (@${e(q.handle)}) <a href="${e(q.url)}">View the post on X</a></blockquote><figcaption>${e(q.caption)}</figcaption></figure>`).join('')}</div></div></section>`;
const galleryHtml=`<section class="rx-gallery" id="gallery" data-rx-chapter="gallery" aria-labelledby="gallery-h"><div class="rx-wrap">${head(e(d.gallery.kicker),d.gallery.title,e(d.gallery.lead)).replace('<h2>','<h2 id="gallery-h">')}
<div class="rx-gallery-bar"><div class="rx-filters" role="group" aria-label="Picture collections">${[['all','All'],['exterior','Exterior'],['interior','Interior'],['engineering','Engineering'],['reveal','The reveal']].map(([id,name])=>`<button type="button" data-rx-filter="${id}" aria-pressed="${id==='all'}">${name}</button>`).join('')}</div><p class="rx-count" id="rx-gallery-count" role="status" aria-live="polite">${studio.gallery.length} pictures</p><div class="rx-arrows" role="group" aria-label="Scroll the pictures"><button type="button" data-rx-reel="-1" aria-label="Previous pictures">←</button><button type="button" data-rx-reel="1" aria-label="Next pictures">→</button></div></div></div>
<div class="rx-reel" tabindex="0" role="region" aria-label="Roadster pictures"><ol class="rx-reel-list">${shots}</ol></div></section>
<dialog id="rx-photo-dialog" class="rx-photo-dialog" aria-labelledby="rx-photo-title"><div class="rx-viewer-top"><p id="rx-photo-title">Roadster pictures</p><button type="button" id="rx-photo-close" aria-label="Close the viewer">×</button></div><img id="rx-photo-image" alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==" width="1920" height="1080"/><div class="rx-viewer-bottom"><button type="button" id="rx-photo-prev" aria-label="Previous picture">←</button><p id="rx-photo-caption"></p><button type="button" id="rx-photo-next" aria-label="Next picture">→</button></div></dialog>`;

// ---- Inside
const ck=d.cockpit;
const cockpitHtml=`<section class="rx-cockpit" id="cockpit" data-rx-chapter="cockpit" aria-labelledby="cockpit-h"><div class="rx-wrap">${head(e(ck.kicker),ck.title,e(ck.lead)).replace('<h2>','<h2 id="cockpit-h">')}</div>
<figure class="rx-cockpit-scene">${picture('cockpit','Roadster interior with the steer-by-wire yoke, the central touchscreen and two forward displays',{folder:'roadster-studio',sizes:'100vw'})}<div class="rx-hotspots">${ck.hotspots.map((h,i)=>`<button type="button" data-rx-hotspot="${i}" style="--x:${h.x}%;--y:${h.y}%" aria-label="${String(i+1).padStart(2,'0')}: ${e(h.label)}" aria-pressed="${i===0}">${String(i+1).padStart(2,'0')}</button>`).join('')}</div><figcaption>Tesla studio imagery. The numbered labels are our annotations.</figcaption></figure>
<div class="rx-wrap rx-cockpit-cards">${ck.cards.map((c,i)=>`<article class="rx-cockpit-card${i===0?' is-selected':''}" data-rx-cockpit="${i}"><p class="rx-kicker">${c.number} / Cockpit</p><h3>${e(c.title)}</h3><p>${e(c.text)}</p>${foot(c)}</article>`).join('')}</div></section>`;

// ---- Engineering: a diagram that follows the system you pick, over a loop of the wing, then what the engineer said
const sysButtons=studio.tech.map((t,i)=>`<button type="button" data-rx-system="${t.id}" aria-controls="rx-tech-${t.id}" aria-pressed="${i===0}"><span>${String(i+1).padStart(2,'0')}</span>${e(t.name)}</button>`).join('');
const sysPanels=studio.tech.map((t,i)=>`<article class="rx-tech-panel" id="rx-tech-${t.id}" data-rx-tech-panel="${t.id}"><p class="rx-kicker">System ${String(i+1).padStart(2,'0')}</p><h3>${e(t.short)}</h3><p class="rx-tech-summary">${e(t.summary)}</p><div class="rx-tech-reading"><div><h4>How it works</h4><p>${e(t.how)}</p></div><div><h4>Why it matters</h4><p>${e(t.why)}</p></div></div><details><summary>What this does, and does not, establish</summary><p>${e(t.boundary)}</p></details><p class="rx-foot"><span class="rx-cites">${cite(t.source)}</span></p></article>`).join('');
const eng=d.engineer;
const techHtml=`<section class="rx-tech" id="tech" data-rx-chapter="tech" aria-labelledby="tech-h"><div class="rx-tech-band" aria-hidden="true">${picture('wing-high-downforce','',{folder:'roadster'})}${clipVideo('wing')}<div class="rx-tech-scrim"></div></div>
<div class="rx-wrap rx-tech-body">${head('Beneath the surface','Extraordinary looks.<br>Serious engineering.','Six systems and the principle behind each. The diagram explains mechanisms; it is not Tesla CAD, a measured simulation or a prediction of performance.').replace('<h2>','<h2 id="tech-h">')}
<div class="rx-system-buttons" role="group" aria-label="Engineering systems">${sysButtons}</div>
<div class="rx-engineering" data-rx-diagram="suction"><div class="rx-engineering-stage">${anatomy()}<p class="rx-diagram-label"><span class="rx-kicker">Mechanism study</span><span id="rx-system-name">${e(studio.tech[0].name)}</span><small>Illustrated principle, not a measured force model</small></p></div><div class="rx-tech-panels">${sysPanels}</div></div>
<div class="rx-engineer">${head(e(eng.kicker),eng.title,e(eng.lead),'rx-head-sub')}<div class="rx-engineer-grid">${eng.cards.map(c=>`<article class="rx-engineer-card"><h3>${e(c.title)}</h3><p>${e(c.text)}</p>${foot(c)}</article>`).join('')}</div></div></div></section>`;

// ---- The numbers, and the physics behind the 0.81 seconds
const pf=d.performance;
const numberCard=i=>`<article class="rx-number"><p class="rx-number-label">${e(i.label)}</p><p class="rx-number-value">${e(i.value).replace(/\n/g,'<br>')}</p><p class="rx-number-detail">${e(i.detail)}</p>${foot(i)}</article>`;
const numbersHtml=`<section class="rx-read rx-numbers" id="performance" data-rx-chapter="performance" aria-labelledby="performance-h"><div class="rx-wrap">${head(e(pf.kicker),pf.title,e(pf.lead)).replace('<h2>','<h2 id="performance-h">')}
${pf.groups.map(g=>`<div class="rx-number-group"><h3>${e(g.label)}</h3><div class="rx-number-grid">${g.items.map(numberCard).join('')}</div></div>`).join('')}
<div class="rx-physics"><div><p class="rx-kicker">A simplified physics illustration ${chip('analysis')}</p><p class="rx-g"><span id="rx-g-value">≈3.38</span><small>g, average acceleration, calculated</small></p><p id="rx-physics-caption" class="rx-note">From Tesla's claimed 0.81-second run. This is a calculation from elapsed time, not measured acceleration, and 0 to 60 mph is 0 to 96.6 km/h, not 0 to 100.</p><div class="rx-physics-options" role="group" aria-label="Acceleration illustration">${[[.81,'Stage run, 0.81 s'],[1.6,'Performance target'],[.9,'Thrust target'],[.59,'Rocket target']].map(([v,t],i)=>`<button type="button" data-rx-physics="${v}" aria-pressed="${i===0}">${t}</button>`).join('')}</div></div>
<figure class="rx-physics-chart"><svg viewBox="0 0 600 350" role="img" aria-labelledby="rx-physics-title"><title id="rx-physics-title">Constant average acceleration from 0 to 60 miles per hour</title><path d="M65 40V285H555" fill="none" stroke="currentColor" opacity=".3"/><path d="M65 90H555M65 155H555M65 220H555" stroke="currentColor" opacity=".1"/><path id="rx-physics-area" d="M65 285L303 55V285Z" fill="currentColor" opacity=".12"/><path id="rx-physics-line" d="M65 285L303 55" stroke="var(--rx-read-accent)" stroke-width="3" fill="none"/><circle id="rx-physics-dot" cx="303" cy="55" r="6" fill="var(--rx-read-accent)"/><text x="20" y="60" fill="currentColor" font-size="12">60</text><text x="29" y="290" fill="currentColor" font-size="12">0</text><text x="65" y="325" fill="currentColor" font-size="12">0 s</text><text x="535" y="325" fill="currentColor" font-size="12" text-anchor="middle">1.6 s</text><text x="65" y="22" fill="currentColor" font-size="10">SPEED, MPH</text></svg><figcaption>A straight line is used for explanation; Tesla has not published an acceleration curve. For an "under" target the line shows a threshold, not a result.</figcaption></figure></div></div></section>`;

// ---- Three trims
const trimDetails=c=>`<details class="rx-trim-details"><summary>Full ${e(c.name)} details</summary><p class="rx-note">Reported specifications, subject to change and not independently verified.</p><dl>${c.reportedSpecs.map(([l,v])=>`<div><dt>${e(l)}</dt><dd>${e(v)}</dd></div>`).join('')}</dl><h4>Equipment</h4><ul>${c.equipment.map(x=>`<li>${e(x)}</li>`).join('')}</ul>${c.exclusions.length?`<h4>Not included</h4><ul>${c.exclusions.map(x=>`<li>${e(x)}</li>`).join('')}</ul>`:''}<p class="rx-foot"><span class="rx-cites">${cite(c.equipmentSource)}</span></p></details>`;
const trimsHtml=`<section class="rx-trims" id="trims" data-rx-chapter="trims" aria-labelledby="trims-h"><div class="rx-wrap">${head('Choose the question','Three trims.<br>Three ambitions.','Tesla\'s configuration descriptions, with Sawyer Merritt\'s reported equipment breakdown. Open a trim for the detail. All figures remain subject to change.').replace('<h2>','<h2 id="trims-h">')}
<div class="rx-configs">${studio.configs.map(c=>`<article class="rx-config" data-config="${c.id}"><p class="rx-kicker">${e(c.tag)}<span>${e(c.availability)}</span></p><h3>${e(c.name)}</h3><p class="rx-config-time">${e(c.target)}<small>0 to 60 mph, announced target ${chip('target')}</small></p><ul>${c.features.map(x=>`<li>${e(x)}</li>`).join('')}</ul><p class="rx-note">${e(c.note)}</p>${trimDetails(c)}${c.id==='rocket'?'<p class="rx-warn">Not approved for public road use.</p>':''}<button type="button" class="rx-btn rx-btn-small" data-rx-compare="${c.id}" aria-pressed="false">Add to comparison +</button></article>`).join('')}</div>
<div class="rx-compare" id="rx-compare" hidden><header><h3>Your comparison</h3><button type="button" class="rx-link-button" id="rx-compare-clear">Clear</button></header><div id="rx-compare-content"></div></div>
<div class="rx-spec-note"><p>Range target: over <b data-rx-distance="300">300 miles</b>. Rocket top-speed claim: over <b data-rx-speed="230">230 mph</b>. Targets, not certified results. The trim breakdown reports over 210 mph for Performance and over 230 mph for Thrust and Rocket. Tesla's page describes Thrust as under one second; the October announcement said under 0.9 s, which we keep.</p><div class="rx-unit-buttons" role="group" aria-label="Units"><button type="button" data-rx-unit="imperial" aria-pressed="true">Miles, mph</button><button type="button" data-rx-unit="metric" aria-pressed="false">km, km/h</button></div></div></div></section>`;

// ---- The wait: a timeline, then 2017 against 2026
const tl=d.timeline,pr=tl.promise;
const timelineHtml=`<section class="rx-read rx-timeline" id="timeline" data-rx-chapter="timeline" aria-labelledby="timeline-h"><div class="rx-wrap">${head(e(tl.kicker),tl.title,e(tl.lead)).replace('<h2>','<h2 id="timeline-h">')}
<ol class="rx-spine">${tl.events.map(t=>`<li><p class="rx-spine-date">${e(t.label)}</p><div class="rx-spine-card"><h3>${e(t.title)}</h3><p>${e(t.text)}</p>${foot(t)}</div></li>`).join('')}</ol>
<div class="rx-promise" id="promise">${head(e(pr.kicker),pr.title,e(pr.lead),'rx-head-sub')}<div class="rx-table-wrap" tabindex="0" role="region" aria-label="2017 promises against the 2026 reveal"><table class="rx-table"><thead><tr><th scope="col">What</th><th scope="col">Promised in 2017</th><th scope="col">Said in 2026</th><th scope="col">Label and sources</th></tr></thead><tbody>${pr.rows.map(r=>`<tr><th scope="row">${e(r.label)}</th><td>${e(r.then)}</td><td>${e(r.now)}</td><td>${foot(r)}</td></tr>`).join('')}</tbody></table></div></div></div></section>`;

// ---- Chapter tabs. Below 900 px the script shows one panel at a time; wide screens and no-script readers get every panel in order.
// Each anchor id the site links to lives in exactly one panel (a test checks it). Labels are short so seven fit a scrolling bar.
const tabDefs=[
 {id:'pictures',label:'Pictures',primary:'gallery',html:galleryHtml+xHtml},
 {id:'inside',label:'Inside',primary:'cockpit',html:cockpitHtml},
 {id:'engineering',label:'Engineering',primary:'tech',html:techHtml},
 {id:'numbers',label:'Numbers',primary:'performance',html:numbersHtml},
 {id:'models',label:'Models',primary:'trims',html:trimsHtml+'\n'+money},
 {id:'timeline',label:'Timeline',primary:'timeline',html:timelineHtml},
 {id:'questions',label:'Questions',primary:'faq',html:faq+'\n'+evidence}];
const tabBar=tabDefs.map((t,i)=>`<button type="button" role="tab" class="rx-tab" id="rx-tab-${t.id}" aria-controls="rx-panel-${t.id}" aria-selected="${i===0}" tabindex="${i===0?0:-1}" data-rx-tab="${t.id}" data-rx-primary="${t.primary}"><span aria-hidden="true">${String(i+1).padStart(2,'0')}</span>${t.label}</button>`).join('');
const panelsHtml=tabDefs.map((t,i)=>{const nx=tabDefs[i+1];
 return `<div class="rx-panel" id="rx-panel-${t.id}" role="tabpanel" aria-labelledby="rx-tab-${t.id}" data-rx-panel="${t.id}">
${t.html}
<div class="rx-panel-next"><p class="rx-kicker">Chapter ${i+1} of ${tabDefs.length}</p>${nx?`<button type="button" class="rx-btn rx-btn-next" data-rx-next="${nx.id}">Next: ${nx.label}</button>`:'<a class="rx-btn rx-btn-next rx-btn-up" href="#top">Back to the top</a>'}</div></div>`;}).join('\n');
const tabsHtml=`<div class="rx-tabs" id="rx-tabs" data-rx-tabs>
<div class="rx-tabs-intro"><p class="rx-kicker">Keep exploring</p><p class="rx-tabs-title">The rest of the story, one chapter at a time.</p></div>
<div class="rx-tabbar-wrap"><div class="rx-tabbar" role="tablist" aria-label="Roadster sections">${tabBar}</div></div>
${panelsHtml}
</div>`;

const rail=`<nav class="rx-rail" aria-label="Roadster chapters"><ol>${d.chapters.map(c=>`<li><a href="#${c.id}" data-rx-rail="${c.id}"><span>${e(c.label)}</span></a></li>`).join('')}</ol></nav><div class="rx-progress" aria-hidden="true"><i></i></div>`;
const motion=`<button type="button" class="rx-motion" id="rx-motion" aria-pressed="false"><span class="rx-motion-icon" aria-hidden="true"></span><span class="rx-motion-label">Pause motion</span></button>`;

const nl=(read('roadster-preview.html').match(/<!--nl:start-->[\s\S]*?<!--nl:end-->/)||[''])[0];
const main=`<main id="main" class="rx" data-rx>
${motion}${rail}${hero}
${reveal}
${tabsHtml}
${closing}
<script type="application/json" id="rx-data">${JSON.stringify({configs:studio.configs.map(c=>({id:c.id,name:c.name,tag:c.tag,seats:c.seats,target:c.target,availability:c.availability})),tech:studio.tech.map(t=>({id:t.id,name:t.name})),gallery:studio.gallery.map(g=>({id:g.id,group:g.group,title:g.title,description:g.description,alt:g.alt,credit:g.credit,legacy:!!g.legacy}))}).replace(/</g,'\\u003c')}</script>${nl?'\n        '+nl:''}
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
    <meta property="og:image:alt" content="The Tesla Roadster at night with its doors raised under a starry sky, with the words Roadster: it flew, here is what is real. Image: Tesla." />
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
// The stylesheet token follows the file's content, so a CSS change can never ship under a stale cache key.
const cssV=crypto.createHash('sha1').update(read('roadster-experience.css')).digest('hex').slice(0,8);
html=html.replace(/roadster-experience\.css\?v=[\w-]+/,'roadster-experience.css?v='+cssV);
if(!html.includes('/x-embed.css'))html=html.replace('<link rel="stylesheet" href="/roadster-experience.css','<link rel="stylesheet" href="/x-embed.css?v=202610262130" />\n    <link rel="stylesheet" href="/roadster-experience.css');
if(!html.includes('/x-embed.js'))html=html.replace('  </body>','    <script defer src="/x-embed.js?v=202610262130"></script>\n  </body>');
fs.writeFileSync(path.join(ROOT,'roadster-preview.html'),html);
console.log(`Roadster preview: ${d.facts.length} facts, ${d.reveal.steps.length} reveal steps, ${d.faq.length} questions, ${all.size} sources; reviewed ${d.reviewed}`);
