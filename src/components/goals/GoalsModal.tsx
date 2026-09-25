import React, { useState } from 'react';
import {
    X,
    Plus,
    PiggyBank,
    Archive,
    CheckCircle2,
    Trash2,
    Pencil,
} from 'lucide-react';
import type { Meta } from '../../domain/goal';
import {
    criarMeta,
    atualizarMeta,
    atualizarProgressoMeta,
    arquivarMeta,
    deletarMeta,
} from '../../services/goalService';
import { centavosParaReais, reaisParaCentavos } from '../../utils/money';
import { toast } from 'react-hot-toast';

interface GoalsModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    metas: Meta[];
}

const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(valor);
};

export const GoalsModal: React.FC<GoalsModalProps> = ({
    isOpen,
    onClose,
    userId,
    metas,
}) => {
    const [modoNovaMeta, setModoNovaMeta] = useState(false);
    const [nomeMeta, setNomeMeta] = useState('');
    const [valorAlvo, setValorAlvo] = useState('');
    const [valorAtual, setValorAtual] = useState('');
    const [dataLimite, setDataLimite] = useState('');
    const [salvando, setSalvando] = useState(false);

    const [metaEditandoId, setMetaEditandoId] = useState<string | null>(null);
    const [editNome, setEditNome] = useState('');
    const [editAlvo, setEditAlvo] = useState('');
    const [editLimite, setEditLimite] = useState('');

    const [progressoAbertoId, setProgressoAbertoId] = useState<string | null>(null);
    const [novoProgresso, setNovoProgresso] = useState('');

    const [metaParaAcao, setMetaParaAcao] = useState<{
        meta: Meta;
        acao: 'excluir' | 'arquivar';
    } | null>(null);

    if (!isOpen) return null;

    const metasAtivas = metas.filter((m) => m.status === 'ativa');
    const metasArquivadasEConcluidas = metas.filter((m) => m.status !== 'ativa');

    const handleSalvarMeta = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!nomeMeta.trim()) {
            return toast.error('O nome da meta é obrigatório.');
        }

        const alvoNumerico = Number(valorAlvo.replace(',', '.'));
        if (isNaN(alvoNumerico) || alvoNumerico <= 0) {
            return toast.error('Insira um valor alvo válido maior que zero.');
        }

        let atualNumerico = 0;
        if (valorAtual.trim()) {
            atualNumerico = Number(valorAtual.replace(',', '.'));
            if (isNaN(atualNumerico) || atualNumerico < 0) {
                return toast.error('O valor atual deve ser maior ou igual a zero.');
            }
        }

        setSalvando(true);

        try {
            await criarMeta({
                userId,
                nome: nomeMeta.trim(),
                valorAlvoCentavos: reaisParaCentavos(alvoNumerico),
                valorAtualCentavos: reaisParaCentavos(atualNumerico),
                dataLimite: dataLimite || undefined,
            });

            toast.success('Meta criada com sucesso!');
            setNomeMeta('');
            setValorAlvo('');
            setValorAtual('');
            setDataLimite('');
            setModoNovaMeta(false);
        } catch (error) {
            console.error('Erro ao criar meta:', error);
            const mensagem = error instanceof Error ? error.message : 'Erro ao criar meta.';
            toast.error(mensagem);
        } finally {
            setSalvando(false);
        }
    };

    const iniciarEdicao = (meta: Meta) => {
        setMetaEditandoId(meta.id);
        setEditNome(meta.nome);
        setEditAlvo(centavosParaReais(meta.valorAlvoCentavos).toString());
        setEditLimite(meta.dataLimite || '');
        setProgressoAbertoId(null);
    };

    const salvarEdicao = async (metaId: string) => {
        if (!editNome.trim()) {
            return toast.error('O nome da meta é obrigatório.');
        }

        const alvoNumerico = Number(editAlvo.replace(',', '.'));
        if (isNaN(alvoNumerico) || alvoNumerico <= 0) {
            return toast.error('Insira um valor alvo válido maior que zero.');
        }

        try {
            await atualizarMeta(metaId, {
                nome: editNome.trim(),
                valorAlvoCentavos: reaisParaCentavos(alvoNumerico),
                dataLimite: editLimite || undefined,
            });
            toast.success('Meta atualizada!');
            setMetaEditandoId(null);
        } catch (error) {
            console.error('Erro ao atualizar meta:', error);
            const mensagem = error instanceof Error ? error.message : 'Erro ao atualizar meta.';
            toast.error(mensagem);
        }
    };

    const iniciarProgresso = (meta: Meta) => {
        setProgressoAbertoId(meta.id);
        setNovoProgresso(centavosParaReais(meta.valorAtualCentavos).toString());
        setMetaEditandoId(null);
    };

    const salvarProgresso = async (meta: Meta) => {
        const atualNumerico = Number(novoProgresso.replace(',', '.'));
        if (isNaN(atualNumerico) || atualNumerico < 0) {
            return toast.error('Insira um valor atual válido.');
        }

        try {
            await atualizarProgressoMeta(
                meta.id,
                reaisParaCentavos(atualNumerico),
                meta.valorAlvoCentavos
            );
            toast.success('Progresso atualizado!');
            setProgressoAbertoId(null);
        } catch (error) {
            console.error('Erro ao atualizar progresso:', error);
            const mensagem = error instanceof Error ? error.message : 'Erro ao atualizar progresso.';
            toast.error(mensagem);
        }
    };

    const confirmarAcao = async () => {
        if (!metaParaAcao) return;

        const { meta, acao } = metaParaAcao;

        try {
            if (acao === 'excluir') {
                await deletarMeta(meta.id);
                toast.success('Meta excluída com sucesso!');
            } else if (acao === 'arquivar') {
                await arquivarMeta(meta.id);
                toast.success('Meta arquivada com sucesso!');
            }
            setMetaParaAcao(null);
        } catch (error) {
            console.error('Erro ao processar ação na meta:', error);
            toast.error('Ocorreu um erro ao processar a solicitação.');
        }
    };


    const renderizarCardMeta = (meta: Meta) => {
        const isEditando = metaEditandoId === meta.id;
        const isAtualizandoProgresso = progressoAbertoId === meta.id;
        const percentual = Math.min(
            100,
            (meta.valorAtualCentavos / meta.valorAlvoCentavos) * 100
        );
        const isConcluida = meta.status === 'concluida';

        return (
            <div key={meta.id} className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-xl p-4 shadow-sm">
                {isEditando ? (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-[#a1a1aa] mb-1">
                                Nome da Meta
                            </label>
                            <input
                                type="text"
                                value={editNome}
                                onChange={(e) => setEditNome(e.target.value)}
                                className="w-full bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-500"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 dark:text-[#a1a1aa] mb-1">
                                    Valor Alvo (R$)
                                </label>
                                <input
                                    type="text"
                                    value={editAlvo}
                                    onChange={(e) => setEditAlvo(e.target.value)}
                                    className="w-full bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 dark:text-[#a1a1aa] mb-1">
                                    Prazo (Opcional)
                                </label>
                                <input
                                    type="date"
                                    value={editLimite}
                                    onChange={(e) => setEditLimite(e.target.value)}
                                    className="w-full bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-500 text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                onClick={() => setMetaEditandoId(null)}
                                className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#27272a] rounded-lg"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => salvarEdicao(meta.id)}
                                className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                            >
                                Salvar
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex items-start justify-between mb-2">
                            <div>
                                <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    {meta.nome}
                                    {isConcluida && (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                                            <CheckCircle2 size={10} />
                                            Concluída
                                        </span>
                                    )}
                                </h4>
                                {meta.dataLimite && (
                                    <p className="text-[11px] text-gray-500 dark:text-[#a1a1aa] mt-0.5">
                                        Prazo: {new Date(meta.dataLimite).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                    </p>
                                )}
                            </div>
                            
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => iniciarEdicao(meta)}
                                    className="p-1.5 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-md transition-colors"
                                    title="Editar Meta"
                                >
                                    <Pencil size={14} />
                                </button>
                                {meta.status === 'ativa' && (
                                   <button
                                        onClick={() => setMetaParaAcao({ meta, acao: 'arquivar' })}
                                        className="p-1.5 text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-md transition-colors"
                                        title="Arquivar Meta"
                                    >
                                        <Archive size={14} />
                                    </button>
                                )}
                                <button
                                    onClick={() => setMetaParaAcao({ meta, acao: 'excluir' })}
                                    className="p-1.5 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-md transition-colors"
                                    title="Excluir Meta"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>

                        <div className="mt-3">
                            <div className="flex justify-between text-xs text-gray-600 dark:text-[#a1a1aa] mb-1.5">
                                <span>{formatarMoeda(centavosParaReais(meta.valorAtualCentavos))}</span>
                                <span>{formatarMoeda(centavosParaReais(meta.valorAlvoCentavos))}</span>
                            </div>
                            <div className="w-full bg-gray-100 dark:bg-[#27272a] h-2 rounded-full overflow-hidden">
                                <div
                                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                                    style={{ width: `${percentual}%` }}
                                />
                            </div>
                            <div className="text-right text-[10px] text-gray-500 mt-1">
                                {percentual.toFixed(1)}%
                            </div>
                        </div>

                        {meta.status === 'ativa' && (
                            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-[#27272a]">
                                {isAtualizandoProgresso ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={novoProgresso}
                                            onChange={(e) => setNovoProgresso(e.target.value)}
                                            placeholder="Novo valor atual"
                                            className="flex-1 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-emerald-500"
                                            autoFocus
                                        />
                                        <button
                                            onClick={() => setProgressoAbertoId(null)}
                                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                        >
                                            <X size={14} />
                                        </button>
                                        <button
                                            onClick={() => salvarProgresso(meta)}
                                            className="px-2 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md"
                                        >
                                            Salvar
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => iniciarProgresso(meta)}
                                        className="w-full text-center text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 py-1"
                                    >
                                        Atualizar progresso
                                    </button>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        );
    };

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm transition-opacity">
                <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-[#27272a]">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                                <PiggyBank size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-[#f4f4f5]">
                                    Metas
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-[#a1a1aa]">
                                    Organize seus objetivos financeiros
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-[#27272a] transition-colors"
                            title="Fechar modal"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-[#a1a1aa]">
                                    Minhas Metas
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setModoNovaMeta(!modoNovaMeta)}
                                    className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                                >
                                    <Plus size={14} />
                                    {modoNovaMeta ? 'Ver Metas' : 'Nova Meta'}
                                </button>
                            </div>

                            {modoNovaMeta ? (
                                <form
                                    onSubmit={handleSalvarMeta}
                                    className="p-4 bg-gray-50 dark:bg-[#121214] border border-gray-200 dark:border-[#27272a] rounded-xl space-y-3"
                                >
                                    <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                        Criar Nova Meta
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="sm:col-span-2">
                                            <label className="block text-xs font-medium text-gray-600 dark:text-[#a1a1aa] mb-1">
                                                Nome da Meta
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Ex: Reserva de Emergência"
                                                value={nomeMeta}
                                                onChange={(e) => setNomeMeta(e.target.value)}
                                                className="w-full bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-500"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 dark:text-[#a1a1aa] mb-1">
                                                Valor Alvo (R$)
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Ex: 5000,00"
                                                value={valorAlvo}
                                                onChange={(e) => setValorAlvo(e.target.value)}
                                                className="w-full bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-500"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 dark:text-[#a1a1aa] mb-1">
                                                Quanto já possui (R$)
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Ex: 500,00"
                                                value={valorAtual}
                                                onChange={(e) => setValorAtual(e.target.value)}
                                                className="w-full bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-500"
                                            />
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className="block text-xs font-medium text-gray-600 dark:text-[#a1a1aa] mb-1">
                                                Prazo (Opcional)
                                            </label>
                                            <input
                                                type="date"
                                                value={dataLimite}
                                                onChange={(e) => setDataLimite(e.target.value)}
                                                className="w-full bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-500 text-gray-900 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setModoNovaMeta(false)}
                                            className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-[#a1a1aa] hover:bg-gray-200 dark:hover:bg-[#27272a] rounded-lg"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={salvando}
                                            className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50"
                                        >
                                            {salvando ? 'Salvando...' : 'Criar Meta'}
                                        </button>
                                    </div>
                                </form>
                            ) : metasAtivas.length === 0 ? (
                                <div className="text-center py-6 border border-dashed border-gray-200 dark:border-[#27272a] rounded-xl">
                                    <PiggyBank size={32} className="mx-auto text-gray-400 mb-2 opacity-60" />
                                    <p className="text-sm font-medium text-gray-600 dark:text-[#a1a1aa]">
                                        Nenhuma meta ativa.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {metasAtivas.map(renderizarCardMeta)}
                                </div>
                            )}
                        </div>

                        {metasArquivadasEConcluidas.length > 0 && (
                            <div className="pt-4 border-t border-gray-100 dark:border-[#27272a]">
                                <span className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-[#a1a1aa] mb-3">
                                    Concluídas & Arquivadas
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {metasArquivadasEConcluidas.map(renderizarCardMeta)}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal de Confirmação (Exclusão/Arquivamento) */}
            {metaParaAcao && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#18181b] rounded-xl p-6 max-w-sm w-full shadow-2xl border border-gray-200 dark:border-[#27272a]">
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                            {metaParaAcao.acao === 'excluir'
                                ? 'Excluir Meta?'
                                : 'Arquivar Meta?'}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-[#a1a1aa] mb-6">
                            {metaParaAcao.acao === 'excluir'
                                ? `Tem certeza que deseja excluir permanentemente a meta "${metaParaAcao.meta.nome}"? Esta ação não pode ser desfeita.`
                                : `Tem certeza que deseja arquivar a meta "${metaParaAcao.meta.nome}"?`}
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setMetaParaAcao(null)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#27272a] rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmarAcao}
                                className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors shadow-sm ${
                                    metaParaAcao.acao === 'excluir'
                                        ? 'bg-rose-600 hover:bg-rose-700'
                                        : 'bg-amber-600 hover:bg-amber-700'
                                }`}
                            >
                                {metaParaAcao.acao === 'excluir' ? 'Sim, Excluir' : 'Sim, Arquivar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
