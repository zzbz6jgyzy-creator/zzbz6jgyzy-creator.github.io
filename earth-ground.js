/* Free ground explorer. No API keys or paid imagery endpoints. */
import {clamp, longitude} from './earth-live-model.js?v=20261030-immersive2';

export function groundStyle(){
  const source='openmaptiles';
  const layer=(id,type,sourceLayer,paint,extra={})=>({id,type,source,'source-layer':sourceLayer,paint,...extra});
  const roads=['match',['get','class'],'motorway',3,'trunk',2.7,'primary',2.4,'secondary',1.8,1];
  const roadWidth=(scale=1)=>['interpolate',['linear'],['zoom'],5,['*',.25*scale,roads],12,['*',1.1*scale,roads],16,['*',7*scale,roads],20,['*',34*scale,roads]];
  const labelFont=['Noto Sans Regular'];
  return {
    version:8,name:'Supercharged / Midnight atlas',
    glyphs:'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sources:{
      openmaptiles:{type:'vector',url:'https://tiles.openfreemap.org/planet',attribution:'<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> · <a href="https://openmaptiles.org" target="_blank" rel="noopener">OpenMapTiles</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors</a>'},
      'elevation-shade':{type:'raster-dem',tiles:['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],tileSize:256,minzoom:0,maxzoom:15,encoding:'terrarium',attribution:'Terrain: <a href="https://www.mapzen.com/rights/" target="_blank" rel="noopener">Mapzen / source credits</a>'},
      elevation:{type:'raster-dem',tiles:['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],tileSize:256,minzoom:0,maxzoom:15,encoding:'terrarium',attribution:'Terrain: <a href="https://www.mapzen.com/rights/" target="_blank" rel="noopener">Mapzen / source credits</a>'},
    },
    light:{anchor:'viewport',color:'#ecf7ff',intensity:.55,position:[1.4,210,36]},
    sky:{'sky-color':'#06111f','horizon-color':'#93c4d8','fog-color':'#24485c','sky-horizon-blend':.8,'horizon-fog-blend':.6,'fog-ground-blend':.7},
    layers:[
      {id:'background',type:'background',paint:{'background-color':'#213740'}},
      layer('landcover','fill','landcover',{'fill-color':['match',['get','class'],'wood','#24413e','grass','#314c43','ice','#8badaf','sand','#5d5950','#294149'],'fill-opacity':.7}),
      layer('parks','fill','park',{'fill-color':'#28514a','fill-opacity':.8}),
      layer('landuse','fill','landuse',{'fill-color':['match',['get','class'],'residential','#253e49','industrial','#31414a','commercial','#334b57','#2c4249'],'fill-opacity':.55}),
      layer('water','fill','water',{'fill-color':'#0b2537','fill-antialias':true}),
      {id:'hillshade',type:'hillshade',source:'elevation-shade',paint:{'hillshade-exaggeration':.65,'hillshade-shadow-color':'#071525','hillshade-highlight-color':'#b6d5ca','hillshade-accent-color':'#3b6570'}},
      layer('waterway','line','waterway',{'line-color':'#497d91','line-width':['interpolate',['linear'],['zoom'],9,.5,17,3],'line-opacity':.7}),
      layer('country-boundaries','line','boundary',{'line-color':'#8fa7b1','line-width':.6,'line-opacity':.35,'line-dasharray':[3,3]},{filter:['==',['get','admin_level'],2]}),
      layer('roads-casing','line','transportation',{'line-color':'#101f2c','line-width':roadWidth(1.25)},{minzoom:6,filter:['!=',['get','class'],'rail'],layout:{'line-cap':'round','line-join':'round'}}),
      layer('roads','line','transportation',{'line-color':['match',['get','class'],'motorway','#dfb5a1','trunk','#b9c5bd','primary','#98bbc4','secondary','#739ba9','path','#507e85','#536f7b'],'line-width':roadWidth(),'line-opacity':.85},{minzoom:6,filter:['!=',['get','class'],'rail'],layout:{'line-cap':'round','line-join':'round'}}),
      layer('rail','line','transportation',{'line-color':'#6c8797','line-width':['interpolate',['linear'],['zoom'],10,.4,18,3],'line-dasharray':[2,2]},{minzoom:10,filter:['==',['get','class'],'rail']}),
      layer('building-footprints','fill','building',{'fill-color':'#7395a5','fill-outline-color':'#9dc3cf','fill-opacity':.45},{minzoom:14}),
      layer('buildings','fill-extrusion','building',{
        'fill-extrusion-color':['interpolate',['linear'],['coalesce',['get','render_height'],5],0,'#3e6276',50,'#6595aa',180,'#b1d8e3',350,'#e0edf0'],
        'fill-extrusion-height':['interpolate',['linear'],['zoom'],13,0,14,['coalesce',['get','render_height'],5]],
        'fill-extrusion-base':['coalesce',['get','render_min_height'],0],
        'fill-extrusion-opacity':.92,'fill-extrusion-vertical-gradient':true,
      },{minzoom:13}),
      layer('road-names','symbol','transportation_name',{'text-color':'#bfd1dc','text-halo-color':'#182c3b','text-halo-width':1.5},{minzoom:14,layout:{'symbol-placement':'line','text-field':['coalesce',['get','name:en'],['get','name']],'text-font':labelFont,'text-size':11,'text-max-angle':35}}),
      layer('place-names','symbol','place',{'text-color':'#e2eef3','text-halo-color':'#162b3b','text-halo-width':1.7},{layout:{'text-field':['coalesce',['get','name:en'],['get','name']],'text-font':labelFont,'text-size':['interpolate',['linear'],['zoom'],2,11,10,16,16,20],'text-letter-spacing':.08,'text-max-width':8},filter:['match',['get','class'],['country','state','city','town','village','suburb','neighbourhood'],true,false]}),
      layer('water-names','symbol','water_name',{'text-color':'#719eb7','text-halo-color':'#092334','text-halo-width':1},{layout:{'text-field':['coalesce',['get','name:en'],['get','name']],'text-font':labelFont,'text-size':12,'text-letter-spacing':.1}}),
    ],
  };
}

export async function createGround({container,place,onChange=()=>{},onInteract=()=>{},onGlobe=()=>{},onStatus=()=>{},onError=()=>{}}){
  const lib=await import('/vendor/maplibre/6.16.0/maplibre-gl.mjs');
  lib.setWorkerUrl('/vendor/maplibre/6.16.0/maplibre-gl-worker.mjs');
  lib.setWorkerCount(2);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const map=new lib.Map({container,style:groundStyle(),center:[place.lon,place.lat],zoom:Math.min(place.zoom,13),pitch:place.pitch,bearing:-24,maxZoom:22,maxPitch:75,attributionControl:false,canvasContextAttributes:{antialias:true},maxTileCacheSize:100,fadeDuration:reduced?0:250});
  const controller=new AbortController();let disposed=false,ready=false,terrain=true,buildings=true,failed=0;const diagnostics=[];
  map.addControl(new lib.NavigationControl({visualizePitch:true}),'top-right');
  map.addControl(new lib.ScaleControl({unit:'metric',maxWidth:100}),'bottom-right');
  map.addControl(new lib.AttributionControl({compact:true}),'bottom-right');
  map.getCanvas().setAttribute('aria-label','Interactive terrain map. Arrow keys pan; plus and minus zoom; shift and arrows tilt or rotate.');
  const notify=()=>{if(disposed)return;const c=map.getCenter();onChange({lat:c.lat,lon:longitude(c.lng),zoom:map.getZoom(),pitch:map.getPitch(),bearing:map.getBearing(),terrain,buildings,elevation:map.queryTerrainElevation(c),ready});};
  const timer=setTimeout(()=>{if(!ready&&!disposed){onError('The map is taking longer than expected. You can retry or open the satellite view.');}},30000);
  map.on('load',()=>{
    if(disposed)return;ready=true;clearTimeout(timer);
    map.setTerrain({source:'elevation',exaggeration:1.15});
    map.flyTo({center:[place.lon,place.lat],zoom:place.zoom,pitch:place.pitch,bearing:-24,duration:reduced?0:2500,essential:false});
    onStatus('Roads, terrain and buildings ready.');notify();
  });
  map.on('movestart',e=>{if(e.originalEvent)onInteract();});
  map.on('dragstart',onInteract);
  // Resizing or flying to a new destination can also emit zoom events. Only a
  // visitor's zoom gesture should hand back to Earth, once per crossing.
  let userZoom=false,returningToGlobe=false;
  map.on('zoomstart',event=>{userZoom=!!event.originalEvent;});
  map.on('moveend',notify);map.on('zoomend',event=>{
    const userGesture=userZoom||!!event.originalEvent;userZoom=false;
    if(map.getZoom()>=3){returningToGlobe=false;return;}
    if(ready&&userGesture&&!returningToGlobe){returningToGlobe=true;const c=map.getCenter();onGlobe({lat:c.lat,lon:longitude(c.lng)});}
  });map.on('terrain',notify);
  map.on('error',event=>{
    if(disposed)return;
    const e=String(event.error?.message||'');diagnostics.push({source:event.sourceId,message:e});if(diagnostics.length>12)diagnostics.shift();
    if(event.sourceId==='elevation'||e.includes('elevation-tiles')){if(terrain){terrain=false;map.setTerrain(null);map.setLayoutProperty('hillshade','visibility','none');onStatus('Terrain is unavailable; the street map is still available.');notify();}return;}
    if(++failed>5&&!ready)onError('The map provider is unavailable. Try again or open the satellite view.');
  });
  map.getCanvas().addEventListener('webglcontextlost',()=>onError('The map graphics were interrupted. Retry the ground view.'),{signal:controller.signal});
  return {
    map,
    diagnostics(){return{errors:diagnostics,loaded:map.isStyleLoaded(),tiles:map.areTilesLoaded(),sources:Object.keys(map.getStyle()?.sources||{})};},
    flyTo(next){if(disposed)return;place=next;const options={center:[next.lon,clamp(next.lat,-85,85)],zoom:next.zoom,pitch:next.pitch,bearing:-24,duration:reduced?0:1800,essential:false};map.flyTo(options);},
    resize(){if(!disposed)map.resize();},
    setTerrain(value){if(disposed||!ready)return;terrain=!!value;map.setTerrain(terrain?{source:'elevation',exaggeration:1.15}:null);map.setLayoutProperty('hillshade','visibility',terrain?'visible':'none');notify();},
    setBuildings(value){if(disposed||!ready)return;buildings=!!value;map.setLayoutProperty('buildings','visibility',buildings?'visible':'none');notify();},
    reset(){if(!disposed)map.easeTo({bearing:0,pitch:0,duration:reduced?0:700});},
    dispose(){if(disposed)return;disposed=true;controller.abort();clearTimeout(timer);map.remove();},
    getState(){const c=map.getCenter();return{ready,terrain,buildings,zoom:map.getZoom(),lat:c.lat,lon:longitude(c.lng),renderedBuildings:ready?map.queryRenderedFeatures({layers:['buildings']}).length:0};},
  };
}
