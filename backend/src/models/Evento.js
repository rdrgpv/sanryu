const { DataTypes, Op } = require('sequelize');
const sequelize = require('../config/database');

function slugify(texto) {
  return texto
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const Evento = sequelize.define('Evento', {
  nome: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  // Link amigável pra divulgação (ex.: /eventos/exame-de-faixa-agosto-2026), em vez do id numérico.
  // Gerado a partir do nome quando não informado; a rota pública aceita id ou slug.
  slug: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
  descricao: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  tipoEventoId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  data: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  local: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('agendado', 'realizado', 'cancelado'),
    allowNull: false,
    defaultValue: 'agendado',
  },
  valor: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  publicado: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  banner: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
  },
});

// Slug em branco/editado -> gera (ou re-slugifica) a partir do nome, garantindo unicidade
// com sufixo numérico em caso de colisão. Não mexe em slug já salvo se o admin não tocar nele.
Evento.beforeValidate(async (evento) => {
  const base = slugify(evento.slug && evento.slug.trim() ? evento.slug : evento.nome || '');

  if (!base) {
    evento.slug = null;
    return;
  }

  let candidato = base;
  let sufixo = 2;

  while (
    await Evento.findOne({
      where: {
        slug: candidato,
        ...(evento.id ? { id: { [Op.ne]: evento.id } } : {}),
      },
    })
  ) {
    candidato = `${base}-${sufixo}`;
    sufixo += 1;
  }

  evento.slug = candidato;
});

module.exports = Evento;
