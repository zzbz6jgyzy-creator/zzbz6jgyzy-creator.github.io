/* A floating-origin, physically scaled scene. The legacy Earth shaders stay shared with the replay; the explorer uses the physical ones. */
import * as THREE from '/vendor/three/three.module.min.js';
import * as M from './earth-cosmos-model.js?v=20261030-tour1';
import {galaxyBlend} from './earth-flight.js?v=20261030-tour1';
const BASE='/assets/cosmos/';
const matrixFromAxes=axes=>new THREE.Matrix4().makeBasis(...axes.map(v=>new THREE.Vector3(...v)));
const smooth=(a,b,x)=>{const t=THREE.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const BODY_VERTEX=`varying vec2 vUv;varying vec3 vN;varying vec3 vP;void main(){vUv=uv;vec4 p=modelMatrix*vec4(position,1.);vP=p.xyz;vN=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*p;}`;
const BODY_FRAGMENT=`uniform sampler2D uMap;uniform float uHasMap;uniform vec3 uColor;uniform vec3 uSun;uniform float uEmissive;uniform float uShOn;uniform vec3 uShDir;uniform vec3 uShEarth;uniform float uShUmbra;uniform float uShPenumbra;varying vec2 vUv;varying vec3 vN;varying vec3 vP;void main(){vec3 base=mix(uColor,texture2D(uMap,vUv).rgb,uHasMap);float mu=max(0.,dot(normalize(vN),uSun));vec3 c=base*mix(.008+1.18*mu,1.15,uEmissive);if(uShOn>0.5){vec3 d=vP-uShEarth;float along=dot(d,uShDir);if(along>0.){vec3 perp=d-uShDir*along;float r=length(perp);float f=r<uShUmbra?.18:r<uShPenumbra?mix(.18,1.,smoothstep(uShUmbra,uShPenumbra,r)):1.;c=mix(c*vec3(1.15,.45,.22)*.4,c,f);}}gl_FragColor=vec4(c,1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
const ECLIPSE_VERTEX=`varying vec3 vN;void main(){vN=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const ECLIPSE_FRAGMENT=`varying vec3 vN;uniform vec3 uMoon;uniform vec3 uSun;uniform float uOn;
void main(){if(uOn<0.5)discard;vec3 P=normalize(vN),dir=uMoon-uSun,target=P-uMoon;float d2=dot(dir,dir);if(d2<1e-12)discard;float u=dot(dir,target)/d2;if(u<=0.||dot(P,normalize(uSun))<=0.)discard;float r=length(u*dir-target);float sunR=109.1986,moonR=0.2727;float k=sunR-(1.+u)*(sunR-moonR),p=-sunR+(1.+u)*(sunR+moonR);float core=max(abs(k),0.);float f=1.;if(r<core&&k>0.)f=.12;else if(r<core&&k<=0.)f=.22;else if(r<p)f=mix(k>0.?.12:.22,1.,smoothstep(core,p,r));if(f>.985)discard;gl_FragColor=vec4(f,f,f,1.);}`;
const POINT_VERTEX=`attribute float aSize;varying vec3 vColor;uniform float uRatio;void main(){vColor=color;vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=aSize*uRatio;}`;
const POINT_FRAGMENT=`varying vec3 vColor;uniform float uOpacity;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;float core=exp(-d*d*13.);float halo=exp(-d*d*3.)*.16;gl_FragColor=vec4(vColor*(core+halo),uOpacity*(core+halo));
#include <colorspace_fragment>
}`;
// Schematic integrated starlight and dust, in kpc. The photograph is used only near the Sun.
const GALAXY_DISK=`varying vec2 vUv;uniform float uOpacity;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){float v=0.,w=.5;for(int i=0;i<4;i++){v+=noise(p)*w;p=mat2(.8,.6,-.6,.8)*p*2.07+13.2;w*=.5;}return v;}
void main(){
 vec2 p=(vUv-.5)*32.;float r=length(p),a=atan(p.y,p.x),barAngle=2.67;
 vec2 q=mat2(cos(barAngle),sin(barAngle),-sin(barAngle),cos(barAngle))*p;
 float bulge=exp(-r*1.25),bar=exp(-length(q*vec2(.42,1.7))*.85);
 float wave=a-log(max(r,1.)/3.)/tan(.225)-barAngle;
 float arms=(pow(.5+.5*cos(wave*2.),4.)*.7+pow(.5+.5*cos(wave*4.),5.)*.3)*smoothstep(2.,3.8,r);
 float structure=fbm(p*1.9),dust=smoothstep(.35,.7,fbm(p*3.1+4.))*arms;
 float disk=exp(-r*.19),fade=1.-smoothstep(13.,15.5,r);
 vec3 c=vec3(.27,.42,.69)*disk*(.025+arms*(.3+structure*.55));
 c+=vec3(1.,.7,.38)*(bulge*.85+bar*.13);c*=1.-dust*.72;
 c+=vec3(.25,.44,.7)*pow(max(0.,structure-.42)*2.8,3.)*arms*disk*.24;
 gl_FragColor=vec4(c*fade*uOpacity,fade*uOpacity);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;

export async function installCosmos({scene,camera,globe,atmosphere,clouds,renderer,onLabels=()=>{},onStatus=()=>{}}){
 const root=new THREE.Group();scene.add(root);
 const plane=new THREE.SphereGeometry(1,64,40),black=new THREE.DataTexture(new Uint8Array([180,180,180,255]),1,1);black.needsUpdate=true;
 const groupSolar=new THREE.Group(),groupStars=new THREE.Group(),groupGalaxy=new THREE.Group();root.add(groupSolar,groupStars,groupGalaxy);
 const system=new Map(),textures=new Map(),pending=new Set(),failedBodies=new Set(),failures=[];
 const eqFrame=new THREE.Matrix4(),galFrame=new THREE.Matrix4();
 let disposed=false,focus='Earth',level='earth',deepSky=false,physical=M.ephemeris(),lastEpoch=0,lastIso='',lastLabels=0,starsCount=0,galaxyCount=0,renderUnit=M.EARTH_RADIUS,currentRange=25000;
 let galaxy,skyMap,blendGalaxy=true,galacticCentre=[0,0,0];
 const grey=new THREE.Color('#bdc9d0');
 for(const b of M.BODIES){if(b.id==='Earth')continue;
  const uniforms={uMap:{value:black},uHasMap:{value:0},uColor:{value:new THREE.Color(b.color)},uSun:{value:new THREE.Vector3(1,0,0)},uEmissive:{value:b.id==='Sun'?1:0},uShOn:{value:0},uShDir:{value:new THREE.Vector3(0,1,0)},uShEarth:{value:new THREE.Vector3()},uShUmbra:{value:0},uShPenumbra:{value:0}};
  const mesh=new THREE.Mesh(plane,new THREE.ShaderMaterial({vertexShader:BODY_VERTEX,fragmentShader:BODY_FRAGMENT,uniforms}));mesh.name=b.id;groupSolar.add(mesh);system.set(b.id,{body:b,mesh,uniforms});
 }
 const ring=new THREE.Mesh(new THREE.RingGeometry(1.24,2.32,160),new THREE.MeshBasicMaterial({color:'#c8b58e',side:THREE.DoubleSide,transparent:true,opacity:.72,depthWrite:false}));
 const ringUV=ring.geometry.getAttribute('uv'),rp=ring.geometry.getAttribute('position');for(let i=0;i<rp.count;i++)ringUV.setXY(i,(Math.hypot(rp.getX(i),rp.getY(i))-1.24)/(2.32-1.24),.5);
 ring.rotation.x=-Math.PI/2;system.get('Saturn').mesh.add(ring);
 const earthEclipseUniforms={uMoon:{value:new THREE.Vector3()},uSun:{value:new THREE.Vector3(1,0,0)},uOn:{value:0}};
 const earthEclipse=new THREE.Mesh(plane,new THREE.ShaderMaterial({vertexShader:ECLIPSE_VERTEX,fragmentShader:ECLIPSE_FRAGMENT,uniforms:earthEclipseUniforms,transparent:true,depthWrite:false,blending:THREE.MultiplyBlending,toneMapped:false}));
 earthEclipse.scale.setScalar(1.011);earthEclipse.renderOrder=3;earthEclipse.frustumCulled=false;globe.add(earthEclipse);
 const glowNames=['Earth',...system.keys()],glowN=glowNames.length,glowPos=new Float32Array(glowN*3),glowCol=new Float32Array(glowN*3),glowSize=new Float32Array(glowN);
 glowNames.forEach((id,i)=>{const c=new THREE.Color(id==='Earth'?'#a9deef':system.get(id).body.color);glowCol.set([c.r,c.g,c.b],i*3);});
 const glowGeo=new THREE.BufferGeometry();glowGeo.setAttribute('position',new THREE.BufferAttribute(glowPos,3));glowGeo.setAttribute('color',new THREE.BufferAttribute(glowCol,3));glowGeo.setAttribute('aSize',new THREE.BufferAttribute(glowSize,1));
 const glowMat=new THREE.ShaderMaterial({uniforms:{uRatio:{value:1},uOpacity:{value:1}},vertexShader:POINT_VERTEX,fragmentShader:POINT_FRAGMENT,vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
 const glows=new THREE.Points(glowGeo,glowMat);glows.frustumCulled=false;groupSolar.add(glows);
 const orbitGroup=new THREE.Group();groupSolar.add(orbitGroup);
 const orbitMaterial=new THREE.LineBasicMaterial({color:'#96a8bd',transparent:true,opacity:.18,depthWrite:false});
 let orbitReady=false;
 function ensureOrbits(){if(orbitReady||disposed)return;orbitReady=true;for(const b of M.BODIES.filter(b=>b.period&&b.id!=='Moon')){
  const points=M.orbit(b.id).map(p=>new THREE.Vector3(...p.map(n=>n/M.AU)));orbitGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),orbitMaterial));
 }}
 const pop=M.galaxyPopulation(innerWidth<800?48000:150000);galaxyCount=pop.sizes.length;
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(pop.positions,3));geometry.setAttribute('color',new THREE.BufferAttribute(pop.colors,3));geometry.setAttribute('aSize',new THREE.BufferAttribute(pop.sizes,1));
 const galMaterial=new THREE.ShaderMaterial({uniforms:{uRatio:{value:1},uOpacity:{value:0}},vertexShader:POINT_VERTEX,fragmentShader:POINT_FRAGMENT,vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
 galaxy=new THREE.Points(geometry,galMaterial);groupGalaxy.add(galaxy);
 // Continuous low-frequency light under the stellar population: bar, bulge, dust lanes.
 const disk=new THREE.Mesh(new THREE.PlaneGeometry(32,32),new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,uniforms:{uOpacity:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:GALAXY_DISK }));groupGalaxy.add(disk);
 const skyUniforms={uMap:{value:black},uHasMap:{value:0},uWorldToGal:{value:new THREE.Matrix3()},uExposure:{value:.035},uOpacity:{value:1}};
 const sky=new THREE.Mesh(new THREE.SphereGeometry(1,64,40),new THREE.ShaderMaterial({uniforms:skyUniforms,side:THREE.BackSide,depthWrite:false,vertexShader:'varying vec3 vDir;void main(){vDir=mat3(modelMatrix)*position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position.z=gl_Position.w*.99999;}',fragmentShader:`uniform sampler2D uMap;uniform mat3 uWorldToGal;uniform float uHasMap;uniform float uExposure;uniform float uOpacity;varying vec3 vDir;void main(){vec3 d=normalize(uWorldToGal*vDir);vec2 uv=vec2(.5-atan(d.y,d.x)/6.28318530718,.5+asin(clamp(d.z,-1.,1.))/3.14159265359);vec3 c=texture2D(uMap,uv).rgb*uExposure*uHasMap;gl_FragColor=vec4(c*uOpacity,1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}` }));sky.frustumCulled=false;sky.renderOrder=-20;scene.add(sky);
 function load(name,color=true){
  if(textures.has(name))return Promise.resolve(textures.get(name));
  return new Promise((resolve,reject)=>{let ended=false;const timer=setTimeout(()=>{ended=true;reject(new Error('Texture timeout: '+name));},20000);
   new THREE.TextureLoader().load(BASE+name,t=>{clearTimeout(timer);if(ended||disposed){t.dispose();if(!ended)reject(new Error('Explorer closed'));return;}ended=true;t.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;t.wrapS=THREE.RepeatWrapping;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());textures.set(name,t);resolve(t);},undefined,()=>{clearTimeout(timer);if(!ended){ended=true;reject(new Error('Texture unavailable: '+name));}});
  });
 }
 function requestBody(id){
  const row=system.get(id);if(!row||!row.body.texture||pending.has(id)||failedBodies.has(id)||row.uniforms.uHasMap.value)return;
  pending.add(id);load(row.body.texture).then(t=>{
   row.uniforms.uMap.value=t;row.uniforms.uHasMap.value=1;onStatus(id+' surface ready.');
   if(id==='Saturn')load('saturn-rings.webp').then(t=>{ring.material.map=t;ring.material.needsUpdate=true;onStatus('Saturn rings ready.');}).catch(()=>failures.push('Saturn ring map unavailable'));
  }).catch(()=>{failedBodies.add(id);failures.push(id+' surface unavailable');}).finally(()=>pending.delete(id));
 }
 load('milky-way-4k.webp').then(t=>{skyMap=t;skyUniforms.uMap.value=t;skyUniforms.uHasMap.value=1;onStatus('Photographic sky ready.');}).catch(()=>failures.push('Sky panorama unavailable'));
 const starGeo=new THREE.BufferGeometry(),starMaterial=new THREE.ShaderMaterial({uniforms:{uRatio:{value:1},uOpacity:{value:0}},vertexShader:POINT_VERTEX,fragmentShader:POINT_FRAGMENT,vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
 const starPoints=new THREE.Points(starGeo,starMaterial);groupStars.add(starPoints);
 const fetchAbort=new AbortController();
 fetch(BASE+'stars.json',{signal:fetchAbort.signal}).then(r=>{if(!r.ok)throw Error('Star catalogue unavailable');return r.json();}).then(data=>{
  if(disposed||!Array.isArray(data.stars))return;
  const years=(Date.now()-Date.UTC(2000,0,1,12))/31557600000,positions=[],colors=[],sizes=[];
  for(const s of data.stars){positions.push(s[1]+s[4]*years,s[2]+s[5]*years,s[3]+s[6]*years);const bv=s[9];const c=new THREE.Color(bv<.15?'#b3d0ff':bv<.65?'#edf2ff':bv<1.1?'#ffe5c4':'#ffbf8e');colors.push(c.r,c.g,c.b);sizes.push(1.1+Math.max(0,6.5-s[7])*.3);}
  starGeo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));starGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));starGeo.setAttribute('aSize',new THREE.Float32BufferAttribute(sizes,1));starGeo.computeBoundingSphere();starsCount=sizes.length;onStatus(starsCount+' catalogue stars ready.');
 }).catch(e=>{if(!disposed&&e.name!=='AbortError')failures.push('Star catalogue unavailable');});
 function frameMatrix(date){
  physical=M.ephemeris(date);const geo=matrixFromAxes(physical.axes),g=new THREE.Matrix4().makeRotationFromQuaternion(globe.quaternion);eqFrame.multiplyMatrices(g,geo);
  galFrame.multiplyMatrices(eqFrame,matrixFromAxes([[1,0,0],[0,1,0],[0,0,1]].map(v=>M.galToEq(v,date))));
  skyUniforms.uWorldToGal.value.setFromMatrix4(galFrame.clone().invert());galacticCentre=M.galToEq(M.SUN_GALACTIC.map(v=>-v*M.KPC),date);
 }
 frameMatrix(new Date());galacticCentre=M.galToEq(M.SUN_GALACTIC.map(v=>-v*M.KPC));
 function world(v){return new THREE.Vector3(...v).applyMatrix4(eqFrame);}
 function bodyPosition(id){return id==='Galaxy'?M.galToEq(M.SUN_GALACTIC.map(v=>-v*M.KPC)):physical.positions[id]||[0,0,0];}
 function focusPosition(){const p=bodyPosition(focus);let result=p;
  // Orbit mode only: far out the pivot slides from the focus to the galactic centre. Free flight re-anchors instead.
  if(blendGalaxy&&focus!=='Galaxy'&&currentRange>M.LY*3000){const g=bodyPosition('Galaxy'),t=galaxyBlend(currentRange);result=result.map((v,i)=>v+(g[i]-v)*t);}return result;}
 // Allocation-free: a body position in the scene (Earth-fixed) frame, km, relative to Earth. Used by the flight module every frame.
 const frameElements=eqFrame.elements;
 function scenePosition(id,out){
  const p=id==='Galaxy'?galacticCentre:physical.positions[id];if(!p){out[0]=out[1]=out[2]=0;return out;}
  const e=frameElements,x=p[0],y=p[1],z=p[2];out[0]=e[0]*x+e[4]*y+e[8]*z;out[1]=e[1]*x+e[5]*y+e[9]*z;out[2]=e[2]*x+e[6]*y+e[10]*z;return out;
 }

 function update({distanceKm,nearKm=distanceKm,blend=true,live=false,fadeKm=distanceKm,date,simulated=false}={}){
  if(disposed)return null;currentRange=distanceKm;blendGalaxy=blend;level=M.levelFor(distanceKm,focus);
  const at=date instanceof Date?date:date?new Date(date):new Date();
  const iso=Number.isFinite(at.getTime())?at.toISOString():'';
  // The Earth-fixed frame turns with the Earth. While the camera is moving it is rebuilt every frame (about 0.2 ms), so bodies never step; at rest once a second. A simulated-time jump always rebuilds.
  if(live||(simulated&&iso!==lastIso)||Date.now()-lastEpoch>1000){lastEpoch=Date.now();lastIso=iso;frameMatrix(at);}
  renderUnit=M.unitFor(distanceKm);const f=focusPosition(),origin=world(f),ratio=Math.min(devicePixelRatio||1,2);
  globe.position.copy(origin).multiplyScalar(-1/renderUnit);globe.scale.setScalar(M.EARTH_RADIUS/renderUnit);globe.visible=distanceKm<1e12;
  const earthNear=focus==='Earth'&&distanceKm<M.EARTH_RADIUS*65;
  atmosphere.visible=earthNear;clouds.visible=distanceKm<M.EARTH_RADIUS*300;
  if(earthNear){atmosphere.position.set(0,0,0);atmosphere.scale.setScalar(1);}
  for(const [id,row] of system){const p=physical.positions[id];row.mesh.position.copy(world(M.sub(p,f))).multiplyScalar(1/renderUnit);row.mesh.scale.setScalar(row.body.radius/renderUnit);
   row.mesh.visible=distanceKm<LY_LIMIT;row.mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().multiplyMatrices(eqFrame,matrixFromAxes(M.bodyAxes(id))));
   const sunDir=M.sub(physical.positions.Sun,p);if(id==='Sun')sunDir[0]=1;row.uniforms.uSun.value.copy(world(sunDir).normalize());
   if(focus===id||(level==='solar'&&distanceKm>M.AU*.1&&distanceKm<M.AU*200))requestBody(id);
  }
  const fovTan=Math.tan(THREE.MathUtils.degToRad(camera.fov/2)),viewH=renderer.domElement.clientHeight||innerHeight;
  glowMat.uniforms.uRatio.value=ratio;
  for(let i=0;i<glowN;i++){
   const id=glowNames[i],body=id==='Earth'?{id:'Earth'}:system.get(id).body,pos=id==='Earth'?globe.position:system.get(id).mesh.position;
   glowPos[i*3]=pos.x;glowPos[i*3+1]=pos.y;glowPos[i*3+2]=pos.z;
   if(body.parent&&!M.satelliteVisible(body,{focus,rangeToParentKm:world(M.sub(physical.positions[body.parent],f)).multiplyScalar(1/renderUnit).distanceTo(camera.position)*renderUnit,parentRadius:M.BODIES.find(x=>x.id===body.parent).radius})){glowSize[i]=0;continue;}
   const depth=pos.distanceTo(camera.position),radius=(id==='Earth'?M.EARTH_RADIUS:system.get(id).body.radius)/renderUnit;
   const disc=depth>1e-9?Math.atan(radius/Math.max(depth,radius))/fovTan*viewH/2:1e6;
   glowSize[i]=disc<10?Math.max(4,12-disc*.6):0;
  }
  glowGeo.attributes.position.needsUpdate=true;glowGeo.attributes.aSize.needsUpdate=true;
  const sh=physical.shadows,moonRow=system.get('Moon');
  if(moonRow){
   const lu=sh?.lunar,on=!!lu?.active;
   moonRow.uniforms.uShOn.value=on?1:0;
   if(on){moonRow.uniforms.uShDir.value.copy(world(lu.dir).normalize());moonRow.uniforms.uShEarth.value.copy(globe.position);moonRow.uniforms.uShUmbra.value=Math.max(lu.k,0)/renderUnit;moonRow.uniforms.uShPenumbra.value=Math.max(lu.p,0)/renderUnit;}
  }
  const so=sh?.solar,earthOn=!!so?.active&&distanceKm<M.AU*2;
  earthEclipse.visible=earthOn;earthEclipseUniforms.uOn.value=earthOn?1:0;
  if(earthOn){
   const at=new Date(physical.at),moonEf=M.toEarthFixed(so.moon,at),sunEf=M.toEarthFixed(so.sun,at);
   earthEclipseUniforms.uMoon.value.set(moonEf[0]/M.EARTH_RADIUS,moonEf[1]/M.EARTH_RADIUS,moonEf[2]/M.EARTH_RADIUS);
   earthEclipseUniforms.uSun.value.set(sunEf[0]/M.EARTH_RADIUS,sunEf[1]/M.EARTH_RADIUS,sunEf[2]/M.EARTH_RADIUS);
  }
  glows.visible=level!=='earth'&&level!=='moon'&&distanceKm<M.LY*.5;
  orbitGroup.visible=distanceKm>M.AU*.07&&distanceKm<M.AU*2000;
  if(orbitGroup.visible){ensureOrbits();orbitGroup.quaternion.setFromRotationMatrix(eqFrame);orbitGroup.position.copy(world(M.sub(physical.earthHelio.map(v=>-v),f))).multiplyScalar(1/renderUnit);orbitGroup.scale.setScalar(M.AU/renderUnit);}
  const sOrigin=world(M.sub(physical.positions.Sun,f)).multiplyScalar(1/renderUnit);groupStars.position.copy(sOrigin);groupStars.quaternion.setFromRotationMatrix(eqFrame);groupStars.scale.setScalar(M.PC/renderUnit);
  groupStars.visible=starsCount>0&&fadeKm>M.LY*.025&&fadeKm<M.LY*8000;
  starMaterial.uniforms.uRatio.value=ratio;starMaterial.uniforms.uOpacity.value=smooth(.025,.3,fadeKm/M.LY)*(1-smooth(1000,8000,fadeKm/M.LY));
  const centre=M.galToEq(M.SUN_GALACTIC.map(v=>-v*M.KPC));groupGalaxy.position.copy(world(M.sub(centre,f))).multiplyScalar(1/renderUnit);groupGalaxy.quaternion.setFromRotationMatrix(galFrame);groupGalaxy.scale.setScalar(M.KPC/renderUnit);
  const galaxyFade=smooth(250,1800,fadeKm/M.LY);groupGalaxy.visible=galaxyFade>0;galMaterial.uniforms.uRatio.value=ratio;galMaterial.uniforms.uOpacity.value=galaxyFade*.28;disk.material.uniforms.uOpacity.value=galaxyFade;
  sky.position.copy(camera.position);sky.scale.setScalar(Math.max(10,distanceKm/renderUnit*4));skyUniforms.uExposure.value=deepSky?.45:earthNear?.05:.07;skyUniforms.uOpacity.value=1-smooth(.05,.4,fadeKm/M.LY);
  // The far plane follows the range; the near plane follows the altitude above the nearest surface (a quarter of it), but never
  // closer than 1e-7 of the far plane, so the depth buffer keeps its precision from the Earth floor out to the galaxy.
  const far=Math.max(200,distanceKm/renderUnit*100);camera.far=far;camera.near=Math.min(Math.max(nearKm/renderUnit*.25,far*1e-7),distanceKm/renderUnit*.05);camera.updateProjectionMatrix();
  return{distanceWorld:distanceKm/renderUnit,level,focus,unit:renderUnit,range:distanceKm,skyReady:!!skyMap,skyVisible:skyUniforms.uOpacity.value>0,starsCount,galaxyCount,model:level==='galaxy',at:physical.at,focusRadius:M.BODIES.find(b=>b.id===focus)?.radius||M.EARTH_RADIUS,failures:[...failures]};
 }
 const LY_LIMIT=M.LY*3;
 function labels(){
  if(disposed)return;const now=performance.now();if(now-lastLabels<70)return;lastLabels=now;
  const f=focusPosition(),rect=renderer.domElement.getBoundingClientRect(),out=[];
  const rows=level==='galaxy'?[{id:'Galactic centre',p:M.galToEq(M.SUN_GALACTIC.map(v=>-v*M.KPC)),color:'#f0d7ae'},{id:'Sun · Solar System',p:physical.positions.Sun,color:'#b3dff4'}]:M.BODIES.map(b=>({id:b.id,p:physical.positions[b.id],color:b.color,parent:b.parent}));
  const occupied=[];
  for(const row of rows){
   if(level==='earth'&&row.id==='Earth'||level==='moon'&&row.id==='Moon'||level==='planet'&&row.id===focus)continue;
   if(row.parent&&!M.satelliteVisible(row,{focus,rangeToParentKm:world(M.sub(physical.positions[row.parent],f)).multiplyScalar(1/renderUnit).distanceTo(camera.position)*renderUnit,parentRadius:M.BODIES.find(b=>b.id===row.parent).radius}))continue;
   const point=world(M.sub(row.p,f)).multiplyScalar(1/renderUnit);const fromCamera=point.clone().sub(camera.position);if(fromCamera.dot(camera.getWorldDirection(new THREE.Vector3()))<=0)continue;
   const p=point.project(camera);if(p.z< -1||p.z>1||Math.abs(p.x)>.96||Math.abs(p.y)>.86)continue;if(level==='earth'&&row.id==='Moon'){const target=world(M.sub(row.p,f)).multiplyScalar(1/renderUnit);const ray=new THREE.Ray(camera.position.clone(),target.clone().sub(camera.position).normalize());const hit=ray.intersectSphere(new THREE.Sphere(globe.position.clone(),globe.scale.x),new THREE.Vector3());if(hit&&hit.distanceTo(camera.position)<target.distanceTo(camera.position))continue;}let x=(p.x+1)*rect.width/2,y=(1-p.y)*rect.height/2;
   if(level==='earth'&&row.id!=='Moon')continue;
   const width=Math.max(55,row.id.length*7+16);x=THREE.MathUtils.clamp(x,12,Math.max(12,rect.width-width-12));let shift=0;while(occupied.some(o=>Math.abs(x-o.x)<(width+o.w)/2&&Math.abs(y+shift-o.y)<34)&&shift<120)shift+=32;
   if(shift>=120)continue;occupied.push({x,y:y+shift,w:width});out.push({id:row.id,x,y:y+shift,anchorY:y,color:row.color});
  }
  onLabels(out);
 }
 // Nearest body to a screen point (within its disc or 28 px of its centre), for tap-to-travel. Not a hot path.
 function pickBody(clientX,clientY){
  const rect=renderer.domElement.getBoundingClientRect(),f=focusPosition(),forward=camera.getWorldDirection(new THREE.Vector3());let best=null,bestScore=Infinity;
  for(const b of M.BODIES){
   if(b.parent&&!M.satelliteVisible(b,{focus,rangeToParentKm:world(M.sub(physical.positions[b.parent],f)).multiplyScalar(1/renderUnit).distanceTo(camera.position)*renderUnit,parentRadius:M.BODIES.find(x=>x.id===b.parent).radius}))continue;
   const p=world(M.sub(physical.positions[b.id],f)).multiplyScalar(1/renderUnit),rel=p.clone().sub(camera.position),depth=rel.dot(forward);if(depth<=0)continue;
   const c=p.clone().project(camera),x=(c.x+1)/2*rect.width+rect.left,y=(1-c.y)/2*rect.height+rect.top;
   const discPx=Math.atan((b.radius/renderUnit)/depth)/Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*rect.height/2,reach=Math.max(28,discPx),d=Math.hypot(clientX-x,clientY-y);
   if(d<=reach&&d/reach<bestScore){bestScore=d/reach;best=b.id;}}
  return best;
 }
 function setFocus(value){if(value===focus)return;if(value!=='Galaxy'&&!M.BODIES.some(b=>b.id===value))return;focus=value;requestBody(value);}
 function recommendedOrbit(galactic=false){
  let normal;if(galactic||focus==='Galaxy')normal=world(M.galToEq([0,0,1]));else{const eclipticPole=[0,-.3977771559,.9174820621];normal=world(eclipticPole);}
  normal.normalize();const side=new THREE.Vector3(1,.2,.4).cross(normal).normalize();const direction=normal.multiplyScalar(.8).addScaledVector(side,.65).normalize();const look=new THREE.Matrix4().lookAt(direction,new THREE.Vector3(),world(M.galToEq([0,0,1])).normalize());return new THREE.Quaternion().setFromRotationMatrix(look);
 }
 function dispose(){if(disposed)return;disposed=true;fetchAbort.abort();earthEclipse.removeFromParent();earthEclipse.material.dispose();root.removeFromParent();sky.removeFromParent();for(const t of textures.values())t.dispose();black.dispose();root.traverse(o=>{if(o.geometry!==plane)o.geometry?.dispose();if(o.material&&o.material!==orbitMaterial)o.material.dispose();});plane.dispose();orbitMaterial.dispose();sky.geometry.dispose();sky.material.dispose();}
 return{update,labels,setFocus,prepare:requestBody,scenePosition,bodyList:()=>[...M.BODIES.map(b=>({id:b.id,radius:b.radius})),{id:'Galaxy',radius:M.KPC,skipOffer:true}],pickBody,recommendedOrbit,getFocus:()=>focus,getState:()=>({focus,level,range:currentRange,starsCount,galaxyCount,skyReady:!!skyMap,surfaces:[...system].filter(([,row])=>row.uniforms.uHasMap.value).map(([id])=>id),ringsReady:!!ring.material.map,at:physical.at,eclipse:{solar:physical.shadows?.solar.kind||'none',lunar:physical.shadows?.lunar.kind||'none'},failures:[...failures]}),setDeepSky(value){deepSky=!!value;},dispose};
}
