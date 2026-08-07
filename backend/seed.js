require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, Admin, Instrutor, Turma, Aluno, Matricula } = require('./src/models');

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
    const [sensei, judoca, karateca] = await Instrutor.bulkCreate([
      {
        nome: 'Sensei Hiroshi Tanaka',
        faixa: 'Preta 5º Dan',
        especialidade: 'Jiu-Jitsu',
        bio: 'Mais de 20 anos de tatame, formado no Japão e radicado no Brasil desde 2005.',
      },
      {
        nome: 'Sensei Marina Kobayashi',
        faixa: 'Preta 3º Dan',
        especialidade: 'Judo',
        bio: 'Ex-atleta de seleção, hoje dedicada a formar a próxima geração de judocas.',
      },
      {
        nome: 'Sensei Ricardo Almeida',
        faixa: 'Preta 4º Dan',
        especialidade: 'Karatê',
        bio: 'Especialista em karatê tradicional Shotokan, com foco em disciplina e kata.',
      },
    ], { returning: true });

    console.log('Instrutores de exemplo criados.');

    const turmaCount = await Turma.count();

    if (turmaCount === 0) {
      await Turma.bulkCreate([
        {
          nome: 'Jiu-Jitsu Iniciante',
          modalidade: 'Jiu-Jitsu',
          nivel: 'Iniciante',
          instrutorId: sensei.id,
          diaSemana: 'Segunda,Quarta,Sexta',
          horaInicio: '19:00',
          horaFim: '20:00',
          vagas: 20,
        },
        {
          nome: 'Jiu-Jitsu Avançado',
          modalidade: 'Jiu-Jitsu',
          nivel: 'Avançado',
          instrutorId: sensei.id,
          diaSemana: 'Terça,Quinta',
          horaInicio: '20:00',
          horaFim: '21:30',
          vagas: 15,
        },
        {
          nome: 'Judo Kids',
          modalidade: 'Judo',
          nivel: 'Todos os níveis',
          instrutorId: judoca.id,
          diaSemana: 'Segunda,Quarta',
          horaInicio: '17:00',
          horaFim: '18:00',
          vagas: 25,
        },
        {
          nome: 'Judo Adulto',
          modalidade: 'Judo',
          nivel: 'Todos os níveis',
          instrutorId: judoca.id,
          diaSemana: 'Sábado',
          horaInicio: '09:00',
          horaFim: '10:30',
          vagas: 20,
        },
        {
          nome: 'Karatê Shotokan',
          modalidade: 'Karate',
          nivel: 'Todos os níveis',
          instrutorId: karateca.id,
          diaSemana: 'Terça,Quinta,Sábado',
          horaInicio: '18:00',
          horaFim: '19:00',
          vagas: 20,
        },
      ], { returning: true });

      console.log('Turmas de exemplo criadas.');
    }
  } else {
    console.log('Instrutores já existem, pulando instrutores e turmas.');
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
  process.exit(0);
}

seed().catch((err) => {
  console.error('Erro ao executar seed:', err);
  process.exit(1);
});
