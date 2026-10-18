# Checklist de deploy

Roteiro para publicar uma versão nova em produção (API Node + MySQL, frontend
estático). Siga na ordem; os itens marcados com **(1ª vez)** só precisam ser
feitos no primeiro deploy da gestão da academia.

## 1. Antes de publicar

- [ ] **Testes passando:** `cd backend && npm test` (todos verdes). Os testes
      usam banco em memória e não tocam em nada real.
- [ ] **Frontend compila:** `cd frontend && npm run build` (o `prebuild` copia
      os modelos do reconhecimento facial para `public/modelos-face`).
- [ ] **Backup do banco de produção** (veja a seção 5). Não publique sem um
      backup de hoje — a subida aplica ajustes automáticos no banco.

## 2. Publicar

- [ ] **Backend:** atualizar o código no servidor, `npm install` (entraram
      dependências desde a última versão?) e reiniciar o processo Node.
- [ ] **Frontend:** publicar o conteúdo de `frontend/dist` pelo processo de
      sempre (branch `deploy-frontend`). Confira que a pasta `modelos-face/`
      foi junto — sem ela a chamada por foto não funciona.
- [ ] Conferir as variáveis de ambiente do backend: `JWT_SECRET` (forte e
      **igual** ao de antes, senão todos os logins caem), `DB_HOST`/`DB_PORT`/
      `DB_USER`/`DB_PASSWORD`/`DB_NAME`.
- [ ] **Nunca** em produção: `PORTAL_CODIGO_NO_LOG=sim` (escreve os códigos de
      acesso no log). `ROTINA_COBRANCA=off` só se for de propósito (desliga a
      geração de mensalidades, a baixa automática e os lembretes).

## 3. Logo depois de subir

- [ ] Abrir `backend/logs/erros-AAAA-MM-DD.log` e ver se a subida registrou
      erro. Na subida o servidor, sozinho:
  - cria as tabelas e colunas novas;
  - remove a restrição de e-mail único dos alunos (irmãos podem usar o
    e-mail dos pais) — **(1ª vez)**;
  - cria a unidade "Sanryu", a configuração da academia (contrato padrão)
    e as categorias financeiras padrão, se ainda não existirem;
  - **(1ª vez, uma única vez)** converte as turmas antigas em **Academias
    Morganti** (externas, com o mesmo professor) e marca como **alunos
    externos** os alunos sem contrato. Turma que já teve chamada é mantida
    como turma do dojo. Depois disso, confira em *Academias Morganti* se cada
    uma tem professor com e-mail (necessário para o Gatame).

  Tudo isso é idempotente (rodar de novo não muda nada). Se algo falhar, fica
  no log e o servidor continua no ar.

## 4. Configuração no admin (1ª vez)

Em **Configurações**:

- [ ] **URL pública do site** (`https://...`) — links de pagamento, contrato e
      eventos nos e-mails e no WhatsApp.
- [ ] **URL pública da API** — o Mercado Pago avisa por ela quando um Pix é
      pago. Sem isso a baixa automática fica só na conferência de hora em hora.
- [ ] **Access Token do Mercado Pago** (de produção, não o de teste).
- [ ] **SMTP** (servidor, porta, usuário, senha, remetente). Sem SMTP ninguém
      recebe código da área do aluno, cobrança nem confirmação de aula
      experimental.

Em **Config. da academia**:

- [ ] Texto do **contrato** revisado por advogado (o padrão é genérico), junto
      com o texto da autorização de reconhecimento facial.
- [ ] **Desconto família** (começa em 0%), multa/juros e antecedência da
      cobrança.

Em **Financeiro → Contas e categorias**:

- [ ] Cadastrar caixa, banco e Mercado Pago com o **saldo de hoje** e marcar
      as formas de pagamento de cada conta (Pix → Mercado Pago, dinheiro →
      caixa...). Sem isso os pagamentos ficam sem conta e fora dos saldos.
- [ ] Lançar as **recorrentes** (aluguel, salários, luz).

Cadastros básicos: unidade (endereço aparece no e-mail da aula experimental),
turmas com instrutor, planos, e o acesso de cada sensei (Instrutores →
cadeado).

## 5. Backup

- [ ] **Backup automático diário do MySQL** (pelo painel da hospedagem ou um
      `mysqldump` agendado), guardando pelo menos 7 dias.
- [ ] Testar uma restauração uma vez (num banco separado) — backup que nunca
      foi restaurado não é garantia.
- [ ] Antes de cada deploy, um backup manual extra (seção 1).

## 6. Teste de fumaça em produção (1ª vez e após mudanças grandes)

Com dados reais, mas controlados:

- [ ] **Pix de verdade:** crie um plano de R$ 1,00, um aluno teste com o seu
      e-mail, contrato e gere a mensalidade. Abra o link, pague o Pix e
      confira: a página mostra "pagamento confirmado", a mensalidade fica paga
      no admin e a entrada aparece no financeiro, na conta do Mercado Pago.
      Depois cancele/encerre o teste.
- [ ] **Contrato:** assine o contrato teste pelo link no celular.
- [ ] **Área do aluno:** entre em `/portal` com o e-mail teste e confira se o
      código chega (e não cai no spam).
- [ ] **Aula experimental:** agende em `/aula-experimental` e veja aparecer em
      Interessados, com o e-mail de confirmação.
- [ ] **Sensei:** entre com um login de sensei pelo celular, faça uma chamada
      e confira que ele não acessa nada do admin.
- [ ] **Chamada por foto:** com um aluno teste que tenha foto e autorização,
      tire uma foto e confira se ele é reconhecido.

## 7. Se der errado

- Problema só no frontend: republique o build anterior.
- Problema no backend sem mexer em dados: volte o código para o commit anterior
  e reinicie (`git log` mostra os commits; os ajustes de banco da subida são
  aditivos e não atrapalham a versão anterior).
- Dados errados ou corrompidos: restaure o backup feito antes do deploy.
