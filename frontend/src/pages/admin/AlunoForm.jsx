import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  CCard,
  CCardBody,
  CForm,
  CFormLabel,
  CFormInput,
  CFormSelect,
  CFormTextarea,
  CRow,
  CCol,
  CButton,
  CNav,
  CNavItem,
  CNavLink,
  CBadge,
  CFormCheck,
} from '@coreui/react';
import api from '../../services/api';
import { OPCOES_TAMANHO_FAIXA } from '../../utils/opcoesTamanhoFaixa.js';
import { formatarCpf, cpfValido, formatarCep, formatarTelefone, calcularIdade, formatarDataHora } from '../../utils/formato.js';
import { reduzirImagem } from '../../utils/imagem.js';

const estadoInicial = {
  nome: '',
  email: '',
  telefone: '',
  dataNascimento: '',
  cpf: '',
  rg: '',
  sexo: '',
  foto: '',
  unidadeId: '',
  faixaId: '',
  tamanhoFaixa: '',
  dataInicio: '',
  situacao: 'ativo',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
  responsavelId: '',
  parentescoResponsavel: '',
  contatoEmergenciaNome: '',
  contatoEmergenciaTelefone: '',
  contatoEmergenciaParentesco: '',
  tipoSanguineo: '',
  alergias: '',
  medicamentos: '',
  restricoesMedicas: '',
  observacoes: '',
  consentimentoBiometria: false,
  consentimentoBiometriaEm: null,
  consentimentoBiometriaOrigem: null,
};

const responsavelNovoInicial = { nome: '', cpf: '', telefone: '', email: '' };

const ABAS = [
  { chave: 'pessoal', label: 'Dados pessoais' },
  { chave: 'academia', label: 'Academia' },
  { chave: 'endereco', label: 'Endereço' },
  { chave: 'responsavel', label: 'Responsável' },
  { chave: 'saude', label: 'Emergência e saúde' },
];

const UFS = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ');
const TIPOS_SANGUINEOS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const PARENTESCOS = ['Mãe', 'Pai', 'Avó', 'Avô', 'Tia', 'Tio', 'Irmã', 'Irmão', 'Tutor(a) legal', 'Outro'];

export default function AlunoForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editando = !!id;
  const [form, setForm] = useState(estadoInicial);
  const [faixas, setFaixas] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [responsaveis, setResponsaveis] = useState([]);
  // "existente" escolhe um responsável já cadastrado (ex.: irmão já matriculado); "novo" cadastra junto.
  const [modoResponsavel, setModoResponsavel] = useState('existente');
  const [responsavelNovo, setResponsavelNovo] = useState(responsavelNovoInicial);
  const [aba, setAba] = useState('pessoal');
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

  const idade = calcularIdade(form.dataNascimento);
  const menorDeIdade = idade !== null && idade < 18;

  useEffect(() => {
    api.get('/admin/faixas').then((res) => setFaixas(res.data));
    api.get('/admin/responsaveis').then((res) => setResponsaveis(res.data));
    api.get('/admin/unidades').then((res) => {
      setUnidades(res.data);
      // Aluno novo com uma unidade só cadastrada: já vem selecionada.
      const ativas = res.data.filter((unidade) => unidade.ativo);
      if (!editando && ativas.length === 1) {
        setForm((prev) => ({ ...prev, unidadeId: prev.unidadeId || String(ativas[0].id) }));
      }
    });
  }, [editando]);

  useEffect(() => {
    if (!editando) return;
    api.get(`/admin/alunos/${id}`).then((res) => {
      const aluno = res.data;
      const carregado = {};
      Object.keys(estadoInicial).forEach((campo) => {
        carregado[campo] = aluno[campo] ?? estadoInicial[campo];
      });
      setForm(carregado);
    });
  }, [id, editando]);

  function atualizar(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  function handleChange(event) {
    atualizar(event.target.name, event.target.value);
  }

  function atualizarResponsavelNovo(campo, valor) {
    setResponsavelNovo((prev) => ({ ...prev, [campo]: valor }));
  }

  async function handleFoto(event) {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;

    try {
      atualizar('foto', await reduzirImagem(arquivo));
    } catch (err) {
      setErro(err.message);
    } finally {
      event.target.value = '';
    }
  }

  // Preenche o endereço pelo CEP (ViaCEP). Falha silenciosa: se não achar, a pessoa digita.
  async function buscarCep() {
    const digitos = form.cep.replace(/\D/g, '');
    if (digitos.length !== 8) return;

    setBuscandoCep(true);
    try {
      const resposta = await fetch(`https://viacep.com.br/ws/${digitos}/json/`);
      const dados = await resposta.json();
      if (!dados.erro) {
        setForm((prev) => ({
          ...prev,
          logradouro: dados.logradouro || prev.logradouro,
          bairro: dados.bairro || prev.bairro,
          cidade: dados.localidade || prev.cidade,
          uf: dados.uf || prev.uf,
        }));
      }
    } catch (err) {
      // Sem internet ou ViaCEP fora do ar — segue com preenchimento manual.
    } finally {
      setBuscandoCep(false);
    }
  }

  // As abas escondem campos, então a validação é feita aqui (e não por "required" do navegador, que
  // não consegue apontar um campo de uma aba fechada) — leva pra aba com o problema.
  function validar() {
    if (!form.nome.trim()) return { aba: 'pessoal', mensagem: 'Informe o nome do aluno.' };
    if (form.cpf && !cpfValido(form.cpf)) return { aba: 'pessoal', mensagem: 'CPF do aluno inválido.' };
    if (!form.unidadeId) return { aba: 'academia', mensagem: 'Selecione a unidade.' };

    const temResponsavel = modoResponsavel === 'novo' ? responsavelNovo.nome.trim() : form.responsavelId;
    if (menorDeIdade && !temResponsavel) {
      return { aba: 'responsavel', mensagem: 'Aluno menor de idade: informe o responsável.' };
    }
    if (modoResponsavel === 'novo' && responsavelNovo.cpf && !cpfValido(responsavelNovo.cpf)) {
      return { aba: 'responsavel', mensagem: 'CPF do responsável inválido.' };
    }
    return null;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErro(null);

    const problema = validar();
    if (problema) {
      setAba(problema.aba);
      setErro(problema.mensagem);
      return;
    }

    const payload = {
      ...form,
      responsavelId: modoResponsavel === 'existente' ? form.responsavelId || null : null,
      responsavelNovo: modoResponsavel === 'novo' ? responsavelNovo : undefined,
    };

    setSalvando(true);
    try {
      if (editando) {
        await api.put(`/admin/alunos/${id}`, payload);
      } else {
        await api.post('/admin/alunos', payload);
      }
      navigate('/admin/alunos');
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar aluno.');
    } finally {
      setSalvando(false);
    }
  }

  const responsavelSelecionado = responsaveis.find((responsavel) => String(responsavel.id) === String(form.responsavelId));

  return (
    <div>
      <Link to="/admin/alunos" className="text-body-secondary text-decoration-none d-inline-block mb-2">
        &larr; Voltar
      </Link>
      <h1 className="h3 mb-3">{editando ? 'Editar aluno' : 'Novo aluno'}</h1>

      <CCard>
        <CCardBody>
          <CNav variant="underline-border" className="mb-4 flex-nowrap overflow-auto">
            {ABAS.map((item) => (
              <CNavItem key={item.chave}>
                <CNavLink
                  as="button"
                  type="button"
                  active={aba === item.chave}
                  onClick={() => setAba(item.chave)}
                  className="text-nowrap"
                >
                  {item.label}
                  {item.chave === 'responsavel' && menorDeIdade && (
                    <CBadge color="warning" className="ms-1">
                      menor
                    </CBadge>
                  )}
                </CNavLink>
              </CNavItem>
            ))}
          </CNav>

          <CForm onSubmit={handleSubmit} noValidate>
            {aba === 'pessoal' && (
              <CRow className="g-3">
                <CCol md={3} className="text-center">
                  <div className="aluno-foto mb-2">
                    {form.foto ? <img src={form.foto} alt="Foto do aluno" /> : <span>Sem foto</span>}
                  </div>
                  <CFormLabel className="btn btn-outline-secondary btn-sm mb-1">
                    {form.foto ? 'Trocar foto' : 'Adicionar foto'}
                    <input type="file" accept="image/*" capture="user" hidden onChange={handleFoto} />
                  </CFormLabel>
                  {form.foto && (
                    <div>
                      <CButton color="link" size="sm" className="text-danger" onClick={() => atualizar('foto', '')}>
                        Remover
                      </CButton>
                    </div>
                  )}
                </CCol>
                <CCol md={9}>
                  <CRow className="g-3">
                    <CCol md={8}>
                      <CFormLabel>Nome completo *</CFormLabel>
                      <CFormInput name="nome" value={form.nome} onChange={handleChange} />
                    </CCol>
                    <CCol md={4}>
                      <CFormLabel>Nascimento {idade !== null && <small className="text-body-secondary">({idade} anos)</small>}</CFormLabel>
                      <CFormInput type="date" name="dataNascimento" value={form.dataNascimento} onChange={handleChange} />
                    </CCol>
                    <CCol md={4}>
                      <CFormLabel>CPF</CFormLabel>
                      <CFormInput
                        inputMode="numeric"
                        value={form.cpf}
                        onChange={(event) => atualizar('cpf', formatarCpf(event.target.value))}
                        invalid={!!form.cpf && form.cpf.length === 14 && !cpfValido(form.cpf)}
                      />
                    </CCol>
                    <CCol md={4}>
                      <CFormLabel>RG</CFormLabel>
                      <CFormInput name="rg" value={form.rg} onChange={handleChange} />
                    </CCol>
                    <CCol md={4}>
                      <CFormLabel>Sexo</CFormLabel>
                      <CFormSelect name="sexo" value={form.sexo} onChange={handleChange}>
                        <option value="">Selecione</option>
                        <option value="feminino">Feminino</option>
                        <option value="masculino">Masculino</option>
                        <option value="outro">Outro</option>
                      </CFormSelect>
                    </CCol>
                    <CCol md={6}>
                      <CFormLabel>Email</CFormLabel>
                      <CFormInput type="email" name="email" value={form.email} onChange={handleChange} />
                      <small className="text-body-secondary">Opcional. Pode ser o mesmo do responsável.</small>
                    </CCol>
                    <CCol md={6}>
                      <CFormLabel>Telefone</CFormLabel>
                      <CFormInput
                        inputMode="numeric"
                        value={form.telefone}
                        onChange={(event) => atualizar('telefone', formatarTelefone(event.target.value))}
                      />
                    </CCol>
                  </CRow>
                </CCol>
              </CRow>
            )}

            {aba === 'academia' && (
              <CRow className="g-3">
                <CCol md={4}>
                  <CFormLabel>Unidade *</CFormLabel>
                  <CFormSelect name="unidadeId" value={form.unidadeId} onChange={handleChange}>
                    <option value="">Selecione</option>
                    {unidades.map((unidade) => (
                      <option key={unidade.id} value={unidade.id} disabled={!unidade.ativo}>
                        {unidade.nome}
                        {!unidade.ativo ? ' (inativa)' : ''}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
                <CCol md={4}>
                  <CFormLabel>Situação</CFormLabel>
                  <CFormSelect name="situacao" value={form.situacao} onChange={handleChange}>
                    <option value="ativo">Ativo</option>
                    <option value="trancado">Trancado</option>
                    <option value="cancelado">Cancelado</option>
                  </CFormSelect>
                </CCol>
                <CCol md={4}>
                  <CFormLabel>Data de início</CFormLabel>
                  <CFormInput type="date" name="dataInicio" value={form.dataInicio} onChange={handleChange} />
                </CCol>
                <CCol md={4}>
                  <CFormLabel>Faixa</CFormLabel>
                  <CFormSelect name="faixaId" value={form.faixaId} onChange={handleChange}>
                    <option value="">Selecione</option>
                    {faixas.map((faixa) => (
                      <option key={faixa.id} value={faixa.id}>
                        {faixa.nome}
                        {faixa.grau ? ` ${faixa.grau}º Dan` : ''}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
                <CCol md={4}>
                  <CFormLabel>Tamanho da faixa</CFormLabel>
                  <CFormSelect name="tamanhoFaixa" value={form.tamanhoFaixa} onChange={handleChange}>
                    <option value="">Selecione</option>
                    {OPCOES_TAMANHO_FAIXA.map((opcao) => (
                      <option key={opcao.valor} value={opcao.valor}>
                        {opcao.label}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
              </CRow>
            )}

            {aba === 'endereco' && (
              <CRow className="g-3">
                <CCol md={3}>
                  <CFormLabel>CEP {buscandoCep && <small className="text-body-secondary">buscando...</small>}</CFormLabel>
                  <CFormInput
                    inputMode="numeric"
                    value={form.cep}
                    onChange={(event) => atualizar('cep', formatarCep(event.target.value))}
                    onBlur={buscarCep}
                  />
                </CCol>
                <CCol md={7}>
                  <CFormLabel>Rua</CFormLabel>
                  <CFormInput name="logradouro" value={form.logradouro} onChange={handleChange} />
                </CCol>
                <CCol md={2}>
                  <CFormLabel>Número</CFormLabel>
                  <CFormInput name="numero" value={form.numero} onChange={handleChange} />
                </CCol>
                <CCol md={4}>
                  <CFormLabel>Complemento</CFormLabel>
                  <CFormInput name="complemento" value={form.complemento} onChange={handleChange} />
                </CCol>
                <CCol md={3}>
                  <CFormLabel>Bairro</CFormLabel>
                  <CFormInput name="bairro" value={form.bairro} onChange={handleChange} />
                </CCol>
                <CCol md={3}>
                  <CFormLabel>Cidade</CFormLabel>
                  <CFormInput name="cidade" value={form.cidade} onChange={handleChange} />
                </CCol>
                <CCol md={2}>
                  <CFormLabel>UF</CFormLabel>
                  <CFormSelect name="uf" value={form.uf} onChange={handleChange}>
                    <option value="">-</option>
                    {UFS.map((uf) => (
                      <option key={uf} value={uf}>
                        {uf}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
              </CRow>
            )}

            {aba === 'responsavel' && (
              <>
                {menorDeIdade ? (
                  <p className="text-warning-emphasis small">Aluno menor de idade — o responsável é obrigatório.</p>
                ) : (
                  <p className="text-body-secondary small">Opcional para maiores de idade (ex.: quem paga a mensalidade).</p>
                )}

                <div className="d-flex gap-3 mb-3">
                  <label className="d-flex align-items-center gap-1">
                    <input
                      type="radio"
                      checked={modoResponsavel === 'existente'}
                      onChange={() => setModoResponsavel('existente')}
                    />
                    Já cadastrado
                  </label>
                  <label className="d-flex align-items-center gap-1">
                    <input type="radio" checked={modoResponsavel === 'novo'} onChange={() => setModoResponsavel('novo')} />
                    Cadastrar novo
                  </label>
                </div>

                <CRow className="g-3">
                  {modoResponsavel === 'existente' ? (
                    <CCol md={6}>
                      <CFormLabel>Responsável</CFormLabel>
                      <CFormSelect name="responsavelId" value={form.responsavelId} onChange={handleChange}>
                        <option value="">Nenhum</option>
                        {responsaveis.map((responsavel) => (
                          <option key={responsavel.id} value={responsavel.id}>
                            {responsavel.nome}
                            {responsavel.cpf ? ` — ${responsavel.cpf}` : ''}
                          </option>
                        ))}
                      </CFormSelect>
                      {responsavelSelecionado && (
                        <small className="text-body-secondary">
                          {[responsavelSelecionado.telefone, responsavelSelecionado.email].filter(Boolean).join(' · ') || 'Sem contato cadastrado'}
                          {responsavelSelecionado.alunos?.length > 0 &&
                            ` · também responsável por ${responsavelSelecionado.alunos
                              .filter((aluno) => String(aluno.id) !== String(id))
                              .map((aluno) => aluno.nome)
                              .join(', ') || '—'}`}
                        </small>
                      )}
                    </CCol>
                  ) : (
                    <>
                      <CCol md={6}>
                        <CFormLabel>Nome completo do responsável *</CFormLabel>
                        <CFormInput value={responsavelNovo.nome} onChange={(event) => atualizarResponsavelNovo('nome', event.target.value)} />
                      </CCol>
                      <CCol md={3}>
                        <CFormLabel>CPF</CFormLabel>
                        <CFormInput
                          inputMode="numeric"
                          value={responsavelNovo.cpf}
                          onChange={(event) => atualizarResponsavelNovo('cpf', formatarCpf(event.target.value))}
                          invalid={responsavelNovo.cpf.length === 14 && !cpfValido(responsavelNovo.cpf)}
                        />
                      </CCol>
                      <CCol md={3}>
                        <CFormLabel>Telefone</CFormLabel>
                        <CFormInput
                          inputMode="numeric"
                          value={responsavelNovo.telefone}
                          onChange={(event) => atualizarResponsavelNovo('telefone', formatarTelefone(event.target.value))}
                        />
                      </CCol>
                      <CCol md={6}>
                        <CFormLabel>Email</CFormLabel>
                        <CFormInput
                          type="email"
                          value={responsavelNovo.email}
                          onChange={(event) => atualizarResponsavelNovo('email', event.target.value)}
                        />
                      </CCol>
                    </>
                  )}
                  <CCol md={modoResponsavel === 'novo' ? 6 : 4}>
                    <CFormLabel>Parentesco</CFormLabel>
                    <CFormSelect name="parentescoResponsavel" value={form.parentescoResponsavel} onChange={handleChange}>
                      <option value="">Selecione</option>
                      {PARENTESCOS.map((parentesco) => (
                        <option key={parentesco} value={parentesco}>
                          {parentesco}
                        </option>
                      ))}
                    </CFormSelect>
                  </CCol>
                </CRow>
              </>
            )}

            {aba === 'saude' && (
              <CRow className="g-3">
                <CCol xs={12}>
                  <h2 className="h6 mb-0">Contato de emergência</h2>
                </CCol>
                <CCol md={5}>
                  <CFormLabel>Nome</CFormLabel>
                  <CFormInput name="contatoEmergenciaNome" value={form.contatoEmergenciaNome} onChange={handleChange} />
                </CCol>
                <CCol md={4}>
                  <CFormLabel>Telefone</CFormLabel>
                  <CFormInput
                    inputMode="numeric"
                    value={form.contatoEmergenciaTelefone}
                    onChange={(event) => atualizar('contatoEmergenciaTelefone', formatarTelefone(event.target.value))}
                  />
                </CCol>
                <CCol md={3}>
                  <CFormLabel>Parentesco</CFormLabel>
                  <CFormInput name="contatoEmergenciaParentesco" value={form.contatoEmergenciaParentesco} onChange={handleChange} />
                </CCol>

                <CCol xs={12}>
                  <h2 className="h6 mb-0 mt-2">Saúde</h2>
                </CCol>
                <CCol md={3}>
                  <CFormLabel>Tipo sanguíneo</CFormLabel>
                  <CFormSelect name="tipoSanguineo" value={form.tipoSanguineo} onChange={handleChange}>
                    <option value="">Não informado</option>
                    {TIPOS_SANGUINEOS.map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {tipo}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
                <CCol md={9} />
                <CCol md={6}>
                  <CFormLabel>Alergias</CFormLabel>
                  <CFormTextarea rows={2} name="alergias" value={form.alergias} onChange={handleChange} />
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Medicamentos de uso contínuo</CFormLabel>
                  <CFormTextarea rows={2} name="medicamentos" value={form.medicamentos} onChange={handleChange} />
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Restrições médicas / lesões</CFormLabel>
                  <CFormTextarea rows={2} name="restricoesMedicas" value={form.restricoesMedicas} onChange={handleChange} />
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Observações</CFormLabel>
                  <CFormTextarea rows={2} name="observacoes" value={form.observacoes} onChange={handleChange} />
                </CCol>

                <CCol xs={12}>
                  <h2 className="h6 mb-1 mt-2">Reconhecimento facial na chamada</h2>
                  <CFormCheck
                    id="consentimentoBiometria"
                    label="O aluno (ou o responsável, se menor) autorizou por escrito o uso do rosto para a chamada por foto"
                    checked={!!form.consentimentoBiometria}
                    onChange={(event) => atualizar('consentimentoBiometria', event.target.checked)}
                  />
                  <small className="text-body-secondary d-block">
                    {form.consentimentoBiometria && form.consentimentoBiometriaEm
                      ? `Autorizado em ${formatarDataHora(form.consentimentoBiometriaEm)} ${form.consentimentoBiometriaOrigem === 'contrato' ? 'na assinatura do contrato' : 'no cadastro'}. Desmarque se a pessoa revogar.`
                      : 'Biometria é dado sensível (LGPD): sem autorização, o aluno fica fora da chamada por foto. Precisa também de uma boa foto de rosto na aba Dados pessoais.'}
                  </small>
                </CCol>
              </CRow>
            )}

            {erro && <div className="alert alert-danger mt-3 mb-0">{erro}</div>}

            <div className="d-flex gap-2 mt-4">
              <CButton type="submit" color="primary" disabled={salvando}>
                {salvando ? 'Salvando...' : editando ? 'Salvar alterações' : 'Adicionar aluno'}
              </CButton>
              <CButton as={Link} to="/admin/alunos" color="secondary" variant="outline">
                Cancelar
              </CButton>
            </div>
          </CForm>
        </CCardBody>
      </CCard>
    </div>
  );
}
