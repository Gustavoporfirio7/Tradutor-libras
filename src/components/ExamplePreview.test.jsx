import {render,screen,fireEvent} from '@testing-library/react';
import ExamplePreview from './ExamplePreview';
test('permite inspecionar quadros do movimento enviado sem precisar aprová-lo',()=>{
 const features=Array.from({length:16},(_,i)=>[1,...Array.from({length:33},(_,j)=>j/10+i/10),...Array(34).fill(0)]);
 const {container}=render(<ExamplePreview example={{label:'Oi',kind:'motion',features}}/>);
 expect(screen.getByRole('img',{name:'Pontos das mãos do exemplo Oi'})).toBeInTheDocument();
 const before=container.querySelector('circle').getAttribute('cx');
 fireEvent.change(screen.getByLabelText('Quadro do exemplo Oi'),{target:{value:15}});
 expect(container.querySelector('circle').getAttribute('cx')).not.toBe(before);
 expect(screen.queryByRole('button',{name:'Confirmar significado e revisar'})).not.toBeInTheDocument();
});
