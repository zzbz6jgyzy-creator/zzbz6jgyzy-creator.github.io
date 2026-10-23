"""Original, source-checked schematic artwork. Coordinates are illustrative, never telemetry."""
import html
import json

def svg(name, prefix='scene', cover=False):
    p=prefix
    defs=f'''<defs>
      <linearGradient id="{p}-metal"><stop stop-color="#69727d"/><stop offset=".24" stop-color="#f0f1ef"/><stop offset=".55" stop-color="#a2abb4"/><stop offset="1" stop-color="#404853"/></linearGradient>
      <linearGradient id="{p}-glass" x2="0" y2="1"><stop stop-color="#33434d"/><stop offset="1" stop-color="#0c141c"/></linearGradient>
      <linearGradient id="{p}-plume" x2="0" y2="1"><stop stop-color="#fff0c8"/><stop offset=".35" stop-color="#e69b56"/><stop offset="1" stop-color="#e31937" stop-opacity="0"/></linearGradient>
      <pattern id="{p}-grid" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M36 0H0V36" fill="none" stroke="#ffffff" stroke-opacity=".045"/></pattern>
      <marker id="{p}-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0L6 3L0 6" fill="none" stroke="#e84d62" stroke-width="1.5"/></marker>
    </defs>'''
    def line(d,colour='#e84d62',dash=''):
        return f'<path d="{d}" fill="none" stroke="{colour}" stroke-width="2" stroke-dasharray="{dash}" marker-end="url(#{p}-arrow)"/>'
    def label(x,y,text,small=False):
        return f'<text x="{x}" y="{y}" fill="#e6e9ee" font-family="Inter,Arial,sans-serif" font-size="{18 if small else 27}" font-weight="500">{html.escape(text)}</text>'
    def poses(values):return html.escape(json.dumps(values),quote=True)
    def tag(n,x,y):
        return f'<circle cx="{x}" cy="{y}" r="16" fill="#e31937"/><text x="{x}" y="{y+6}" text-anchor="middle" fill="white" font-family="Inter,Arial,sans-serif" font-weight="700" font-size="18">{n}</text>'
    def flame(x,y,width=36,height=80):
        return f'<path d="M{x-width/2} {y}Q{x} {y+height*1.8} {x+width/2} {y}Z" fill="url(#{p}-plume)"/>'
    def car(x,y,red=False,scale=1):
        return f'''<g transform="translate({x} {y}) scale({scale})"><rect x="-45" y="-86" width="90" height="172" rx="29" fill="url(#{p}-metal)" stroke="#c5cdd4"/><path d="M-31-37Q0-59 31-37L34 31Q0 46-34 31Z" fill="url(#{p}-glass)" stroke="#728390"/><path d="M-35-62L-18-68M18-68L35-62" stroke="#faf7ea" stroke-width="5"/><path d="M-36 65L-20 72M20 72L36 65" stroke="{'#f65063' if red else '#752b35'}" stroke-width="6"/><path d="M0-28V26" stroke="#60717d"/><rect x="-49" y="-47" width="6" height="30" rx="3" fill="#101318"/><rect x="43" y="-47" width="6" height="30" rx="3" fill="#101318"/><rect x="-49" y="40" width="6" height="30" rx="3" fill="#101318"/><rect x="43" y="40" width="6" height="30" rx="3" fill="#101318"/></g>'''
    if name=='hot-staging':
        ship=f'''<g data-cold-poses="{poses(['translate(0 0)','translate(0 0)','translate(0 -36)','translate(0 -60)','translate(0 -60)'])}" data-poses="{poses(['translate(0 0)','translate(0 0)','translate(0 0)','translate(0 -36)','translate(0 -60)'])}">
          <path d="M165 200V103Q165 52 207 28Q249 52 249 103V200Z" fill="url(#{p}-metal)" stroke="#c6ced4"/><path d="M169 119L147 139V164L168 150M245 119L267 139V164L246 150" fill="#7e8994" stroke="#bac2ca"/><path d="M169 174L143 194V218L171 205M245 174L271 194V218L243 205" fill="#717c88" stroke="#b4bcc5"/>
          <path d="M181 200L176 213H192L188 200M204 200L199 213H215L211 200M227 200L222 213H238L234 200" fill="#565f69"/>
          <g data-show="2 3 4" data-mode-only="hot">{flame(207,211,55,85)}</g>
          <g data-show="3 4" data-mode-only="cold">{flame(207,211,55,85)}</g>
        </g>'''
        booster=f'''<g data-cold-poses="{poses(['translate(0 0)','translate(0 0)','translate(0 16)','translate(0 35)','translate(0 35)'])}" data-poses="{poses(['translate(0 0)','translate(0 0)','translate(0 0)','translate(0 16)','translate(0 35)'])}"><rect x="156" y="222" width="102" height="189" rx="9" fill="url(#{p}-metal)" stroke="#bdc5ce"/>
          {''.join(f'<path d="M157 {y}H257" stroke="#36414c" stroke-opacity=".7"/>' for y in range(240,405,19))}
          <path d="M156 241L138 248V275L156 268M258 241L276 248V275L258 268" fill="#77828d" stroke="#d0d5d8"/><path d="M165 412L160 428H182L177 412M200 412L195 428H217L212 412M235 412L230 428H252L247 412" fill="#454e59"/>
          <g data-show="0">{flame(207,427,80,65)}</g><g data-show="1 2" data-mode-only="hot">{flame(207,427,24,42)}</g></g>'''
        body=f'''{booster}{ship}<rect x="151" y="214" width="112" height="27" rx="5" fill="#21171b" stroke="#e84d62" stroke-width="3"/>
          {''.join(f'<path d="M{x} 218V237" stroke="#e84d62" stroke-width="3"/>' for x in range(163,258,13))}
          <path d="M273 227L386 169" fill="none" stroke="#8c98a5" stroke-dasharray="5 5"/>
          <rect x="382" y="103" width="287" height="276" rx="24" fill="#121820" stroke="#65717e"/>
          {label(402,81,'The staging joint')}
          <path d="M461 124H588V175H461Z" fill="url(#{p}-metal)"/><path d="M488 176L477 210H507L500 176M546 176L535 210H565L558 176" fill="#6d7885" stroke="#a6b0bb"/>
          <path d="M432 211V326H476V283H573V326H617V211" fill="none" stroke="#aab5c0" stroke-width="9"/>
          <path d="M449 326H602" stroke="#5a6572" stroke-width="9"/>
          <g data-show="2 3" data-mode-only="hot">{flame(521,209,74,106)}{line('M512 263H402')}{line('M539 263H652')}</g>
          <g data-show="2" data-mode-only="cold"><path d="M475 237H575" stroke="#e6c38a" stroke-width="2" stroke-dasharray="5 5"/>{label(475,274,'Coast',True)}</g>
          {label(52,92,'Ship')}{line('M98 102H153','#8c98a5')}{label(42,360,'Booster')}{line('M133 353H151','#8c98a5')}
          {tag(1,284,128)}{tag(2,281,228)}{tag(3,282,360)}
          {label(413,356,'Exhaust route',True)}'''
    elif name=='catch':
        tower=f'''<path d="M87 66H133V419H87Z" fill="#252f3b" stroke="#a9b6c3" stroke-width="2"/>{''.join(f'<path d="M89 {y}L131 {y+29}M131 {y}L89 {y+29}" stroke="#69798a"/>' for y in range(70,395,31))}<path d="M71 419H153" stroke="#a9b6c3" stroke-width="5"/>
          <path d="M128 236H258M128 258H258" stroke="#c4c9cd" stroke-width="9"/><path d="M137 236H253M137 258H253" stroke="#e84d62" stroke-width="3"/>'''
        body=f'''{tower}<path d="M41 426H341" stroke="#7b8997" stroke-width="2"/>
          <path d="M242 85V422" stroke="#8d9aa7" stroke-dasharray="4 7"/>
          <g data-poses="{poses(['translate(266 83) rotate(12)','translate(251 122)','translate(235 170)','translate(223 206)','translate(223 206)'])}"><rect x="-24" y="-14" width="48" height="170" rx="7" fill="url(#{p}-metal)" stroke="#cbd2d9"/><path d="M-28 29H28" stroke="#e84d62" stroke-width="7"/><path d="M-24 12L-38 17V35L-24 29M24 12L38 17V35L24 29" fill="#74818f" stroke="#bcc5cd"/><path d="M-16 156L-20 166H20L16 156" fill="#4e5965"/><g data-show="2 3">{flame(0,166,42,67)}</g></g>
          {label(55,49,'Elevation')}{label(421,49,'From above')}
          <rect x="389" y="76" width="282" height="307" rx="24" fill="#121820" stroke="#65717e"/>
          <circle cx="536" cy="219" r="103" fill="none" stroke="#51606f" stroke-dasharray="4 7"/><path d="M418 219H654M536 100V338" stroke="#586675" stroke-dasharray="4 7"/>
          <path d="M419 187H574M419 251H574" stroke="#c8cdd2" stroke-width="10"/>
          <g data-poses="{poses(['translate(608 138)','translate(582 170)','translate(554 200)','translate(536 219)','translate(536 219)'])}"><circle r="33" fill="url(#{p}-metal)" stroke="#dce2e6" stroke-width="2"/><circle r="12" fill="#26323d"/><path d="M-43 0H43" stroke="#e84d62" stroke-width="5"/></g>
          <g data-show="4">{line('M539 187H440')}{line('M539 251H440')}</g>
          {label(431,354,'Alignment',True)}{tag(1,162,92)}{tag(2,363,220)}{tag(3,163,286)}'''
    elif name=='fsd':
        body=f'''<rect x="72" y="45" width="239" height="389" rx="20" fill="#141b23" stroke="#4d5a68"/><path d="M107 57V420M277 57V420" stroke="#8c98a5" stroke-dasharray="18 15"/>
          <g data-show="1 2 3 4"><path d="M191 183L116 76H266Z" fill="#e31937" fill-opacity=".14" stroke="#e84d62" stroke-opacity=".4"/><path d="M151 245L93 203V308Z" fill="#e31937" fill-opacity=".1"/><path d="M231 245L291 203V308Z" fill="#e31937" fill-opacity=".1"/></g>
          {car(191,246)}<circle cx="191" cy="170" r="5" fill="#f17a87"/><circle cx="145" cy="229" r="5" fill="#f17a87"/><circle cx="237" cy="229" r="5" fill="#f17a87"/>
          {line('M242 246H373','#8c98a5')}
          <rect x="379" y="71" width="268" height="92" rx="16" fill="#1a222c" stroke="#8c98a5"/>{tag(1,403,95)}{label(430,113,'Hardware')}
          <g data-show="1 2 3 4"><rect x="395" y="148" width="236" height="4" rx="2" fill="#e31937"/></g>
          <rect x="379" y="191" width="268" height="92" rx="16" fill="#1a222c" stroke="#8c98a5"/>{tag(2,403,215)}{label(430,233,'Software')}
          <g data-show="2 3 4"><rect x="395" y="268" width="236" height="4" rx="2" fill="#e31937"/></g>
          <rect x="379" y="311" width="268" height="92" rx="16" fill="#1a222c" stroke="#8c98a5"/>{tag(3,403,335)}{label(430,353,'Region')}
          <g data-show="3 4"><rect x="395" y="388" width="236" height="4" rx="2" fill="#e31937"/></g>
          <path d="M513 165V189M513 285V309" stroke="#687686" stroke-width="2"/>
          <g data-show="4"><path d="M324 436H645" stroke="#e84d62" stroke-width="2"/>{label(367,462,'Driver supervision',True)}</g>'''
    else:
        body=f'''<rect x="51" y="50" width="410" height="380" rx="22" fill="#141b23" stroke="#5d6976"/><path d="M188 64V419M323 64V419" stroke="#94a0aa" stroke-width="2" stroke-dasharray="20 18"/>
          <path d="M68 70V412M445 70V412" stroke="#a4afb8" stroke-width="3"/>
          <g data-poses="{poses(['translate(254 117)','translate(254 117)','translate(254 133)','translate(254 147)','translate(254 147)'])}">{car(0,0,True,.62)}</g>
          <g data-show="1 2 3"><path d="M254 279L190 188H318Z" fill="#e31937" fill-opacity=".14" stroke="#e84d62" stroke-dasharray="4 5"/></g>
          {car(254,326,False,.78)}
          <g data-show="2 3"><path d="M227 215L254 168L281 215Z" fill="#e31937" stroke="#ffb7c0"/><text x="254" y="203" fill="white" text-anchor="middle" font-size="24" font-weight="700">!</text></g>
          <path d="M498 89H661M498 223H661M498 357H661" stroke="#5c6a79" stroke-width="2"/>
          {tag(1,519,126)}{label(546,135,'Detect')}
          {tag(2,519,260)}{label(546,269,'Warn')}
          {tag(3,519,394)}{label(546,403,'Assist')}
          <g data-show="1"><circle cx="519" cy="126" r="26" fill="none" stroke="#f65063" stroke-width="2"/></g>
          <g data-show="2"><circle cx="519" cy="260" r="26" fill="none" stroke="#f65063" stroke-width="2"/></g>
          <g data-show="3 4"><circle cx="519" cy="394" r="26" fill="none" stroke="#f65063" stroke-width="2"/></g>'''
    # Static HTML already has a complete, meaningful first frame before JS runs.
    import re
    initial=2 if cover else 0
    def visibility(m):
        tag=m.group(0);show=re.search(r'data-show="([^"]+)"',tag);mode=re.search(r'data-mode-only="([^"]+)"',tag)
        visible=(not show or str(initial) in show[1].split()) and (not mode or mode[1]=='hot')
        return tag[:-1]+f' opacity="{1 if visible else 0}">'
    body=re.sub(r'<g\b[^>]*(?:data-show|data-mode-only)=[^>]+>',visibility,body)
    body=re.sub(r'<g\b([^>]*?)data-poses="([^"]+)"([^>]*)>',lambda m:'<g'+m[1]+'data-poses="'+m[2]+'"'+m[3]+' transform="'+html.escape(json.loads(html.unescape(m[2]))[initial],quote=True)+'">',body)
    titles={'hot-staging':'Starship and an enlarged hot-staging joint','catch':'Booster return alignment, shown from the side and above','fsd':'Vehicle hardware, installed software and regional availability','evasion':'A developing road hazard and distinct warning and assistance functions'}
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 480" role="img" aria-labelledby="{p}-title {p}-desc"><title id="{p}-title">{titles[name]}</title><desc id="{p}-desc">Original educational schematic. Explanatory labels and a text description accompany the illustration. Not to scale.</desc>{defs}<rect width="720" height="480" rx="20" fill="#0b1119"/><rect width="720" height="480" rx="20" fill="url(#{p}-grid)"/>{body}</svg>'

def detail_svg(name,prefix):
    """Static companion figures; the adjacent HTML supplies data and interpretation."""
    esc=html.escape
    defs=f'<defs><marker id="{prefix}-arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0L6 3L0 6" fill="none" stroke="#ed5368" stroke-width="1.5"/></marker></defs>'
    def text(x,y,value,size=22,fill='#dce3eb'):return f'<text x="{x}" y="{y}" fill="{fill}" font-size="{size}" font-family="Inter,Arial,sans-serif">{esc(str(value))}</text>'
    if name=='forces':
        title='Simplified vertical braking force balance';desc='An upward thrust arrow and downward weight arrow on a descending booster. Upward net acceleration reduces downward velocity. Arrow lengths do not represent measured forces.'
        body='<rect x="315" y="138" width="90" height="220" rx="20" fill="#9faab5" stroke="#e1e6e9"/><path d="M360 137V48M360 360V443" stroke="#ed5368" stroke-width="4" marker-end="url(#'+prefix+'-arr)"/><path d="M208 165V330" stroke="#a9b7c8" stroke-width="3" stroke-dasharray="8 6"/>'
        body+=text(392,74,'Thrust T')+text(393,434,'Weight mg')+text(72,145,'Descending',20)+text(63,365,'Velocity downward',18)+text(44,45,'INSTANTANEOUS FORCE MODEL',18)+text(444,205,'Net acceleration',20)+text(444,237,'is upward when',20)+text(444,269,'T > mg',26,'#f67889')
    elif name=='cameras':
        title='Camera-position inventory for the cited US Model Y configuration';desc='Eight road-facing cameras: one front bumper, two windshield, two door pillar, two front fender and one rear. Cabin camera separate. Layout schematic, not viewing angles.'
        body='<rect x="283" y="60" width="154" height="360" rx="60" fill="#9da8b3" stroke="#e4e8eb"/><path d="M306 154Q360 119 414 154L414 296Q360 324 306 296Z" fill="#192b37"/>'
        points=[(360,67),(346,143),(374,143),(283,221),(437,221),(283,135),(437,135),(360,411)]
        body+=''.join(f'<circle cx="{x}" cy="{y}" r="7" fill="#f24761" stroke="#ffe1e7"/>' for x,y in points)
        body+=text(42,57,'US MODEL Y MANUAL',18)+text(465,78,'Front bumper ×1')+text(465,149,'Windshield ×2')+text(38,133,'Front fenders ×2')+text(42,226,'Door pillars ×2')+text(465,414,'Rear ×1')+text(58,467,'Cabin camera is separate · schematic positions',18)
        body+='<path d="M369 68H456M384 143H456M270 135H244M270 221H228M369 411H456" stroke="#6b7d8d" stroke-width="2"/>'
    else:
        title='Hypothetical delay and braking distances';desc='At 30, 60 and 90 kilometres per hour, model totals are 14.1, 39.8 and 77.1 metres. Assumes one-second delay and constant six metres per second squared deceleration. Not measured Tesla performance.'
        body=text(38,42,'ONE-SECOND DELAY · a = 6 m/s²',20)+text(38,77,'Chosen assumptions, not vehicle test results',18,'#aebac8')
        for i,kph in enumerate([30,60,90]):
            v=kph/3.6;delay=v;brake=v*v/12;scale=5.2;y=126+i*103
            body+=text(38,y+18,str(kph)+' km/h',22)+f'<rect x="166" y="{y}" width="{delay*scale:.2f}" height="30" rx="3" fill="#9aa9b9"/><rect x="{166+delay*scale:.2f}" y="{y}" width="{brake*scale:.2f}" height="30" rx="3" fill="#e31937"/>'+text(166,y+59,f'{delay+brake:.1f} m total',21)
        body+='<rect x="40" y="442" width="18" height="14" fill="#9aa9b9"/><rect x="340" y="442" width="18" height="14" fill="#e31937"/>'+text(70,455,'Delay travel',19)+text(370,455,'Braking travel',19)
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 480" role="img" aria-labelledby="{prefix}-title {prefix}-desc"><title id="{prefix}-title">{title}</title><desc id="{prefix}-desc">{desc}</desc>{defs}<rect width="720" height="480" rx="16" fill="#0b1119"/>{body}</svg>'
