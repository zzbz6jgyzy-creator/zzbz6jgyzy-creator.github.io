// Builds fsd-tracker.html (main content, title, meta, JSON-LD) and its search records from data/fsd-tracker.json.
// The shell (nav, footer, bundle tags) lives in the page itself. This page is separate from fsd.html on purpose:
// the owner can compare the two and keep either.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {adoptionBars,adoptionList,attachSteps,milesArea,buildLines,dailyTable,atlasMap,regionBars,euTiles,euMeters,recognitionSteps,claimsBars} from './fsd-tracker-charts.mjs';
const require=createRequire(import.meta.url),M=require('../fsd-tracker-model.js'),e=M.esc;
const ledger_=JSON.parse(fs.readFileSync('data/promises.json','utf8')).promises;
const d=M.validate(JSON.parse(fs.readFileSync('data/fsd-tracker.json','utf8')));
const URL_='https://superchargeddaily.com/fsd-tracker.html',TITLE='FSD by the numbers: adoption and rollout | Supercharged Daily';
const DESC='How big Tesla FSD is and how fast it is growing: subscriptions, attach rate, markets and software, each number sourced and dated.';
const OG='https://superchargeddaily.com/assets/og-fsd-tracker.jpg';
const fmt=(v,o={day:'numeric',month:'short',year:'numeric'})=>new Intl.DateTimeFormat('en-GB',{...o,timeZone:'UTC'}).format(new Date(v+'T12:00:00Z')).replace('Sept','Sep');
const nf=(n,x=2)=>n.toLocaleString('en-GB',{minimumFractionDigits:x,maximumFractionDigits:x});
const src=id=>d.sources.find(s=>s.id===id);
const cite=id=>`<a class="ft-cite" href="${e(src(id).url)}" rel="noopener">${e(src(id).outlet)}, ${fmt(src(id).date)} →</a>`;
const chip=s=>`<span class="ft-chip ft-chip-${s}">${e(M.status[s])}</span>`;
const section=(id,n,title,text,body,cls='')=>`<section class="ft-section ${cls}" id="${id}" aria-labelledby="${id}-h"><header class="ft-head"><p class="ft-kicker">${n}</p><h2 id="${id}-h">${title}</h2><p>${text}</p></header>${body}</section>`;

// Markets come from the atlas slice pinned from the global tracker's data (scripts/refresh-fsd-pins.mjs).
const listed=d.atlas.countries.filter(c=>c.status==='listed').length;
const kpiHtml=d.kpis.map(k=>{
  if(k.computed==='markets')return `<article class="ft-kpi"><p class="ft-kpi-label">${e(k.label)}</p><p class="ft-kpi-value">${listed}<small>${e(k.unit)}</small></p><p class="ft-kpi-detail">Tesla's own list, checked ${fmt(src('tesla-markets').checked)}. A listing is not a legal approval and does not mean every car can use it. <a href="#atlas">Map and countries →</a></p><p class="ft-kpi-foot">${chip('disclosed')} <span>As of ${fmt(src('tesla-markets').checked)}</span> ${cite('tesla-markets')}</p></article>`;
  return `<article class="ft-kpi"><p class="ft-kpi-label">${e(k.label)}</p><p class="ft-kpi-value">${e(k.value)}<small>${e(k.unit)}</small></p><p class="ft-kpi-detail">${e(k.detail)}</p><p class="ft-kpi-foot">${chip(k.status)} <span>As of ${fmt(k.asOf)}</span> ${cite(k.source)}</p></article>`;
}).join('');

const pts=d.adoption.points,first=pts[0],last=pts.at(-1),yoy=pts.find(p=>p.end===`${+last.end.slice(0,4)-1}${last.end.slice(4)}`);
const adoption=`<div class="ft-split"><figure class="ft-card ft-fig"><div class="ft-desk">${adoptionBars(pts)}</div><div class="ft-phone">${adoptionList(pts)}</div><figcaption>Active FSD subscriptions, millions, at the end of each quarter. ${cite('q3-update')} · ${cite('q1-update')}</figcaption></figure>
<aside class="ft-card"><h3>Who takes it with the car</h3><p class="ft-muted">Share of new deliveries in North America that include FSD (Supervised).</p>${attachSteps(d.adoption.attach)}<p class="ft-event-foot">${chip('disclosed')} ${d.adoption.attach.map(a=>cite(a.source)).filter((v,i,a)=>a.indexOf(v)===i).join(' · ')}</p></aside></div>
<p class="ft-takeaway"><strong>${nf(last.subs)} million</strong> active subscriptions in ${e(last.label)}${yoy?`, up from ${nf(yoy.subs)} million a year earlier (${Math.round((last.subs/yoy.subs-1)*100)}%)`:''}. Our own ratio of subscriptions per 100 cars ever delivered rose from ${nf(M.ratio(first),1)} to ${nf(M.ratio(last),1)} over the period shown.</p>
<details class="ft-table-view"><summary>View the numbers as a table</summary><div class="ft-table-wrap" tabindex="0" role="region" aria-label="Adoption table"><table class="ft-table"><thead><tr><th scope="col">Quarter end</th><th scope="col">Active subscriptions (M)</th><th scope="col">Cars delivered, all time (M)</th><th scope="col">Subscriptions per car (our ratio)</th><th scope="col">Source</th></tr></thead><tbody>${pts.map(p=>`<tr><th scope="row">${e(p.label)} <small>${fmt(p.end)}</small></th><td>${nf(p.subs)}</td><td>${nf(p.deliveries,1)}</td><td>${nf(M.ratio(p),1)}% ${chip('estimate')}</td><td>${cite(p.source)}</td></tr>`).join('')}</tbody></table></div></details>
<p class="ft-note">${e(d.adoption.caveat)}</p>`;

// Software: a dated slice pinned in data/fsd-tracker.json by scripts/refresh-fsd-pins.mjs, so this page does not change with every snapshot.
const sw=d.software,lines=buildLines(sw),linesC=buildLines(sw,true),total=sw.latestCount;
const stText={early:'Early wave',rolling:'Rolling out',wide:'Wide',limited:'Limited'};
const fsdRel=sw.releases;
const miles=d.miles,mlast=miles.points.at(-1),eu=miles.europe;
const milesHtml=`<div class="ft-split"><figure class="ft-card ft-fig"><div class="ft-desk">${milesArea(miles.points)}</div><div class="ft-phone">${milesArea(miles.points,true)}</div><figcaption>Billions of miles, measured from Tesla's chart. ${chip('approx')} ${cite(miles.source)}</figcaption></figure>
<aside class="ft-card"><h3>Europe so far</h3><p class="ft-muted">Tesla's Q3 deck, nine EU countries.</p><p class="ft-big">${e(eu.customers)}<small>customers</small></p><p class="ft-big">${e(eu.km)}<small>since initial approval</small></p><p class="ft-event-foot">${chip('disclosed')} ${cite(eu.source)}</p></aside></div>
<p class="ft-takeaway">Tesla's chart ends at roughly <strong>${Math.round(mlast.total)} billion</strong> cumulative miles in ${e(mlast.label)}, close to <strong>10 billion</strong> of them in the last year by our reading. Nearly all are on V12 and later, which is why the red band dominates.</p>
<p class="ft-note">${e(miles.note)}</p>
<details class="ft-table-view"><summary>View the measured values as a table</summary><div class="ft-table-wrap" tabindex="0" role="region" aria-label="Measured cumulative miles"><table class="ft-table"><thead><tr><th scope="col">Quarter end</th><th scope="col">Total (B miles, approx.)</th><th scope="col">V11 and before</th><th scope="col">V12 and beyond</th></tr></thead><tbody>${miles.points.map(p=>`<tr><th scope="row">${e(p.label)}</th><td>${nf(p.total,1)} ${chip('approx')}</td><td>${nf(p.v11,1)}</td><td>${nf(p.total-p.v11,1)}</td></tr>`).join('')}</tbody></table></div></details>`;
const softwareHtml=`<div class="ft-card ft-fig"><h3>Cars seen on each build</h3><p class="ft-muted">Running total of cars Teslascope has seen on each of the ${sw.top} builds with the most cars, ${fmt(sw.days[0])} to ${fmt(sw.days.at(-1))}. In Teslascope's sample of ${total.toLocaleString('en-GB')} cars at our ${fmt(sw.asOf.slice(0,10))}, ${sw.asOf.slice(11,16)} UTC snapshot. A car can appear under more than one build, so the lines are not stacked.</p><div class="ft-desk">${lines.svg}</div><div class="ft-phone">${linesC.svg}</div>${lines.key}<p class="ft-event-foot">${chip('reported')} ${cite(sw.source)}</p></div>
<div class="ft-card ft-fig"><h3>New cars seen, day by day</h3><p class="ft-muted">Cars Teslascope saw on each build for the first time that day (UTC). The last column is a part day. This shows how fast a build is spreading in the sample; it is not Tesla's rollout count.</p>${dailyTable(sw)}<p class="ft-event-foot">${chip('reported')} ${cite(sw.source)}</p></div>
<div class="ft-card ft-fig"><h3>Recent FSD builds</h3><p class="ft-muted">When each build was first seen in the Teslascope sample, newest first, from our software records. <a href="/updates.html">Full software tracker →</a></p><ol class="ft-rel">${fsdRel.map(r=>`<li><p class="ft-date"><time datetime="${r.date}">First seen ${fmt(r.date)}</time> <span class="ft-type">${e(stText[r.status]||r.status)}</span></p><h4>${e(r.id)}</h4><p>${e(r.fsd)}. ${e(r.countries.length?'Seen in: '+r.countries.join(', ')+'.':'')}</p></li>`).join('')}</ol><p class="ft-event-foot">${chip('reported')} ${cite(sw.source)}</p></div>
<p class="ft-note">${e(sw.caveat)}</p>`;
const landSvg=fs.readFileSync('assets/world-land.svg','utf8'),cSvg=fs.readFileSync('assets/world-countries.svg','utf8');
const geo={land:landSvg.match(/<path[^>]* d="([^"]+)"/)[1],countries:Object.fromEntries([...cSvg.matchAll(/<path data-code="([A-Z]{2})" d="([^"]+)"/g)].map(m=>[m[1],m[2]]))};
const stateByCode=Object.fromEntries(d.europe.states.map(x=>[x.code,x]));
const approver=d.europe.recognitions[0].code; // the first state to act is the one that granted the approval the others recognise
const the=n=>/^(United|Netherlands)/.test(n)?'the '+n:n;
const cap=n=>/^(United|Netherlands)/.test(n)?'The '+n:n;
const pickText=c=>{const st=stateByCode[c.code];
 const base=c.status==='listed'?`Tesla's list shows FSD (Supervised) in ${the(c.name)}. A listing is not a legal approval and does not mean every car can use it.`:c.status==='uncertain'?`Tesla's list is unclear for ${the(c.name)}. See the country tracker (/fsd.html) for what we found.`:`${cap(c.name)} is not on Tesla's list.`;
 const eu=st?(c.code===approver?` The national authority granted the Dutch approval that other EU states recognise. As of ${fmt(d.europe.asOf)}.`:st.recognised?` The national authority has recognised the Dutch approval${st.listed?'':', but Tesla does not list it yet'}. As of ${fmt(d.europe.asOf)}.`:` No national recognition is recorded yet (as of ${fmt(d.europe.asOf)}).`):'';
 return base+` As of ${fmt(d.atlas.asOf)}.`+eu;};
const picker=`<div class="ft-card ft-pick" id="ft-pick" hidden><h3>Your country</h3><p class="ft-muted">Pick it and we will remember it on this device. Nothing is sent anywhere.</p><label for="ft-pick-sel" class="ft-pick-l">Country</label><select id="ft-pick-sel"><option value="">Choose a country</option>${[...d.atlas.countries].sort((a,b)=>a.name.localeCompare(b.name)).map(c=>`<option value="${c.code}" data-text="${e(pickText(c))}">${e(c.name)}</option>`).join('')}</select><p class="ft-pick-out" id="ft-pick-out" role="status" aria-live="polite"></p><div class="ft-car" id="ft-car" hidden><h4>Your car, from My Tesla</h4><p id="ft-car-out"></p><p class="ft-event-foot">What you entered in My Tesla, read from this device only. We do not guess hardware from the model year. <a href="/my-tesla.html">Open My Tesla →</a></p></div></div>`;
const atlasHtml=`<div class="ft-card ft-fig ft-mapcard" data-share-title="Where Tesla lists FSD (Supervised)" data-share-note="Markets on Tesla's own list. A listing is not a legal approval and does not mean every car can use it."><div class="ft-maps"><div class="ft-map-w">${atlasMap(d.atlas,geo)}</div><div class="ft-map-e"><p class="ft-muted">Europe, enlarged</p>${atlasMap(d.atlas,geo,true)}</div></div><ul class="ft-maplegend"><li><i class="ft-m-listed"></i>Tesla-listed</li><li><i class="ft-m-uncertain"></i>Scope unresolved</li><li><i class="ft-m-not_listed"></i>Tracked, not on the list</li><li><i class="ft-m-none"></i>Outside our coverage</li></ul><p class="ft-event-foot">${chip('disclosed')} ${cite('tesla-markets')}</p></div>
<div class="ft-split ft-split-even"><div class="ft-card"><h3>By region</h3><p class="ft-muted">Tesla-listed markets out of the ${d.atlas.countries.length} we track.</p>${regionBars(d.atlas)}</div><div class="ft-card"><h3>What a listing means</h3><p class="ft-muted">Tesla's list says where it offers FSD (Supervised). It is separate from a regulator's permission and from a software update reaching your car, and your car still has to qualify. Driver supervision is always required.</p><p><a class="ft-btn" href="/fsd.html#map">Find your country →</a></p></div></div>
${picker}`;
const eur=d.europe,meters=euMeters(eur),recN=eur.states.filter(s=>s.recognised).length,lstN=eur.states.filter(s=>s.listed).length,obsN=eur.states.filter(s=>s.observed).length;
const europeHtml=`<div class="ft-split"><div class="ft-card"><h3>Where each EU state stands</h3><p class="ft-muted">One tile per EU state. Teal: national authority recognised the Dutch approval and Tesla lists the market. Violet: recognised, not yet listed. A dot: customer use reported.</p>${euTiles(eur)}<ul class="ft-maplegend"><li><i class="ft-t-both"></i>Recognised and listed (${eur.states.filter(s=>s.recognised&&s.listed).length})</li><li><i class="ft-t-rec"></i>Recognised only (${eur.states.filter(s=>s.recognised&&!s.listed).length})</li>${eur.states.some(s=>!s.recognised&&s.listed)?`<li><i class="ft-t-list"></i>Listed, no recognition recorded (${eur.states.filter(s=>!s.recognised&&s.listed).length})</li>`:''}<li><i class="ft-t-none"></i>Nothing recorded (${eur.states.filter(s=>!s.recognised&&!s.listed).length})</li></ul><p class="ft-event-foot">${recN} recognised (the Netherlands granted the approval, the others recognised it), ${lstN} listed by Tesla, ${obsN} with customer use reported, of ${eur.states.length}. Records from <a href="/fsd-europe.html">our Europe tracker</a>, checked ${fmt(eur.asOf)}.</p></div>
<aside class="ft-card"><h3>The road to an EU-wide decision</h3><p class="ft-muted">The two thresholds FSD·EU measures against. National recognitions are not committee votes.</p>${meters.html}<p class="ft-event-foot">${chip('reported')} Thresholds: ${cite(eur.thresholds.source)} ${chip('estimate')} Population share: the recognising states' population on 1 Jan 2025 as a share of the EU total of ${(eur.populationTotal/1e6).toFixed(1)} million, ${cite(eur.popSource)}</p></aside></div>
<div class="ft-card ft-fig"><h3>Recognitions over time</h3><p class="ft-muted">Number of EU states whose authority has recognised the Dutch RDW approval, April to ${fmt(eur.recognitions.at(-1).date,{month:'long',year:'numeric'})}.</p><div class="ft-desk">${recognitionSteps(eur.recognitions)}</div><p class="ft-event-foot">What is counted: ${e(eur.recognitions[0].name==='Netherlands'?'The Netherlands':eur.recognitions[0].name)} granted the approval; the other ${eur.recognitions.length-1} EU states in this list recognised it. ${eur.recognitions.filter(r=>r.kind==='authority').length} of the ${eur.recognitions.length} dates come from an authority's own notice (Disclosed) and ${eur.recognitions.filter(r=>r.kind!=='authority').length} from press reports (Reported); each state's source is listed at superchargeddaily.com/fsd-tracker.html#europe. Checked ${fmt(eur.asOf)}.</p><ol class="ft-rec">${eur.recognitions.map((r,i)=>`<li><time datetime="${r.date}">${fmt(r.date)}</time><b>${i+1}</b><span>${e(r.name)}</span><span class="ft-rec-src">${r.kind==='authority'?chip('disclosed'):chip('reported')} ${r.links.slice(0,1).map(u=>`<a class="ft-cite" href="${e(u)}" rel="noopener">Source →</a>`).join('')}</span></li>`).join('')}</ol></div>
<p class="ft-note">A recognition here means a national authority has accepted the Dutch approval for its own roads; it is not a vote of the EU's technical committee. The "road to a decision" bars follow FSD·EU's two lines, which it applies to a committee vote; whether and when the committee votes on Tesla's file has not been announced, and we do not forecast it. ${chip('estimate')} Population is Eurostat's official data (some of it provisional or estimated); we sum it, which is our own arithmetic. Dates are those in our Europe tracker; an authority's own notice can be dated a day earlier or later. More detail in <a href="/fsd-europe.html">the Europe tracker</a>.</p>`;
const cl=d.claims,fsdRow=cl.us.rows.find(r=>r.id==='fsd'),usRow=cl.us.rows.find(r=>r.id==='us'),manRow=cl.us.rows.find(r=>r.id==='manual-as');
const claimsHtml=`<div class="ft-split"><figure class="ft-card ft-fig"><h3>Miles between major collisions</h3><p class="ft-muted">Tesla's Vehicle Safety Report for the 12 months it covered, as reported by Not a Tesla App on ${fmt(src(cl.us.source).date)}, which says Tesla had recently released it. Tesla may have updated it since; we have not compared it with Tesla's original. North America, all road classes. Longer is better.</p>${claimsBars(cl.us.rows)}<figcaption>${chip('reported')} As of ${fmt(cl.asOf)} ${cite(cl.us.source)}</figcaption></figure>
<aside class="ft-card"><h3>What counts as a collision</h3><p class="ft-muted">${e(cl.us.definition)}</p><p class="ft-muted">A year earlier, as the same outlet gives it, Tesla reported one major collision every 5.1 million miles with FSD, 2.3 million for manual driving with Active Safety and 927,000 without.</p><p class="ft-event-foot">${chip('reported')} ${cite(cl.us.source)}</p></aside></div>
<p class="ft-takeaway">By 19 February Tesla had reported one major collision every <strong>${nf(fsdRow.miles/1e6)} million miles</strong> with FSD (Supervised) engaged, against <strong>${nf(manRow.miles/1e6)} million</strong> for manually driven Teslas with Active Safety and <strong>${nf(usRow.miles/1e6)} million</strong> for the U.S. average. Dividing, that is ${nf(fsdRow.miles/manRow.miles,1)}× the first and ${nf(fsdRow.miles/usRow.miles,1)}× the second ${chip('estimate')}. These are Tesla's rates for Tesla's groups, not a regulator's finding.</p>
<div class="ft-split ft-split-even"><div class="ft-card"><h3>Europe: the dashboard Tesla gave regulators</h3><p class="ft-muted">As EVwire reports Tesla's EU dashboard: ${cl.eu.fsdCollisions} collisions with FSD in ${nf(cl.eu.fsdKm,1)} million km of customer driving in five countries (${e(cl.eu.window)}), against ${cl.eu.manualCollisions} in ${nf(cl.eu.manualKm,1)} million km for manually driven Teslas with Active Safety on. That is ${cl.eu.multiple} times fewer, a comparison with Tesla's own cars, not average drivers. Tesla's July update said ${cl.eu.july.multiple} times after ${cl.eu.july.km} million km.</p><p class="ft-event-foot">${chip('reported')} ${cite(cl.eu.source)} · ${cite(cl.eu.also)} · ${cite(cl.eu.critic)}</p></div>
<div class="ft-card"><h3>Read it with these caveats</h3><ul class="ft-caveats">${cl.caveats.map(c=>`<li>${e(c.text)} ${c.status?chip(c.status)+' ':''}${c.sources.map(cite).join(' ')}</li>`).join('')}</ul></div></div>`;
const ledgerTopic=ledger_.filter(p=>p.topic===d.promises.topic).sort((a,b)=>a.said_on<b.said_on?-1:a.said_on>b.said_on?1:0);
if(ledgerTopic.length<5)throw Error('promise ledger topic missing: '+d.promises.topic);
const rowsP=ledgerTopic;
const ptally=rowsP.reduce((a,p)=>(a[p.status]=(a[p.status]||0)+1,a),{});
const slug=s=>s.toLowerCase().replace(/[^a-z]+/g,'-');
const promisesHtml=`<ul class="ft-tally" aria-label="Tally of these promises by outcome">${Object.entries(ptally).map(([k,v])=>`<li class="ft-ps-${slug(k)}"><strong>${v}</strong> ${e(k)}</li>`).join('')}</ul><ol class="ft-promises">${rowsP.map(p=>`<li class="ft-promise ft-ps-${slug(p.status)}"><div><h3>${e(p.title)}</h3><p class="ft-muted">Said <time datetime="${p.said_on}">${e(p.said_on.length===7?p.said_on:fmt(p.said_on))}</time> by ${e(p.person)}. Due ${p.deadline?`<time datetime="${p.deadline}">${e(p.deadline.length<=4?p.deadline:fmt(p.deadline))}</time>`:'no date given'}.</p></div><span class="ft-pstatus">${e(p.status)}</span><a class="ft-cite" href="${e(p.source.url)}" rel="noopener">Said at: ${e(p.source.outlet)} →</a></li>`).join('')}</ol><p class="ft-note">Every entry the <a href="/promise-tracker.html">promise tracker</a> lists under FSD / autonomy, oldest first; wording and status come from that ledger when this page is rebuilt; a pull request that changes the ledger flags a stale page. ${ptally.Delivered===1?'Only one, '+e(rowsP.find(p=>p.status==='Delivered').title)+', was delivered on time.':ptally.Delivered?ptally.Delivered+' were delivered on time.':'None was delivered on time.'} Robotaxi promises are tracked in <a href="/cybercab-guide.html#promises">the Cybercab guide</a>.</p>`;
const lastFrom={deck:`Tesla Q3 2026 update, ${fmt(src('q3-update').date)}`,software:`Snapshot pinned ${fmt(d.software.asOf.slice(0,10))}`,markets:`Checked ${fmt(d.atlas.asOf)}`,safety:`Reported ${fmt(src(d.claims.us.source).date)} (U.S.) and ${fmt(src(d.claims.eu.source).date)} (EU)`};
const refreshHtml=`<div class="ft-table-wrap" tabindex="0" role="region" aria-label="When each part of this page updates next"><table class="ft-table ft-refresh"><thead><tr><th scope="col">What</th><th scope="col">Last updated from</th><th scope="col">Next update</th></tr></thead><tbody>${d.refresh.map(r=>`<tr><th scope="row">${e(r.what)}</th><td data-label="Last updated from">${e(lastFrom[r.from])}</td><td data-label="Next update">${e(r.next)} ${chip('expected')}</td></tr>`).join('')}</tbody></table></div><p class="ft-note">These are our expectations, not Tesla's schedule. Reviewed ${fmt(d.reviewed)}. <a href="/fsd-tracker-feed.xml">RSS feed of changes</a>.</p>`;
const legend=`<ul class="ft-legend">${[['disclosed','Tesla or a regulator said it in a document we opened.'],['reported','A journalist, analyst or tracker found it, or Tesla published it and an outlet describes it; we have not compared it with the original. We quote the outlet.'],['estimate','Our own arithmetic on disclosed numbers. Shown dashed or marked.'],['approx','Read off a chart Tesla published without exact labels.'],['target','A stated aim or date. Not a result.'],['expected','Our guess at when a number will next change. Not a schedule Tesla has given.']].map(([k,t])=>`<li>${chip(k)} <span>${t}</span></li>`).join('')}</ul>`;
const changes=`<ol class="ft-changes">${d.changes.map(c=>`<li><time datetime="${c.date}">${fmt(c.date)}</time> <span class="ft-kind ft-kind-${c.kind}">${c.kind==='correction'?'Correction':'Update'}</span> ${e(c.text)}</li>`).join('')}</ol>`;
const ledger=`<ul class="ft-ledger">${d.sources.map(s=>`<li><a href="${e(s.url)}" rel="noopener">${e(s.title)}</a> <span>${e(s.outlet)} · ${fmt(s.date)} · opened ${fmt(s.checked)}</span></li>`).join('')}</ul>`;

const sec=[
 ['adoption','How big, and growing','Subscriptions per quarter and how many new cars come with FSD. Tesla publishes these in its shareholder decks.',adoption],
 ['miles','How much it has driven','Cumulative miles on FSD (Supervised), as drawn in Tesla\'s own deck.',milesHtml],
 ['software','Which builds are spreading','Cars a connected-car service has seen on each FSD build, and how fast new builds appear in its sample.',softwareHtml],
 ['atlas','Where it works','Which markets Tesla lists for FSD (Supervised), shown on a map and by region.',atlasHtml],
 ['europe','Europe and the road to a decision','Which EU states have recognised the Dutch approval, and the two thresholds FSD·EU measures against.',europeHtml],
 ['safety','What Tesla says about safety','Tesla\'s own published crash-rate comparisons, what each is measured against, and what we could not verify.',claimsHtml],
 ['promises','What was promised','Every FSD and autonomy promise in our ledger, and what happened by the date given.',promisesHtml],
 ['next','When it updates next','What gets refreshed, from which source, and when we expect the next change.',refreshHtml],
 ['labels','How to read the numbers','Every figure on this page carries one of these labels, a date and a source.',legend],
 ['changes','What changed','Corrections are shown here, never silently rewritten.',changes],
 ['sources','Sources','The sources behind the numbers above, with the date we opened each. Individual recognition links in the Europe section come from our Europe tracker\'s evidence records.',ledger]
].map(([id,title,text,body,cls],i)=>section(id,String(i+1).padStart(2,'0'),title,text,body,cls)).join('\n');
const jump=['adoption','miles','software','atlas','europe','safety','promises','next','labels','changes','sources'].map(id=>`<a href="#${id}">${id[0].toUpperCase()+id.slice(1)}</a>`).join('');
const main=`<main id="main" class="ft">
<header class="ft-hero"><p class="ft-crumb"><a href="/tesla.html">Tesla</a> / FSD by the numbers</p><h1>FSD, by the numbers.<br><span>Sourced, dated, plain.</span></h1><p class="ft-lede">How big Tesla's Full Self-Driving (Supervised) is, how fast it is growing and where it works. Every number says who published it and when, and where Tesla has not published one we say so.</p><p class="ft-hero-meta">Reviewed ${fmt(d.reviewed)} · <a href="/fsd.html">Country-by-country tracker →</a> · <a href="/fsd-europe.html">Europe →</a> · <a href="/updates.html">Software →</a> · <a href="/fsd-tracker-feed.xml">RSS</a></p><div class="ft-kpis">${kpiHtml}</div><nav class="ft-jump" aria-label="On this page">${jump}</nav></header>
${sec}
</main>`;

const ld={"@context":"https://schema.org","@graph":[
 {"@type":"WebPage","name":TITLE,"description":DESC,"url":URL_,"dateModified":d.reviewed,"about":{"@type":"Thing","name":"Tesla Full Self-Driving (Supervised)"},"publisher":{"@type":"Organization","name":"Supercharged Daily","url":"https://superchargeddaily.com/"}},
 {"@type":"BreadcrumbList","itemListElement":[["Home","https://superchargeddaily.com/"],["Tesla","https://superchargeddaily.com/tesla.html"],["FSD by the numbers",URL_]].map(([name,item],i)=>({"@type":"ListItem","position":i+1,name,item}))}]};
let html=fs.readFileSync('fsd-tracker.html','utf8');
// scripts/inject_newsletter.py puts its signup band inside <main>; keep it when this builder rewrites <main>.
const nl=(html.match(/<!--nl:start-->[\s\S]*?<!--nl:end-->/)||[''])[0];
const meta=`<title>${e(TITLE)}</title>
    <meta name="description" content="${e(DESC)}" />
    <link rel="canonical" href="${URL_}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Supercharged Daily" />
    <meta property="og:title" content="${e(TITLE)}" />
    <meta property="og:description" content="${e(DESC)}" />
    <meta property="og:url" content="${URL_}" />
    <meta property="og:image" content="${OG}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${e('FSD by the numbers: '+d.kpis.filter(k=>!k.computed).slice(0,3).map(k=>k.value+' '+k.label.toLowerCase()).join(', ')+'.')}" />
    <link rel="alternate" type="application/rss+xml" title="FSD by the numbers: changes" href="https://superchargeddaily.com/fsd-tracker-feed.xml" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@ALJR86" />
    <meta name="twitter:creator" content="@ALJR86" />
    <meta name="twitter:title" content="${e(TITLE)}" />
    <meta name="twitter:description" content="${e(DESC)}" />
    <meta name="twitter:image" content="${OG}" />
    `;
html=html.replace(/<title>[\s\S]*?(?=<link rel="icon" href="\/favicon\.ico")/,meta)
 .replace(/<!-- seo:ld -->[\s\S]*?<!-- \/seo:ld -->/,`<!-- seo:ld -->\n    <script type="application/ld+json">${JSON.stringify(ld)}</script>\n    <!-- /seo:ld -->`)
 .replace(/<main\b[\s\S]*?<\/main>/,()=>nl?main.replace(/\n<\/main>$/,'\n        '+nl+'\n</main>'):main);
fs.writeFileSync('fsd-tracker.html',html);

// RSS feed of the change log, from the same data as the page.
const rfc=x=>new Date(x+'T12:00:00Z').toUTCString();
const feed=`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>FSD by the numbers: changes</title><link>${URL_}</link><atom:link href="https://superchargeddaily.com/fsd-tracker-feed.xml" rel="self" type="application/rss+xml"/><description>Updates and corrections to Supercharged Daily's FSD by the numbers page.</description><language>en-gb</language><lastBuildDate>${rfc(d.reviewed)}</lastBuildDate>\n${d.changes.map((c,i)=>`<item><title>${c.kind==='correction'?'Correction':'Update'}, ${fmt(c.date)}</title><link>${URL_}#changes</link><guid isPermaLink="false">fsd-tracker-${c.date}-${crypto.createHash('sha1').update(c.text).digest('hex').slice(0,8)}</guid><pubDate>${rfc(c.date)}</pubDate><description>${e(c.text)}</description></item>`).join('\n')}\n</channel></rss>\n`;
fs.writeFileSync('fsd-tracker-feed.xml',feed);

// Search records, added without touching unrelated entries.
const indexPath='data/pages.json',index=JSON.parse(fs.readFileSync(indexPath,'utf8'));
const recs=[{url:'/fsd-tracker.html',title:'FSD by the numbers',tag:'FSD',summary:'How big Tesla FSD is and how fast it is growing: subscriptions, attach rate, markets and software, each number sourced and dated.'},
 {url:'/fsd-tracker.html#adoption',title:'FSD adoption: subscriptions and attach rate',tag:'FSD',summary:'Active FSD subscriptions per quarter from Tesla’s decks and the North America attach rate on new deliveries.'},
 {url:'/fsd-tracker.html#miles',title:'FSD cumulative miles',tag:'FSD',summary:'Cumulative miles driven with FSD (Supervised), measured from Tesla’s deck chart and marked approximate, plus the European totals.'},
 {url:'/fsd-tracker.html#atlas',title:'FSD markets map',tag:'FSD',summary:'World map of Tesla-listed FSD (Supervised) markets with regional counts and a Europe close-up.'},
 {url:'/fsd-tracker.html#europe',title:'FSD in Europe: the road to an EU-wide decision',tag:'FSD',summary:'Which EU states recognise the Dutch approval, recognitions over time and the two thresholds FSD·EU shows.'},
 {url:'/fsd-tracker.html#safety',title:'FSD safety claims: what Tesla says and what it compares against',tag:'FSD',summary:'Tesla’s published miles per major collision with FSD, manual driving and the U.S. average, with the caveats, and the EU dashboard claim.'},
 {url:'/fsd-tracker.html#promises',title:'FSD promises versus reality',tag:'FSD',summary:'Tesla and Musk autonomy promises from 2017 to 2027 and whether each was delivered, from our promise ledger.'},
 {url:'/fsd-tracker.html#next',title:'FSD tracker: when each number updates next',tag:'FSD',summary:'What on the FSD by the numbers page refreshes from which source, and when the next update is expected.'},
 {url:'/fsd-tracker.html#software',title:'FSD software: which builds are spreading',tag:'FSD',summary:'Cars Teslascope has seen on each FSD build, new cars per day and the latest FSD builds.'}];
index.pages=index.pages.filter(x=>!x.url.startsWith('/fsd-tracker.html'));
// After the last /fsd.html entry, so the global tracker's builder (which keeps its own records in one block) never reorders ours.
const at=index.pages.reduce((k,x,i)=>/^\/fsd\.html(#|$)/.test(x.url)?i:k,-1);
index.pages.splice(at<0?index.pages.length:at+1,0,...recs);
if(!index.updated||index.updated<d.reviewed)index.updated=d.reviewed;
fs.writeFileSync(indexPath,JSON.stringify(index,null,2)+'\n');
