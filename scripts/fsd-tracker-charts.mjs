// Build-time SVG charts for the FSD tracker. No chart library: every chart is plain SVG plus a table view,
// so it renders without JavaScript and costs phones nothing.
import {createRequire} from 'node:module';
const M=createRequire(import.meta.url)('../fsd-tracker-model.js'),e=M.esc;
const nf=(n,d=2)=>n.toLocaleString('en-GB',{minimumFractionDigits:d,maximumFractionDigits:d});

// Bars of active subscriptions (millions) per quarter, with our subscriptions-per-delivered-car ratio under each quarter.
export function adoptionBars(points){
  const W=720,H=380,L=52,R=20,T=34,B=70,pw=W-L-R,ph=H-T-B,max=2,bw=pw/points.length*.58,n=points.length;
  let s=`<svg class="ft-chart" viewBox="0 0 ${W} ${H}" role="group" aria-labelledby="ft-a-t ft-a-d" focusable="false"><title id="ft-a-t">Active FSD subscriptions by quarter</title><desc id="ft-a-d">Bars rise from ${nf(points[0].subs)} million in ${e(points[0].label)} to ${nf(points.at(-1).subs)} million in ${e(points.at(-1).label)}. Below each bar is our ratio of subscriptions to all cars delivered.</desc>`;
  for(let i=0;i<=4;i++){const y=T+ph-ph*i/4;s+=`<line x1="${L}" x2="${W-R}" y1="${y}" y2="${y}" class="ft-grid"/><text x="${L-10}" y="${y+4}" class="ft-ax" text-anchor="end">${nf(max*i/4,1)}M</text>`;}
  points.forEach((p,i)=>{
    const cx=L+pw/n*(i+.5),h=ph*p.subs/max,y=T+ph-h,last=i===n-1,r=M.ratio(p);
    s+=`<g class="ft-bar${last?' ft-hot':''}" data-i="${i}" tabindex="0" role="img" aria-label="${e(p.label)}: ${nf(p.subs)} million active subscriptions, ${nf(r,1)}% of all cars delivered">`
     +`<rect x="${cx-bw/2}" y="${y}" width="${bw}" height="${h}" rx="6"/><text x="${cx}" y="${y-9}" class="ft-val" text-anchor="middle">${nf(p.subs)}</text></g>`
     +`<text x="${cx}" y="${H-40}" class="ft-ax" text-anchor="middle">${e(p.label)}</text><text x="${cx}" y="${H-20}" class="ft-ratio" text-anchor="middle">${nf(r,1)}%</text>`;
  });
  s+=`<text x="${L}" y="${H-2}" class="ft-ax">Amber row: subscriptions per delivered car (our calculation)</text></svg>`;
  return s;
}

// Two-step "bullet" for the attach rate: a bar from 0 to 100% per quarter with the "over" bound marked.
export function attachSteps(items){
  const W=360,row=54,H=items.length*row+36,L=64,R=18,pw=W-L-R;
  let s=`<svg class="ft-chart ft-attach" viewBox="0 0 ${W} ${H}" role="img" aria-label="${e(items.map(i=>i.label+': over '+i.value+'%').join('; '))}" focusable="false">`;
  items.forEach((a,i)=>{const y=14+i*row;
    s+=`<text x="0" y="${y+17}" class="ft-ax">${e(a.label)}</text><rect x="${L}" y="${y}" width="${pw}" height="22" rx="11" class="ft-track"/>`
     +`<rect x="${L}" y="${y}" width="${pw*a.value/100}" height="22" rx="11" class="${i===items.length-1?'ft-fill ft-hot':'ft-fill'}"/>`
     +`<text x="${L+pw*a.value/100+8}" y="${y+16}" class="ft-val">${a.bound==='over'?'>':''}${a.value}%</text>`;});
  return s+`<text x="${L}" y="${H-4}" class="ft-ax">0%</text><text x="${W-R}" y="${H-4}" class="ft-ax" text-anchor="end">100%</text></svg>`;
}
