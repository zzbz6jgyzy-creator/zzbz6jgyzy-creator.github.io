import * as THREE from '/vendor/three/three.module.min.js';
import { earthShaders } from '/earth-renderer.js?v=20261030-flight1';
import { buildVehicles, vehicleEnvironment, batchStatic } from '/starship-vehicle.js';
import { FLIGHT, sampleFlight, shipPosition, clamp, mix, smooth } from '/starship-replay-model.js';

const TAU=Math.PI*2;
const geo=(lat,lon,r=1)=>new THREE.Vector3(Math.cos(lat)*Math.cos(lon)*r,Math.sin(lat)*r,-Math.cos(lat)*Math.sin(lon)*r);
const rad=THREE.MathUtils.degToRad;
const PAD=geo(rad(25.997),rad(-97.156));

export async function initReplay({canvas,onStatus=()=>{},onError=()=>{},onChange=()=>{}}) {
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;renderer.autoClear=false;
  const mobile=canvas.clientWidth<700;
  const scene=new THREE.Scene(),nearScene=new THREE.Scene();
  const skyScene=new THREE.Scene(),skyCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  const skyMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,depthTest:false,uniforms:{uOpacity:{value:1}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:'varying vec2 vUv;uniform float uOpacity;void main(){vec3 col=mix(vec3(.38,.48,.57),vec3(.035,.11,.22),pow(vUv.y,.65));float glow=exp(-length((vUv-vec2(.78,.55))*vec2(1.1,2.))*4.);col+=vec3(.24,.15,.06)*glow;gl_FragColor=vec4(col,uOpacity);}' });
  skyScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),skyMaterial));
  const camera=new THREE.PerspectiveCamera(42,1,.001,150);
  const nearCamera=new THREE.PerspectiveCamera(38,1,.2,10000);
  const environment=vehicleEnvironment(renderer);nearScene.environment=environment.texture;nearScene.environmentIntensity=.85;
  nearScene.add(new THREE.HemisphereLight(0xc6ddff,0x182236,2));
  const key=new THREE.DirectionalLight(0xffe2bf,3.5);key.position.set(-140,120,110);nearScene.add(key);
  const rim=new THREE.DirectionalLight(0x78b8ff,3);rim.position.set(60,25,-150);nearScene.add(rim);
  const fill=new THREE.DirectionalLight(0xbacbdf,1.3);fill.position.set(140,30,130);nearScene.add(fill);
  const sun=new THREE.Vector3(-.25,.18,1).normalize();
  const blank=new THREE.DataTexture(new Uint8Array([0,0,0,255]),1,1);blank.needsUpdate=true;
  const uniforms={uDay:{value:blank},uNight:{value:blank},uCloud:{value:blank},uSun:{value:sun},uCloudOffset:{value:0}};
  const earth=new THREE.Group();scene.add(earth);
  const surface=new THREE.Mesh(new THREE.SphereGeometry(1,144,100),new THREE.ShaderMaterial({vertexShader:earthShaders.vertex,fragmentShader:earthShaders.surface,uniforms}));earth.add(surface);
  const cloud=new THREE.Mesh(new THREE.SphereGeometry(1.009,112,80),new THREE.ShaderMaterial({vertexShader:earthShaders.vertex,fragmentShader:earthShaders.clouds,uniforms:{uCloud:uniforms.uCloud,uSun:uniforms.uSun},transparent:true,depthWrite:false}));cloud.renderOrder=2;earth.add(cloud);
  const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(1.035,96,64),new THREE.ShaderMaterial({vertexShader:earthShaders.vertex,fragmentShader:earthShaders.atmosphere,uniforms:{uSun:uniforms.uSun},side:THREE.BackSide,transparent:true,blending:THREE.AdditiveBlending,premultipliedAlpha:true,depthWrite:false}));atmosphere.renderOrder=3;scene.add(atmosphere);
  let seed=14141;
  const random=()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646;};
  const stars=[];for(let i=0;i<1500;i++){const a=random()*TAU,z=random()*2-1,r=Math.sqrt(1-z*z);stars.push(Math.cos(a)*r*35,z*35,Math.sin(a)*r*35);}
  const starsGeo=new THREE.BufferGeometry();starsGeo.setAttribute('position',new THREE.Float32BufferAttribute(stars,3));
  const starfield=new THREE.Points(starsGeo,new THREE.PointsMaterial({color:0x8cabc9,size:.035,transparent:true,opacity:.7,depthWrite:false}));scene.add(starfield);

  const vehicles=buildVehicles({mobile}),ship=vehicles.ship,booster=vehicles.booster;
  const shipRig=new THREE.Group(),boosterRig=new THREE.Group();shipRig.add(ship);boosterRig.add(booster);nearScene.add(shipRig,boosterRig);
  // Keep the centres local for sub-metre vehicle detail, independent of Earth-scale coordinates.
  const pad=new THREE.Group();nearScene.add(pad);
  const structure=new THREE.MeshStandardMaterial({color:0x46515d,metalness:.8,roughness:.65});
  const dark=new THREE.MeshStandardMaterial({color:0x263440,metalness:.3,roughness:.9});
  const groundMaterial=new THREE.ShaderMaterial({vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec3 vP;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
    void main(){vec2 p=vP.xz;float n=noise(p*.03)*.5+noise(p*.15)*.3+noise(p*.6)*.2;float shore=p.x-230.-sin(p.y*.002)*120.;float sea=smoothstep(-18.,22.,shore);vec3 land=mix(vec3(.14,.145,.1),vec3(.26,.255,.19),n);float sand=smoothstep(-70.,0.,shore)*(1.-sea);land=mix(land,vec3(.39,.36,.27),sand*.75);float road=1.-smoothstep(4.,7.,abs(p.x+52.));land=mix(land,vec3(.17,.19,.2),road);float apron=1.-smoothstep(34.,39.,length(p));land=mix(land,vec3(.29,.31,.31),apron);vec3 ocean=mix(vec3(.025,.16,.21),vec3(.045,.22,.26),noise(p*.06));vec3 col=mix(land,ocean,sea);float haze=smoothstep(500.,2400.,length(vP-cameraPosition));gl_FragColor=vec4(mix(col,vec3(.22,.32,.42),haze),1.);}`});
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(8000,8000),groundMaterial);ground.rotation.x=-Math.PI/2;ground.position.y=-8;pad.add(ground);
  const mount=new THREE.Mesh(new THREE.CylinderGeometry(8,9,8,24,1,true),structure);mount.position.y=-4;pad.add(mount);
  for(let i=0;i<6;i++){const a=i*TAU/6;const leg=new THREE.Mesh(new THREE.CylinderGeometry(.6,.9,10,8),structure);leg.position.set(Math.sin(a)*6,-4,Math.cos(a)*6);pad.add(leg);}
  // Pad 2 structures are an illustrative set; no claim of surveyed pad geometry.
  const tower=new THREE.Group();tower.position.set(-26,-8,-18);pad.add(tower);
  for(const x of [-6,6])for(const z of [-6,6]){const p=new THREE.Mesh(new THREE.BoxGeometry(.9,148,.9),structure);p.position.set(x,74,z);tower.add(p);}
  for(let y=7;y<148;y+=11){for(const z of [-6,6]){const a=new THREE.Mesh(new THREE.BoxGeometry(12,.5,.5),structure);a.position.set(0,y,z);tower.add(a);const b=new THREE.Mesh(new THREE.BoxGeometry(.4,16,.4),structure);b.position.set(0,y+5.5,z);b.rotation.z=Math.PI/4;tower.add(b);}for(const x of [-6,6]){const a=new THREE.Mesh(new THREE.BoxGeometry(.5,.5,12),structure);a.position.set(x,y,0);tower.add(a);}}
  for(const x of [-4,4]){const arm=new THREE.Mesh(new THREE.BoxGeometry(2,1,24),dark);arm.position.set(x,75,8);tower.add(arm);}
  // Small service details create scale cues without downloading a large proprietary pad model.
  for(let i=0;i<6;i++){
    const tank=new THREE.Mesh(new THREE.CylinderGeometry(3.5,3.5,18+i%2*4,20),structure);tank.position.set(-70+(i%3)*10,2+i%2*2,-58-Math.floor(i/3)*13);pad.add(tank);
    const cap=new THREE.Mesh(new THREE.SphereGeometry(3.5,16,8,0,TAU,0,Math.PI/2),structure);cap.position.copy(tank.position);cap.position.y+=9+i%2*2;pad.add(cap);
  }
  for(let i=0;i<4;i++){const pipe=new THREE.Mesh(new THREE.CylinderGeometry(.25,.25,65,8),structure);pipe.rotation.z=Math.PI/2;pipe.position.set(-33,-5+i*.65,-13);pad.add(pipe);}
  for(let i=0;i<3;i++){const building=new THREE.Mesh(new THREE.BoxGeometry(12,5,8),dark);building.position.set(-65-i*15,-5,35);pad.add(building);}
  batchStatic(pad);
  // Ocean near-field replaces the launch set during either stage's terminal approach.
  const ocean=new THREE.Mesh(new THREE.PlaneGeometry(12000,12000,40,40),new THREE.ShaderMaterial({uniforms:{uTime:{value:0}},
    vertexShader:'varying vec3 vP;uniform float uTime;void main(){vec3 p=position;p.z+=sin(p.x*.026+uTime*.8)*.14+sin(p.y*.04-uTime)*.09;vP=p;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}',
    fragmentShader:'varying vec3 vP;uniform float uTime;void main(){float w=sin(vP.x*.045+uTime)*sin(vP.y*.055+uTime*.5);float s=pow(max(0.,w),18.);gl_FragColor=vec4(vec3(.015,.055,.08)+vec3(.07,.15,.18)*s,1.);}'
  }));ocean.rotation.x=-Math.PI/2;ocean.visible=false;nearScene.add(ocean);
  const puffGeometry=new THREE.PlaneGeometry(1,1),smokeCount=mobile?36:72;
  const smokeMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uOpacity:{value:1}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'varying vec2 vUv;uniform float uOpacity;void main(){float d=length(vUv-.5)*2.;float a=pow(max(0.,1.-d*d),2.)*.13*uOpacity;gl_FragColor=vec4(vec3(.5,.56,.62),a);}'
  });
  const smoke=new THREE.Group();nearScene.add(smoke);
  for(let i=0;i<smokeCount;i++){const p=new THREE.Mesh(puffGeometry,smokeMaterial);p.userData={a:random()*TAU,r:random(),s:random(),n:i};smoke.add(p);}
  const spray=new THREE.Mesh(new THREE.RingGeometry(.4,1,80),new THREE.MeshBasicMaterial({color:0xb6e7ff,transparent:true,opacity:.35,side:THREE.DoubleSide,depthWrite:false}));spray.rotation.x=-Math.PI/2;spray.visible=false;nearScene.add(spray);
  const satellites=new THREE.Group();ship.add(satellites);
  for(let i=0;i<26;i++){const satellite=new THREE.Group();const body=new THREE.Mesh(new THREE.BoxGeometry(.9,.08,.45),structure);satellite.add(body);for(const x of [-1,1]){const panel=new THREE.Mesh(new THREE.BoxGeometry(1.4,.025,.65),new THREE.MeshStandardMaterial({color:0x1c477a,metalness:.7,roughness:.35}));panel.position.x=x*1.1;satellite.add(panel);}satellite.userData.index=i;satellites.add(satellite);}

  const orbitGeo=new THREE.BufferGeometry(),historyGeo=new THREE.BufferGeometry(),boosterPathGeo=new THREE.BufferGeometry();
  const future=new THREE.Line(orbitGeo,new THREE.LineDashedMaterial({color:0x6e92a5,dashSize:.012,gapSize:.009,transparent:true,opacity:.32}));
  const history=new THREE.Line(historyGeo,new THREE.LineBasicMaterial({color:0xa6e5ff,transparent:true,opacity:.95}));
  const boosterPath=new THREE.Line(boosterPathGeo,new THREE.LineBasicMaterial({color:0xff8d64,transparent:true,opacity:.8}));
  const routeGroup=new THREE.Group();routeGroup.add(future,history,boosterPath);scene.add(routeGroup);
  const shipDot=new THREE.Mesh(new THREE.SphereGeometry(.008,12,8),new THREE.MeshBasicMaterial({color:0xd9f6ff}));const boosterDot=new THREE.Mesh(new THREE.SphereGeometry(.006,12,8),new THREE.MeshBasicMaterial({color:0xffab7d}));routeGroup.add(shipDot,boosterDot);
  const padDot=new THREE.Mesh(new THREE.SphereGeometry(.0045,12,8),new THREE.MeshBasicMaterial({color:0xff607b}));padDot.position.copy(PAD.clone().multiplyScalar(1.003));routeGroup.add(padDot);
  let t=0,mode='cinema',quality='auto',width=1,height=1,ready=false,disposed=false,frames=0,lost=false,visible=true,framing=null;
  let yaw=.12,pitch=.04,zoom=1,pinch=0,textureWidth=0,textureToken=0,detail='';
  const textures={},pointers=new Map(),cleanups=[];
  const bind=(obj,name,fn,opts)=>{obj.addEventListener(name,fn,opts);cleanups.push(()=>obj.removeEventListener(name,fn,opts));};

  function positionAt(seconds,stage='ship') {
    const s=sampleFlight(seconds);
    if(stage==='booster'){
      const p=shipPosition(Math.min(142,seconds)),f=smooth(147,421,seconds);
      // Reconstruct the booster return to an illustrative offshore Gulf point; not GPS.
      return geo(rad(mix(p.lat,25.95,f)),rad(mix(p.lon,-96.86,f)),1+s.boosterAltitude/6371);
    }
    return geo(rad(s.position.lat),rad(s.position.lon),1+s.shipAltitude/6371);
  }
  const route=[];for(let n=0;n<=900;n++)route.push(positionAt(FLIGHT.duration*n/900));
  orbitGeo.setFromPoints(route);future.computeLineDistances();historyGeo.setFromPoints(route);historyGeo.setDrawRange(0,1);
  const returnRoute=[];for(let n=0;n<=100;n++)returnRoute.push(positionAt(421*n/100,'booster'));boosterPathGeo.setFromPoints(returnRoute);

  function state(){return{ready,frames,t,camera:mode,quality,textureWidth,tileCount:vehicles.tileCount,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,contextLost:lost,detail,zoom,yaw,pitch,framing,...sampleFlight(t)};}
  function setTime(value){t=clamp(Number(value)||0,0,FLIGHT.duration);draw();}
  function setCamera(value){if(!['cinema','ship','booster','earth'].includes(value))return;mode=value;yaw=.12;pitch=.04;zoom=1;draw();onChange(state());}
  function resize(){const b=canvas.getBoundingClientRect();width=Math.max(1,b.width);height=Math.max(1,b.height);const budget=width<700?1800000:quality==='ultra'?6200000:3300000;renderer.setPixelRatio(Math.min(devicePixelRatio||1,2,Math.sqrt(budget/(width*height))));renderer.setSize(width,height,false);for(const c of [camera,nearCamera]){c.aspect=width/height;c.setViewOffset(width,height,-width*(width<700?0:.1),-height*(width<700?.13:0),width,height);c.updateProjectionMatrix();}draw();}
  function load(name,color=true){return new Promise((resolve,reject)=>{let settled=false;const timer=setTimeout(()=>{settled=true;reject(new Error('Earth imagery took too long to load.'));},18000);new THREE.TextureLoader().load('/assets/earth/'+name,tex=>{clearTimeout(timer);if(settled||disposed){tex.dispose();if(!settled)reject(new Error('Replay closed.'));return;}settled=true;tex.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());resolve(tex);},undefined,()=>{clearTimeout(timer);if(!settled){settled=true;reject(new Error('Earth imagery could not load.'));}});});}
  async function setQuality(value){
    if(!['auto','high','ultra'].includes(value)||disposed)return;
    quality=value;const token=++textureToken;
    const limited=navigator.deviceMemory&&navigator.deviceMemory<=4,max=renderer.capabilities.maxTextureSize;
    const tier=value==='ultra'&&max>=8192&&!limited?'8k':max>=4096&&(value!=='auto'||(!mobile&&!navigator.connection?.saveData&&!limited))?'4k':'2k';
    const auxiliary=tier==='8k'?'4k':'2k';detail=value==='ultra'&&tier!=='8k'?'Ultra is limited to '+tier.toUpperCase()+' on this device.':'';
    onStatus('Loading '+tier.toUpperCase()+' Earth imagery…');
    for(const [key,mapTier]of[['day',tier],['night',auxiliary],['cloud',auxiliary]]){
      if(textures[key]?.tier===mapTier)continue;
      const tex=await load('earth-'+(key==='cloud'?'clouds':key)+'-'+mapTier+'.webp',key!=='cloud');
      if(token!==textureToken||disposed){tex.dispose();return;}
      textures[key]?.texture.dispose();textures[key]={texture:tex,tier:mapTier};uniforms[{day:'uDay',night:'uNight',cloud:'uCloud'}[key]].value=tex;
    }
    textureWidth=textures.day.texture.image.width;resize();onChange(state());return state();
  }

  function draw(){
    if(!ready||disposed||lost||!visible||document.hidden)return;
    const s=sampleFlight(t),isEarth=mode==='earth';
    const followBooster=mode==='booster';
    const stage=followBooster?'booster':'ship';
    routeGroup.visible=isEarth;
    shipDot.position.copy(positionAt(t));boosterDot.position.copy(positionAt(Math.min(t,421),'booster'));
    historyGeo.setDrawRange(0,Math.max(1,Math.floor(t/FLIGHT.duration*900)+1));
    boosterPathGeo.setDrawRange(0,Math.max(1,Math.floor(Math.min(t,421)/421*100)+1));
    const sub=positionAt(t,stage).normalize();
    // Earth and close vehicles have separate cameras in one WebGL context.
    if(isEarth){
      const a=Math.atan2(-sub.z,sub.x)+yaw,lat=clamp(Math.asin(sub.y)+pitch,-1.3,1.3);
      const orbit=new THREE.Vector3(Math.cos(a)*Math.cos(lat),Math.sin(lat),-Math.sin(a)*Math.cos(lat));
      camera.position.copy(orbit.multiplyScalar(3.25/zoom));camera.lookAt(0,0,0);
    }else{
      const side=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),sub).normalize();
      const up=new THREE.Vector3().crossVectors(sub,side).normalize();
      camera.position.copy(sub.clone().multiplyScalar(1.3).add(side.clone().multiplyScalar(.18+yaw*.1)).add(up.clone().multiplyScalar(.14+pitch*.05)));
      camera.lookAt(sub.clone().multiplyScalar(.7).add(up.clone().multiplyScalar(.48)));
    }
    starfield.visible=isEarth||s.shipAltitude>70;
    renderer.setClearColor(0x03070e,1);renderer.clear();renderer.render(scene,camera);
    const viewAltitude=followBooster?s.boosterAltitude:s.shipAltitude;
    if(!isEarth&&viewAltitude<60){skyMaterial.uniforms.uOpacity.value=1-smooth(12,60,viewAltitude);renderer.render(skyScene,skyCamera);}
    if(!isEarth){
      const launch=t<140&&!followBooster;
      const staging=t>=140&&t<170&&mode==='cinema';
      const landing=followBooster?t>=380:t>=11260;
      shipRig.visible=!followBooster;boosterRig.visible=followBooster||!s.separated||staging;
      ship.position.set(0,0,0);booster.position.set(0,0,0);shipRig.position.set(0,0,0);boosterRig.position.set(0,0,0);shipRig.rotation.set(0,0,0);boosterRig.rotation.set(0,0,0);
      let target=new THREE.Vector3(0,28,0),distance=155;
      if(!s.separated){
        const rise=Math.max(0,(s.shipAltitude-shipPosition(0).altitude)*1000);boosterRig.position.y=rise;shipRig.position.y=71+rise;
        target.set(0,65-smooth(0,6,t)*49+rise,0);distance=(width<700?250:220)*(1+smooth(0,6,t)*(width<700?.8:.65));
        const tilt=smooth(35,140,t)*.48;shipRig.rotation.z=-tilt;boosterRig.rotation.z=-tilt;
        if(t>20){shipRig.position.set(Math.sin(tilt)*71,71*Math.cos(tilt)+rise,0);}
      }else if(staging){
        const f=s.separation;shipRig.rotation.z=-.62;boosterRig.rotation.z=mix(-.62,1.8,smooth(144,162,t));
        shipRig.position.set(-20+Math.sin(.62)*(71+f*70),-35+Math.cos(.62)*(71+f*70),0);boosterRig.position.set(-20-f*30,-35-f*40,0);target.set(8,42,0);distance=width<700?310:250;
      }else if(followBooster){
        const rotation=t<190?mix(1.8,Math.PI,smooth(162,175,t)):Math.PI*(1-smooth(220,310,t));
        boosterRig.rotation.z=rotation;target.set(0,34,0);distance=width<700?165:145;
        if(landing){boosterRig.rotation.z=0;boosterRig.position.y=s.boosterAltitude*1000;target.y=34+boosterRig.position.y;}
      }else{
        if(s.entry>.01)shipRig.rotation.z=-Math.PI/2+.14*Math.sin(t*.003);
        else if(t>11260)shipRig.rotation.z=mix(-Math.PI/2,0,s.flip);
        else shipRig.rotation.z=-.35;
        if(landing){shipRig.position.y=s.shipAltitude*1000;target.set(0,26+shipRig.position.y,0);}
        else target.set(s.entry>.01?22:8,18,0);
        distance=width<700?140:118;
        if(s.shipEngine>.01){distance*=1.3;target.y-=12;}
      }
      const aspectFactor=width/height<1?Math.max(1,(height/width)*.58):1;
      distance*=aspectFactor/zoom;
      const azimuth=.45+yaw;nearCamera.position.set(target.x+Math.sin(azimuth)*distance,target.y+distance*(.13+pitch),target.z+Math.cos(azimuth)*distance);nearCamera.lookAt(target);
      if(width<700){nearCamera.setViewOffset(width,height,0,-height*(width<height?.13+(!s.separated?smooth(0,6,t)*.06:0):0),width,height);nearCamera.updateProjectionMatrix();}
      nearCamera.updateMatrixWorld();
      if(!s.separated){const tip=ship.localToWorld(new THREE.Vector3(0,53.4,0)).project(nearCamera),tail=booster.localToWorld(new THREE.Vector3(0,-92,0)).project(nearCamera);framing={tipY:tip.y,tailY:tail.y};}else framing=null;
      // Geometry stays original in scale. Tracking camera changes framing only.
      pad.visible=launch&&t<40;pad.position.y=0;
      ocean.visible=landing;ocean.position.y=-.2;
      spray.visible=landing&&((followBooster&&t>418)||(!followBooster&&t>11308));
      if(spray.visible){const f=followBooster?smooth(418,435,t):smooth(11308,11312,t);spray.scale.setScalar(8+f*65);spray.position.y=.15;}
      vehicles.flames.ship.set(s.shipEngine,t);vehicles.flames.booster.set(s.boosterEngine,t);
      vehicles.plasma.material.uniforms.uPower.value=s.entry;vehicles.plasma.material.uniforms.uTime.value=t;
      vehicles.tileMat.emissive.setHex(0xc13a12);vehicles.tileMat.emissiveIntensity=s.entry*.28;
      vehicles.plasma.visible=s.entry>.01;
      for(let i=0;i<vehicles.flaps.length;i++)vehicles.flaps[i].rotation.y=(i%2?1:-1)*(s.entry*.5+Math.sin(t*.13+i)*.025*s.entry);
      satellites.visible=t>=2047&&t<8000;
      for(const sat of satellites.children){const n=sat.userData.index,release=(t-2047)-(1832/26)*n;sat.visible=release>=0;if(sat.visible){sat.position.set(7+release*.025,28-release*.012,(n%3-1)*1.8);sat.rotation.set(release*.003,n*.3,release*.001);}}
      smoke.visible=(launch&&t<65)||(landing&&((followBooster&&t>396)||(!followBooster&&t>11293)));
      smokeMaterial.uniforms.uOpacity.value=launch?1-smooth(35,65,t):.8;
      for(const puff of smoke.children){const d=puff.userData,age=(t*.18+d.s*8)%8,r=(age*7+d.r*10);puff.position.set(Math.cos(d.a)*r,Math.max(-6,age*1.5-5),Math.sin(d.a)*r);puff.scale.setScalar(10+age*6);puff.quaternion.copy(nearCamera.quaternion);}
      ocean.material.uniforms.uTime.value=t;
      renderer.clearDepth();renderer.render(nearScene,nearCamera);
    }
    frames++;
  }
  const down=e=>{if(e.pointerType==='mouse'&&e.button!==0)return;canvas.focus({preventScroll:true});pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);if(pointers.size===2){const[a,b]=[...pointers.values()];pinch=Math.hypot(a.x-b.x,a.y-b.y);}};
  const move=e=>{const prev=pointers.get(e.pointerId);if(!prev)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===1){yaw-=(e.clientX-prev.x)*.006;pitch=clamp(pitch+(e.clientY-prev.y)*.003,-.6,.8);}else{const[a,b]=[...pointers.values()],d=Math.hypot(a.x-b.x,a.y-b.y);if(pinch)zoom=clamp(zoom*d/pinch,.65,2);pinch=d;}draw();};
  const up=e=>{pointers.delete(e.pointerId);pinch=0;};
  bind(canvas,'pointerdown',down);bind(canvas,'pointermove',move);bind(canvas,'pointerup',up);bind(canvas,'pointercancel',up);bind(canvas,'lostpointercapture',up);
  bind(canvas,'wheel',e=>{e.preventDefault();zoom=clamp(zoom-e.deltaY*.001,.65,2);draw();},{passive:false});
  bind(canvas,'keydown',e=>{const keys=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Home'];if(!keys.includes(e.key))return;e.preventDefault();if(e.key==='Home'){yaw=.12;pitch=.04;zoom=1;}else if(e.key==='ArrowLeft')yaw+=.12;else if(e.key==='ArrowRight')yaw-=.12;else if(e.key==='ArrowUp')pitch=clamp(pitch+.08,-.6,.8);else if(e.key==='ArrowDown')pitch=clamp(pitch-.08,-.6,.8);else zoom=clamp(zoom+(e.key==='-'?-.1:.1),.65,2);draw();});
  bind(canvas,'webglcontextlost',e=>{e.preventDefault();lost=true;onError(new Error('The graphics connection was interrupted. Reload the replay to reconnect.'));});
  bind(document,'visibilitychange',()=>{if(!document.hidden)draw();});
  const observer=new ResizeObserver(resize);observer.observe(canvas);
  const intersection=typeof IntersectionObserver!=='undefined'?new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)draw();}):null;intersection?.observe(canvas);
  function dispose(){if(disposed)return;disposed=true;textureToken++;observer.disconnect();intersection?.disconnect();cleanups.forEach(f=>f());vehicles.dispose();environment.dispose();const geometries=new Set(),materials=new Set();for(const root of[scene,nearScene,skyScene])root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());Object.values(textures).forEach(x=>x.texture.dispose());blank.dispose();renderer.dispose();}
  const api={getState:state,setTime,setCamera,setQuality,render:draw,dispose,resetView(){yaw=.12;pitch=.04;zoom=1;draw();}};
  try{await setQuality('auto');ready=true;resize();onStatus('Replay ready.');return api;}catch(error){dispose();onError(error);throw error;}
}
