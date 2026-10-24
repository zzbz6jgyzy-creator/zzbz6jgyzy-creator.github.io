from pathlib import Path
import subprocess,json
import argparse
parser=argparse.ArgumentParser(description='Render the Roadster editorial film from downloaded Tesla originals and an Inter TTF.')
parser.add_argument('source_directory',type=Path)
args=parser.parse_args()
R=args.source_directory.resolve();O=Path(__file__).resolve().parents[1]/'assets/roadster-studio';W=R/'render';W.mkdir(exist_ok=True)
FONT=str(R/'inter.ttf')
scenes=[('still','Roadster-01-Hero-Desktop.jpg',7,'ROADSTER','A NEW DIMENSION'),('still','Roadster-02-Pilot-Desktop.jpg',6,'01 / FORM','DESIGNED AROUND THE AIR'),('still','Roadster-03-Carousel-Slide-4-Desktop.jpg',7,'02 / CONTROL','THE PILOT STAYS CENTRAL'),('still','Roadster-03-Carousel-Slide-5-Desktop.jpg',6,'03 / ENGINEERING','BENEATH THE SURFACE'),('video',441,8,'04 / THE REVEAL','PROGRAMMED SHOW DEMONSTRATION'),('video',1334,12,'BEYOND THE ROAD','TESLA REVEAL FOOTAGE / OCTOBER 2026'),('still','Roadster-08-End-Desktop.jpg',8,'ROADSTER','A SUPERCHARGED DAILY EDIT')]
for i,(kind,src,duration,title,subtitle)in enumerate(scenes):
 out=W/f'scene-{i}.mp4';(W/f'title-{i}.txt').write_text(title);(W/f'subtitle-{i}.txt').write_text(subtitle)
 if out.exists():continue
 command=['ffmpeg','-y','-v','error','-threads','2']
 if kind=='still':
  command+=['-loop','1','-i',str(R/'official'/src)];movement=f"scale=2112:1188:force_original_aspect_ratio=increase,crop=2112:1188,zoompan=z='1+0.035*on/{duration*24}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s=1920x1080:fps=24"
 else:
  command+=['-ss',str(src),'-i',str(R/'official-event.mp4')];movement='scale=1920:1080:flags=lanczos,fps=24'
 filt=movement+f",setsar=1,drawbox=x=0:y=0:w=iw:h=180:color=black@0.16:t=fill,drawtext=fontfile={FONT}:textfile={W}/title-{i}.txt:fontsize=58:fontcolor=white:x=100:y=64,drawtext=fontfile={FONT}:textfile={W}/subtitle-{i}.txt:fontsize=20:fontcolor=white@0.8:x=104:y=140,drawtext=fontfile={FONT}:text='TESLA IMAGERY / EDIT BY SUPERCHARGED DAILY':fontsize=16:fontcolor=white@0.7:x=100:y=h-48,format=yuv420p"
 command+=['-vf',filt,'-t',str(duration),'-an','-c:v','libx264','-preset','fast','-crf','23','-threads','2','-movflags','+faststart',str(out)]
 subprocess.run(command,check=True);print('Scene rendered',i,duration,flush=True)
cmd=['ffmpeg','-y','-v','error','-threads','2']
for i in range(len(scenes)):cmd+=['-i',str(W/f'scene-{i}.mp4')]
f=[]
for i in range(len(scenes)):f.append(f'[{i}:v]settb=1/24,setpts=N,fps=24[v{i}]')
prev='v0';offset=0
for i in range(1,len(scenes)):
 offset+=scenes[i-1][2]-.6;name=f'x{i}';f.append(f'[{prev}][v{i}]xfade=transition=fade:duration=0.6:offset={offset:.1f},settb=1/24,fps=24[{name}]');prev=name
cmd+=['-filter_complex_threads','1','-filter_complex',';'.join(f),'-map',f'[{prev}]','-an','-c:v','libx264','-preset','fast','-crf','25','-threads','2','-pix_fmt','yuv420p','-movflags','+faststart',str(W/'picture-1080.mp4')]
subprocess.run(cmd,check=True);print('Main film encoded',flush=True)
subprocess.run(['ffmpeg','-y','-v','error','-i',str(W/'picture-1080.mp4'),'-vf','scale=1280:720','-c:v','libx264','-preset','fast','-crf','26','-threads','2','-an','-movflags','+faststart',str(W/'picture-720.mp4')],check=True)
import sys
subprocess.run([sys.executable,str(Path(__file__).with_name('score-roadster-film.py')),'--music',str(R/'Legacy.mp3'),'--input-1080',str(W/'picture-1080.mp4'),'--input-720',str(W/'picture-720.mp4')],check=True)
probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration:stream=width,height,codec_name','-of','json',str(O/'roadster-film-1080.mp4')]))
(R/'film-probe.json').write_text(json.dumps(probe,indent=2));print('Film ready',[(p.name,p.stat().st_size)for p in O.glob('*.mp4')],flush=True)
