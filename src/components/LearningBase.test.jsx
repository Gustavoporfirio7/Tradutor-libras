import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import LearningBase from './LearningBase';
import {learningRequest,refreshLearning,restoreLearningModel,trainLearningModel} from '../services/learning';
jest.mock('../services/learning',()=>({learningRequest:jest.fn(),refreshLearning:jest.fn(),restoreLearningModel:jest.fn(),trainLearningModel:jest.fn(),saveLearningExample:jest.fn(),LEARNING_EVENT:'efata-learning-updated'}));
jest.mock('../services/videoExamples',()=>({extractVideoExample:jest.fn()}));
beforeEach(()=>{learningRequest.mockReset().mockResolvedValue([]);refreshLearning.mockReset().mockResolvedValue([]);restoreLearningModel.mockReset().mockResolvedValue(null);trainLearningModel.mockReset();});
test('mostra a base vazia e não treina sem movimentos revisados',async()=>{
  render(<LearningBase/>);
  await screen.findByText(/Base local conectada/);
  expect(screen.getByRole('button',{name:'Treinar com exemplos revisados'})).toBeDisabled();
  expect(trainLearningModel).not.toHaveBeenCalled();
});
test('exige revisão explícita antes de usar um exemplo recebido',async()=>{
  refreshLearning.mockResolvedValue([{id:'pending-one',label:'Oi',kind:'motion',status:'pending',source:{type:'camera'},description:''}]);
  render(<LearningBase/>);await screen.findByText('Oi');
  fireEvent.click(screen.getByRole('button',{name:'Confirmar significado e revisar'}));
  await waitFor(()=>expect(learningRequest).toHaveBeenCalledWith('/examples/pending-one/review',{method:'PATCH',body:JSON.stringify({status:'reviewed'})}));
  expect(trainLearningModel).not.toHaveBeenCalled();
});
