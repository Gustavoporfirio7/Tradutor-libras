# Éfata

Aplicação React em português do Brasil com duas direções de tradução em desenvolvimento.

## Texto ou voz → Libras

Digite até 500 caracteres ou use o microfone para transcrever a fala em pt-BR. Confira o texto, clique em **Abrir intérprete em Libras** e, com a seleção de texto do VLibras ativa, toque na frase apresentada na página. Também é possível copiar o texto e colar na opção **Tradutor** do menu do VLibras.

Integração oficial: https://vlibras.gov.br/doc/widget/installation/webpageintegration.html
Tradução por seleção: https://vlibras.gov.br/doc/widget/functionalities/text-translation.html

O widget é carregado somente quando solicitado e precisa de internet. O aplicativo usa o botão público documentado `window.VLibrasWidget.initBtn`; não depende de APIs privadas do avatar. O botão abre o widget, mas não envia o texto automaticamente: o usuário seleciona a frase ou cola no tradutor.

O reconhecimento de voz depende de `SpeechRecognition` ou `webkitSpeechRecognition`. Pode usar serviços externos do navegador e não estar disponível em todos os dispositivos; o campo de texto continua disponível.

## Libras → Texto e voz (experimental)

A webcam usa o MediaPipe para localizar a mão. Há quatro gestos básicos: mão aberta, punho fechado, positivo e vitória/paz.

Em **Ensinar uma palavra**, informe uma palavra e salve pelo menos três exemplos de um sinal estático de uma mão. Os exemplos são vetores dos pontos da mão, sem gravação de vídeo, e ficam no armazenamento local deste navegador. Há limite de 30 palavras e 8 exemplos por palavra, com remoção individual.

O protótipo compara posturas normalizadas pela escala e posição da mão, preservando a orientação. Recusa correspondências distantes ou ambíguas e aguarda aproximadamente 0,6 segundo de estabilidade antes de mostrar a palavra e pronunciá-la em pt-BR. O limiar é experimental e não representa precisão medida. Três exemplos não equivalem a treinamento de um modelo geral de Libras.

Use a mesma mão e orientação dos exemplos. O cadastro de posturas não valida os rótulos e cobre somente uma mão estática. Para trajetórias de uma ou duas mãos, use o cadastro de movimentos descrito abaixo. Expressões faciais, referência ao corpo e tradução de frases ainda exigem dados e um modelo validado.

## Câmeras do celular

Use o seletor **Frontal / webcam**, **Traseira** ou o botão **Trocar câmera**. A câmera anterior é encerrada antes de solicitar a próxima. A frontal é espelhada na prévia; a traseira não é.

A opção traseira solicita `facingMode: { exact: 'environment' }`. Se o dispositivo não a disponibilizar, o app mostra um erro e permite voltar para a frontal. Abra por HTTPS no celular; um endereço HTTP na rede local normalmente não permite webcam ou microfone. Não há fallback silencioso de erro da traseira para a frontal.

## Executar e validar

```sh
npm install
npm start
npm test -- --watchAll=false --runInBand
npm run build
```

Abra http://localhost:3000. A navegação usa `#/tradutor`, compatível com hospedagem estática. A página declara pt-BR e solicita que o navegador não traduza automaticamente o conteúdo.

Os testes automatizados usam dispositivos simulados. É necessária validação no celular real, com as duas câmeras, reconhecimento de fala e avatar do VLibras.

## Movimentos e conversa

Em **Sinais com movimento**, informe uma palavra ou escolha uma sugestão e grave três exemplos completos com **Gravar exemplo em movimento (3 s)**. Depois use **Reconhecer sinal em movimento (3 s)** para registrar uma tentativa. O resultado reconhecido é mostrado, falado e acrescentado ao campo **Sua conversa**, onde você pode editar o texto e ouvir a sequência de palavras.

Os nomes sugeridos (Oi, Tchau, Obrigado etc.) não são sinais pré-treinados: precisam de exemplos reais cadastrados. A comparação considera a trajetória das duas mãos ao longo do tempo, normaliza a posição inicial e escala e usa alinhamento temporal DTW. A coleta é amostrada por tempo e preserva o lado da mão informado pelo detector. Os limites são experimentais e não representam precisão validada.

As gravações duram três segundos e exigem as mãos visíveis em pelo menos 80% dos quadros amostrados. Há limite de 40 rótulos e cinco exemplos por sinal em movimento, armazenados separadamente dos exemplos de posturas. Cancelar, trocar a câmera ou sair da tela interrompe a coleta. Não são salvos vídeos.

A conversa é a concatenação das palavras cadastradas reconhecidas; não é tradução gramatical de frases completas. Expressões faciais e referência ao corpo ainda não são capturadas, então sinais diferenciados por esses elementos podem ser confundidos. Para uma versão ampla, precisamos de um vocabulário revisado por usuários de Libras, gravações de pessoas diferentes, captura de corpo/rosto e um modelo temporal avaliado com pessoas ausentes do treinamento.

## Posição do VLibras

O atalho minimizado fica no canto inferior, respeitando a área segura do celular. O seletor **Atalho do VLibras** permite alternar entre direita e esquerda e salva a preferência neste navegador. O ajuste usa a referência `access` exposta pelo loader oficial do VLibras; futuras mudanças no widget podem exigir revisão.

O painel aberto mantém o arraste nativo pela barra superior ou inferior, conforme https://vlibras.gov.br/doc/widget/functionalities/widget-position.html .

## Éfata, temas e alfabeto

A marca do site é Éfata. Sua história é inspirada em “Efatá”, em Marcos 7:31–37: abrir caminhos para a comunicação, com respeito à identidade surda e à Libras. A página inicial inclui uma explicação e um link para a passagem bíblica.

O botão de tema permite escolher modo claro ou escuro. A preferência fica em `efata-theme`, sem alterar os cadastros antigos. Os identificadores `signaweb-*` são preservados para manter os exemplos já salvos.

Na área dos desenvolvedores, abra **Capturar exemplos pela câmera → Reconhecer → Alfabeto manual**. Há regras experimentais para configurações distintas de B, F, I, L, U, V e W. O painel inclui todas as letras de A a Z e Ç e a referência visual enviada. Para as outras posturas, salve três exemplos. Para Ç, H, J, K, X, Y e Z, cadastre três sequências no painel de movimento usando a letra como nome.

As letras calibradas são lidas continuamente. Os movimentos cadastrados do alfabeto são comparados em uma janela móvel de até três segundos. A detecção inicial não equivale a um modelo treinado ou a validação linguística; letras parecidas e movimentos incompletos podem ser recusados ou confundidos. Uma única imagem não fornece dados suficientes para treinamento completo.

O histórico fica abaixo da câmera e mantém as 30 detecções mais recentes, incluindo repetições após retirar a mão. Letras consecutivas são concatenadas em **Sua conversa**; o texto permanece editável.

## IA e base de aprendizado local

Esta etapa adiciona uma API Node.js e um banco SQLite persistente, em `.data/efata.sqlite`. A base é local e não é compartilhada entre usuários do site publicado. Use Node.js 24 ou superior. Para iniciar o aplicativo e a API juntos:

```sh
npm install
npm run dev:local
```

Abra http://127.0.0.1:3000. A API fica em http://127.0.0.1:3002, vinculada somente ao computador local. Também é possível iniciar `npm run server` e `npm start` em terminais separados. O frontend encaminha `/api/learning` à API via proxy de desenvolvimento. GitHub Pages continua servindo somente o frontend; não hospeda essa base.

### Ensinar durante o uso

Na tela pública, o reconhecimento usa automaticamente somente a base revisada. Se uma postura permanecer estável por cerca de três segundos sem ser reconhecida, o aplicativo oferece **O que você sinalizou?**. A captura temporária não é enviada automaticamente. Ao informar o significado e clicar em **Ensinar e salvar exemplo**, o exemplo e sua descrição são gravados como **aguardando revisão**.

Movimentos desconhecidos também podem abrir a pergunta após uma captura contínua de aproximadamente três segundos. O usuário pode responder ou ignorar; a resposta é salva como contribuição pendente. A captura não é enviada antes dessa ação. Os controles de importação, correção manual e treinamento ficam somente na área dos desenvolvedores.

Abra http://127.0.0.1:3000/#/desenvolvedor e informe a chave do arquivo `.data/admin-key.txt`, criada pela API na primeira execução. A chave permanece só na memória desta sessão do navegador. A API exige essa chave para referências, exportação, revisão e publicação de modelos. Confira a prévia dos pontos das mãos, a descrição e o trecho de origem; marque **Confirmar significado e revisar** somente quando o significado puder ser validado. Exemplos rejeitados ou pendentes não entram no reconhecimento. A classificação de posturas usa comparação com pelo menos três exemplos revisados; o modelo neural é destinado aos movimentos.

### Vídeos e PDFs

O importador de vídeos aceita MP4/WebM de até 100 MB, com um trecho de 1 a 10 segundos contendo um único sinal. O navegador acompanha as mãos com o MediaPipe, preserva os lados das duas mãos e transforma a trajetória em uma sequência de 16 quadros. Apenas os pontos normalizados, significado, nome do arquivo e trecho são enviados ao banco; o vídeo original não é armazenado.

Os PDFs de até 10 MB são guardados no banco com o texto selecionável extraído por `pdf-parse`. Esse texto pode ser consultado como material de referência, mas não é tratado como exemplos de movimento ou usado para inventar rótulos. PDFs escaneados ainda não recebem OCR. Nenhuma leitura semântica automática do material ou tradução de descrições em movimentos está implementada.

### Treinamento e limites

Com três movimentos revisados por palavra e pelo menos duas palavras, clique em **Treinar com exemplos revisados**. O TensorFlow.js treina uma rede densa pequena com sequências das mãos normalizadas. Um exemplo por classe é separado da etapa de ajuste e usado para uma avaliação inicial. Essa avaliação pequena não comprova precisão com outros usuários, condições de iluminação ou movimentos não cadastrados.

A versão do modelo, seus pesos e os identificadores dos exemplos usados são salvos no SQLite. A câmera carrega essa versão e combina a previsão neural com um limite de semelhança geométrica para recusar sinais muito distantes. Após novas revisões, é necessário treinar novamente para atualizar a rede; não há aprendizado cego a partir das próprias previsões.

Os cadastros antigos do navegador são preservados e continuam disponíveis nos modos anteriores. Eles não são enviados automaticamente à nova base. Os materiais importados ficam na base privada deste computador e não acompanham o Git. Eles devem passar pela revisão; importar materiais não publica nem treina uma rede automaticamente. Expressões faciais, referência ao corpo, gramática de Libras e conversas livres ainda não são cobertas.

### Validação e cópia de segurança

```sh
npm test -- --watchAll=false --runInBand
npm run test:server
npm run build
```

Os testes incluem persistência e revisão no SQLite, leitura de um PDF válido, fluxo de ensino e treinamento/salvamento/restauração de uma rede com dados sintéticos. Testes sintéticos não substituem a validação com usuários de Libras e vídeos reais.

O botão **Exportar exemplos e modelo** gera um JSON com os exemplos, os pesos e metadados das referências. Para guardar também os PDFs originais, encerre a API e copie a pasta `.data` inteira. Ela está no `.gitignore`, para evitar publicação dos materiais de treinamento no repositório.

### Importação offline pelos desenvolvedores

Para lotes de vídeos, `server/extract-materials.py` lê um manifesto JSON com caminhos e trechos rotulados, detecta os 21 pontos de cada mão e gera os quadros. Instale as dependências apenas no ambiente de trabalho local (`mediapipe==0.10.21`, `opencv-contrib-python==4.11.0.86`). Exemplo de manifesto:

```json
[{"path":"C:/materiais/alfabeto.mp4","segments":[["A",6,8],["B",12,14]]}]
```

```sh
python server/extract-materials.py manifesto.json quadros.json
node server/import-materials.mjs quadros.json referencia.pdf
```

O importador reutiliza a mesma normalização do aplicativo e salva exemplos pendentes. Para letras estáticas, também extrai três posturas por trecho; elas não representam três pessoas ou execuções independentes. Separe os vídeos/pessoas ao avaliar a precisão. As letras com movimento não recebem posturas isoladas. O PDF fica como referência textual; não gera sinais automaticamente.

A prévia da revisão mostra pontos das mãos, não rosto, corpo ou o vídeo original. Rejeite ou mantenha pendente qualquer contribuição cujo significado não possa ser confirmado com esses dados. Esta etapa é local; uma versão hospedada precisará de contas e permissões de servidor próprias.
