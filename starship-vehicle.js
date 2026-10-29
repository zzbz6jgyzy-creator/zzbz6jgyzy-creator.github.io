/* Original procedural Starship study. Public external features; not an engineering CAD model. */
import * as THREE from '/vendor/three/three.module.min.js';
import { mergeGeometries } from '/vendor/three/utils/BufferGeometryUtils.js';

const TAU = Math.PI * 2;
const mesh = (g, m, parent, x=0, y=0, z=0) => { const o = new THREE.Mesh(g,m); o.position.set(x,y,z); parent.add(o); return o; };

// Batch fixed hardware by material; retain all of its geometric detail in a few GPU calls.
export function batchStatic(root, exclusions=[]) {
  root.updateMatrixWorld(true);const groups=new Map(),old=new Set();
  root.traverse(o=>{
    if(!o.isMesh||o.isInstancedMesh||Array.isArray(o.material))return;
    for(let p=o;p&&p!==root;p=p.parent)if(exclusions.includes(p))return;
    const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);
    for(const name of Object.keys(g.attributes))if(!['position','normal','uv'].includes(name))g.deleteAttribute(name);
    const group=groups.get(o.material)||[];group.push({g,o});groups.set(o.material,group);old.add(o.geometry);
  });
  for(const [material,items]of groups){
    const geometry=mergeGeometries(items.map(x=>x.g),false);if(!geometry)continue;
    for(const {g,o}of items){o.removeFromParent();g.dispose();}
    mesh(geometry,material,root);
  }
  old.forEach(g=>g.dispose());
}

function texture(width, height, paint, color = true) {
  const c = document.createElement('canvas'); c.width=width; c.height=height;
  paint(c.getContext('2d'),width,height);
  const t = new THREE.CanvasTexture(c); t.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;
  t.anisotropy=4; return t;
}

export function vehicleEnvironment(renderer) {
  const map=texture(2048,1024,(c,w,h)=>{
    const g=c.createLinearGradient(0,0,0,h); g.addColorStop(0,'#7c91a8'); g.addColorStop(.4,'#cbd7e0'); g.addColorStop(.52,'#24384f'); g.addColorStop(.6,'#081422'); g.addColorStop(1,'#050a12'); c.fillStyle=g;c.fillRect(0,0,w,h);
    [[.12,.06],[.36,.1],[.72,.025],[.8,.08]].forEach(([x,s],i)=>{
      const p=c.createLinearGradient(w*x,0,w*(x+s),0);p.addColorStop(0,'#172a3c');p.addColorStop(.5,i===2?'#ffe0b8':'#f4f7fa');p.addColorStop(1,'#263f54');c.fillStyle=p;c.fillRect(w*x,0,w*s,h*.61);
    });
  });
  map.mapping=THREE.EquirectangularReflectionMapping;
  const pmrem=new THREE.PMREMGenerator(renderer); const rt=pmrem.fromEquirectangular(map); map.dispose();pmrem.dispose();return rt;
}

function engine(parent, x, z, size, materials) {
  const g=new THREE.Group();g.position.set(x,0,z);parent.add(g);
  const points=[new THREE.Vector2(size*.2,2.1*size),new THREE.Vector2(size*.24,1.7*size),new THREE.Vector2(size*.28,1.4*size),new THREE.Vector2(size*.39,.8*size),new THREE.Vector2(size*.63,0)];
  mesh(new THREE.LatheGeometry(points,24),materials.bell,g);
  const ring=mesh(new THREE.TorusGeometry(size*.62,size*.025,5,32),materials.edge,g);ring.rotation.x=Math.PI/2;
  mesh(new THREE.CylinderGeometry(size*.21,size*.21,.65*size,12),materials.dark,g,0,2.3*size);
  const inside=mesh(new THREE.CircleGeometry(size*.55,24),materials.throat,g,0,.045,0);inside.rotation.x=-Math.PI/2;
  for(let j=0;j<3;j++){
    const pipe=mesh(new THREE.CylinderGeometry(.035*size,.035*size,1.5*size,5),materials.pipe,g,Math.cos(j*TAU/3)*size*.35,1.5*size,Math.sin(j*TAU/3)*size*.35);pipe.rotation.z=.18;
  }
  return g;
}

function makeFlame(parent, radius, length) {
  const uniforms={uTime:{value:0},uPower:{value:1},uTint:{value:new THREE.Color('#70bfff')}};
  const geo=new THREE.CylinderGeometry(radius*.22,radius,length,32,36,true);
  // Narrow the nozzle and taper the far end without a hard cone silhouette.
  const pos=geo.attributes.position;
  for(let i=0;i<pos.count;i++){
    const f=(length/2-pos.getY(i))/length, factor=Math.pow(Math.sin(Math.PI*(f*.92+.04)),.8);
    pos.setXYZ(i,pos.getX(i)*factor,pos.getY(i)-length/2,pos.getZ(i)*factor);
  }
  geo.computeVertexNormals();
  const mat=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
    vertexShader:`varying vec2 vUv; uniform float uTime; uniform float uPower;
      void main(){vUv=uv;vec3 p=position;p.xz*=1.+.055*sin(p.y*1.1+uTime*31.);p.y*=uPower;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader:`varying vec2 vUv;uniform float uTime;uniform float uPower;uniform vec3 uTint;
      void main(){float f=1.-vUv.y;float noise=sin(vUv.x*97.+uTime*43.+f*31.)*sin(f*113.-uTime*30.);
      float diamond=pow(max(0.,sin(f*48.-uTime*3.)),8.);float edge=pow(max(0.,sin(vUv.x*3.14159)),.35);
      float alpha=pow(1.-f,1.25)*edge*(.4+.27*noise+.45*diamond)*min(1.,uPower*3.);
      vec3 col=mix(vec3(.32,.26,1.2),vec3(1.9,.8,.27),pow(f,.9));col=mix(col,vec3(2.3,2.3,2.6),diamond*.8+(1.-f)*.35);
      gl_FragColor=vec4(col,alpha);}`});
  const flame=mesh(geo,mat,parent); flame.position.y=-.1;
  const core=mesh(new THREE.CylinderGeometry(radius*.1,radius*.24,length*.62,20,1,true),new THREE.MeshBasicMaterial({color:0xc0d9ff,transparent:true,opacity:.35,depthWrite:false,blending:THREE.AdditiveBlending}),parent,0,-length*.3,0);
  const light=new THREE.PointLight(0x86baff,500,120,1.8);light.position.y=-5;parent.add(light);
  return {group:parent, flame,core,light,uniforms,set(power,time){parent.visible=power>.005;uniforms.uPower.value=Math.max(.01,power);uniforms.uTime.value=time;core.scale.y=Math.max(.01,power);light.intensity=power*800;}};
}

export function buildVehicles({mobile=false}={}) {
  const brushed=texture(512,1024,(c,w,h)=>{
    c.fillStyle='#808080';c.fillRect(0,0,w,h);let seed=21;
    for(let i=0;i<6000;i++){seed=(seed*16807)%2147483647;c.strokeStyle=`rgba(${seed%2?255:0},${seed%2?255:0},${seed%2?255:0},.035)`;const y=seed%h;c.beginPath();c.moveTo(0,y);c.lineTo(w,y+(seed%4));c.stroke();}
    for(let y=0;y<h;y+=25){c.fillStyle='#333';c.fillRect(0,y,w,1);c.fillStyle='#bcbcbc';c.fillRect(0,y+1,w,1);}
  },false);
  const steel=new THREE.MeshPhysicalMaterial({color:0xc5cbd0,metalness:.96,roughness:.3,clearcoat:.28,clearcoatRoughness:.35,bumpMap:brushed,bumpScale:.025});
  const materials={steel,edge:new THREE.MeshStandardMaterial({color:0x9ba6b0,metalness:.9,roughness:.25}),dark:new THREE.MeshStandardMaterial({color:0x202830,metalness:.85,roughness:.46}),pipe:new THREE.MeshStandardMaterial({color:0x959d9d,metalness:.8,roughness:.4}),bell:new THREE.MeshStandardMaterial({color:0x657583,metalness:.96,roughness:.3,side:THREE.DoubleSide}),throat:new THREE.MeshBasicMaterial({color:0x090d16})};
  const tileMat=new THREE.MeshStandardMaterial({color:0x14191c,roughness:.92,metalness:.08});
  const ship=new THREE.Group(),booster=new THREE.Group();
  const segments=mobile?64:112;
  mesh(new THREE.CylinderGeometry(4.5,4.5,36.2,segments),steel,ship,0,18.1,0);
  const profile=[];
  for(let i=0;i<=40;i++){const a=i/40;profile.push(new THREE.Vector2(4.5*Math.cos(a*Math.PI/2),36.2+17.2*a));}
  mesh(new THREE.LatheGeometry(profile,segments),steel,ship);
  const backing=new THREE.MeshStandardMaterial({color:0x0b1014,roughness:.96});
  mesh(new THREE.CylinderGeometry(4.512,4.512,36.2,segments/2,1,true,Math.PI,Math.PI),backing,ship,0,18.1,0);
  mesh(new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(p.x+.012,p.y)),segments/2,Math.PI,Math.PI),backing,ship);
  mesh(new THREE.CylinderGeometry(4.5,4.5,68.6,segments),steel,booster,0,34.3,0);
  mesh(new THREE.CylinderGeometry(4.55,4.55,2.4,segments,1,true),materials.dark,booster,0,69.8,0);
  // Weld bands are actual geometry: they catch close-up grazing light.
  for(let y=1.8;y<68.5;y+=1.8){const o=mesh(new THREE.TorusGeometry(4.505,.018,4,segments),materials.edge,booster,0,y,0);o.rotation.x=Math.PI/2;}
  for(let y=1.8;y<36;y+=1.8){const o=mesh(new THREE.TorusGeometry(4.505,.015,4,segments),materials.edge,ship,0,y,0);o.rotation.x=Math.PI/2;}
  // Half-shell heat shield. Thousands of individually shaded hexagonal tiles.
  const tileGeo=new THREE.CylinderGeometry(.185,.185,.035,6);tileGeo.rotateX(Math.PI/2);tileGeo.rotateZ(Math.PI/6);
  const tileRows=mobile?95:145,cols=mobile?28:42;
  const tiles=new THREE.InstancedMesh(tileGeo,tileMat,tileRows*cols);
  const dummy=new THREE.Object3D(),color=new THREE.Color();let k=0;
  for(let row=0;row<tileRows;row++){
    const y=.25+row*52.5/tileRows;
    const a=Math.max(0,(y-36.2)/17.2),r=y<=36.2?4.53:4.53*Math.cos(a*Math.PI/2);
    for(let col=0;col<cols;col++){
      const theta=Math.PI/2+(col+(row%2)*.5)/cols*Math.PI;
      dummy.position.set(Math.cos(theta)*r,y,Math.sin(theta)*r);
      dummy.rotation.set(0,Math.PI/2-theta,0);dummy.scale.set(mobile?1.52:1.03,mobile?1.5:1.01,1);dummy.updateMatrix();tiles.setMatrixAt(k,dummy.matrix);
      color.setHSL(.55,.04,.065+((row*17+col*7)%13)*.003);tiles.setColorAt(k++,color);
    }
  }
  tiles.count=k;ship.add(tiles);
  // Longitudinal conduits and service panels, with restrained identification markings.
  for(const x of [-2.0,2.0]){
    mesh(new THREE.BoxGeometry(.22,58,.28),materials.edge,booster,x,33,4.02);
    mesh(new THREE.BoxGeometry(.17,28,.2),materials.edge,ship,x,17,4.05);
  }
  for(let i=0;i<14;i++) mesh(new THREE.BoxGeometry(.7,.3,.09),materials.dark,booster,1.8,6+i*3.9,4.17);
  for(let i=0;i<6;i++){const theta=i*TAU/6;const o=mesh(new THREE.BoxGeometry(.14,6,.24),materials.edge,booster,Math.sin(theta)*4.48,4,Math.cos(theta)*4.48);o.rotation.y=theta;}
  // Slotted hot-stage ring; no solid opaque cap over the vent field.
  for(let i=0;i<84;i++){const theta=i*TAU/84;const o=mesh(new THREE.BoxGeometry(.1,2.3,.12),materials.edge,booster,Math.sin(theta)*4.57,69.8,Math.cos(theta)*4.57);o.rotation.y=theta;}
  for(const y of [68.65,70.95]){const o=mesh(new THREE.TorusGeometry(4.56,.08,6,segments),materials.edge,booster,0,y,0);o.rotation.x=Math.PI/2;}
  const flaps=[];
  function flap(x,y,z,front){
    const pivot=new THREE.Group();pivot.position.set(x,y,z);ship.add(pivot);
    const shape=new THREE.Shape();shape.moveTo(0,-2.2);shape.lineTo(x>0?3.6:-3.6,-3.1);shape.lineTo(x>0?3.2:-3.2,front?2.5:6);shape.lineTo(0,front?4.8:8);shape.closePath();
    const o=mesh(new THREE.ExtrudeGeometry(shape,{depth:.17,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.08,bevelThickness:.08}),steel,pivot);
    const back=mesh(new THREE.ExtrudeGeometry(shape,{depth:.035,bevelEnabled:false}),tileMat,pivot,0,0,-.05);
    const hinge=mesh(new THREE.CylinderGeometry(.22,.22,front?5:9,12),materials.edge,pivot,0,front?.5:2.5,0);
    flaps.push(pivot);return {o,back,hinge};
  }
  flap(-4.1,37,0,true);flap(4.1,37,0,true);flap(-4.2,4,0,false);flap(4.2,4,0,false);
  // Grid fins: open titanium lattice, rather than a solid rectangle.
  for(let i=0;i<4;i++){
    const theta=Math.PI/4+i*Math.PI/2,g=new THREE.Group();g.position.set(Math.sin(theta)*4.3,62.4,Math.cos(theta)*4.3);g.rotation.y=theta;booster.add(g);
    mesh(new THREE.BoxGeometry(3.6,.24,2.6),materials.dark,g,0,0,1.35);
    for(let j=0;j<9;j++)mesh(new THREE.BoxGeometry(.065,.8,2.5),materials.edge,g,-1.7+j*.42,.5,1.35);
    for(let j=0;j<7;j++)mesh(new THREE.BoxGeometry(3.6,.8,.065),materials.edge,g,0,.5,.1+j*.42);
    mesh(new THREE.BoxGeometry(.3,1.2,.55),materials.edge,g,0,-.5,0);
  }
  // 33 Super Heavy engines (20 + 10 + 3); Ship has 3 sea-level and 3 vacuum bells.
  for(const [count,r] of [[20,3.56],[10,2.12],[3,.82]]) for(let i=0;i<count;i++)engine(booster,Math.sin(i*TAU/count)*r,Math.cos(i*TAU/count)*r,.85,materials);
  for(let i=0;i<3;i++){
    engine(ship,Math.sin(i*TAU/3)*1.04,Math.cos(i*TAU/3)*1.04,.9,materials);
    engine(ship,Math.sin(i*TAU/3+Math.PI/3)*2.92,Math.cos(i*TAU/3+Math.PI/3)*2.92,1.45,materials);
  }
  function mark(parent,text,y){
    const map=texture(512,256,c=>{c.clearRect(0,0,512,256);c.fillStyle='#1a222a';c.textAlign='center';c.font='600 74px sans-serif';c.fillText(text,256,145);});
    const label=mesh(new THREE.PlaneGeometry(4,2),new THREE.MeshStandardMaterial({map,transparent:true,metalness:.4,roughness:.5,depthWrite:false}),parent,0,y,4.53);return label;
  }
  mark(ship,'S41',29);mark(booster,'B21',49);
  batchStatic(ship,flaps);batchStatic(booster);
  const shipPlume=new THREE.Group(),boosterPlume=new THREE.Group();ship.add(shipPlume);booster.add(boosterPlume);
  const flames={ship:makeFlame(shipPlume,6,48),booster:makeFlame(boosterPlume,9,92)};
  const plasma=mesh(new THREE.CylinderGeometry(5.2,5.1,38,64,24,true),new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,uniforms:{uPower:{value:0},uTime:{value:0}},
    vertexShader:'varying vec2 vUv;varying vec3 vN;varying vec3 vV;void main(){vUv=uv;vec4 p=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',
    fragmentShader:'varying vec2 vUv;varying vec3 vN;varying vec3 vV;uniform float uPower;uniform float uTime;void main(){float rim=pow(1.-abs(dot(vN,vV)),1.4);float wave=.75+.25*sin(vUv.y*85.+uTime*19.+sin(vUv.x*45.));float edge=sin(vUv.y*3.14159);float a=rim*uPower*wave*edge*.56;vec3 col=mix(vec3(1.7,.28,.035),vec3(.18,.35,1.4),pow(rim,3.));gl_FragColor=vec4(col,a);}'
  }),ship,0,21,0);
  return {ship,booster,flaps,flames,plasma,tileMat,tileCount:k,
    dispose(){const geometries=new Set(),mats=new Set(),maps=new Set();for(const root of [ship,booster])root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material]){mats.add(m);for(const v of Object.values(m))if(v?.isTexture)maps.add(v);}});geometries.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());maps.forEach(m=>m.dispose());}
  };
}
