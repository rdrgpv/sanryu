const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SITUACOES_ALUNO = ['ativo', 'trancado', 'cancelado'];

const Aluno = sequelize.define('Aluno', {
  nome: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  // Opcional e pode repetir: criança sem email próprio, ou irmãos usando o email dos pais. Recursos
  // que dependem do email (consulta/cadastro no Gatame) já checam se ele existe antes.
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: true,
    },
  },
  telefone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  dataNascimento: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  cpf: {
    type: DataTypes.STRING(14),
    allowNull: true,
  },
  rg: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  sexo: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // JPEG em data URL, já reduzido no navegador antes de enviar (ver AlunoForm).
  foto: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
  },

  unidadeId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  faixaId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  // Medida física da faixa (PP/P/M/G/GG) — enviada como tamanho_faixa ao cadastrar o aluno no
  // Gatame (ver alunoController.cadastrarNoGatame). Mesmas opções da inscrição pública de eventos.
  tamanhoFaixa: {
    type: DataTypes.CHAR(2),
    allowNull: true,
  },
  dataInicio: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  situacao: {
    type: DataTypes.ENUM(...SITUACOES_ALUNO),
    allowNull: false,
    defaultValue: 'ativo',
  },
  // Espelho de situacao === 'ativo', mantido pelo hook abaixo — o dashboard e as contagens antigas
  // filtram por ele. Não editar direto: mude a situacao.
  ativo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },

  cep: {
    type: DataTypes.STRING(9),
    allowNull: true,
  },
  logradouro: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  numero: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  complemento: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  bairro: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  cidade: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  uf: {
    type: DataTypes.CHAR(2),
    allowNull: true,
  },

  responsavelId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  parentescoResponsavel: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  contatoEmergenciaNome: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  contatoEmergenciaTelefone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  contatoEmergenciaParentesco: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  tipoSanguineo: {
    type: DataTypes.STRING(3),
    allowNull: true,
  },
  alergias: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  medicamentos: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  restricoesMedicas: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  observacoes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  // Consentimento pro reconhecimento facial na chamada por foto. Biometria é dado sensível na LGPD
  // (art. 11; de menor, consentimento do responsável — art. 14): sem isto, o aluno fica fora da
  // comparação. Origem: "contrato" (marcado ao assinar pelo link/recepção) ou "cadastro" (admin
  // registrou autorização por escrito). Desmarcar = revogação.
  consentimentoBiometria: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  consentimentoBiometriaEm: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  consentimentoBiometriaOrigem: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },

  // Marca que esse aluno já foi cadastrado no Gatame a partir desta tela (ver
  // alunoController.cadastrarNoGatame) — evita tentar de novo à toa.
  cadastradoNoGatame: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
});

Aluno.beforeValidate((aluno) => {
  if (aluno.email === '') aluno.email = null;
});

// beforeSave (e não beforeValidate): só os campos alterados em hooks de save entram no UPDATE —
// num aluno.update({ situacao }) o "ativo" mudado no beforeValidate não era gravado.
Aluno.beforeSave((aluno) => {
  if (aluno.situacao) aluno.ativo = aluno.situacao === 'ativo';
});

Aluno.SITUACOES = SITUACOES_ALUNO;

module.exports = Aluno;
