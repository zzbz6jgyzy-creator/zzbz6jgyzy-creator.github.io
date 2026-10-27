// Original side-view illustration of the Cybercab as publicly described. Drawn by us, not Tesla CAD; proportions are approximate.
// Markers sit only on features whose position is known; the charge port and battery pack are listed, not drawn.
export function car(parts){
  const marks=parts.map((p,i)=>`<g class="cg-mark" data-part="${p.id}" transform="translate(${p.x*6},${p.y*2.6})"><circle r="16"/><text y="5" text-anchor="middle">${i+1}</text></g>`).join('');
  return `<svg class="cg-car" viewBox="20 40 560 210" role="img" aria-labelledby="cg-car-t cg-car-d" focusable="false">
<title id="cg-car-t">Illustration of the Cybercab, side view</title>
<desc id="cg-car-d">Our own simplified drawing of a coupe with a long sloping roof, one schematic door outline, flat disc wheels and a front light bar. Seats and controls are not drawn. Not Tesla CAD or a photograph.</desc>
<defs><linearGradient id="cg-g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#232b39"/><stop offset="1" stop-color="#10141c"/></linearGradient></defs>
<ellipse cx="300" cy="226" rx="250" ry="10" fill="#000" opacity=".45"/>
<path class="cg-body" d="M46 190 C40 170 52 150 92 142 C140 132 168 92 226 70 C286 52 372 56 430 84 C470 104 512 124 548 142 C570 152 574 176 566 190 L546 196 L456 196 C452 168 400 168 396 196 L204 196 C198 166 142 166 138 196 L66 196 Z" fill="url(#cg-g)" stroke="#5a6678" stroke-width="2"/>
<path class="cg-glass" d="M214 100 C262 80 336 80 400 100 L426 124 L206 124 Z" fill="#0a0d12" stroke="#5a6678" stroke-width="1.5"/>
<path d="M236 126 C232 150 234 176 240 188 L388 188 C392 170 392 146 386 126" fill="none" stroke="#5a6678" stroke-width="1.5"/>
<rect x="44" y="166" width="26" height="5" rx="2.5" fill="#f3f4f7"/>
<g class="cg-wheel"><circle cx="170" cy="196" r="34" fill="#0a0d12" stroke="#5a6678" stroke-width="2"/><circle cx="170" cy="196" r="22" fill="#171d28" stroke="#3a4352"/></g>
<g class="cg-wheel"><circle cx="426" cy="196" r="34" fill="#0a0d12" stroke="#5a6678" stroke-width="2"/><circle cx="426" cy="196" r="22" fill="#171d28" stroke="#3a4352"/></g>
${marks}
</svg>`;
}
