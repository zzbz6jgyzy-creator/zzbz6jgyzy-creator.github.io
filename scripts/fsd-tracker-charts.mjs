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
export function milesArea(points,c=false){
  const W=c?420:720,H=c?340:380,L=c?42:52,R=c?16:24,T=28,B=52,pw=W-L-R,ph=H-T-B,max=Math.max(4,Math.ceil(Math.max(...points.map(p=>p.total))*1.02/4)*4),n=points.length;
  const x=i=>L+pw*i/(n-1),y=v=>T+ph-ph*v/max;
  let s=`<svg class="ft-chart${c?' ft-c':''}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="ft-m-t${c?'c':''} ft-m-d${c?'c':''}" focusable="false"><title id="ft-m-t${c?'c':''}">Cumulative miles driven with FSD (Supervised), approximate</title><desc id="ft-m-d${c?'c':''}">The total rises from almost nothing in ${e(points[0].label)} to about ${points.at(-1).total} billion miles in ${e(points.at(-1).label)}, measured from Tesla's own chart.</desc>`;
  for(let i=0;i<=4;i++){const v=max*i/4;s+=`<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}" class="ft-grid"/><text x="${L-10}" y="${y(v)+4}" class="ft-ax" text-anchor="end">${v}B</text>`;}
  const top=points.map((p,i)=>`${x(i)},${y(p.total)}`),mid=points.map((p,i)=>`${x(i)},${y(p.v11)}`),base=`${x(n-1)},${y(0)} ${x(0)},${y(0)}`;
  s+=`<polygon points="${top.join(' ')} ${mid.slice().reverse().join(' ')}" class="ft-a-new"/><polygon points="${mid.join(' ')} ${base}" class="ft-a-old"/><polyline points="${top.join(' ')}" class="ft-a-line"/>`;
  points.forEach((p,i)=>{if((c?i%8===0:i%4===0)||i===n-1)s+=`<text x="${x(i)}" y="${H-24}" class="ft-ax" text-anchor="${i===0?'start':i===n-1?'end':'middle'}">${e(p.label)}</text>`;});
  const q=points.at(-1);
  s+=`<circle cx="${x(n-1)}" cy="${y(q.total)}" r="5" class="ft-dot"/><text x="${x(n-1)-10}" y="${y(q.total)-12}" class="ft-val" text-anchor="end">≈${q.total}B</text>`;
  s+=`<g class="ft-keyrow"><rect x="${L+12}" y="${T+10}" width="12" height="12" rx="3" class="ft-a-new"/><text x="${L+30}" y="${T+20}" class="ft-ax">FSD miles on V12 and beyond</text><rect x="${L+12}" y="${T+30}" width="12" height="12" rx="3" class="ft-a-old"/><text x="${L+30}" y="${T+40}" class="ft-ax">V11 and before</text></g></svg>`;
  return s;
}

// Share of the Teslascope sample on the most common builds over time (stacked area), with a key.
export function buildShare(hist,labels,top,c=false){
  const last=hist.at(-1),builds=Object.entries(last.v).sort((a,b)=>b[1][0]-a[1][0]).slice(0,top).map(x=>x[0]);
  const cols=['#ff3e60','#86dccb','#f3c47a','#b4bcff','#7ea6ff','#c98cff','#e3a07a','#9bd37a'];
  const rows=hist.map(h=>({t:h.t,vals:builds.map(k=>h.v[k]?h.v[k][0]/h.fleet*100:0)}));
  const W=c?420:720,H=c?320:360,L=c?42:46,R=c?14:18,T=20,B=44,pw=W-L-R,ph=H-T-B,n=rows.length;
  const x=i=>L+pw*i/(n-1),y=v=>T+ph-ph*v/100;
  let s=`<svg class="ft-chart${c?' ft-c':''}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="ft-b-t${c?'c':''} ft-b-d${c?'c':''}" focusable="false"><title id="ft-b-t${c?'c':''}">Share of the Teslascope sample on each of the ${builds.length} most common builds</title><desc id="ft-b-d${c?'c':''}">From ${dayLabel(ymd(rows[0].t))} to ${dayLabel(ymd(rows.at(-1).t))}. The newest builds grow as older ones shrink. The table below the chart gives the latest shares.</desc>`;
  for(let i=0;i<=4;i++){const v=i*25;s+=`<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}" class="ft-grid"/><text x="${L-10}" y="${y(v)+4}" class="ft-ax" text-anchor="end">${v}%</text>`;}
  const cum=rows.map(()=>0);
  builds.forEach((k,j)=>{const lo=cum.slice();rows.forEach((r,i)=>cum[i]+=r.vals[j]);
    s+=`<polygon points="${rows.map((r,i)=>`${x(i)},${y(cum[i])}`).join(' ')} ${rows.map((r,i)=>`${x(i)},${y(lo[i])}`).reverse().join(' ')}" fill="${cols[j]}" opacity=".85"/>`;});
  [0,Math.floor((n-1)/2),n-1].forEach(i=>s+=`<text x="${x(i)}" y="${H-16}" class="ft-ax" text-anchor="${i===0?'start':i===n-1?'end':'middle'}">${dayLabel(ymd(rows[i].t))}</text>`);
  s+='</svg>';
  const key=builds.map((k,j)=>`<li><i style="background:${cols[j]}"></i><span class="ft-k-b">${e(k)}</span>${labels[k]?`<span class="ft-k-f">${e(labels[k])}</span>`:''}<span class="ft-k-v">${rows.at(-1).vals[j].toFixed(1)}%</span></li>`).join('');
  return {svg:s,key:`<ul class="ft-key">${key}</ul>`,builds,total:rows.at(-1).vals.reduce((a,b)=>a+b,0)};
}

// Net change in the number of sampled cars on each build, per day. Not installs: cars can also leave the sample.
export function dailyChange(hist,builds,days){
  const byDay=new Map();hist.forEach(h=>byDay.set(ymd(h.t),h));
  const dates=[...byDay.keys()].sort(),use=dates.slice(-(days+1));
  const cols=use.slice(1);
  const rows=builds.map(b=>({b,cells:cols.map((d,i)=>{const cur=byDay.get(d).v[b]?.[0]||0,prev=byDay.get(use[i]).v[b]?.[0]||0;return cur-prev;})}));
  const mx=Math.max(1,...rows.flatMap(r=>r.cells.map(Math.abs)));
  return {cols,rows,mx};
}
export function dailyTable(t,labels){
  const head=t.cols.map(c=>`<th scope="col">${dayLabel(c)}</th>`).join('');
  const body=t.rows.map(r=>`<tr><th scope="row"><span class="ft-k-b">${e(r.b)}</span>${labels[r.b]?`<small>${e(labels[r.b])}</small>`:''}</th>${r.cells.map(v=>`<td style="--i:${(Math.abs(v)/t.mx).toFixed(2)}" class="${v>0?'ft-up':v<0?'ft-dn':'ft-0'}">${v>0?'+':''}${v||'·'}</td>`).join('')}</tr>`).join('');
  return `<div class="ft-table-wrap" tabindex="0" role="region" aria-label="Daily change in sampled cars per build, scrolls sideways on small screens"><table class="ft-table ft-heat"><thead><tr><th scope="col">Build</th>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}
