#!/usr/bin/env python3
"""Synchronise a licensed orchestral cue and editorial effects to the Roadster film.
Requires FFmpeg, NumPy and SciPy. The original music is never published alone.
"""
import argparse, hashlib, json, subprocess, tempfile
from pathlib import Path
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--music',type=Path,required=True)
p.add_argument('--input-1080',type=Path,required=True)
p.add_argument('--input-720',type=Path,required=True)
p.add_argument('--output-dir',type=Path,default=ROOT/'assets/roadster-studio')
p.add_argument('--report',type=Path)
a=p.parse_args()
SOURCE_SHA='6cf8094c7277b33190cfd9ccedd04dacc487bd96c7214f26a8d5b7d0e848db07'
if hashlib.sha256(a.music.read_bytes()).hexdigest()!=SOURCE_SHA:raise SystemExit('Unexpected music source: verify the licensed Legacy MP3 before changing its pinned checksum.')
sr=48000;duration=50.416667;n=round(duration*sr)
with tempfile.TemporaryDirectory(prefix='roadster-score-')as tmp:
 tmp=Path(tmp)
 raw=subprocess.check_output(['ffmpeg','-v','error','-ss','312','-i',str(a.music),'-t',str(duration),'-ar',str(sr),'-ac','2','-f','f32le','-'])
 music=np.frombuffer(raw,dtype='<f4').reshape(-1,2).copy();music=np.pad(music,((0,max(0,n-len(music))),(0,0)))[:n]
 t=np.arange(n)/sr
 # Continuous 50.4-second excerpt preserves musical phrasing, without a stitched chord change.
 envelope=np.interp(t,[0,.65,6.4,11.8,18.2,22.2,23.6,31,42.4,47.3,duration],[0,.42,.48,.58,.64,.72,.94,1,.93,.75,0])
 music*=envelope[:,None]
 effects=np.zeros((n,2),dtype=np.float64);rng=np.random.default_rng(20261024)
 def air(start,length,level,pan=0,reverse=False):
  count=round(length*sr);x=rng.normal(size=count);x=sosfilt(butter(2,[260,6200],btype='bandpass',fs=sr,output='sos'),x)
  phase=np.linspace(0,1,count);env=(phase**2*(1-phase)**.35)if reverse else np.sin(np.pi*phase)**2
  x=x/(np.sqrt(np.mean(x*x))+1e-9)*env*level
  # Equal-power panning, with a short same-polarity stereo reflection. Mono remains coherent.
  angle=(pan+1)*np.pi/4;stereo=np.column_stack([x*np.cos(angle),x*np.sin(angle)])
  delay=round(.018*sr);stereo[delay:,1]+=.17*x[:-delay]
  offset=round(start*sr);end=min(n,offset+count);effects[offset:end]+=stereo[:end-offset]
 def impact(at,level,pitch=68):
  length=1.5;u=np.arange(round(length*sr))/sr
  phase=2*np.pi*(pitch*u+50*.045*(1-np.exp(-u/.045)))
  x=np.sin(phase)*np.exp(-u/ .28)*np.minimum(u/.008,1)*level
  offset=round(at*sr);end=min(n,offset+len(x));effects[offset:end]+=x[:end-offset,None]*.7071
 for at,length,level,pan,rev in [(5.8,.9,.009,-.3,False),(11.15,.9,.008,.3,False),(17.35,1.15,.011,-.2,False),(21.25,2.35,.020,.15,True),(30.2,1.4,.015,.25,False),(41.65,1.2,.012,-.2,False)]:air(at,length,level,pan,rev)
 impact(23.6,.035);impact(31,.024,76);impact(42.4,.025,62)
 # Effects are editorial accents, not recordings of Tesla's vehicle or thrusters.
 mix=(music+effects).astype(np.float32);wavfile.write(tmp/'mix.wav',sr,mix)
 # Two-pass EBU R128 normalization: retain orchestral dynamics and leave AAC peak headroom.
 first=subprocess.run(['ffmpeg','-hide_banner','-i',str(tmp/'mix.wav'),'-af','loudnorm=I=-17:TP=-2:LRA=11:print_format=json','-f','null','-'],capture_output=True,text=True,check=True)
 measurement=json.loads(first.stderr[first.stderr.rfind('{'):first.stderr.rfind('}')+1])
 filt='loudnorm=I=-17:TP=-2:LRA=11:'+':'.join(k+'='+measurement[v]for k,v in [('measured_I','input_i'),('measured_TP','input_tp'),('measured_LRA','input_lra'),('measured_thresh','input_thresh'),('offset','target_offset')])+':linear=true:print_format=json'
 mastered=tmp/'master.wav';subprocess.run(['ffmpeg','-y','-v','error','-i',str(tmp/'mix.wav'),'-af',filt,'-ar',str(sr),'-c:a','pcm_s24le',str(mastered)],check=True)
 a.output_dir.mkdir(parents=True,exist_ok=True)
 for quality,source in [('1080',a.input_1080),('720',a.input_720)]:
  out=a.output_dir/f'roadster-film-{quality}.mp4';temp=tmp/f'film-{quality}.mp4'
  subprocess.run(['ffmpeg','-y','-v','error','-i',str(source),'-i',str(mastered),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','192k','-ar',str(sr),'-t',str(duration),'-movflags','+faststart','-metadata','title=Roadster — A New Dimension','-metadata','artist=Music: Legacy by Scott Buckley; film edit and additional sound design: Supercharged Daily','-metadata','copyright=Music © Scott Buckley, CC BY 4.0; imagery © Tesla','-metadata','comment=Legacy by Scott Buckley — https://www.scottbuckley.com.au/library/legacy/ — CC BY 4.0 https://creativecommons.org/licenses/by/4.0/ . Excerpted, faded and mixed for this editorial film. No endorsement implied.',str(temp)],check=True)
  out.write_bytes(temp.read_bytes());print('Updated soundtrack:',out.name,out.stat().st_size,flush=True)
 if a.report:a.report.write_text(json.dumps({'sourceSha256':SOURCE_SHA,'sourceStart':312,'duration':duration,'normalization':measurement,'targetLUFS':-17,'targetTruePeak':-2,'music':'Legacy','composer':'Scott Buckley','license':'CC BY 4.0','effects':'Original editorial transitions and low impacts, not vehicle recordings'},indent=2)+'\n')
