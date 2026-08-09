require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, Admin, Instrutor, Turma, Aluno, Matricula, Faixa, TipoEvento, Banco } = require('./src/models');

async function seed() {
  await sequelize.sync();

  const adminCount = await Admin.count();

  if (adminCount === 0) {
    const passwordHash = await bcrypt.hash(process.env.ADMIN_DEFAULT_PASSWORD || 'troque_esta_senha', 10);
    await Admin.create({
      nome: 'Administrador',
      username: process.env.ADMIN_DEFAULT_USER || 'admin',
      passwordHash,
    });
    console.log('Admin padrão criado.');
  } else {
    console.log('Admin já existe, pulando.');
  }

  const instrutorCount = await Instrutor.count();

  if (instrutorCount === 0) {
    const [sensei, kidsCoach, competicaoCoach] = await Instrutor.bulkCreate([
      {
        nome: 'Sensei Roberto Morganti',
        faixa: 'Preta 5º Dan',
        especialidade: 'Ju-Jitsu',
        bio: 'Responsável técnico do San·Ryu Dojo, formado no Método Morganti Ju-Jitsu com mais de 20 anos de tatame.',
      },
      {
        nome: 'Sensei Fernanda Lima',
        faixa: 'Preta 2º Dan',
        especialidade: 'Ju-Jitsu Kids',
        bio: 'Especialista em ensino infantil, forma a próxima geração dentro do Método Morganti.',
      },
      {
        nome: 'Sensei Bruno Alencar',
        faixa: 'Preta 3º Dan',
        especialidade: 'Ju-Jitsu Competição',
        bio: 'Ex-competidor, hoje dedicado à preparação de atletas para campeonatos.',
      },
    ], { returning: true });

    console.log('Instrutores de exemplo criados.');

    const turmaCount = await Turma.count();

    if (turmaCount === 0) {
      await Turma.bulkCreate([
        {
          nome: 'Ju-Jitsu Kids Iniciante',
          modalidade: 'Ju-Jitsu',
          nivel: 'Iniciante',
          instrutorId: kidsCoach.id,
          diaSemana: 'Segunda,Quarta',
          horaInicio: '17:00',
          horaFim: '18:00',
          vagas: 25,
        },
        {
          nome: 'Ju-Jitsu Kids Avançado',
          modalidade: 'Ju-Jitsu',
          nivel: 'Avançado',
          instrutorId: kidsCoach.id,
          diaSemana: 'Terça,Quinta',
          horaInicio: '17:00',
          horaFim: '18:00',
          vagas: 20,
        },
        {
          nome: 'Ju-Jitsu Adulto Iniciante',
          modalidade: 'Ju-Jitsu',
          nivel: 'Iniciante',
          instrutorId: sensei.id,
          diaSemana: 'Segunda,Quarta,Sexta',
          horaInicio: '19:00',
          horaFim: '20:00',
          vagas: 20,
        },
        {
          nome: 'Ju-Jitsu Avançado',
          modalidade: 'Ju-Jitsu',
          nivel: 'Avançado',
          instrutorId: sensei.id,
          diaSemana: 'Terça,Quinta',
          horaInicio: '20:00',
          horaFim: '21:30',
          vagas: 15,
        },
        {
          nome: 'Ju-Jitsu Competição',
          modalidade: 'Ju-Jitsu',
          nivel: 'Avançado',
          instrutorId: competicaoCoach.id,
          diaSemana: 'Sábado',
          horaInicio: '09:00',
          horaFim: '11:00',
          vagas: 15,
        },
      ], { returning: true });

      console.log('Turmas de exemplo criadas.');
    }
  } else {
    console.log('Instrutores já existem, pulando instrutores e turmas.');
  }

  const faixaCount = await Faixa.count();

  if (faixaCount === 0) {
    await Faixa.bulkCreate([
      { nome: 'Branca', cor: '#FFFFFF', ordem: 1, valorComCarteirinha: 100, valorSemCarteirinha: 150 },
      { nome: 'Azul', cor: '#0000FF', ordem: 2, valorComCarteirinha: 120, valorSemCarteirinha: 170 },
      { nome: 'Roxa', cor: '#800080', ordem: 3, valorComCarteirinha: 140, valorSemCarteirinha: 190 },
      { nome: 'Marrom', cor: '#8B4513', ordem: 4, valorComCarteirinha: 160, valorSemCarteirinha: 210 },
      { nome: 'Preta', cor: '#000000', grau: 1, ordem: 5, valorComCarteirinha: 200, valorSemCarteirinha: 250 },
    ]);

    console.log('Faixas de exemplo criadas.');
  } else {
    console.log('Faixas já existem, pulando.');
  }

  const tipoEventoCount = await TipoEvento.count();

  if (tipoEventoCount === 0) {
    await TipoEvento.create({ id: 1, nome: 'Exame de Faixa', cobravel: true });
    console.log('Tipo de evento padrão "Exame de Faixa" criado.');
  } else {
    console.log('Tipos de evento já existem, pulando.');
  }

  const bancoCount = await Banco.count();

  if (bancoCount === 0) {
    await Banco.create({
      nome: 'Conta principal',
      chavePix: process.env.PIX_CHAVE_PADRAO || 'contato@sanryudojo.com.br',
      tipoChave: 'email',
      titular: 'San Ryu Dojo',
    });
    console.log('Configuração Pix padrão criada.');
  } else {
    console.log('Configuração Pix já existe, pulando.');
  }

  const alunoCount = await Aluno.count();

  if (alunoCount === 0) {
    const alunos = await Aluno.bulkCreate([
      { nome: 'João Silva', email: 'joao.silva@example.com', telefone: '(11) 91234-0001', faixa: 'Branca' },
      { nome: 'Maria Souza', email: 'maria.souza@example.com', telefone: '(11) 91234-0002', faixa: 'Azul' },
      { nome: 'Pedro Santos', email: 'pedro.santos@example.com', telefone: '(11) 91234-0003', faixa: 'Roxa' },
      { nome: 'Ana Oliveira', email: 'ana.oliveira@example.com', telefone: '(11) 91234-0004', faixa: 'Branca' },
      { nome: 'Lucas Costa', email: 'lucas.costa@example.com', telefone: '(11) 91234-0005', faixa: 'Marrom' },
      { nome: 'Beatriz Lima', email: 'beatriz.lima@example.com', telefone: '(11) 91234-0006', faixa: 'Azul' },
      { nome: 'Gabriel Pereira', email: 'gabriel.pereira@example.com', telefone: '(11) 91234-0007', faixa: 'Branca' },
      { nome: 'Camila Rodrigues', email: 'camila.rodrigues@example.com', telefone: '(11) 91234-0008', faixa: 'Preta' },
    ], { returning: true });

    console.log('Alunos de exemplo criados.');

    const turmas = await Turma.findAll();

    if (turmas.length > 0) {
      const matriculas = alunos.slice(0, 6).map((aluno, index) => ({
        alunoId: aluno.id,
        turmaId: turmas[index % turmas.length].id,
        status: 'ativa',
      }));

      await Matricula.bulkCreate(matriculas);
      console.log('Matrículas de exemplo criadas.');
    }
  } else {
    console.log('Alunos já existem, pulando.');
  }

  console.log('Seed finalizado.');
}

module.exports = seed;

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Erro ao executar seed:', err);
      process.exit(1);
    });
}
