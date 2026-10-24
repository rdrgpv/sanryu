import { useEffect, useState } from 'react';
import { CCard, CCardBody, CForm, CFormLabel, CFormInput, CFormTextarea, CInputGroup, CInputGroupText, CRow, CCol, CButton } from '@coreui/react';
import api from '../../services/api';

const MARCADORES = [
  ['{{contratante}}', 'quem assina (responsável, se o aluno for menor)'],
  ['{{cpfContratante}}', 'CPF de quem assina'],
  ['{{aluno}}', 'nome do aluno'],
  ['{{cpfAluno}}', 'CPF do aluno'],
  ['{{dataNascimentoAluno}}', 'nascimento do aluno'],
  ['{{unidade}}', 'unidade'],
  ['{{plano}}', 'nome do plano'],
  ['{{periodicidade}}', 'mensal, trimestral...'],
  ['{{valor}}', 'valor final por período'],
  ['{{diaVencimento}}', 'dia do vencimento'],
  ['{{dataInicio}}', 'início do contrato'],
  ['{{data}}', 'data da assinatura'],
];

const CAMPOS_SITE = [
  ['siteTelefone', 'Telefone', '(11) 0000-0000', 3],
  ['siteWhatsapp', 'WhatsApp', '(11) 90000-0000', 3],
  ['siteEmail', 'E-mail', 'contato@sanryu.com.br', 3],
  ['siteInstagram', 'Instagram', '@sanryudojo', 3],
];
const SITE_VAZIO = { siteTelefone: '', siteWhatsapp: '', siteEmail: '', siteInstagram: '', siteEndereco: '', siteHorarioFuncionamento: '' };

export default function ConfiguracaoAcademia() {
  const [form, setForm] = useState({
    descontoFamiliaPercentual: '',
    multaPercentual: '',
    jurosMensalPercentual: '',
    diasAntecedenciaCobranca: '',
    termoContrato: '',
    reciboNome: '',
    reciboDocumento: '',
    reciboEndereco: '',
    ...SITE_VAZIO,
  });
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    api.get('/admin/configuracao-academia').then((res) =>
      setForm({
        descontoFamiliaPercentual: res.data.descontoFamiliaPercentual,
        multaPercentual: res.data.multaPercentual,
        jurosMensalPercentual: res.data.jurosMensalPercentual,
        diasAntecedenciaCobranca: res.data.diasAntecedenciaCobranca,
        termoContrato: res.data.termoContrato,
        reciboNome: res.data.reciboNome || '',
        reciboDocumento: res.data.reciboDocumento || '',
        reciboEndereco: res.data.reciboEndereco || '',
        ...Object.fromEntries(Object.keys(SITE_VAZIO).map((campo) => [campo, res.data[campo] || ''])),
      })
    );
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setErro(null);
    setMensagem(null);
    setSalvando(true);

    try {
      await api.put('/admin/configuracao-academia', {
        ...form,
        descontoFamiliaPercentual: Number(form.descontoFamiliaPercentual),
        multaPercentual: Number(form.multaPercentual),
        jurosMensalPercentual: Number(form.jurosMensalPercentual),
        diasAntecedenciaCobranca: Number(form.diasAntecedenciaCobranca),
      });
      setMensagem('Configurações salvas.');
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div>
      <h1 className="h3 mb-3">Configurações da academia</h1>

      <CCard>
        <CCardBody>
          <CForm onSubmit={handleSubmit}>
            <CRow className="g-3">
              <CCol md={4}>
                <CFormLabel>Desconto família</CFormLabel>
                <CInputGroup>
                  <CFormInput
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={form.descontoFamiliaPercentual}
                    onChange={(event) => setForm((prev) => ({ ...prev, descontoFamiliaPercentual: event.target.value }))}
                  />
                  <CInputGroupText>%</CInputGroupText>
                </CInputGroup>
                <small className="text-body-secondary">
                  Aplicado do 2º aluno em diante do mesmo responsável. 0 = sem desconto.
                </small>
              </CCol>

              <CCol md={3}>
                <CFormLabel>Multa por atraso</CFormLabel>
                <CInputGroup>
                  <CFormInput
                    type="number"
                    min="0"
                    max="2"
                    step="0.01"
                    value={form.multaPercentual}
                    onChange={(event) => setForm((prev) => ({ ...prev, multaPercentual: event.target.value }))}
                  />
                  <CInputGroupText>%</CInputGroupText>
                </CInputGroup>
                <small className="text-body-secondary">Máximo 2% (CDC).</small>
              </CCol>
              <CCol md={3}>
                <CFormLabel>Juros de mora</CFormLabel>
                <CInputGroup>
                  <CFormInput
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={form.jurosMensalPercentual}
                    onChange={(event) => setForm((prev) => ({ ...prev, jurosMensalPercentual: event.target.value }))}
                  />
                  <CInputGroupText>% ao mês</CInputGroupText>
                </CInputGroup>
                <small className="text-body-secondary">Proporcional por dia. Máximo 1% ao mês.</small>
              </CCol>
              <CCol md={2}>
                <CFormLabel>Gerar cobrança</CFormLabel>
                <CInputGroup>
                  <CFormInput
                    type="number"
                    min="0"
                    max="28"
                    step="1"
                    value={form.diasAntecedenciaCobranca}
                    onChange={(event) => setForm((prev) => ({ ...prev, diasAntecedenciaCobranca: event.target.value }))}
                  />
                  <CInputGroupText>dias antes</CInputGroupText>
                </CInputGroup>
              </CCol>

              <CCol xs={12}>
                <h2 className="h6 mb-0 mt-2">Recibo de pagamento</h2>
                <small className="text-body-secondary">Quem aparece como emissor no recibo das mensalidades (recibo simples, sem valor fiscal).</small>
              </CCol>
              <CCol md={5}>
                <CFormLabel>Nome ou razão social</CFormLabel>
                <CFormInput value={form.reciboNome} placeholder="San·Ryu Dojo" onChange={(event) => setForm((prev) => ({ ...prev, reciboNome: event.target.value }))} />
              </CCol>
              <CCol md={3}>
                <CFormLabel>CPF ou CNPJ</CFormLabel>
                <CFormInput value={form.reciboDocumento} onChange={(event) => setForm((prev) => ({ ...prev, reciboDocumento: event.target.value }))} />
              </CCol>
              <CCol md={4}>
                <CFormLabel>Endereço</CFormLabel>
                <CFormInput value={form.reciboEndereco} onChange={(event) => setForm((prev) => ({ ...prev, reciboEndereco: event.target.value }))} />
              </CCol>

              <CCol xs={12}>
                <h2 className="h6 mb-0 mt-2">Contato no site</h2>
                <small className="text-body-secondary">Aparece no rodapé, na página de contato, no botão do WhatsApp e nos dados para o Google. Campo vazio não aparece.</small>
              </CCol>
              {CAMPOS_SITE.map(([campo, rotulo, exemplo, largura]) => (
                <CCol md={largura} key={campo}>
                  <CFormLabel>{rotulo}</CFormLabel>
                  <CFormInput value={form[campo]} placeholder={exemplo} onChange={(event) => setForm((prev) => ({ ...prev, [campo]: event.target.value }))} />
                </CCol>
              ))}
              <CCol md={6}>
                <CFormLabel>Endereço</CFormLabel>
                <CFormInput
                  value={form.siteEndereco}
                  placeholder="Rua Monte Serrat, 380 — Tatuapé, São Paulo - SP, 03312-000"
                  onChange={(event) => setForm((prev) => ({ ...prev, siteEndereco: event.target.value }))}
                />
                <small className="text-body-secondary">Usado também no mapa da página de contato.</small>
              </CCol>
              <CCol md={6}>
                <CFormLabel>Horário de funcionamento</CFormLabel>
                <CFormTextarea
                  rows={2}
                  value={form.siteHorarioFuncionamento}
                  placeholder={'Segunda a sexta: 07h — 22h\nSábado: 08h — 13h'}
                  onChange={(event) => setForm((prev) => ({ ...prev, siteHorarioFuncionamento: event.target.value }))}
                />
                <small className="text-body-secondary">Uma linha por período.</small>
              </CCol>

              <CCol md={12}>
                <CFormLabel>Texto do contrato de matrícula</CFormLabel>
                <CFormTextarea
                  rows={18}
                  className="font-monospace small"
                  value={form.termoContrato}
                  onChange={(event) => setForm((prev) => ({ ...prev, termoContrato: event.target.value }))}
                />
                <small className="text-body-secondary d-block mt-1">
                  O texto inicial é genérico — revise com um advogado. Mudanças valem só para contratos ainda não
                  assinados. Marcadores preenchidos automaticamente:
                </small>
                <div className="d-flex flex-wrap gap-2 mt-1">
                  {MARCADORES.map(([marcador, descricao]) => (
                    <span key={marcador} className="badge text-bg-light border fw-normal" title={descricao}>
                      <code>{marcador}</code> {descricao}
                    </span>
                  ))}
                </div>
              </CCol>
            </CRow>

            <div className="d-flex gap-2 mt-4 align-items-center">
              <CButton type="submit" color="primary" disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </CButton>
              {mensagem && <span className="text-success small">{mensagem}</span>}
            </div>
            {erro && <div className="alert alert-danger mt-3">{erro}</div>}
          </CForm>
        </CCardBody>
      </CCard>
    </div>
  );
}
