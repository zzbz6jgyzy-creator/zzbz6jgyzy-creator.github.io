// Build-time SVG charts for the FSD tracker. No chart library: every chart is plain SVG plus a table view,
// so it renders without JavaScript and costs phones nothing.
import {createRequire} from 'node:module';
const M=createRequire(import.meta.url)('../fsd-tracker-model.js'),e=M.esc;
const nf=(n,d=2)=>n.toLocaleString('en-GB',{minimumFractionDigits:d,maximumFractionDigits:d});

// Bars of active subscriptions (millions) per quarter, with our subscriptions-per-delivered-car ratio under each quarter.
export function adoptionBars(points){
  const W=720,H=380,L=52,R=20,T=34,B=70,pw=W-L-R,ph=H-T-B,max=Math.max(2,Math.ceil(Math.max(...points.map(p=>p.subs))*1.1*2)/2),bw=pw/points.length*.58,n=points.length;
  let s=`<svg class="ft-chart" viewBox="0 0 ${W} ${H}" role="group" aria-labelledby="ft-a-t ft-a-d" focusable="false"><title id="ft-a-t">Active FSD subscriptions by quarter</title><desc id="ft-a-d">Bars rise from ${nf(points[0].subs)} million in ${e(points[0].label)} to ${nf(points.at(-1).subs)} million in ${e(points.at(-1).label)}. Below each bar is our own ratio of subscriptions per 100 cars delivered.</desc>`;
  for(let i=0;i<=4;i++){const y=T+ph-ph*i/4;s+=`<line x1="${L}" x2="${W-R}" y1="${y}" y2="${y}" class="ft-grid"/><text x="${L-10}" y="${y+4}" class="ft-ax" text-anchor="end">${nf(max*i/4,1)}M</text>`;}
  points.forEach((p,i)=>{
    const cx=L+pw/n*(i+.5),h=ph*p.subs/max,y=T+ph-h,last=i===n-1,r=M.ratio(p);
    s+=`<g class="ft-bar${last?' ft-hot':''}" data-i="${i}" tabindex="0" role="img" aria-label="${e(p.label)}: ${nf(p.subs)} million active subscriptions, our ratio ${nf(r,1)} subscriptions per 100 cars delivered">`
     +`<rect x="${cx-bw/2}" y="${y}" width="${bw}" height="${h}" rx="6"/><text x="${cx}" y="${y-9}" class="ft-val" text-anchor="middle">${nf(p.subs)}</text></g>`
     +`<text x="${cx}" y="${H-40}" class="ft-ax" text-anchor="middle">${e(p.label)}</text><text x="${cx}" y="${H-20}" class="ft-ratio" text-anchor="middle">${nf(r,1)}%</text>`;
  });
  s+=`<text x="${L}" y="${H-2}" class="ft-ax">Amber row: subscriptions per delivered car (our calculation)</text></svg>`;
  return s;
}

// Two-step "bullet" for the attach rate: a bar from 0 to 100% per quarter with the "over" bound marked.
export function attachSteps(items){
  const W=360,row=54,H=items.length*row+36,L=64,R=18,pw=W-L-R;
  let s=`<svg class="ft-chart ft-attach" viewBox="0 0 ${W} ${H}" role="img" aria-label="${e(items.map(i=>i.label+': '+(i.bound==='over'?'over ':i.bound==='about'?'about ':'')+i.value+'%').join('; '))}" focusable="false">`;
  items.forEach((a,i)=>{const y=14+i*row;
    s+=`<text x="0" y="${y+17}" class="ft-ax">${e(a.label)}</text><rect x="${L}" y="${y}" width="${pw}" height="22" rx="11" class="ft-track"/>`
     +`<rect x="${L}" y="${y}" width="${pw*a.value/100}" height="22" rx="11" class="${i===items.length-1?'ft-fill ft-hot':'ft-fill'}"/>`
     +`<text x="${L+pw*a.value/100+8}" y="${y+16}" class="ft-val">${a.bound==='over'?'>':''}${a.value}%</text>`;});
  return s+`<text x="${L}" y="${H-4}" class="ft-ax">0%</text><text x="${W-R}" y="${H-4}" class="ft-ax" text-anchor="end">100%</text></svg>`;
}

// Phone version of the adoption chart: horizontal bars drawn with CSS, readable at 390 px where the SVG text would shrink to about 5 px.
export function adoptionList(points){
  const max=Math.max(2,Math.ceil(Math.max(...points.map(p=>p.subs))*1.1*2)/2);
  return `<ol class="ft-hbars" aria-label="Active FSD subscriptions by quarter, millions">${points.map((p,i)=>`<li${i===points.length-1?' class="ft-hot"':''}><span class="ft-hb-q">${e(p.label)}</span><span class="ft-hb-track"><i style="width:${(p.subs/max*100).toFixed(1)}%"></i></span><span class="ft-hb-v">${nf(p.subs)}M</span><span class="ft-hb-r">${nf(M.ratio(p),1)} per 100</span></li>`).join('')}</ol><p class="ft-hb-note">Amber: our ratio, subscriptions per 100 cars ever delivered.</p>`;
}

const ymd=t=>t.slice(0,10);
const dayLabel=t=>new Date(t+'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'UTC'});

// Cumulative miles as two stacked areas (V11 and before, V12 and beyond), drawn from our measurements of Tesla's chart.
// Dashed outline and an "approx" chip elsewhere mark every value as approximate.
export function milesArea(points,c=false){ // heatDays unused here
  const W=c?420:720,H=c?340:380,L=c?42:52,R=c?16:24,T=28,B=52,pw=W-L-R,ph=H-T-B,max=Math.max(4,Math.ceil(Math.max(...points.map(p=>p.total))*1.02/4)*4),n=points.length;
  const x=i=>L+pw*i/(n-1),y=v=>T+ph-ph*v/max;
  let s=`<svg class="ft-chart${c?' ft-c':''}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="ft-m-t${c?'c':''} ft-m-d${c?'c':''}" focusable="false"><title id="ft-m-t${c?'c':''}">Cumulative miles driven with FSD (Supervised), approximate</title><desc id="ft-m-d${c?'c':''}">The total rises from almost nothing in ${e(points[0].label)} to about ${Math.round(points.at(-1).total)} billion miles in ${e(points.at(-1).label)}, measured from Tesla's own chart.</desc>`;
  for(let i=0;i<=4;i++){const v=max*i/4;s+=`<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}" class="ft-grid"/><text x="${L-10}" y="${y(v)+4}" class="ft-ax" text-anchor="end">${v}B</text>`;}
  const top=points.map((p,i)=>`${x(i)},${y(p.total)}`),mid=points.map((p,i)=>`${x(i)},${y(p.v11)}`),base=`${x(n-1)},${y(0)} ${x(0)},${y(0)}`;
  s+=`<polygon points="${top.join(' ')} ${mid.slice().reverse().join(' ')}" class="ft-a-new"/><polygon points="${mid.join(' ')} ${base}" class="ft-a-old"/><polyline points="${top.join(' ')}" class="ft-a-line"/>`;
  points.forEach((p,i)=>{if((c?i%8===0:i%4===0)||i===n-1)s+=`<text x="${x(i)}" y="${H-24}" class="ft-ax" text-anchor="${i===0?'start':i===n-1?'end':'middle'}">${e(p.label)}</text>`;});
  const q=points.at(-1);
  s+=`<circle cx="${x(n-1)}" cy="${y(q.total)}" r="5" class="ft-dot"/><text x="${x(n-1)-10}" y="${y(q.total)-12}" class="ft-val" text-anchor="end">≈${Math.round(q.total)}B</text>`;
  s+=`<g class="ft-keyrow"><rect x="${L+12}" y="${T+10}" width="12" height="12" rx="3" class="ft-a-new"/><text x="${L+30}" y="${T+20}" class="ft-ax">FSD miles on V12 and beyond</text><rect x="${L+12}" y="${T+30}" width="12" height="12" rx="3" class="ft-a-old"/><text x="${L+30}" y="${T+40}" class="ft-ax">V11 and before</text></g></svg>`;
  return s;
}

// Running total of cars Teslascope has seen on each build, one line per build (not stacked: a car can appear under more than one build).
export function buildLines(sw,c=false){
  const cols=['#ff3e60','#86dccb','#f3c47a','#b4bcff','#7ea6ff','#c98cff'];
  const W=c?420:720,H=c?320:360,L=c?46:52,R=c?14:18,T=20,B=44,pw=W-L-R,ph=H-T-B,n=sw.days.length;
  const raw=Math.max(...sw.builds.flatMap(b=>b.counts)),step=raw>2000?500:raw>800?200:100,max=Math.ceil(raw*1.05/step)*step;
  const x=i=>L+pw*i/(n-1),y=v=>T+ph-ph*v/max,id=c?'c':'';
  let s=`<svg class="ft-chart${c?' ft-c':''}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="ft-b-t${id} ft-b-d${id}" focusable="false"><title id="ft-b-t${id}">Cars Teslascope has seen on each of the ${sw.builds.length} builds with the most cars, running totals</title><desc id="ft-b-d${id}">One line per build from ${dayLabel(sw.days[0])} to ${dayLabel(sw.days.at(-1))}. Newer builds climb in turn as they roll out; older builds level off. The key below gives the latest totals.</desc>`;
  for(let i=0;i<=4;i++){const v=max*i/4;s+=`<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}" class="ft-grid"/><text x="${L-10}" y="${y(v)+4}" class="ft-ax" text-anchor="end">${v.toLocaleString('en-GB')}</text>`;}
  sw.builds.forEach((b,j)=>{s+=`<polyline points="${b.counts.map((v,i)=>`${x(i)},${y(v)}`).join(' ')}" fill="none" stroke="${cols[j]}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${x(n-1)}" cy="${y(b.counts.at(-1))}" r="3.6" fill="${cols[j]}"/>`;});
  [0,Math.floor((n-1)/2),n-1].forEach(i=>s+=`<text x="${x(i)}" y="${H-16}" class="ft-ax" text-anchor="${i===0?'start':i===n-1?'end':'middle'}">${dayLabel(sw.days[i])}</text>`);
  s+='</svg>';
  const key=sw.builds.map((b,j)=>`<li><i style="background:${cols[j]}"></i><span class="ft-k-b">${e(b.id)}</span>${b.fsd?`<span class="ft-k-f">${e(b.fsd)}</span>`:'<span></span>'}<span class="ft-k-v">${b.counts.at(-1).toLocaleString('en-GB')}</span></li>`).join('');
  return {svg:s,key:`<ul class="ft-key">${key}</ul>`};
}

// New cars seen on each build per UTC day: the difference between the last snapshot of one day and the last of the day before.
export function dailyTable(sw){
  const n=sw.days.length,from=Math.max(1,n-sw.heatDays);
  const cols=sw.days.slice(from),rows=sw.builds.map(b=>({b,cells:cols.map((d,k)=>b.counts[from+k]-b.counts[from+k-1])}));
  const mx=Math.max(1,...rows.flatMap(r=>r.cells.map(Math.abs)));
  const partial=sw.asOf.slice(11,16);
  const head=cols.map((c,k)=>`<th scope="col">${dayLabel(c)}${k===cols.length-1?`<small>to ${partial} UTC</small>`:''}</th>`).join('');
  const body=rows.map(r=>`<tr><th scope="row"><span class="ft-k-b">${e(r.b.id)}</span>${r.b.fsd?`<small>${e(r.b.fsd)}</small>`:''}</th>${r.cells.map(v=>`<td style="--i:${(Math.abs(v)/mx).toFixed(2)}" class="${v>0?'ft-up':v<0?'ft-dn':'ft-0'}">${v>0?'+':''}${v}</td>`).join('')}</tr>`).join('');
  return `<div class="ft-table-wrap" tabindex="0" role="region" aria-label="New cars seen on each build per day, scrolls sideways on small screens"><table class="ft-table ft-heat"><thead><tr><th scope="col">Build</th>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

// ---------- Atlas and Europe ----------
const STATUS={listed:'Tesla-listed',uncertain:'Scope unresolved',not_listed:'Not on checked list'};
const proj=(lon,lat)=>[(lon+180)*1000/360,(90-lat)*500/180];
// Build-time world map: public-domain Natural Earth land with each tracked market coloured by status. No script needed.
export function atlasMap(atlas,geo,europe=false){
  const byCode=new Map(atlas.countries.map(c=>[c.code,c]));
  const paths=atlas.countries.filter(c=>geo.countries[c.code]).map(c=>`<path d="${geo.countries[c.code]}" class="ft-m-${c.status}"><title>${e(c.name)}: ${STATUS[c.status]}</title></path>`).join('');
  const vb=europe?'462 50 152 106':'0 20 1000 400';
  const off={NL:[-4,-3],BE:[-2,4.5],SI:[-4.5,-3.5],HR:[3.5,4.5],DK:[0,-3],CZ:[0,-1]};
  const labels=europe?atlas.countries.filter(c=>c.status==='listed'&&c.region==='Europe').map(c=>{const [x,y]=proj(c.lon,c.lat),[dx,dy]=off[c.code]||[0,0];return `<text x="${(x+dx).toFixed(1)}" y="${(y+dy).toFixed(1)}" class="ft-m-lab" text-anchor="middle">${e(c.code)}</text>`;}).join(''):'';
  const dots=europe?'':atlas.countries.filter(c=>c.status==='listed'&&c.code==='PR').map(c=>{const [x,y]=proj(c.lon,c.lat);return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.2" class="ft-m-dot"/>`;}).join('');
  const id=europe?'e':'w';
  return `<svg class="ft-chart ft-map${europe?' ft-map-eu':''}" viewBox="${vb}" role="img" aria-labelledby="ft-mp-t${id} ft-mp-d${id}" focusable="false"><title id="ft-mp-t${id}">${europe?'Europe':'World'} map of Tesla-listed FSD markets</title><desc id="ft-mp-d${id}">${europe?`${atlas.countries.filter(c=>c.status==='listed'&&c.region==='Europe').length} European markets are on Tesla's list: ${atlas.countries.filter(c=>c.status==='listed'&&c.region==='Europe').map(c=>c.name).join(', ')}.`:`${atlas.countries.filter(c=>c.status==='listed').length} markets are on Tesla's list: ${atlas.countries.filter(c=>c.status==='listed').map(c=>c.name).join(', ')}.`} Colour marks listing status only; the region list below names them too.</desc><rect x="-100" y="-100" width="1300" height="800" class="ft-m-sea"/>${europe?'':`<defs><g id="ft-geo"><path d="${geo.land}" class="ft-m-land" fill-rule="evenodd"/>${paths}</g></defs>`}<use href="#ft-geo"/>${dots}${labels}</svg>`;
}
export function regionBars(atlas){
  const regions=['Americas','Europe','Asia-Pacific','Middle East & Africa'];
  const rows=regions.map(r=>({r,n:atlas.countries.filter(c=>c.region===r&&c.status==='listed').length,u:atlas.countries.filter(c=>c.region===r&&c.status==='uncertain').length,t:atlas.countries.filter(c=>c.region===r).length}));
  const max=Math.max(1,...rows.map(r=>r.n));
  return `<ol class="ft-hbars ft-regions" aria-label="Tesla-listed markets by region">${rows.map(r=>`<li><span class="ft-hb-q">${e(r.r)}</span><span class="ft-hb-track"><i style="width:${(r.n/max*100).toFixed(1)}%"></i></span><span class="ft-hb-v">${r.n}</span><span class="ft-hb-r">of ${r.t} tracked${r.u?`, ${r.u} unresolved`:''}${r.n?': '+e(atlas.countries.filter(c=>c.region===r.r&&c.status==="listed").map(c=>c.name).join(', ')):''}</span></li>`).join('')}</ol>`;
}
// One tile per EU state: recognised and listed, recognised only, or neither. A dot marks reported customer use.
export function euTiles(eu){
  const order=[...eu.states].sort((a,b)=>(b.recognised-a.recognised)||(b.population-a.population));
  const cls=s=>s.recognised&&s.listed?'ft-t-both':s.recognised?'ft-t-rec':s.listed?'ft-t-list':'ft-t-none';
  const how=s=>s.code==='NL'?'granted the approval (RDW)':s.permission==='recorded'?'recognised by its authority':'recognition reported by media';
  const txt=s=>`${s.name}: ${s.recognised?how(s):'no recognition recorded'}; ${s.listed?'listed by Tesla':'not on Tesla\'s list'}${s.observed?'; customer use reported':''}`;
  return `<ul class="ft-tiles" aria-label="The 27 EU states">${order.map(s=>`<li class="${cls(s)}" title="${e(txt(s))}"><b aria-hidden="true">${e(s.code)}</b><span class="ft-sr">${e(txt(s))}</span>${s.observed?'<i aria-hidden="true"></i>':''}</li>`).join('')}</ul>`;
}
export function euMeters(eu){
  const rec=eu.states.filter(s=>s.recognised),n=eu.states.length,pop=rec.reduce((a,s)=>a+s.population,0)/eu.populationTotal*100,th=eu.thresholds;
  const meter=(w,mark,label,left,right,aria)=>`<div class="ft-meter-row"><div class="ft-meter" role="img" aria-label="${e(aria)}"><i style="width:${w.toFixed(1)}%"></i><u style="left:${mark}%"></u></div><p class="ft-ml"><span>${left}</span><span>${right}</span></p></div>`;
  return {pop,html:meter(rec.length/n*100,th.states/n*100,'',`<b>${rec.length}</b> of ${n} states recognised`,`FSD·EU's line: ${th.states}`,`${rec.length} of ${n} EU states recognised; FSD·EU's committee-vote line is ${th.states}`)
   +meter(pop,th.populationPct,'',`<b>${pop.toFixed(1)}%</b> of EU population`,`FSD·EU's line: ${th.populationPct}%`,`${pop.toFixed(1)} percent of EU population; FSD·EU's committee-vote line is ${th.populationPct} percent`)};
}
// Count of recognising states over time, as a step line with each recognition labelled.
export function recognitionSteps(rec){
  const W=720,H=320,L=44,R=24,T=28,B=52,pw=W-L-R,ph=H-T-B,n=rec.length;
  const t0=Date.parse('2026-04-01T00:00:00Z'),t1=Date.parse(rec.at(-1).date+'T00:00:00Z')+9*864e5,t=d=>Date.parse(d+'T00:00:00Z');
  const x=d=>L+pw*(t(d)-t0)/(t1-t0),y=v=>T+ph-ph*v/Math.max(10,n);
  let s=`<svg class="ft-chart" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="ft-r-t ft-r-d" focusable="false"><title id="ft-r-t">Number of EU states recognising Tesla's FSD approval, by date</title><desc id="ft-r-d">The count steps from 0 to ${n} between ${dayLabel(rec[0].date)} and ${dayLabel(rec.at(-1).date)} 2026, one step per country. The list below the chart gives each date.</desc>`;
  for(let v=0;v<=10;v+=5)s+=`<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}" class="ft-grid"/><text x="${L-10}" y="${y(v)+4}" class="ft-ax" text-anchor="end">${v}</text>`;
  const pts=[[t0,0]];rec.forEach((r,i)=>{pts.push([t(r.date),i]);pts.push([t(r.date),i+1]);});pts.push([t1,n]);
  s+=`<polyline points="${pts.map(([tt,v])=>`${(L+pw*(tt-t0)/(t1-t0)).toFixed(1)},${y(v).toFixed(1)}`).join(' ')}" fill="none" stroke="#ff3e60" stroke-width="3" stroke-linejoin="round"/>`;
  rec.forEach((r,i)=>{const cx=x(r.date),cy=y(i+1);s+=`<circle cx="${cx}" cy="${cy}" r="4.5" class="ft-dot"/><text x="${cx+(i%2?8:-8)}" y="${cy+(i%2?18:-10)}" class="ft-val" text-anchor="${i%2?'start':'end'}">${e(r.code)}</text>`;});
  ['2026-04-01','2026-06-01','2026-08-01','2026-10-01'].forEach(d=>s+=`<text x="${x(d)}" y="${H-22}" class="ft-ax" text-anchor="middle">${new Date(d+'T12:00:00Z').toLocaleDateString('en-GB',{month:'short',timeZone:'UTC'})}</text>`);
  return s+'</svg>';
}
