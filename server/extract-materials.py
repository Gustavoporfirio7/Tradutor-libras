"""Developer-only offline extractor. Input: JSON list of {path,segments:[[label,start,end],...]}."""
from pathlib import Path
import sys,json
sys.path.insert(0,str(Path('.data/python-tools').resolve()))
import cv2
import mediapipe as mp
manifest=json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
output=[]
for material in manifest:
 path=Path(material['path']);cap=cv2.VideoCapture(str(path))
 for label,start,end in material['segments']:
  frames=[]
  with mp.solutions.hands.Hands(static_image_mode=False,max_num_hands=2,model_complexity=1,min_detection_confidence=.7,min_tracking_confidence=.7) as detector:
   for i in range(16):
    t=start+(end-start)*i/15;cap.set(cv2.CAP_PROP_POS_MSEC,t*1000);ok,frame=cap.read()
    if not ok:continue
    result=detector.process(cv2.cvtColor(frame,cv2.COLOR_BGR2RGB));hands=[None,None]
    for hand,side in zip(result.multi_hand_landmarks or [],result.multi_handedness or []):
     slot=1 if side.classification[0].label=='Right' else 0
     hands[slot]=[{'x':p.x,'y':p.y,'z':p.z} for p in hand.landmark]
    frames.append({'time':t*1000,'hands':hands})
  output.append({'label':label,'start':start,'end':end,'name':path.name,'frames':frames})
  print(path.stem[:35],label,sum(any(f['hands']) for f in frames),flush=True)
 cap.release()
Path(sys.argv[2]).write_text(json.dumps(output,ensure_ascii=False),encoding='utf-8')
