import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import TeachUnknown from './TeachUnknown';
import {saveLearningExample} from '../services/learning';
jest.mock('../services/learning',()=>({saveLearningExample:jest.fn()}));
beforeEach(()=>saveLearningExample.mockReset());
test('pede o significado e salva somente após o usuário ensiná-lo',async()=>{
  saveLearningExample.mockResolvedValue({id:'example',status:'pending'});
  const sample={kind:'static',features:Array(63).fill(0.2)};
  render(<TeachUnknown sample={sample} onDismiss={jest.fn()}/>);
  expect(saveLearningExample).not.toHaveBeenCalled();
  expect(screen.getByRole('button',{name:'Ensinar e salvar exemplo'})).toBeDisabled();
  fireEvent.change(screen.getByLabelText('O que você sinalizou?'),{target:{value:'Obrigado'}});
  fireEvent.change(screen.getByLabelText('Descrição ou contexto (opcional)'),{target:{value:'Agradecimento'}});
  fireEvent.click(screen.getByRole('button',{name:'Ensinar e salvar exemplo'}));
  await waitFor(()=>expect(saveLearningExample).toHaveBeenCalledWith({...sample,label:'Obrigado',description:'Agradecimento',source:{type:'camera'}}));
  expect(await screen.findByRole('status')).toHaveTextContent('aguardando revisão');
});
test('não informa sucesso quando a base está desconectada',async()=>{
  saveLearningExample.mockRejectedValue(new Error('Base desconectada.'));
  render(<TeachUnknown sample={{kind:'static',features:Array(63).fill(0)}} onDismiss={jest.fn()}/>);
  fireEvent.change(screen.getByLabelText('O que você sinalizou?'),{target:{value:'A'}});
  fireEvent.click(screen.getByRole('button',{name:'Ensinar e salvar exemplo'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('Base desconectada');
  expect(screen.queryByText(/Exemplo salvo/)).not.toBeInTheDocument();
});
