import {extractVideoExample} from './videoExamples';
import {Hands} from '@mediapipe/hands';
jest.mock('@mediapipe/hands',()=>({Hands:jest.fn()}));
test('recusa trechos incompletos e arquivos acima do limite antes de processar',async()=>{
  await expect(extractVideoExample({size:100000001},0,3)).rejects.toThrow('100 MB');
  await expect(extractVideoExample({size:100},0,0.5)).rejects.toThrow('1 e 10 segundos');
  expect(Hands).not.toHaveBeenCalled();
});
test('transforma os quadros de um vídeo em um exemplo e libera os recursos',async()=>{
  URL.createObjectURL=jest.fn(()=> 'blob:video-test');URL.revokeObjectURL=jest.fn();
  jest.spyOn(HTMLMediaElement.prototype,'load').mockImplementation(function(){this.dispatchEvent(new Event('loadeddata'));});
  const previousDuration=Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype,'duration');
  const previousTime=Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype,'currentTime');
  Object.defineProperty(HTMLMediaElement.prototype,'duration',{configurable:true,get:()=>4});
  let time=0;
  Object.defineProperty(HTMLMediaElement.prototype,'currentTime',{configurable:true,get:()=>time,set:function(value){time=value;this.dispatchEvent(new Event('seeked'));}});
  let callback;const close=jest.fn().mockResolvedValue();
  Hands.mockImplementation(()=>({setOptions:jest.fn(),onResults:fn=>{callback=fn;},close,send:jest.fn(async()=>{
    const points=Array.from({length:21},(_,i)=>({x:0.1+i*0.01+time*0.03,y:0.2+i*0.02,z:0}));
    callback({multiHandLandmarks:[points],multiHandedness:[{label:'Left'}]});
  })}));
  try {
    const features=await extractVideoExample(new File(['sample'],'test.mp4',{type:'video/mp4'}),0,3);
    expect(features).toHaveLength(16);expect(features[0]).toHaveLength(68);
    expect(close).toHaveBeenCalledTimes(1);expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:video-test');
  } finally{
    Object.defineProperty(HTMLMediaElement.prototype,'duration',previousDuration);
    Object.defineProperty(HTMLMediaElement.prototype,'currentTime',previousTime);
    jest.restoreAllMocks();
  }
});
