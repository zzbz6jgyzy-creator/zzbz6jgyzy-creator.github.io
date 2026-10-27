// Original engineering illustrations for /optimus.html. Diagrams of principles, not Tesla CAD.
// Pure string builders: same input, same markup, so the page stays reproducible.

const line = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
const dot = (x, y, r = 8) => `<circle cx="${x}" cy="${y}" r="${r}"/>`;

// Kinematic sketch of a humanoid. Each system is a group the page can light up.
export function body() {
  const links = [
    [200, 100, 200, 124], [140, 150, 260, 150], [140, 150, 115, 255], [115, 255, 100, 350],
    [260, 150, 285, 255], [285, 255, 300, 350], [200, 124, 200, 330], [172, 345, 228, 345],
    [172, 345, 168, 500], [228, 345, 232, 500], [168, 500, 166, 655], [232, 500, 234, 655],
  ];
  const joints = [[200, 124], [140, 150], [260, 150], [115, 255], [285, 255], [200, 330], [172, 345], [228, 345], [168, 500], [232, 500], [166, 655], [234, 655]];
  const hand = (x, s) => [
    dot(x, 350, 6),
    `<path d="M${x} 356 L${x - 12 * s} 398 M${x} 356 L${x - 4 * s} 404 M${x} 356 L${x + 4 * s} 404 M${x} 356 L${x + 12 * s} 398 M${x} 360 L${x + 16 * s} 380"/>`,
  ].join('');
  return `<svg class="os-body" viewBox="0 0 400 760" role="img" aria-labelledby="body-title body-desc">
<title id="body-title">Kinematic sketch of a humanoid robot</title>
<desc id="body-desc">Joints, links, cameras, computer, battery, hands and feet drawn as a simple engineering diagram. Illustration by Supercharged Daily, not Tesla CAD.</desc>
<defs><pattern id="os-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#18202b"/></pattern>
<radialGradient id="os-glow"><stop offset="0" stop-color="#ff3e60" stop-opacity=".35"/><stop offset="1" stop-color="#ff3e60" stop-opacity="0"/></radialGradient></defs>
<rect width="400" height="760" fill="url(#os-grid)"/>
<g class="os-body-shell"><path d="M150 136 L250 136 L240 300 Q200 318 160 300 Z"/><path d="M160 318 L240 318 L236 362 L164 362 Z"/></g>
<g class="os-body-links">${links.map(l => line(...l)).join('')}</g>
<g class="os-sys" data-sys="perception"><path class="os-cone" d="M212 57 L360 14 L360 100 Z"/><rect x="172" y="28" width="56" height="72" rx="24"/><rect class="os-visor" x="178" y="48" width="44" height="18" rx="9"/>${dot(190, 57, 3)}${dot(210, 57, 3)}</g>
<g class="os-sys" data-sys="learning"><path class="os-wire" d="M200 150 C200 120 200 110 200 100"/><rect x="182" y="150" width="36" height="26" rx="4"/><path class="os-pins" d="M188 146v4M196 146v4M204 146v4M212 146v4M188 176v4M196 176v4M204 176v4M212 176v4"/></g>
<g class="os-sys" data-sys="power"><rect x="168" y="190" width="64" height="96" rx="8"/><path class="os-cells" d="M176 214H224M176 238H224M176 262H224"/><path class="os-bolt" d="M203 196 L193 214 H202 L196 230"/></g>
<g class="os-sys" data-sys="actuation">${joints.map(j => dot(...j)).join('')}</g>
<g class="os-sys" data-sys="hands">${hand(100, 1)}${hand(300, -1)}</g>
<g class="os-sys" data-sys="balance"><path d="M140 668 L190 668 L192 690 L136 690 Z M210 668 L260 668 L264 690 L208 690 Z"/><path class="os-support" d="M136 700 H264"/><path class="os-plumb" d="M200 300 V700"/>${dot(200, 300, 7)}<path class="os-com" d="M200 293 A7 7 0 0 1 207 300 H200 Z M200 307 A7 7 0 0 1 193 300 H200 Z"/></g>
</svg>`;
}

// Hand lab: degrees of freedom drawn on a schematic hand. Which joints are driven is our illustration.
const FINGERS = [
  { x: 150, scale: .86 }, { x: 190, scale: 1 }, { x: 230, scale: .95 }, { x: 270, scale: .78 },
];
export function handDofs() {
  const dofs = [];
  FINGERS.forEach((f, i) => {
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
<desc id="ramp-desc">Two S-shaped curves rise from near zero in October 2026 toward 20,000 robots a week: one reaches it in about a year, the other in two years. Shapes are illustrative; Tesla has published no volumes.</desc>
${grid}<line class="os-baseline" x1="${L}" x2="${W - R}" y1="${y(0)}" y2="${y(0)}"/>
<rect class="os-band" x="${x(12)}" y="${T}" width="${x(14) - x(12)}" height="${H - T - B}"/><text class="os-axis os-band-label" x="${x(13)}" y="${T + 14}" text-anchor="middle">Outside deliveries target</text>
<line class="os-goal" x1="${L}" x2="${W - R}" y1="${y(20000)}" y2="${y(20000)}"/>
<path class="os-curve os-curve-slower" d="${path('slower')}"/><path class="os-curve os-curve-stated" d="${path('stated')}"/>
<text class="os-direct" x="${W - R + 8}" y="${end('stated') - 8}">About a year</text><text class="os-direct os-direct-muted" x="${W - R + 8}" y="${end('slower') + 18}">Two years</text>
${ticks}
<g class="os-cursor" hidden><line x1="0" x2="0" y1="${T}" y2="${H - B}"/><circle r="6"/></g>
<rect class="os-hit" x="${L}" y="${T}" width="${W - L - R}" height="${H - T - B}"/>
</svg>`;
}
export const RAMP_GEOMETRY = { W: 760, H: 330, L: 56, R: 120, T: 20, B: 44, max: 22000, months: 24 };
