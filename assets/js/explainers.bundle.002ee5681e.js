window.EXPLAINERS={updated:"2026-10-16",updatedLabel:"16 Oct 2026",tabs:{spacex:{kicker:"SpaceX \xB7 Starship",lede:"Why the ring burns, and how a catch works. Original diagrams you can scrub, then official SpaceX footage. Flight numbers and T+ times from the flight lab."},tesla:{kicker:"Tesla \xB7 FSD",lede:"Same brand, three stacks. What HW4 actually got, what HW3 Lite did not, and why Europe is still Assisted Driving on 14.2. Sourced from the trackers \u2014 not invented version lore."}},items:[{id:"hot-staging",tab:"spacex",share:"Why Starship lights the Ship inside Super Heavy\u2019s exhaust."},{id:"catch",tab:"spacex",share:"How a Super Heavy catch works \u2014 boostback, flip, chopsticks."},{id:"fsd",tab:"tesla",share:"What actually changed between Tesla FSD stacks \u2014 HW4, HW3 Lite, Europe."},{id:"evasion",tab:"tesla",share:"Collision Evasion is HW4 in North America. HW3 Lite and Europe 14.2 do not have it."}],hot:{facts:[{k:"Flight 2",v:"18 Nov 2023 \xB7 first hot-stage. First water deluge. Both vehicles were then lost."},{k:"Flight 14",v:"MECO at T+2:20. Hot-stage at T+2:22. Official SpaceX timeline."},{k:"Block 3",v:"First Block 3 hot-stage on Flight 12, ~T+2:30. Same family through Flight 14."}],steps:[{at:.08,title:"Climb",clock:"F14 \xB7 before MECO",caption:"Thirty-three Super Heavy Raptors are doing the work. Ship is still a passenger.",callout:"Ascent",text:"Until the ring says otherwise, Ship is mass. Super Heavy is the engine. Staging only pays if this climb is still accelerating when Ship lights."},{at:.28,title:"The ring dumps",clock:"F14 \xB7 MECO T+2:20",caption:"Vents open sideways. Super Heavy\u2019s exhaust has to leave the stack, not punch Ship.",callout:"Vent the plume",text:"A vented hot-stage ring sits between the two vehicles. The moment Ship lights, that plume has nowhere to go except through the ring. Sideways dump is the whole hardware trick."},{at:.46,title:"Ship lights first",clock:"F14 \xB7 T+2:22",caption:"Ship\u2019s Raptors ignite while the clamp is still closed. No coast. No ullage wait.",callout:"Hot-stage",text:"Cold staging would cut Super Heavy, wait, then light Ship. That wait is gravity loss on a heavy stack. Hot staging never drops the thrust. Flight 14 did this at T+2:22."},{at:.64,title:"Separate under thrust",clock:"Under thrust",caption:"The clamp opens. Ship is already pushing. Super Heavy starts to fall away.",callout:"Sep",text:"Because Ship is already lit, separation is a shove, not a coast. Super Heavy is no longer dragging the stack. That is the payload argument SpaceX publishes: performance, not theatre."},{at:.86,title:"Booster flips",clock:"Boostback setup",caption:"Super Heavy turns around for boostback. Ship keeps the acceleration it already paid for.",callout:"Boostback setup",text:"The flip is the catch sequence starting, not staging finishing. Staging already worked if Ship is clean and the booster is still a vehicle."}],why:[{title:"No coast",text:"Cold staging cuts the booster, waits, then lights the upper stage. Hot staging never drops the thrust. For a stack this heavy, that wait is expensive in gravity loss and attitude propellant."},{title:"More payload",text:"Continuous acceleration is SpaceX\u2019s published reason. We do not invent a kilogram number. The ring exists because the payload argument won."},{title:"The hardware cost",text:"The ring has to survive Ship lighting in the booster\u2019s plume. Flight 2 proved the staging (~T+2:49) and then lost both vehicles. Later flights kept the idea and made the ring live."}],timeline:[{k:"F2 \xB7 18 Nov 2023",v:"First hot-stage. First deluge. Staging was the test that paid off; both vehicles died afterwards."},{k:"F3 \xB7 14 Mar 2024",v:"First Starship to space. Staging held."},{k:"F12",v:"First Block 3 hot-stage, ~T+2:30."},{k:"F14",v:"Hot-stage on time at T+2:22 after MECO at T+2:20."}]},catch:{facts:[{k:"Flight 5",v:"13 Oct 2024 \xB7 B12 \xB7 first Super Heavy catch, ~T+6:56. No engine failures on the way up."},{k:"Divert",v:"If the approach is off, SpaceX sends it to a controlled splashdown. Missing is allowed. Hitting the tower wrong is not."},{k:"Flight 15",v:"First serious attempt to catch a Ship. Same chopsticks idea, harder timing. NET 8 Nov."}],steps:[{at:.1,title:"Leave the tower",clock:"T+0",caption:"The chopsticks that will catch it later have just released the stack.",callout:"Liftoff",text:"Mechazilla is the pad and the landing site. The arms that hold the stack for launch are the arms that have to meet the pins on the way back."},{at:.3,title:"Boostback",clock:"After staging",caption:"After hot-stage, Super Heavy burns toward home instead of falling downrange.",callout:"Boostback",text:"This is the expensive part of reuse: reverse the downrange velocity so the booster falls at the tower it left, not into the Gulf. Flight 4 flew a virtual-tower profile instead of a catch."},{at:.52,title:"Flip and landing burn",clock:"Landing burn",caption:"Falling at the tower. Grid fins aim. Landing-burn engines kill the speed.",callout:"Landing burn",text:"Upright, slow, at the right height. The pins are small. The arms are not a net. Timing is the whole trick \u2014 same idea as a Falcon landing, except the pad is reaching out."},{at:.74,title:"Pins on the arms",clock:"F5 \xB7 ~T+6:56",caption:"Hard points on the booster have to meet the chopsticks. Flight 5 was the first time it worked.",callout:"Catch window",text:"~T+6:56 on Flight 5. B12 hung. Everything since is the same geometry, faster, on later boosters. A miss still prefers splash to a tower strike."},{at:.92,title:"Hang",clock:"Hang",caption:"Arms close. No legs. The tower is the landing pad.",callout:"Hang",text:"A Super Heavy that landed on legs would carry that mass on every flight and need a huge pad. The catch puts the mass in a tower you already built to stack the vehicle."}],why:[{title:"No legs",text:"Landing legs are mass you fly, then a pad you pour. A catch spends that mass once, in Mechazilla, and every booster reuses it."},{title:"Catch or splash",text:"Flight 11\u2019s booster did a controlled splash, not a catch. Divert is a success mode when the approach is off. A bad tower hit is not."},{title:"Ship is next",text:"Flight 15 is the first serious attempt to catch a Ship (S42 on the Pad 2 tower). Same chopsticks, a different vehicle, tighter timing. SpaceX has not confirmed it as the plan of record."}]},fsd:{sae:"FSD Supervised is SAE Level 2. The driver must supervise. Europe lists the same idea as Tesla Assisted Driving. Not Tesla\u2019s official comparison.",facts:[{k:"US HW4",v:"v14.3.12 on 2026.38.5 \u2014 same notes as 14.3.11, early US wave since 10 Oct. Collision Evasion on."},{k:"US HW3",v:"v14.3 Lite. Parking, unparking, start-from-park. Distilled from HW4. No Collision Evasion."},{k:"Europe",v:"v14.2.2.6 on 2026.33.100. Assisted Driving Basic, \u20AC99 a month. Same week as US 14.3.11, still on 14.2."}],stacks:[{id:"us-hw4",label:"US / Canada \xB7 HW4",short:"HW4",version:"v14.3.11 / 14.3.12",name:"FSD (Supervised)",hardware:"HW4 / AI4",features:{city:!0,evasion:!0,park:!0,lite:!1,europeName:!1,cabin38:!0},text:"Widest North America HW4 stack. Automatic Collision Evasion is in 14.3.11 and 14.3.12. 14.3.12 is the same notes on the 2026.38 cabin branch. Faster reactions, better rare-scene and low-visibility vision, cleaner parking pins, better emergency-vehicle, school-bus and yellow-light behaviour.",src:"https://www.notateslaapp.com/"},{id:"us-hw3",label:"US / Canada \xB7 HW3",short:"HW3",version:"v14.3 Lite",name:"FSD (Supervised) Lite",hardware:"HW3",features:{city:!0,evasion:!1,park:!0,lite:!0,europeName:!1,cabin38:!0},text:"Distilled from the HW4 model. Parking, unparking, reversing, start-from-park, Arrival Options and Speed Profiles including Sloth. No Collision Evasion. Tesla is not promising HW3 the full HW4 stack.",src:"https://www.notateslaapp.com/"},{id:"eu",label:"Europe",short:"Europe",version:"v14.2.2.6",name:"Assisted Driving Basic",hardware:"HW3 / HW4",features:{city:!0,evasion:!1,park:!0,lite:!1,europeName:!0,cabin38:!1},text:"Renamed on 9 Oct 2026. Same week as US 14.3.11, still on 14.2. Collision Evasion is North America only. \u20AC99 a month in the Tesla app. EU-wide vote: December 2026 at the earliest.",src:"https://tad-tracker.eu/en/"}],flags:[{id:"city",label:"Supervised city driving"},{id:"park",label:"Park / unpark / start-from-park"},{id:"evasion",label:"Automatic Collision Evasion"},{id:"lite",label:"HW3 Lite model"},{id:"europeName",label:"Listed as Assisted Driving"},{id:"cabin38",label:"On the 2026.38 cabin branch"}],jumps:[{date:"2026-10-09",title:"Europe rename",text:"FSD (Supervised) is called Tesla Assisted Driving in Europe. Autosteer, Summon, Autopark \u2014 a name built for regulators.",href:"/dispatch/assisted-driving.html"},{date:"2026-10-06",title:"14.3.11 + Lite",text:"HW4 gets Collision Evasion. HW3 gets Lite parking. Europe stays on 14.2 (build 2026.33.100).",href:"/updates.html"},{date:"2026-10-10",title:"14.3.12",text:"Same notes as 14.3.11, now on the 2026.38 cabin branch. Early US wave; Mexico and Canada reporting by 13 Oct.",href:"/fsd.html#versions"}]},evasion:{facts:[{k:"What it is",v:"HW4 can switch Supervised FSD on to try to avoid an imminent frontal crash, or if FSD looks like it was dropped by mistake."},{k:"Where",v:"North America, 14.3.11 and 14.3.12. Not on HW3 Lite. Not on Europe 14.2."},{k:"Still L2",v:"The driver still has to supervise. This is not a hands-off crash-avoidance robot."}],modes:[{id:"hw4",label:"HW4 \xB7 North America",outcome:"Can re-engage"},{id:"hw3",label:"HW3 Lite",outcome:"No evasion"},{id:"eu",label:"Europe 14.2",outcome:"No evasion"}],steps:[{at:.08,title:"Supervised FSD is on",clock:"HW4 NA \xB7 14.3",caption:"City or highway, SAE Level 2. You are still the driver.",callout:"FSD on",text:"Collision Evasion is not a separate Autopilot. It is a way for HW4 to put Supervised FSD back on when a frontal crash is about to happen."},{at:.3,title:"Attention drops",clock:"Look-away / drop",caption:"You look away, or FSD disengages unintentionally.",callout:"Drop",text:"Tesla\u2019s own notes: if you look away or FSD drops by mistake, the car can re-engage Supervised FSD. That sentence is the whole feature."},{at:.52,title:"Frontal crash incoming",clock:"Frontal only",caption:"HW4 is watching for an imminent frontal collision.",callout:"Threat",text:"The notes say frontal. They do not claim a full-surround guardian. We do not invent side or rear coverage."},{at:.74,title:"HW4 can re-engage",clock:"Re-engage or no",caption:"Supervised FSD comes back on and tries to stay out of it, then keeps going.",callout:"Re-engage",text:"On HW4 in North America (14.3.11 / 14.3.12) this step is the feature. On HW3 Lite and Europe 14.2 this step does not exist \u2014 FSD stays off."},{at:.92,title:"You are still driving",clock:"Still SAE L2",caption:"SAE Level 2. Evasion is not unsupervised Robotaxi.",callout:"L2",text:"Austin unsupervised Cybercab is a different product on a different stack. This explainer is the consumer FSD note on HW4 cars in North America."}]}},(()=>{var B,P;const p=window.EXPLAINERS;if(!p)return;const at=(P=(B=window.matchMedia)==null?void 0:B.call(window,"(prefers-reduced-motion: reduce)"))==null?void 0:P.matches,v=t=>String(t!=null?t:"").replace(/[&<>"]/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[e]),A=document.querySelector("[data-vx-updated]");A&&(A.textContent=p.updatedLabel,A.setAttribute("datetime",p.updated));const q=document.querySelector("[data-vx-kicker]"),W=document.querySelector("[data-vx-lede]"),G=[];function j(t){return`https://superchargeddaily.com/explainers.html#${t}`}function M(t,{onTick:e,labels:o,initial:a=.42}){const i=t.querySelector("[data-vx-play]"),r=t.querySelector("[data-vx-range]"),l=t.querySelector("[data-vx-readout]");let n=0,s=!1,d=0;const f=(c,g)=>{n=Math.max(0,Math.min(1,c)),r&&!g&&(r.value=String(Math.round(n*1e3))),e(n),l&&o&&(l.textContent=o(n))},x=c=>{s&&(d||(d=c),n+=(c-d)/9e3,d=c,n>=1&&(n=0),f(n),requestAnimationFrame(x))},b=()=>{s=!1,i&&(i.textContent="Play",i.setAttribute("aria-pressed","false"))};i==null||i.addEventListener("click",()=>{s=!s,i.textContent=s?"Pause":"Play",i.setAttribute("aria-pressed",s?"true":"false"),d=0,s&&requestAnimationFrame(x)}),r==null||r.addEventListener("input",()=>{b(),f(Number(r.value)/1e3,!0)}),f(a);const h={set:f,stop:b,root:t};return G.push(h),h}function m(t,e,o,a="#c4b8a4"){const i=Math.max(40,String(o).length*6.6+16);return`<g transform="translate(${t} ${e})">
      <rect width="${i}" height="17" rx="4" fill="rgba(8,10,14,.74)" stroke="rgba(255,255,255,.12)"/>
      <text x="8" y="12.2" fill="${a}" font-size="9.5" font-family="IBM Plex Mono,ui-monospace,monospace">${o}</text>
    </g>`}function D(t){return`<linearGradient id="${t}-steel" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#2a2620"/><stop offset=".28" stop-color="#6a6458"/>
        <stop offset=".46" stop-color="#e8e2d4"/><stop offset=".55" stop-color="#fff8ec"/>
        <stop offset=".68" stop-color="#9a9284"/><stop offset="1" stop-color="#2c2822"/>
      </linearGradient>
      <linearGradient id="${t}-plume" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fff8dc"/><stop offset=".12" stop-color="#b4dcff"/>
        <stop offset=".42" stop-color="#ffb040"/><stop offset="1" stop-color="rgba(255,50,8,0)"/>
      </linearGradient>
      <linearGradient id="${t}-bell" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#24180f"/><stop offset=".35" stop-color="#8a5328"/>
        <stop offset=".5" stop-color="#e0b068"/><stop offset=".75" stop-color="#7a4a24"/><stop offset="1" stop-color="#1a120c"/>
      </linearGradient>
      <filter id="${t}-glow" x="-60%" y="-30%" width="220%" height="180%">
        <feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>`}function H(t,e,o,a){return`<g transform="translate(${t} ${e}) scale(${o})">
      <path d="M-2.8 -1.6 L-5.6 8.4 Q0 10.8 5.6 8.4 L2.8 -1.6 Z" fill="${a}"/>
      <ellipse cx="0" cy="8" rx="2.4" ry="1.1" fill="#0e0a08"/>
    </g>`}function S(t,e,o,a){return`<g transform="translate(${t} ${e}) rotate(${o}) scale(${a?-1:1} 1)">
      <path d="M4 -4 H36 L39 20 H4 Z" fill="#7a7468"/>
      <path d="M7 -1 H34 L36 17 H7 Z" fill="#2a2620"/>
      <path d="M10 3 H33 M10 8 H33 M10 13 H33 M14 -1 V17 M19 -1 V17 M24 -1 V17 M29 -1 V17" stroke="#c4b8a4" stroke-width=".85"/>
      <rect x="-2" y="2" width="10" height="10" rx="1" fill="#5a544c"/>
    </g>`}function R(){const t=[[22,18,1.1],[58,42,.8],[88,14,1.4],[128,34,.7],[176,10,1],[236,26,1.3],[292,12,.8],[332,40,1.1],[368,18,.7],[44,74,.6],[304,66,1],[354,86,.7],[16,116,.5],[394,124,.7],[72,154,.5],[404,188,.55],[110,28,.5],[210,48,.6],[268,8,.9],[390,56,.5]],e=Array.from({length:18},(a,i)=>Array.from({length:6},(r,l)=>{const n=169+l*3.4+i%2*1.6,s=86+i*5.6;return`<rect x="${n}" y="${s}" width="3" height="4.9" rx=".3" fill="rgba(0,0,0,.5)"/>`}).join("")).join(""),o=Array.from({length:12},(a,i)=>`<path d="M171 ${228+i*13.2} H229" stroke="rgba(10,8,6,.48)" stroke-width="1.05"/>`).join("");return`<svg viewBox="0 0 420 520" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Starship stack during hot staging">
      <defs>
        <linearGradient id="vx-hot-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#02050a"/><stop offset=".46" stop-color="#0a1420"/>
          <stop offset=".78" stop-color="#1a2432"/><stop offset="1" stop-color="#4a2e22"/>
        </linearGradient>
        ${D("vx-hot")}
        <linearGradient id="vx-hot-soot" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="rgba(12,10,8,0)"/><stop offset="1" stop-color="rgba(10,8,6,.42)"/>
        </linearGradient>
        <linearGradient id="vx-hot-tile" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#14110d"/><stop offset=".72" stop-color="#2a241c"/><stop offset="1" stop-color="rgba(24,20,16,0)"/>
        </linearGradient>
        <radialGradient id="vx-hot-ringg" cx="50%" cy="50%" r="50%">
          <stop offset="0" stop-color="rgba(255,210,140,.62)"/><stop offset=".42" stop-color="rgba(255,120,36,.28)"/><stop offset="1" stop-color="rgba(255,30,0,0)"/>
        </radialGradient>
        <radialGradient id="vx-hot-limb" cx="50%" cy="100%" r="70%">
          <stop offset="0" stop-color="rgba(232,160,96,.28)"/><stop offset=".55" stop-color="rgba(80,40,24,.08)"/><stop offset="1" stop-color="rgba(0,0,0,0)"/>
        </radialGradient>
      </defs>
      <rect width="420" height="520" fill="url(#vx-hot-sky)"/>
      <rect width="420" height="520" fill="url(#vx-hot-limb)"/>
      ${t.map(([a,i,r])=>`<circle cx="${a}" cy="${i}" r="${r}" fill="${r>1?"#fff4d4":"#d8e4ff"}" opacity=".62"/>`).join("")}
      <ellipse cx="210" cy="528" rx="320" ry="46" fill="#14100e"/>
      <ellipse cx="210" cy="510" rx="230" ry="18" fill="#c47850" opacity=".22"/>
      <path d="M-20 498 Q210 470 440 498 L440 530 L-20 530 Z" fill="#1a1410"/>
      <g data-hot-stack>
        <g data-hot-booster>
          <path d="M170 214 H230 L236 392 Q200 412 164 392 Z" fill="url(#vx-hot-steel)"/>
          ${o}
          <path d="M200 218 V394" stroke="rgba(16,14,12,.22)" stroke-width=".8"/>
          <rect x="218" y="220" width="6" height="172" fill="rgba(10,8,6,.44)"/>
          <rect x="166" y="314" width="68" height="82" fill="url(#vx-hot-soot)"/>
          ${S(168,236,-8,!0)}${S(232,236,8,!1)}
          ${S(168,268,-4,!0)}${S(232,268,4,!1)}
          ${[-18,-9,0,9,18].map((a,i)=>H(200+a,396+Math.abs(a)*.15,1.15+(i===2?.12:0),"url(#vx-hot-bell)")).join("")}
          <g data-hot-booster-plumes filter="url(#vx-hot-glow)">
            <ellipse class="vx-flicker" cx="200" cy="418" rx="48" ry="20" fill="rgba(255,180,80,.38)"/>
            <path d="M162 408 L238 408 L216 512 L184 512 Z" fill="url(#vx-hot-plume)"/>
            <path class="vx-flicker" d="M184 408 L216 408 L208 504 L192 504 Z" fill="url(#vx-hot-plume)" opacity=".92"/>
            <path d="M192 408 L208 408 L205 478 L195 478 Z" fill="#fff8dc" opacity=".35"/>
          </g>
          ${m(258,292,"SUPER HEAVY")}
          ${m(258,314,"33 RAPTORS","#8a8074")}
        </g>
        <g data-hot-ring>
          <ellipse cx="200" cy="208" rx="62" ry="18" fill="url(#vx-hot-ringg)"/>
          <rect x="158" y="196" width="84" height="20" rx="7" fill="#6a4a18"/>
          <rect x="162" y="199" width="76" height="7" rx="2" fill="#e2c48a"/>
          <g fill="#3a2a10">
            ${[166,180,194,208,222].map(a=>`<rect x="${a}" y="209" width="9" height="6" rx="1"/>`).join("")}
          </g>
          ${m(258,200,"RING","#e2c48a")}
          <g data-hot-vents opacity="0" filter="url(#vx-hot-glow)">
            <path d="M158 208 L96 198 L102 212 L158 214 Z" fill="#ff8a28" opacity=".7"/>
            <path d="M262 208 L324 198 L318 212 L262 214 Z" fill="#ff8a28" opacity=".7"/>
            <path d="M158 210 L118 204 L122 214 L158 213 Z" fill="#ffb040" opacity=".8"/>
            <path d="M262 210 L302 204 L298 214 L262 213 Z" fill="#ffb040" opacity=".8"/>
            <path class="vx-flicker" d="M158 211 L130 208 L132 214 L158 213 Z" fill="#ffe08a"/>
            <path class="vx-flicker" d="M262 211 L290 208 L288 214 L262 213 Z" fill="#ffe08a"/>
          </g>
        </g>
        <g data-hot-ship>
          <path d="M168 138 L132 160 L138 178 L168 164 Z" fill="#6a6458"/>
          <path d="M252 138 L288 160 L282 178 L252 164 Z" fill="#6a6458"/>
          <path d="M170 140 L140 160 L144 168 L170 156 Z" fill="#2a261e"/>
          <path d="M250 140 L280 160 L276 168 L250 156 Z" fill="#2a261e"/>
          <path d="M174 88 L148 104 L154 116 L174 106 Z" fill="#8a8274"/>
          <path d="M246 88 L272 104 L266 116 L246 106 Z" fill="#8a8274"/>
          <path d="M200 28 C226 28 232 54 232 80 L232 196 H168 L168 80 C168 54 174 28 200 28 Z" fill="url(#vx-hot-steel)"/>
          <path d="M168 84 L198 78 L198 184 L168 178 Z" fill="url(#vx-hot-tile)"/>
          ${e}
          <rect x="192" y="66" width="16" height="11" rx="1.6" fill="#101216"/>
          <rect x="194" y="68" width="12" height="7" rx="1" fill="#8ec8ff" opacity=".78"/>
          ${[-10,0,10].map(a=>H(200+a,196,.95,"url(#vx-hot-bell)")).join("")}
          <g data-hot-ship-plumes opacity="0" filter="url(#vx-hot-glow)">
            <path d="M176 198 L224 198 L214 286 L186 286 Z" fill="url(#vx-hot-plume)"/>
            <path class="vx-flicker" d="M188 198 L212 198 L208 274 L192 274 Z" fill="url(#vx-hot-plume)"/>
          </g>
          ${m(258,68,"SHIP")}
          ${m(258,90,"6 RAPTORS","#8a8074")}
        </g>
      </g>
      <g data-hot-coast opacity="0">
        <rect x="168" y="166" width="64" height="22" rx="5" fill="#3a2424" stroke="#c98a8a"/>
        <text x="180" y="181" fill="#e8b0b0" font-size="11" font-family="IBM Plex Mono,ui-monospace,monospace">COAST</text>
      </g>
      <text x="16" y="508" fill="#8a8074" font-size="10" font-family="IBM Plex Mono,ui-monospace,monospace">Original diagram \xB7 not to scale \xB7 F14 clocks</text>
    </svg>`}function I(){const t=Array.from({length:16},(i,r)=>{const l=22+r*18.6;return`<path d="M38 ${l} L82 ${l+18} M82 ${l} L38 ${l+18} M38 ${l} H82" stroke="#7a848e" stroke-width="1.45"/>`}).join(""),e=Array.from({length:10},(i,r)=>{const l=168+r*14;return`<path d="M468 ${l} L488 ${l+14} M488 ${l} L468 ${l+14}" stroke="#6a727c" stroke-width="1.15"/>`}).join(""),o=i=>Array.from({length:10},(r,l)=>`<rect x="${82+l*15}" y="${i+2}" width="13" height="12" fill="${l%2?"#161614":"#e2c04a"}"/>`).join(""),a=Array.from({length:10},(i,r)=>`<path d="M0 ${322+r*6.2} H560" stroke="rgba(210,180,130,${.04+r%3*.018})" stroke-width="1.1"/>`).join("");return`<svg viewBox="0 0 560 400" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Super Heavy approaching the chopsticks">
      <defs>
        <linearGradient id="vx-ca-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#1a2230"/><stop offset=".4" stop-color="#3a3848"/>
          <stop offset=".7" stop-color="#c47850"/><stop offset="1" stop-color="#e8a070"/>
        </linearGradient>
        <linearGradient id="vx-ca-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#6a4a3a"/><stop offset=".32" stop-color="#2a2830"/><stop offset="1" stop-color="#121018"/>
        </linearGradient>
        ${D("vx-ca")}
        <linearGradient id="vx-ca-arm" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#8a8680"/><stop offset=".4" stop-color="#4a4844"/><stop offset="1" stop-color="#1c1c1a"/>
        </linearGradient>
        <radialGradient id="vx-ca-sun" cx="78%" cy="70%" r="58%">
          <stop offset="0" stop-color="rgba(255,210,140,.55)"/><stop offset=".16" stop-color="rgba(255,160,80,.2)"/><stop offset="1" stop-color="rgba(255,120,40,0)"/>
        </radialGradient>
      </defs>
      <rect width="560" height="400" fill="url(#vx-ca-sky)"/>
      <rect width="560" height="400" fill="url(#vx-ca-sun)"/>
      <circle cx="436" cy="286" r="7" fill="rgba(255,236,200,.88)"/>
      <ellipse cx="120" cy="92" rx="70" ry="10" fill="#efe4d4" opacity=".14"/>
      <ellipse cx="340" cy="70" rx="90" ry="12" fill="#efe4d4" opacity=".1"/>
      <ellipse cx="500" cy="108" rx="50" ry="8" fill="#efe4d4" opacity=".12"/>
      <rect x="0" y="318" width="560" height="82" fill="url(#vx-ca-water)"/>
      <path d="M0 318 H560" stroke="rgba(255,220,180,.3)" stroke-width="1.3"/>
      <ellipse cx="430" cy="318" rx="96" ry="6" fill="rgba(255,200,140,.14)"/>
      ${a}
      <g opacity=".9">
        <rect x="466" y="164" width="24" height="154" fill="#1a1c20"/>
        <rect x="466" y="164" width="4" height="154" fill="#2c3036"/>
        <rect x="486" y="164" width="4" height="154" fill="#2c3036"/>
        ${e}
        <rect x="462" y="158" width="32" height="7" fill="#2a2c30"/>
      </g>
      <ellipse cx="196" cy="316" rx="170" ry="16" fill="#2a2822"/>
      <rect x="40" y="308" width="210" height="3" fill="rgba(236,220,160,.1)"/>
      <rect x="126" y="309" width="16" height="2" fill="rgba(200,16,46,.4)"/>
      <rect x="148" y="309" width="16" height="2" fill="rgba(200,16,46,.4)"/>
      <g opacity=".95">
        <rect x="214" y="262" width="18" height="52" rx="8" fill="#2a2c26"/>
        <rect x="238" y="248" width="16" height="66" rx="8" fill="#3a3c36"/>
        <rect x="260" y="270" width="20" height="44" rx="9" fill="#2a2c26"/>
      </g>
      <g data-catch-tower>
        <rect x="36" y="12" width="50" height="306" fill="#1c2026"/>
        <rect x="38" y="12" width="8" height="306" fill="#2c3036"/>
        <rect x="76" y="12" width="8" height="306" fill="#2c3036"/>
        ${t}
        <rect x="32" y="8" width="58" height="10" fill="#2c3036"/>
        <rect x="54" y="0" width="14" height="10" fill="#c8102e"/>
        <circle cx="61" cy="-2" r="2.5" fill="#ff3a3a"/>
        <g>
          <circle cx="44" cy="68" r="2.2" fill="#ffe6be"/>
          <circle cx="78" cy="138" r="2.2" fill="#ffe6be"/>
          <circle cx="44" cy="208" r="2.2" fill="#ffe6be"/>
          <ellipse cx="44" cy="68" rx="28" ry="22" fill="rgba(255,220,150,.16)"/>
          <ellipse cx="78" cy="138" rx="28" ry="22" fill="rgba(255,220,150,.12)"/>
          <ellipse cx="44" cy="208" rx="28" ry="22" fill="rgba(255,220,150,.1)"/>
        </g>
        ${m(96,22,"TOWER")}
        <g data-catch-arms>
          <g data-arm="l">
            <rect x="72" y="142" width="176" height="20" fill="url(#vx-ca-arm)"/>
            <rect x="72" y="142" width="176" height="3" fill="rgba(236,228,210,.26)"/>
            <rect x="76" y="139" width="158" height="3" fill="#2a2824"/>
            ${o(142)}
            <rect x="236" y="140" width="16" height="24" fill="#5a5852"/>
          </g>
          <g data-arm="r">
            <rect x="72" y="192" width="176" height="20" fill="url(#vx-ca-arm)"/>
            <rect x="72" y="192" width="176" height="3" fill="rgba(236,228,210,.26)"/>
            <rect x="76" y="189" width="158" height="3" fill="#2a2824"/>
            ${o(192)}
            <rect x="236" y="190" width="16" height="24" fill="#5a5852"/>
          </g>
        </g>
        ${m(96,236,"CHOPSTICKS","#e2c48a")}
      </g>
      <g data-catch-booster transform="translate(430 90) rotate(-16)">
        <path d="M0 -118 C16 -118 24 -96 24 -72 L26 78 Q0 96 -26 78 L-24 -72 C-24 -96 -16 -118 0 -118 Z" fill="url(#vx-ca-steel)"/>
        <path d="M0 -110 V76" stroke="rgba(20,18,16,.22)" stroke-width=".8"/>
        ${Array.from({length:11},(i,r)=>`<path d="M-22 ${-74+r*13.2} H22" stroke="rgba(20,18,16,.2)" stroke-width=".55"/>`).join("")}
        <rect x="10" y="-70" width="8" height="136" fill="rgba(10,8,6,.36)"/>
        ${S(-22,-78,-6,!0)}${S(22,-78,6,!1)}
        <rect x="-42" y="-14" width="18" height="9" rx="1" fill="#e2c04a"/>
        <rect x="24" y="-14" width="18" height="9" rx="1" fill="#e2c04a"/>
        <rect x="-42" y="-14" width="18" height="2.2" fill="rgba(255,255,220,.42)"/>
        <rect x="24" y="-14" width="18" height="2.2" fill="rgba(255,255,220,.42)"/>
        ${m(36,-8,"PINS","#e2c04a")}
        ${m(30,-62,"B12")}
        ${[-8,0,8].map(i=>H(i,82,.85,"url(#vx-ca-bell)")).join("")}
        <g data-catch-plumes opacity="0" filter="url(#vx-ca-glow)">
          <ellipse class="vx-flicker" cx="0" cy="94" rx="24" ry="11" fill="rgba(255,180,80,.42)"/>
          <path d="M-16 84 L16 84 L8 176 L-8 176 Z" fill="url(#vx-ca-plume)"/>
        </g>
      </g>
      ${m(318,374,"MISS \u2192 CONTROLLED SPLASH")}
      <text x="16" y="392" fill="#8a8074" font-size="10" font-family="IBM Plex Mono,ui-monospace,monospace">Original diagram \xB7 not to scale \xB7 F5 clocks</text>
    </svg>`}function N(t,e,o,{dark:a=!1,sensors:i=!1,scale:r=1}={}){const l=a?["#2a3038","#5a646e","#14181c"]:["#b4bcc4","#e8eef2","#6a727a"],n=a?"#3a424c":"#d8dee4";return`<g transform="translate(${e} ${o}) scale(${r})">
      <defs>
        <linearGradient id="vx-${t}-paint" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${l[1]}"/><stop offset=".42" stop-color="${l[0]}"/><stop offset="1" stop-color="${l[2]}"/>
        </linearGradient>
        <linearGradient id="vx-${t}-glass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#9ad0ff"/><stop offset=".55" stop-color="#2a4a62"/><stop offset="1" stop-color="#0c1822"/>
        </linearGradient>
        <radialGradient id="vx-${t}-beam" cx="0%" cy="50%" r="90%">
          <stop offset="0" stop-color="rgba(255,240,210,.32)"/><stop offset="1" stop-color="rgba(255,220,160,0)"/>
        </radialGradient>
      </defs>
      <ellipse cx="104" cy="70" rx="94" ry="6" fill="#000" opacity=".4"/>
      ${i?`<path d="M196 36 L268 12 L274 56 L196 48 Z" fill="url(#vx-${t}-beam)"/>`:""}
      <path d="M10 50
        C14 40 26 34 42 32
        C58 22 78 14 104 12
        C132 10 154 16 170 24
        C184 30 194 38 200 46
        L206 50 L206 58
        C206 61 202 63 194 63
        H176
        C172 63 166 54 158 54
        C150 54 144 63 140 63
        H68
        C64 63 58 54 50 54
        C42 54 36 63 32 63
        H16
        C8 63 6 60 6 56
        C6 53 8 50 10 50 Z" fill="url(#vx-${t}-paint)"/>
      <path d="M62 30 C80 16 118 14 152 24 C160 28 166 34 170 40 H66 C63 36 62 32 62 30 Z" fill="#0c1218"/>
      <path d="M68 31 C86 18 120 16 148 25 C154 28 158 33 160 38 H72 C69 35 68 33 68 31 Z" fill="url(#vx-${t}-glass)" opacity=".7"/>
      <path d="M108 14 V40" stroke="rgba(8,10,14,.55)" stroke-width="1.6"/>
      <path d="M18 49 H188" stroke="${a?"#1a2026":"#9aa3ad"}" stroke-width="1.1" opacity=".4"/>
      <rect x="86" y="42" width="12" height="2.4" rx="1" fill="${n}"/>
      <rect x="128" y="42" width="12" height="2.4" rx="1" fill="${n}"/>
      <path d="M58 34 L50 28 L54 34 Z" fill="${a?"#1c2228":"#c4ccd4"}"/>
      <g>
        <circle cx="50" cy="58" r="15.5" fill="#0a0c0e"/>
        <circle cx="50" cy="58" r="10.2" fill="#2c3036"/>
        <circle cx="50" cy="58" r="4" fill="#8a9098"/>
        <path d="M50 48 V68 M40 58 H60" stroke="#4a5058" stroke-width="1.1"/>
        <circle cx="158" cy="58" r="15.5" fill="#0a0c0e"/>
        <circle cx="158" cy="58" r="10.2" fill="#2c3036"/>
        <circle cx="158" cy="58" r="4" fill="#8a9098"/>
        <path d="M158 48 V68 M148 58 H168" stroke="#4a5058" stroke-width="1.1"/>
      </g>
      <rect x="188" y="44" width="18" height="5" rx="1.5" fill="#f6f1e4"/>
      <rect x="8" y="46" width="16" height="4.2" rx="1.2" fill="#e31937"/>
      <path d="M190 42 C200 39 210 44 214 49" stroke="#f6f1e4" stroke-width="1.8" fill="none" opacity=".75"/>
    </g>`}function L(t,e,o,a){return Array.from({length:a},(i,r)=>Array.from({length:o},(l,n)=>{if((r*5+n*3)%4===0)return"";const s=(r+n)%3!==1;return`<rect x="${t+n*5}" y="${e+r*7}" width="3" height="4.2" fill="${s?(r+n)%5===0?"#f0d080":"#9ec8ff":"#1a222c"}" opacity="${s?.55:.25}"/>`}).join("")).join("")}function U(){return`<svg viewBox="0 0 560 400" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Collision Evasion: HW4 can re-engage Supervised FSD">
      <defs>
        <linearGradient id="vx-ev-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#070b12"/><stop offset=".62" stop-color="#121820"/><stop offset="1" stop-color="#1a222c"/>
        </linearGradient>
        <linearGradient id="vx-ev-road" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#2a3038"/><stop offset="1" stop-color="#12161c"/>
        </linearGradient>
        <linearGradient id="vx-ev-wet" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="rgba(255,240,210,.08)"/><stop offset="1" stop-color="rgba(255,240,210,0)"/>
        </linearGradient>
        <radialGradient id="vx-ev-lamp" cx="50%" cy="0%" r="70%">
          <stop offset="0" stop-color="rgba(255,220,150,.2)"/><stop offset="1" stop-color="rgba(255,200,120,0)"/>
        </radialGradient>
      </defs>
      <rect width="560" height="400" fill="url(#vx-ev-sky)"/>
      <rect x="18" y="78" width="36" height="168" fill="#141820"/>
      <rect x="62" y="118" width="28" height="128" fill="#10141a"/>
      <rect x="168" y="64" width="48" height="182" fill="#161c24"/>
      <rect x="226" y="96" width="32" height="150" fill="#10161c"/>
      <rect x="340" y="72" width="40" height="174" fill="#141820"/>
      <rect x="388" y="108" width="26" height="138" fill="#10141a"/>
      <rect x="470" y="86" width="44" height="160" fill="#161c24"/>
      ${L(22,86,6,14)}
      ${L(172,72,8,16)}
      ${L(344,80,6,14)}
      ${L(476,94,7,13)}
      <g>
        <rect x="118" y="196" width="3" height="50" fill="#2a3038"/>
        <circle cx="119.5" cy="194" r="4" fill="#ffe6be"/>
        <ellipse cx="120" cy="210" rx="28" ry="40" fill="url(#vx-ev-lamp)"/>
        <rect x="292" y="188" width="3" height="58" fill="#2a3038"/>
        <circle cx="293.5" cy="186" r="4" fill="#ffe6be"/>
        <ellipse cx="294" cy="206" rx="32" ry="44" fill="url(#vx-ev-lamp)"/>
        <rect x="508" y="200" width="3" height="46" fill="#2a3038"/>
        <circle cx="509.5" cy="198" r="4" fill="#ffe6be"/>
      </g>
      <rect x="0" y="246" width="560" height="154" fill="url(#vx-ev-road)"/>
      <path d="M0 246 H560" stroke="#4a525c" stroke-width="3"/>
      <path d="M0 248 H560" stroke="#1a1e24" stroke-width="1"/>
      <path d="M18 318 H542" stroke="#c4b060" stroke-width="3.2" stroke-dasharray="24 18"/>
      <path d="M0 388 H560" stroke="#3a424c" stroke-width="2"/>
      <rect x="0" y="250" width="560" height="70" fill="url(#vx-ev-wet)"/>
      <g data-ev-threat>
        ${N("th",332,236,{dark:!0})}
        ${m(352,224,"AHEAD","#e2c48a")}
      </g>
      <g data-ev-car>
        ${N("me",28,248,{sensors:!0})}
        <g data-ev-driver transform="translate(146 274)">
          <ellipse rx="7" ry="8" fill="#1a1c20"/>
          <ellipse cy="14" rx="9" ry="8" fill="#2a3038"/>
        </g>
        <g data-ev-badge>
          <rect x="132" y="226" width="54" height="18" rx="9" fill="#1b3d2a"/>
          <text x="142" y="239" fill="#7dcea0" font-size="11" font-family="IBM Plex Mono,ui-monospace,monospace">FSD</text>
        </g>
      </g>
      <text x="16" y="386" fill="#8a8074" font-size="10" font-family="IBM Plex Mono,ui-monospace,monospace">Original diagram \xB7 not a crash test \xB7 SAE Level 2</text>
    </svg>`}function F(t,e,o){return t+(e-t)*o}function V(t){return Math.max(0,Math.min(1,t))}function u(t,e,o){return V((t-e)/(o-e))}function $(t,e){let o=0;return t.forEach((a,i)=>{e>=a.at-.08&&(o=i)}),t[o]}function E(t,e,o){const a=$(e,o);t.querySelectorAll("[data-vx-step]").forEach((n,s)=>n.classList.toggle("is-on",e[s]===a));const i=t.querySelector("[data-vx-caption]"),r=t.querySelector("[data-vx-callout]"),l=t.querySelector("[data-vx-clock]");i&&a&&(i.textContent=a.caption),r&&a&&(r.textContent=a.callout),l&&a&&(l.textContent=a.clock||"")}function _(t,e){t.querySelectorAll("[data-vx-step]").forEach((o,a)=>{const i=e[a];if(!i)return;const r=o.querySelector("b"),l=o.querySelector("span");r&&(r.textContent=i.title),l&&(l.textContent=i.text)})}function C(t,e,o){_(t,e),t.querySelectorAll("[data-vx-step]").forEach((a,i)=>{a.addEventListener("click",()=>o.set(e[i].at))})}function X(t){const e=t.querySelector("[data-vx-diagram]"),o=t.querySelector("[data-vx-mode]");e.innerHTML=R();let a=!0;const i=e.querySelector("[data-hot-ship]"),r=e.querySelector("[data-hot-stack]"),l=e.querySelector("[data-hot-ring]"),n=e.querySelector("[data-hot-vents]"),s=e.querySelector("[data-hot-ship-plumes]"),d=e.querySelector("[data-hot-booster-plumes]"),f=e.querySelector("[data-hot-booster]"),x=e.querySelector("[data-hot-coast]"),h=M(t,{onTick:c=>{if(a){const g=u(c,.3,.46),y=u(c,.48,.72),k=u(c,.7,1),et=1-u(c,.2,.4)*.35;s.setAttribute("opacity",String(g)),n.setAttribute("opacity",String(u(c,.22,.38))),d.setAttribute("opacity",String(.35+et*.65)),x==null||x.setAttribute("opacity","0"),i.setAttribute("transform",`translate(0 ${(-y*56).toFixed(1)})`),l.setAttribute("transform",`translate(0 ${(-y*10).toFixed(1)})`),f.setAttribute("transform",`rotate(${(-k*20).toFixed(1)} 200 400)`),r.setAttribute("transform",`translate(0 ${(-c*8).toFixed(1)})`)}else{const g=u(c,.22,.34),y=u(c,.4,.58),k=u(c,.58,.74);s.setAttribute("opacity",String(k)),n.setAttribute("opacity","0"),d.setAttribute("opacity",String(1-g)),x==null||x.setAttribute("opacity",String(y*(1-k))),i.setAttribute("transform",`translate(0 ${(-y*36).toFixed(1)})`),l.setAttribute("transform","translate(0 0)"),f.setAttribute("transform",`rotate(${(-u(c,.7,1)*14).toFixed(1)} 200 400)`),r.setAttribute("transform",`translate(0 ${(-c*6).toFixed(1)})`)}E(t,p.hot.steps,c)},initial:.44,labels:c=>{const g=$(p.hot.steps,c);return(a?"Hot staging":"Cold staging")+(g!=null&&g.clock?" \xB7 "+g.clock:"")+" \xB7 "+Math.round(c*100)+"%"}});o==null||o.addEventListener("click",()=>{a=!a,o.textContent=a?"Show cold staging":"Show hot staging",o.setAttribute("aria-pressed",a?"false":"true"),h.set(a?.44:.66)}),C(t,p.hot.steps,h)}function z(t){const e=t.querySelector("[data-vx-diagram]");e.innerHTML=I();const o=e.querySelector("[data-catch-booster]"),a=e.querySelector("[data-catch-plumes]"),i=e.querySelector('[data-arm="l"]'),r=e.querySelector('[data-arm="r"]'),n=M(t,{onTick:s=>{const d=F(430,196,u(s,.08,.82)),f=F(90,180,u(s,0,.86)),x=F(-16,0,u(s,.28,.62)),b=u(s,.42,.58)*(1-u(s,.78,.92)),h=u(s,.8,.96);o.setAttribute("transform",`translate(${d.toFixed(1)} ${f.toFixed(1)}) rotate(${x.toFixed(1)})`),a.setAttribute("opacity",String(b)),i.setAttribute("transform",`translate(${(h*18).toFixed(1)} 0)`),r.setAttribute("transform",`translate(${(h*18).toFixed(1)} 0)`),E(t,p.catch.steps,s)},initial:.72,labels:s=>{const d=$(p.catch.steps,s);return((d==null?void 0:d.clock)||(s<.35?"Boostback":s<.7?"Landing burn":"Catch"))+" \xB7 "+Math.round(s*100)+"%"}});C(t,p.catch.steps,n)}function Y(t){const e=t.querySelector("[data-vx-a]"),o=t.querySelector("[data-vx-b]"),a=t.querySelector("[data-vx-flags]"),i=t.querySelector("[data-vx-stack-note]"),r=p.fsd.stacks,l=(s,d)=>{s.innerHTML=r.map(f=>`<option value="${v(f.id)}"${f.id===d?" selected":""}>${v(f.label)} \xB7 ${v(f.version)}</option>`).join("")};l(e,"us-hw4"),l(o,"eu");const n=()=>{const s=r.find(f=>f.id===e.value),d=r.find(f=>f.id===o.value);!s||!d||(a.innerHTML=`<div class="vx-flag vx-flag-h"><span>Feature</span><span>${v(s.short)}</span><span>${v(d.short)}</span></div>`+p.fsd.flags.map(f=>{const x=s.features[f.id],b=d.features[f.id];return`<div class="vx-flag"><span>${v(f.label)}</span>
            <span class="vx-pill ${x?"on":"off"}">${x?"On":"Off"}</span>
            <span class="vx-pill ${b?"on":"off"}">${b?"On":"Off"}</span></div>`}).join(""),i.innerHTML=`<p><strong>${v(s.name)}</strong> \u2014 ${v(s.text)} <a href="${v(s.src)}" rel="noopener">Source</a></p>
        <p><strong>${v(d.name)}</strong> \u2014 ${v(d.text)} <a href="${v(d.src)}" rel="noopener">Source</a></p>`)};e.addEventListener("change",n),o.addEventListener("change",n),n()}function Q(t){const e=t.querySelector("[data-vx-diagram]");e.innerHTML=U();const o=e.querySelector("[data-ev-car]"),a=e.querySelector("[data-ev-threat]"),i=e.querySelector("[data-ev-driver]"),r=e.querySelector("[data-ev-badge] rect"),l=e.querySelector("[data-ev-badge] text");let n="hw4";const s=()=>n==="hw4",d=h=>{const c=u(h,.28,.4),g=u(h,.45,.78),y=s()?u(h,.7,.9):0;o.setAttribute("transform",`translate(${(g*70+y*36).toFixed(1)} ${(-y*6).toFixed(1)}) rotate(${(-y*4).toFixed(1)})`),a.setAttribute("transform",`translate(${(-g*40).toFixed(1)} 0)`),i.setAttribute("transform",`translate(146 274) rotate(${(c*28-y*28).toFixed(1)})`);const k=h<.32||y>.15;!s()&&h>=.62?(r.setAttribute("fill","#3a3030"),l.setAttribute("fill","#c98a8a"),l.textContent="NO"):(r.setAttribute("fill",k?"#1b3d2a":"#3a3030"),l.setAttribute("fill",k?"#7dcea0":"#c98a8a"),l.textContent=k?"FSD":"OFF"),E(t,p.evasion.steps,h)},f=t.querySelector("[data-vx-mode-note]"),x=()=>{const h=p.evasion.modes.find(c=>c.id===n);f&&h&&(f.textContent=h.id==="hw4"?"HW4 in North America (14.3.11 / 14.3.12) can re-engage Supervised FSD for an imminent frontal crash, or an unintentional drop.":h.id==="hw3"?"HW3 Lite: parking, unparking, start-from-park. Distilled from HW4. No Collision Evasion \u2014 the re-engage step does not exist.":"Europe 14.2: Assisted Driving Basic on 2026.33.100. Same week as US 14.3.11, still on 14.2. Collision Evasion is North America only.")},b=M(t,{onTick:d,initial:.76,labels:h=>{const c=p.evasion.modes.find(y=>y.id===n),g=$(p.evasion.steps,h);return(c?c.label:n)+(g!=null&&g.clock?" \xB7 "+g.clock:"")+" \xB7 "+Math.round(h*100)+"%"}});x(),t.querySelectorAll("[data-vx-hw]").forEach(h=>{h.addEventListener("click",()=>{n=h.getAttribute("data-vx-hw"),t.querySelectorAll("[data-vx-hw]").forEach(c=>c.setAttribute("aria-pressed",c===h?"true":"false")),x(),b.set(.76)})}),C(t,p.evasion.steps,b)}function K(t,e){const o=t.querySelector("[data-vx-copy]");o==null||o.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(j(e.id)),o.textContent="Copied",setTimeout(()=>{o.textContent="Copy link"},1400)}catch(a){o.textContent="Copy failed"}})}document.querySelectorAll("[data-vx-piece]").forEach(t=>{const e=t.getAttribute("data-vx-piece"),o=p.items.find(a=>a.id===e);o&&(e==="hot-staging"&&X(t),e==="catch"&&z(t),e==="fsd"&&Y(t),e==="evasion"&&Q(t),K(t,o))});let w="spacex";function T(t,{scrollId:e}={}){w=t==="tesla"?"tesla":"spacex";const o=p.tabs[w];if(q&&(q.textContent=o.kicker),W&&(W.textContent=o.lede),document.documentElement.setAttribute("data-vx-tab",w),document.querySelectorAll("button[data-vx-tab]").forEach(a=>{const i=a.getAttribute("data-vx-tab")===w;a.setAttribute("aria-selected",i?"true":"false"),a.setAttribute("tabindex",i?"0":"-1")}),document.querySelectorAll("[data-vx-pane]").forEach(a=>{const i=a.getAttribute("data-vx-pane")===w;a.hidden=!i}),document.querySelectorAll("[data-vx-jump]").forEach(a=>{a.hidden=a.getAttribute("data-vx-jump")!==w}),document.querySelectorAll("[data-vx-cards]").forEach(a=>{a.hidden=a.getAttribute("data-vx-cards")!==w}),G.forEach(a=>{const i=a.root.closest("[data-vx-pane]");i&&i.hidden&&a.stop()}),O(),e){const a=document.getElementById(e);a==null||a.scrollIntoView({block:"start"})}}function J(t){const e=String(t||"").replace(/^#/,"");if(e==="tesla"||e==="spacex")return e;const o=p.items.find(a=>a.id===e);return o?o.tab:"spacex"}const tt=()=>document.querySelectorAll("[data-vx-jump]:not([hidden]) a"),O=()=>{var i;const t=document.querySelector(`[data-vx-pane="${w}"]`),e=t?[...t.querySelectorAll("[data-vx-piece]")]:[],o=window.scrollY+140;let a=(i=e[0])==null?void 0:i.id;e.forEach(r=>{r.offsetTop<=o&&(a=r.id)}),tt().forEach(r=>r.classList.toggle("is-on",r.getAttribute("href")==="#"+a))};window.addEventListener("scroll",O,{passive:!0}),document.querySelectorAll("button[data-vx-tab]").forEach(t=>{t.addEventListener("click",()=>{const e=t.getAttribute("data-vx-tab");location.hash.replace("#","")!==e?location.hash=e:T(e)}),t.addEventListener("keydown",e=>{var a;if(e.key!=="ArrowRight"&&e.key!=="ArrowLeft"&&e.key!=="ArrowDown"&&e.key!=="ArrowUp")return;e.preventDefault();const o=w==="spacex"?"tesla":"spacex";location.hash.replace("#","")!==o?location.hash=o:T(o),(a=document.querySelector(`button[data-vx-tab="${o}"]`))==null||a.focus()})});const Z=()=>{var a;const t=location.hash.replace("#",""),e=J(location.hash),o=p.items.some(i=>i.id===t);T(e,{scrollId:o?t:null}),(!t||t==="spacex"||t==="tesla")&&((a=document.querySelector(".vx-tabs"))==null||a.scrollIntoView({block:"start"}))};window.addEventListener("hashchange",Z),Z()})();
