const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Instrutor = sequelize.define('Instrutor', {
  nome: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  faixaId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  especialidade: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  fotoUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // Foto enviada pelo admin (JPEG reduzido em data URL). Tem prioridade sobre fotoUrl no site.
  foto: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
  },
  // Conquistas e certificações mostradas no perfil do site, uma por item (guardadas como JSON).
  titulos: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      try {
        const lista = JSON.parse(this.getDataValue('titulos') || '[]');
        return Array.isArray(lista) ? lista : [];
      } catch {
        return [];
      }
    },
    set(lista) {
      const limpos = (Array.isArray(lista) ? lista : []).map((item) => String(item || '').trim()).filter(Boolean);
      this.setDataValue('titulos', limpos.length ? JSON.stringify(limpos) : null);
    },
  },
  // Só quem está marcado aparece em "Nossos instrutores" no site.
  exibirNoSite: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
}, {
  // A foto é pesada (data URL): fica fora das listagens e dos includes; quem precisa usa unscoped().
  defaultScope: { attributes: { exclude: ['foto'] } },
});

module.exports = Instrutor;
