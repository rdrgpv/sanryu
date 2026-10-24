import { useEffect, useState } from 'react';
import api from '../services/api';

// Dados públicos do site (contato e planos), buscados uma vez só por visita e compartilhados entre
// rodapé, contato, botão do WhatsApp e página de planos.
let promessa = null;

function carregarSite() {
  if (!promessa) {
    promessa = api
      .get('/site')
      .then((res) => res.data)
      .catch(() => {
        promessa = null;
        return null;
      });
  }
  return promessa;
}

export function useSite() {
  const [site, setSite] = useState(null);

  useEffect(() => {
    let ativo = true;
    carregarSite().then((dados) => ativo && setSite(dados));
    return () => {
      ativo = false;
    };
  }, []);

  return site;
}

const TITULO_PADRAO = 'San·Ryu Dojo — Morganti Ju-Jitsu';
const DESCRICAO_PADRAO =
  'Dojo de Morganti Ju-Jitsu no Tatuapé, São Paulo. Aulas para crianças e adultos, graduação por faixas e aula experimental gratuita.';

// Título da aba e descrição de cada página (o Google lê as duas).
export function usePagina(titulo, descricao) {
  useEffect(() => {
    document.title = titulo ? `${titulo} | San·Ryu Dojo` : TITULO_PADRAO;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', descricao || DESCRICAO_PADRAO);
  }, [titulo, descricao]);
}

// "(11) 98765-4321" -> "5511987654321" (wa.me exige o número com DDI, só dígitos).
export function linkWhatsapp(numero, mensagem) {
  let digitos = String(numero || '').replace(/\D/g, '');
  if (!digitos) return null;
  if (digitos.length <= 11) digitos = `55${digitos}`;
  return `https://wa.me/${digitos}${mensagem ? `?text=${encodeURIComponent(mensagem)}` : ''}`;
}

// "@sanryudojo", "sanryudojo" ou a URL inteira -> URL do perfil.
export function linkInstagram(valor) {
  const texto = String(valor || '').trim();
  if (!texto) return null;
  if (/^https?:\/\//i.test(texto)) return texto;
  return `https://www.instagram.com/${texto.replace(/^@/, '')}/`;
}

export function arrobaInstagram(valor) {
  const texto = String(valor || '').trim();
  if (!texto) return null;
  const usuario = texto.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/[/?#].*$/, '').replace(/^@/, '');
  return `@${usuario}`;
}
