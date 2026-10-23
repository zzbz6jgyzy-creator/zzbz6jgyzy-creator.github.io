/* Local SGP4 propagation; no requests to orbit providers. */
importScripts('/vendor/satellite.min.js');
let records=[];
self.onmessage=event=>{
 const m=event.data;
 try{
  if(m.type==='load'){
   records=m.rows.map((row,index)=>{try{const rec=satellite.twoline2satrec(row[3],row[4]);return rec.error?null:{rec,index};}catch{return null;}}).filter(Boolean);
   self.postMessage({type:'ready',count:records.length});return;
  }
  if(m.type!=='propagate'||!Number.isFinite(m.now))return;
  const now=new Date(m.now),gmst=satellite.gstime(now),out=[];
  for(const {rec,index}of records){try{const position=satellite.propagate(rec,now).position;if(!position)continue;const g=satellite.eciToGeodetic(position,gmst);if(![g.longitude,g.latitude,g.height].every(Number.isFinite)||g.height<80||g.height>10000)continue;out.push(index,g.longitude*180/Math.PI,g.latitude*180/Math.PI,g.height);}catch{}}
  const positions=new Float32Array(out);self.postMessage({type:'positions',now:m.now,positions},[positions.buffer]);
 }catch{self.postMessage({type:'error'});}
};
