// Original engineering illustrations for /optimus.html. Diagrams of principles, not Tesla CAD.
// Pure string builders: same input, same markup, so the page stays reproducible.

const line = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
const dot = (x, y, r = 8) => `<circle cx="${x}" cy="${y}" r="${r}"/>`;

// X-ray of a humanoid, front view, 173 cm tall at ~6.5 units/cm. Layout follows Tesla's AI Day 2022
// description (28 actuators: 14 rotary, 14 linear; battery and computer in the torso; 6 hand actuators).
// Illustration, not Tesla CAD. Each system is a group the page can light up; its labels show when active.
const C = 300;
const n = v => +v.toFixed(1);
const at = (s, dx) => n(C + s * dx);
function capsule(x1, y1, w1, x2, y2, w2) {
  return `M${n(x1 - w1 / 2)} ${y1} Q${x1} ${n(y1 - w1 * .45)} ${n(x1 + w1 / 2)} ${y1} L${n(x2 + w2 / 2)} ${y2} Q${x2} ${n(y2 + w2 * .45)} ${n(x2 - w2 / 2)} ${y2} Z`;
}
function rotary(x, y, r) {
  const bolts = Array.from({ length: 6 }, (_, i) => { const a = i * Math.PI / 3 + .3; return `<circle class="os-bolt-dot" cx="${n(x + Math.cos(a) * r * .8)}" cy="${n(y + Math.sin(a) * r * .8)}" r="${n(r * .09 + .6)}"/>`; }).join('');
  return `<g class="os-rot"><rect class="os-tab" x="${n(x - r * .25)}" y="${n(y - r - 4)}" width="${n(r * .5)}" height="5" rx="1"/><circle cx="${x}" cy="${y}" r="${r}"/><circle class="os-bearing" cx="${x}" cy="${y}" r="${n(r * .8)}"/><circle class="os-rot-ring" cx="${x}" cy="${y}" r="${n(r * .6)}"/><circle class="os-rot-hub" cx="${x}" cy="${y}" r="${n(r * .22)}"/>${bolts}</g>`;
}
function linear(x1, y1, x2, y2, w) {
  const L = Math.hypot(x2 - x1, y2 - y1), deg = n(Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI);
  const threads = Array.from({ length: Math.floor(L * .3 / 4) }, (_, i) => { const x = n(L * .38 + 2 + i * 4); return `M${x} ${n(-w * .36)} L${n(x + 3)} ${n(w * .36)}`; }).join(' ');
  return `<g class="os-lin" transform="translate(${n(x1)} ${n(y1)}) rotate(${deg})"><circle class="os-lin-eye" cx="${n(-w * .5)}" cy="0" r="${n(w * .32)}"/><rect x="0" y="${n(-w / 2)}" width="${n(L * .38)}" height="${w}" rx="${n(w * .3)}"/><path class="os-lin-fins" d="${Array.from({ length: 4 }, (_, i) => `M${n(L * .06 + i * L * .07)} ${n(-w / 2)} V${n(w / 2)}`).join(' ')}"/><rect class="os-lin-nut" x="${n(L * .38)}" y="${n(-w * .38)}" width="${n(L * .32)}" height="${n(w * .76)}"/><path class="os-lin-thread" d="${threads}"/><rect class="os-lin-rod" x="${n(L * .7)}" y="${n(-w * .17)}" width="${n(L * .27)}" height="${n(w * .34)}"/><circle class="os-lin-eye" cx="${n(L)}" cy="0" r="${n(w * .42)}"/></g>`;
}
function label(x, y, tx, ty, text, anchor) {
  const lines = text.split('|');
  return `<g class="os-xlabel"><path d="M${x} ${y} L${tx + (anchor === 'end' ? 8 : -8)} ${ty} H${tx + (anchor === 'end' ? 4 : -4)}"/><circle cx="${x}" cy="${y}" r="2.6"/><text x="${tx}" y="${ty + 4}" text-anchor="${anchor}">${lines.map((l, i) => `<tspan x="${tx}" dy="${i ? 17 : 0}">${l}</tspan>`).join('')}</text></g>`;
}
const R = (x, y, t) => label(x, y, 506, y, t, 'start');
const Lf = (x, y, t) => label(x, y, 94, y, t, 'end');
const hinge = (x, y, r) => `<circle class="os-hinge" cx="${x}" cy="${y}" r="${r}"/><circle class="os-hinge os-hinge-in" cx="${x}" cy="${y}" r="${n(r * .55)}"/>`;
const tube = (x1, y1, x2, y2, w) => `<path d="${capsule(x1, y1, w, x2, y2, w)}"/>`;

// Outer shell: Optimus-like proportions drawn as translucent panels.
function shell() {
  const side = s => [
    `<path d="M${at(s, 120)} 300 C${at(s, 115)} 360 ${at(s, 123)} 430 ${at(s, 130)} 468 L${at(s, 174)} 468 C${at(s, 180)} 430 ${at(s, 183)} 360 ${at(s, 175)} 300 Z"/>`,
    `<path class="os-dark" d="M${at(s, 131)} 470 H${at(s, 173)} L${at(s, 176)} 492 H${at(s, 129)} Z"/>`,
    `<path d="M${at(s, 129)} 494 C${at(s, 125)} 540 ${at(s, 134)} 610 ${at(s, 141)} 654 L${at(s, 173)} 654 C${at(s, 179)} 610 ${at(s, 186)} 540 ${at(s, 180)} 494 Z"/>`,
    `<path class="os-dark" d="M${at(s, 141)} 655 H${at(s, 173)} V668 H${at(s, 141)} Z"/>`,
    `<path d="M${at(s, 128)} 228 C${at(s, 98)} 228 ${at(s, 84)} 252 ${at(s, 86)} 278 C${at(s, 90)} 300 ${at(s, 110)} 310 ${at(s, 134)} 310 C${at(s, 160)} 310 ${at(s, 174)} 290 ${at(s, 172)} 266 C${at(s, 170)} 244 ${at(s, 154)} 228 ${at(s, 128)} 228 Z"/>`,
    `<path class="os-seam" d="M${at(s, 92)} 268 C${at(s, 110)} 286 ${at(s, 150)} 288 ${at(s, 168)} 262"/>`,
    `<path d="M${at(s, 14)} 650 C${at(s, 18)} 720 ${at(s, 26)} 820 ${at(s, 32)} 876 L${at(s, 78)} 876 C${at(s, 88)} 820 ${at(s, 101)} 720 ${at(s, 98)} 654 C${at(s, 70)} 642 ${at(s, 40)} 642 ${at(s, 14)} 650 Z"/>`,
    `<path class="os-seam" d="M${at(s, 30)} 700 C${at(s, 50)} 720 ${at(s, 74)} 720 ${at(s, 92)} 700 M${at(s, 56)} 720 V860 M${at(s, 124)} 384 H${at(s, 178)} M${at(s, 131)} 574 H${at(s, 181)} M${at(s, 56)} 930 V1100"/>`,
    ...[[56, 740], [56, 840], [151, 330], [151, 450], [156, 520], [156, 630], [56, 950], [56, 1080]].map(([dx, y]) => `<circle class="os-fastener" cx="${at(s, dx)}" cy="${y}" r="1.8"/>`),
    `<path class="os-dark" d="M${at(s, 32)} 878 H${at(s, 78)} L${at(s, 80)} 906 H${at(s, 30)} Z"/>`,
    `<ellipse cx="${at(s, 55)}" cy="890" rx="20" ry="17"/>`,
    `<path d="M${at(s, 33)} 908 C${at(s, 28)} 960 ${at(s, 35)} 1060 ${at(s, 40)} 1114 L${at(s, 68)} 1114 C${at(s, 73)} 1060 ${at(s, 86)} 960 ${at(s, 79)} 908 Z"/>`,
    `<path class="os-dark" d="M${at(s, 40)} 1116 H${at(s, 68)} V1136 H${at(s, 40)} Z"/>`,
    `<path d="M${at(s, 24)} 1138 L${at(s, 84)} 1138 C${at(s, 92)} 1150 ${at(s, 97)} 1172 ${at(s, 97)} 1188 L${at(s, 13)} 1188 C${at(s, 13)} 1172 ${at(s, 17)} 1150 ${at(s, 24)} 1138 Z"/>`,
    `<path d="M${at(s, 137)} 670 L${at(s, 181)} 670 C${at(s, 186)} 698 ${at(s, 187)} 726 ${at(s, 181)} 748 L${at(s, 140)} 748 C${at(s, 135)} 726 ${at(s, 134)} 698 ${at(s, 137)} 670 Z"/>`,
    ...[[144, 34], [155, 39], [166, 37], [177, 30]].flatMap(([dx, len]) => [0, .42, .74].map((k, i) => {
      const y1 = n(752 + len * k), y2 = n(752 + len * [.38, .7, 1][i]);
      return `<path class="os-phalanx" d="M${at(s, dx) - 3.6} ${y1} H${at(s, dx) + 3.6} V${y2} Q${at(s, dx)} ${y2 + 3} ${at(s, dx) - 3.6} ${y2} Z"/>`;
    })),
    `<path class="os-phalanx" d="M${at(s, 136)} 712 L${at(s, 130)} 734 L${at(s, 124)} 733 L${at(s, 131)} 710 Z M${at(s, 129)} 738 L${at(s, 125)} 758 L${at(s, 119)} 757 L${at(s, 123)} 737 Z"/>`,
  ].join('');
  return `<g class="os-shell">
<path d="M300 36 C343 36 366 70 366 114 C366 150 354 182 332 198 L268 198 C246 182 234 150 234 114 C234 70 257 36 300 36 Z"/>
<path class="os-seam" d="M238 128 C250 160 262 180 272 194 M362 128 C350 160 338 180 328 194"/>
<path class="os-visor" d="M300 66 C332 66 349 90 349 118 C349 150 328 178 300 188 C272 178 251 150 251 118 C251 90 268 66 300 66 Z"/>
<path class="os-dark" d="M282 198 H318 L322 236 H278 Z"/><path class="os-seam" d="M284 208 H316 M283 218 H317 M282 228 H318"/>
<path d="M278 232 C300 228 300 228 322 232 C350 236 376 238 398 248 C414 256 418 280 408 312 C402 350 400 390 388 430 C382 450 376 464 370 474 L230 474 C224 464 218 450 212 430 C200 390 198 350 192 312 C182 280 186 256 202 248 C224 238 250 236 278 232 Z"/>
<path class="os-seam" d="M222 300 C252 334 290 338 300 326 C310 338 348 334 378 300 M234 432 Q300 448 366 432 M300 330 V430"/>
<path class="os-dark" d="M232 476 L368 476 L360 548 L240 548 Z"/>
<path class="os-seam" d="${Array.from({ length: 7 }, (_, i) => `M${n(233 + i * 1.1)} ${484 + i * 9} Q300 ${488 + i * 9} ${n(367 - i * 1.1)} ${484 + i * 9}`).join(' ')}"/>
<path d="M222 550 C260 542 340 542 378 550 C392 574 394 606 384 632 C364 642 340 652 318 658 L300 642 L282 658 C260 652 236 642 216 632 C206 606 208 574 222 550 Z"/>
<path class="os-seam" d="M232 590 Q300 604 368 590"/>
${side(-1)}${side(1)}
${[[250, 262], [350, 262], [236, 420], [364, 420], [240, 610], [360, 610]].map(([x, y]) => `<circle class="os-fastener" cx="${x}" cy="${y}" r="2"/>`).join('')}
</g>`;
}

// Load-bearing frame behind the actuators.
function frame() {
  const vert = Array.from({ length: 9 }, (_, i) => `<rect x="292" y="${244 + i * 25}" width="16" height="19" rx="3"/>`).join('');
  const limbs = [-1, 1].map(s => [
    tube(at(s, 147), 312, at(s, 151), 470, 9), tube(at(s, 147), 500, at(s, 150), 650, 6), tube(at(s, 162), 500, at(s, 161), 650, 6),
    tube(at(s, 55), 650, at(s, 54), 876, 11), tube(at(s, 54), 912, at(s, 54), 1112, 9),
    `<path d="M300 246 L${at(s, 116)} 254"/>`, hinge(at(s, 152), 482, 15), hinge(at(s, 157), 662, 11), hinge(at(s, 55), 892, 18), hinge(at(s, 54), 1128, 13),
  ].join('')).join('');
  return `<g class="os-frame">${vert}${limbs}<path d="M246 566 C270 556 330 556 354 566 L368 620 C344 636 256 636 232 620 Z"/></g>`;
}

export function body() {
  const cells = [];
  for (let r = 0; r < 10; r++) for (let c = 0; c < 9; c++) cells.push(`<circle cx="${n(246 + c * 13.5 + (r % 2) * 6.5)}" cy="${n(328 + r * 12.4)}" r="5.2"/>`);
  const busbars = Array.from({ length: 5 }, (_, i) => `M240 ${n(334 + i * 24.8)} H360`).join(' ');
  const arms = [-1, 1].map(s => [
    rotary(at(s, 128), 266, 21), rotary(at(s, 144), 316, 15), rotary(at(s, 149), 350, 13),
    linear(at(s, 140), 366, at(s, 148), 476, 13),
    `<circle class="os-pivot" cx="${at(s, 152)}" cy="482" r="9"/>`,
    rotary(at(s, 155), 512, 12),
    linear(at(s, 143), 530, at(s, 150), 650, 9), linear(at(s, 167), 530, at(s, 165), 650, 9),
    `<circle class="os-pivot" cx="${at(s, 157)}" cy="662" r="7"/>`,
  ].join('')).join('');
  const legs = [-1, 1].map(s => [
    rotary(at(s, 44), 598, 16), rotary(at(s, 64), 640, 17),
    linear(at(s, 34), 662, at(s, 38), 836, 13), linear(at(s, 74), 666, at(s, 64), 882, 16),
    `<circle class="os-pivot" cx="${at(s, 55)}" cy="892" r="11"/>`,
    linear(at(s, 42), 928, at(s, 45), 1110, 10), linear(at(s, 68), 928, at(s, 64), 1110, 10),
    `<circle class="os-pivot" cx="${at(s, 54)}" cy="1128" r="8"/>`,
  ].join('')).join('');
  const hands = [-1, 1].map(s => {
    const px = at(s, 159);
    const motors = [0, 1, 2].flatMap(c => [0, 1].map(r => `<rect x="${n(px - 17 + c * 11.5)}" y="${680 + r * 22}" width="9" height="17" rx="2"/><path class="os-coil" d="M${n(px - 15 + c * 11.5)} ${684 + r * 22} h5 M${n(px - 15 + c * 11.5)} ${688 + r * 22} h5 M${n(px - 15 + c * 11.5)} ${692 + r * 22} h5"/>`)).join('');
    const tendons = [[144, 34], [155, 39], [166, 37], [177, 30]].map(([dx, len], i) => `<path class="os-tendon-x" d="M${n(px - 13 + (i % 3) * 11.5)} ${i < 3 ? 697 : 719} C${n(px - 13 + (i % 3) * 11.5)} 736 ${at(s, dx)} 740 ${at(s, dx)} ${n(752 + len * .97)}"/>`).join('');
    const thumb = `<path class="os-tendon-x" d="M${n(px - 13)} 719 C${n(px - 16)} 730 ${at(s, 132)} 730 ${at(s, 122)} 754 M${n(px - 2)} 719 C${n(px - 8)} 726 ${at(s, 134)} 718 ${at(s, 133)} 714"/>`;
    return `${motors}<rect class="os-chip-x" x="${n(px - 11)}" y="726" width="22" height="11" rx="2"/>${tendons}${thumb}`;
  }).join('');
  const cables = [-1, 1].map(s => `M${at(s, 108)} 258 C${at(s, 124)} 300 ${at(s, 134)} 400 ${at(s, 138)} 480 C${at(s, 140)} 560 ${at(s, 146)} 640 ${at(s, 152)} 676 M310 600 C${at(s, 20)} 640 ${at(s, 24)} 760 ${at(s, 30)} 880 C${at(s, 34)} 960 ${at(s, 36)} 1060 ${at(s, 44)} 1136`).join(' ');
  const feet = [-1, 1].map(s => `<rect class="os-ft" x="${at(s, s < 0 ? 72 : 36)}" y="1142" width="36" height="12" rx="2"/><path class="os-ft-gauge" d="M${at(s, s < 0 ? 68 : 40)} 1148 h5 l2 -4 l2 8 l2 -8 l2 8 l2 -4 h5"/><path class="os-sole" d="M${at(s, 14)} 1186 H${at(s, 96)}"/><path class="os-toe" d="M${at(s, 18)} 1166 H${at(s, 95)}"/><circle class="os-pivot" cx="${at(s, s < 0 ? 86 : 22)}" cy="1166" r="3.5"/><circle class="os-pivot" cx="${at(s, s < 0 ? 22 : 86)}" cy="1166" r="3.5"/>`).join('');
  return `<svg class="os-body os-xray" viewBox="-110 0 820 1220" role="img" aria-labelledby="body-title body-desc">
<title id="body-title">X-ray illustration of a humanoid robot</title>
<desc id="body-desc">Front view showing the frame, cameras behind the face plate, a computer and a battery pack in the torso, rotary actuators at the neck, shoulders, wrists, hips and waist, linear actuators along the arms and legs, hands with six motors and tendons, cable runs, and force sensors in the feet. Layout follows Tesla’s 2022 description; illustration by Supercharged Daily, not Tesla CAD.</desc>
<defs>
<pattern id="os-xgrid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#132030" stroke-width="1"/></pattern>
<linearGradient id="os-shell-fill" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#cfe4f7" stop-opacity=".16"/><stop offset=".55" stop-color="#7fa6c8" stop-opacity=".05"/><stop offset="1" stop-color="#cfe4f7" stop-opacity=".11"/></linearGradient>
<filter id="os-glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<radialGradient id="os-xglow" cx=".5" cy=".42" r=".55"><stop offset="0" stop-color="#2a4766" stop-opacity=".6"/><stop offset="1" stop-color="#2a4766" stop-opacity="0"/></radialGradient>
</defs>
<rect x="-110" width="820" height="1220" fill="url(#os-xgrid)"/>
<ellipse cx="300" cy="580" rx="330" ry="620" fill="url(#os-xglow)"/>
${frame()}
${shell()}
<g class="os-dim"><path d="M-62 36 V1188 M-72 36 H-52 M-72 1188 H-52"/>${Array.from({ length: 18 }, (_, i) => `<path d="M-62 ${n(36 + i * 64)} h${i % 2 ? 5 : 9}"/>`).join('')}<text transform="translate(-74 612) rotate(-90)" text-anchor="middle">173 cm · 2021 concept height</text></g>
<g class="os-titleblock"><rect x="470" y="1146" width="234" height="60"/><path d="M470 1168 H704 M576 1168 V1206"/><text x="478" y="1162">OPTIMUS · X-RAY · FRONT</text><text x="478" y="1192">2022 LAYOUT</text><text x="584" y="1192">ILLUSTRATIVE</text></g>
<g class="os-sys" data-sys="learning"><path class="os-harness" d="${cables} M300 290 V304 M300 458 V600"/><rect x="258" y="248" width="84" height="44" rx="6"/><path class="os-fins" d="${Array.from({ length: 6 }, (_, i) => `M${264 + i * 4} 252 V288`).join(' ')}"/><rect class="os-chip-x" x="290" y="256" width="26" height="26" rx="3"/><rect class="os-die" x="297" y="263" width="12" height="12" rx="1"/><rect class="os-chip-x" x="321" y="256" width="15" height="9" rx="2"/><rect class="os-chip-x" x="321" y="269" width="15" height="9" rx="2"/><rect class="os-chip-x" x="321" y="282" width="15" height="6" rx="1"/>${R(342, 268, 'Central computer|in the torso')}${Lf(at(-1, 136), 560, 'Power and data|from the centre')}</g>
<g class="os-sys" data-sys="power"><rect x="234" y="304" width="132" height="158" rx="12"/><rect class="os-pcb" x="240" y="308" width="120" height="14" rx="3"/><path class="os-pcb-parts" d="M248 312 h6 v6 h-6 Z M260 312 h10 v6 h-10 Z M276 313 h4 v4 h-4 Z M286 312 h14 v6 h-14 Z M306 313 h4 v4 h-4 Z M318 312 h8 v6 h-8 Z M332 312 h20 v6 h-20 Z"/><g class="os-cells">${cells.join('')}</g><path class="os-busbar" d="${busbars}"/><path class="os-bus" d="M300 462 V476"/>${R(366, 396, '2.3 kWh pack|(2022 prototype)')}${Lf(240, 315, 'Pack electronics|on one board')}</g>
<g class="os-sys" data-sys="perception"><path class="os-fov" d="M300 104 L-90 0 L-90 210 Z M300 104 L690 0 L690 210 Z"/><rect x="264" y="97" width="26" height="15" rx="3"/><rect x="310" y="97" width="26" height="15" rx="3"/><circle class="os-lens" cx="277" cy="104.5" r="4.4"/><circle class="os-lens" cx="323" cy="104.5" r="4.4"/><path class="os-harness" d="M290 112 Q300 150 300 200 M310 112 Q300 150 300 200"/>${R(336, 104, 'Cameras behind|the face plate')}</g>
<g class="os-sys" data-sys="actuation">${rotary(300, 210, 9)}${rotary(300, 227, 8)}${arms}${rotary(300, 496, 15)}${rotary(300, 528, 15)}${legs}${Lf(at(-1, 150), 266, '14 rotary actuators|shoulders, wrists,|hips and waist')}${R(at(1, 72), 760, '14 linear actuators|roller screws')}${R(309, 218, '2-DoF neck (Gen 2)')}${Lf(at(-1, 72), 820, 'Knee: strongest|linear unit')}</g>
<g class="os-sys" data-sys="hands">${hands}${R(at(1, 182), 700, '6 motors, 11 DoF|per hand (2022)')}${Lf(at(-1, 150), 776, 'Metal tendons|pull the fingers')}</g>
<g class="os-sys" data-sys="balance">${feet}<path class="os-plumb" d="M300 470 V1204"/><circle class="os-com-ring" cx="300" cy="470" r="10"/><path class="os-com" d="M300 460 A10 10 0 0 1 310 470 H300 Z M300 480 A10 10 0 0 1 290 470 H300 Z"/><path class="os-support" d="M${at(-1, 98)} 1206 H${at(1, 98)}"/>${R(at(1, 94), 1148, 'Force/torque|sensing (Gen 2)')}${Lf(at(-1, 96), 1170, 'Articulated toes|(Gen 2)')}${Lf(290, 470, 'Centre of mass|over the feet')}</g>
</svg>`;
}

// Hand lab: degrees of freedom drawn on a schematic hand. Which joints are driven is our illustration.
const FINGERS = [
  { x: 150, scale: .86 }, { x: 190, scale: 1 }, { x: 230, scale: .95 }, { x: 270, scale: .78 },
];
export function handDofs() {
  const dofs = [];
  FINGERS.forEach(f => {
    const [mcp, pip, dip] = [230, 230 - 62 * f.scale, 230 - 104 * f.scale];
    dofs.push({ x: f.x, y: mcp, kind: 'flex', g2: true }, { x: f.x, y: mcp, kind: 'spread', g2: false },
      { x: f.x, y: pip, kind: 'flex', g2: true }, { x: f.x, y: dip, kind: 'flex', g2: false, coupled: true });
  });
  dofs.push({ x: 138, y: 352, kind: 'flex', g2: true }, { x: 138, y: 352, kind: 'spread', g2: true },
    { x: 104, y: 304, kind: 'flex', g2: true }, { x: 104, y: 304, kind: 'spread', g2: false },
    { x: 84, y: 266, kind: 'flex', g2: false, coupled: true }, { x: 210, y: 300, kind: 'arch', g2: false });
  return dofs;
}
export function hand() {
  const fingers = FINGERS.map(f => {
    const ys = [230, 230 - 62 * f.scale, 230 - 104 * f.scale, 230 - 136 * f.scale];
    return `<path class="os-finger" d="M${f.x} ${ys[0]} V${ys[3]}"/><path class="os-tendon" d="M${f.x + 5} ${ys[3] + 6} V430 L${200 + (f.x - 210) / 6} 470"/>`;
  }).join('');
  const thumb = `<path class="os-finger" d="M138 352 L104 304 L84 266 L74 238"/><path class="os-tendon" d="M80 246 L112 312 L186 470"/>`;
  const marks = handDofs().map((m, i) => {
    const cls = `os-dof os-dof-${m.kind}${m.g2 ? ' os-dof-g2' : ''}${m.coupled ? ' os-dof-coupled' : ''}`;
    if (m.kind === 'flex') return `<circle class="${cls}" cx="${m.x}" cy="${m.y}" r="7"/>`;
    if (m.kind === 'arch') return `<path class="${cls}" d="M150 300 Q210 324 270 300"/>`;
    return `<path class="${cls}" d="M${m.x - 12} ${m.y - 13} A16 16 0 0 1 ${m.x + 12} ${m.y - 13}"/>`;
  }).join('');
  return `<svg class="os-hand-svg" viewBox="0 0 420 540" role="img" aria-labelledby="hand-title hand-desc">
<title id="hand-title">Schematic hand showing degrees of freedom</title>
<desc id="hand-desc">Fingers, thumb and palm with markers for each independently driven motion, and tendons running to actuators in the forearm. Illustration by Supercharged Daily; Tesla has not published which joints are driven.</desc>
<rect class="os-palm" x="130" y="226" width="160" height="176" rx="30"/>
${fingers}${thumb}
<rect class="os-forearm" x="160" y="440" width="100" height="92" rx="12"/>
<g class="os-actuators">${[0, 1, 2, 3, 4].map(i => `<rect x="${170 + i * 17}" y="462" width="12" height="52" rx="3"/>`).join('')}</g>
<text class="os-svg-label" x="270" y="456">ACTUATORS</text><text class="os-svg-label" x="300" y="300">TENDONS</text>
<path class="os-svg-lead" d="M296 296 H262"/>
${marks}
</svg>`;
}

// Egg used in the grip demonstration.
export function egg() {
  return `<svg class="os-egg" viewBox="0 0 140 170" aria-hidden="true"><path class="os-egg-shell" d="M70 12 C108 12 126 74 126 104 C126 140 100 160 70 160 C40 160 14 140 14 104 C14 74 32 12 70 12 Z"/><path class="os-egg-crack" d="M30 92 L48 84 L56 98 L72 86 L82 100 L98 88 L112 96"/></svg>`;
}

// Static ramp chart: two illustrative curves, the goal line and labelled axes. JS adds the cursor.
export function rampChart(M) {
  const W = 760, H = 330, L = 56, R = 120, T = 20, B = 44, max = 22000, months = 24;
  const x = m => L + (m / months) * (W - L - R), y = v => T + (1 - v / max) * (H - T - B);
  const path = sc => Array.from({ length: months * 4 + 1 }, (_, i) => i / 4).map((m, i) => `${i ? 'L' : 'M'}${x(m).toFixed(1)} ${y(M.ramp(m, sc).weekly).toFixed(1)}`).join(' ');
  const grid = [5000, 10000, 15000, 20000].map(v => `<line class="os-grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="os-axis" x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${v / 1000}k</text>`).join('');
  const ticks = [[0, 'Oct 2026'], [6, 'Apr 2027'], [12, 'Oct 2027'], [18, 'Apr 2028'], [24, 'Oct 2028']].map(([m, t]) => `<text class="os-axis" x="${x(m)}" y="${H - 16}" text-anchor="middle">${t}</text>`).join('');
  const end = sc => y(M.ramp(months, sc).weekly);
  return `<svg class="os-ramp-chart" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="ramp-title ramp-desc">
<title id="ramp-title">Illustrative Optimus production ramp, robots per week</title>
<desc id="ramp-desc">Two S-shaped curves rise from near zero in October 2026 toward 20,000 robots a week: one reaches it in a little over a year, the other in two years. Shapes are illustrative; Tesla has published no volumes.</desc>
${grid}<line class="os-baseline" x1="${L}" x2="${W - R}" y1="${y(0)}" y2="${y(0)}"/>
<rect class="os-band" x="${x(12)}" y="${T}" width="${x(14) - x(12)}" height="${H - T - B}"/><text class="os-axis os-band-label" x="${x(13)}" y="${T + 14}" text-anchor="middle">Outside deliveries target</text>
<line class="os-goal" x1="${L}" x2="${W - R}" y1="${y(20000)}" y2="${y(20000)}"/>
<path class="os-curve os-curve-slower" d="${path('slower')}"/><path class="os-curve os-curve-stated" d="${path('stated')}"/>
<text class="os-direct" x="${W - R + 8}" y="${end('stated') - 8}">At least a year</text><text class="os-direct os-direct-muted" x="${W - R + 8}" y="${end('slower') + 18}">Two years</text>
${ticks}
<g class="os-cursor" hidden><line x1="0" x2="0" y1="${T}" y2="${H - B}"/><circle r="6"/></g>
<rect class="os-hit" x="${L}" y="${T}" width="${W - L - R}" height="${H - T - B}"/>
</svg>`;
}
