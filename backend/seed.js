require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, Admin, Faixa, TipoEvento, Banco, Configuracao } = require('./src/models');

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
      chavePix: process.env.PIX_CHAVE_PADRAO || 'contato@sanryu.com.br',
      tipoChave: 'email',
      titular: 'San Ryu Dojo',
      cidade: 'SAO PAULO',
    });
    console.log('Configuração Pix padrão criada.');
  } else {
    console.log('Configuração Pix já existe, pulando.');
  }

  const configuracaoCount = await Configuracao.count();

  if (configuracaoCount === 0) {
    await Configuracao.bulkCreate([
      { sistema: 'SAN', parametro: 'GATAME_URL', valor: process.env.GATAME_API_URL || '', tipoParametro: 'S' },
      { sistema: 'SAN', parametro: 'GATAME_EMAIL', valor: process.env.GATAME_EMAIL || '', tipoParametro: 'S' },
      { sistema: 'SAN', parametro: 'GATAME_SENHA', valor: process.env.GATAME_SENHA || '', tipoParametro: 'S' },
      { sistema: 'SAN', parametro: 'MP_ACCESS_TOKEN', valor: process.env.MP_ACCESS_TOKEN || '', tipoParametro: 'S' },
    ]);
    console.log('Configurações padrão criadas (edite em /admin/configuracoes).');
  } else {
    console.log('Configurações já existem, pulando.');
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
