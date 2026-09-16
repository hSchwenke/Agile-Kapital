import React, { useState } from 'react';
import {
    X,
    Plus,
    CreditCard,
    Calendar,
    Archive,
    CheckCircle2,
    Clock,
    Trash2,
} from 'lucide-react';
import type { Cartao } from '../../domain/card';
import type { Parcelamento } from '../../domain/installment';
import {
    criarCartao,
    atualizarCartao,
    deletarCartao,
} from '../../services/cardService';
import { deletarParcelamento } from '../../services/installmentService';
import {
    calcularStatusParcelamento,
    dividirParcelas,
} from '../../finance/financialCore';
import { centavosParaReais } from '../../utils/money';
import { toast } from 'react-hot-toast';

interface CardsModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    cartoes: Cartao[];
    parcelamentos: Parcelamento[];
}

const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(valor);
};

export const CardsModal: React.FC<CardsModalProps> = ({
    isOpen,
    onClose,
    userId,
    cartoes,
    parcelamentos,
}) => {
    const [cartaoSelecionadoId, setCartaoSelecionadoId] = useState<string>(() => {
        return cartoes[0]?.id || '';
    });

    const [modoNovoCartao, setModoNovoCartao] = useState(false);
    const [nomeCartao, setNomeCartao] = useState('');
    const [bancoCartao, setBancoCartao] = useState('');
    const [diaFechamento, setDiaFechamento] = useState('');
    const [diaVencimento, setDiaVencimento] = useState('');
    const [salvando, setSalvando] = useState(false);

    const [parcelamentoParaDeletar, setParcelamentoParaDeletar] =
        useState<Parcelamento | null>(null);
    const [cartaoParaAcao, setCartaoParaAcao] = useState<{
        cartao: Cartao;
        acao: 'arquivar' | 'excluir';
    } | null>(null);

    if (!isOpen) return null;

    // Se nenhum cartão selecionado ou o selecionado foi deletado, foca no primeiro
    const cartaoAtivo =
        cartoes.find((c) => c.id === cartaoSelecionadoId) || cartoes[0];

    const comprasDoCartao = cartaoAtivo
        ? parcelamentos.filter((p) => p.cartaoId === cartaoAtivo.id)
        : [];

    const handleSalvarCartao = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!nomeCartao.trim() || !bancoCartao.trim()) {
            return toast.error('Preencha o nome e o banco do cartão.');
        }

        const fechamentoNum = Number(diaFechamento);
        const vencimentoNum = Number(diaVencimento);

        if (
            !Number.isInteger(fechamentoNum) ||
            fechamentoNum < 1 ||
            fechamentoNum > 31 ||
            !Number.isInteger(vencimentoNum) ||
            vencimentoNum < 1 ||
            vencimentoNum > 31
        ) {
            return toast.error(
                'Os dias de fechamento e vencimento devem ser entre 1 e 31.'
            );
        }

        setSalvando(true);

        try {
            const novoId = await criarCartao({
                userId,
                nome: nomeCartao.trim(),
                banco: bancoCartao.trim(),
                diaFechamento: fechamentoNum,
                diaVencimento: vencimentoNum,
                ativo: true,
            });

            toast.success('Cartão adicionado com sucesso!');

            setNomeCartao('');
            setBancoCartao('');
            setDiaFechamento('');
            setDiaVencimento('');
            setModoNovoCartao(false);
            setCartaoSelecionadoId(novoId);
        } catch (error) {
            console.error('Erro ao criar cartão: ', error);
            toast.error('Erro ao salvar cartão.');
        } finally {
            setSalvando(false);
        }
    };

    const handleAlternarStatusCartao = async (cartao: Cartao) => {
        try {
            await atualizarCartao(cartao.id, {
                ativo: !cartao.ativo,
            });

            toast.success(
                cartao.ativo
                    ? 'Cartão arquivado! Ele não aparecerá para novas compras.'
                    : 'Cartão reativado!'
            );
        } catch (error) {
            console.error('Erro ao atualizar status do cartão: ', error);
            toast.error('Erro ao alterar status do cartão.');
        }
    };

    const handleDeletarCartao = (cartao: Cartao) => {
        const comprasVinculadas = parcelamentos.filter(
            (p) => p.cartaoId === cartao.id
        );

        if (comprasVinculadas.length > 0) {
            if (!cartao.ativo) {
                toast.error(
                    'Este cartão possui histórico de compras e já está arquivado.'
                );
                return;
            }

            setCartaoParaAcao({
                cartao,
                acao: 'arquivar',
            });

            return;
        }

        setCartaoParaAcao({
            cartao,
            acao: 'excluir',
        });
    };

    const confirmarAcaoCartao = async () => {
        if (!cartaoParaAcao) return;

        const { cartao, acao } = cartaoParaAcao;

        try {
            if (acao === 'arquivar') {
                await atualizarCartao(cartao.id, {
                    ativo: false,
                });

                toast.success('Cartão arquivado com sucesso!');
            } else {
                await deletarCartao(cartao.id);

                toast.success('Cartão excluído!');

                const restante = cartoes.filter(
                    (c) => c.id !== cartao.id
                );

                if (restante.length > 0) {
                    setCartaoSelecionadoId(restante[0].id);
                }
            }

            setCartaoParaAcao(null);
        } catch (error) {
            console.error('Erro ao processar cartão: ', error);

            toast.error(
                acao === 'arquivar'
                    ? 'Erro ao arquivar cartão.'
                    : 'Erro ao remover cartão.'
            );
        }
    };

    const handleDeletarCompra = (parcelamento: Parcelamento) => {
        setParcelamentoParaDeletar(parcelamento);
    };

    const confirmarDelecaoCompra = async () => {
        if (!parcelamentoParaDeletar) return;

        try {
            await deletarParcelamento(
                parcelamentoParaDeletar.id,
                userId
            );

            toast.success(
                'Compra parcelada removida com sucesso!'
            );

            setParcelamentoParaDeletar(null);
        } catch (error) {
            console.error(
                'Erro ao remover compra parcelada: ',
                error
            );

            toast.error(
                'Erro ao remover parcelamento.'
            );
        }
    };

    const formatarTextoParcelas = (p: Parcelamento) => {
        try {
            const parcelas = dividirParcelas(
                p.valorTotalCentavos,
                p.totalParcelas
            );

            const primeira = formatarMoeda(
                centavosParaReais(parcelas[0])
            );

            const ultima = formatarMoeda(
                centavosParaReais(
                    parcelas[parcelas.length - 1]
                )
            );

            if (
                parcelas[0] ===
                parcelas[parcelas.length - 1]
            ) {
                return `${primeira} por parcela`;
            }

            return `1ª de ${primeira}, demais de ${ultima}`;
        } catch {
            return `${formatarMoeda(
                centavosParaReais(
                    Math.floor(
                        p.valorTotalCentavos /
                        p.totalParcelas
                    )
                )
            )} por parcela`;
        }
    };

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm transition-opacity">
                <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-[#27272a]">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-xl">
                                <CreditCard size={20} />
                            </div>

                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-[#f4f4f5]">
                                    Seção de Cartões
                                </h3>

                                <p className="text-xs text-gray-500 dark:text-[#a1a1aa]">
                                    Gerencie seus cartões e acompanhe compras parceladas
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

                    {/* Body com Scroll */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Lista Horizontal de Cartões + Botão de Novo Cartão */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-[#a1a1aa]">
                                    Seus Cartões
                                </span>

                                <button
                                    type="button"
                                    onClick={() =>
                                        setModoNovoCartao(
                                            !modoNovoCartao
                                        )
                                    }
                                    className="flex items-center gap-1 text-xs font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
                                >
                                    <Plus size={14} />
                                    {modoNovoCartao
                                        ? 'Ver Cartões'
                                        : 'Adicionar Cartão'}
                                </button>
                            </div>

                            {modoNovoCartao ? (
                                <form
                                    onSubmit={
                                        handleSalvarCartao
                                    }
                                    className="p-4 bg-gray-50 dark:bg-[#121214] border border-gray-200 dark:border-[#27272a] rounded-xl space-y-3"
                                >
                                    <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                        Cadastrar Novo Cartão
                                    </h4>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 dark:text-[#a1a1aa] mb-1">
                                                Nome do Cartão
                                            </label>

                                            <input
                                                type="text"
                                                placeholder="Ex: Nubank Ultravioleta"
                                                value={
                                                    nomeCartao
                                                }
                                                onChange={(
                                                    e
                                                ) =>
                                                    setNomeCartao(
                                                        e.target
                                                            .value
                                                    )
                                                }
                                                className="w-full bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 dark:text-[#a1a1aa] mb-1">
                                                Banco Emissor
                                            </label>

                                            <input
                                                type="text"
                                                placeholder="Ex: Nubank / Itaú"
                                                value={
                                                    bancoCartao
                                                }
                                                onChange={(
                                                    e
                                                ) =>
                                                    setBancoCartao(
                                                        e.target
                                                            .value
                                                    )
                                                }
                                                className="w-full bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 dark:text-[#a1a1aa] mb-1">
                                                Dia de Fechamento
                                                (1 a 31)
                                            </label>

                                            <input
                                                type="number"
                                                min="1"
                                                max="31"
                                                placeholder="Ex: 20"
                                                value={
                                                    diaFechamento
                                                }
                                                onChange={(
                                                    e
                                                ) =>
                                                    setDiaFechamento(
                                                        e.target
                                                            .value
                                                    )
                                                }
                                                className="w-full bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 dark:text-[#a1a1aa] mb-1">
                                                Dia de Vencimento
                                                (1 a 31)
                                            </label>

                                            <input
                                                type="number"
                                                min="1"
                                                max="31"
                                                placeholder="Ex: 27"
                                                value={
                                                    diaVencimento
                                                }
                                                onChange={(
                                                    e
                                                ) =>
                                                    setDiaVencimento(
                                                        e.target
                                                            .value
                                                    )
                                                }
                                                className="w-full bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-lg px-3 py-1.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-2 pt-2">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setModoNovoCartao(
                                                    false
                                                )
                                            }
                                            className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-[#a1a1aa] hover:bg-gray-200 dark:hover:bg-[#27272a] rounded-lg transition-colors"
                                        >
                                            Cancelar
                                        </button>

                                        <button
                                            type="submit"
                                            disabled={
                                                salvando
                                            }
                                            className="px-4 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
                                        >
                                            {salvando
                                                ? 'Salvando...'
                                                : 'Salvar Cartão'}
                                        </button>
                                    </div>
                                </form>
                            ) : cartoes.length === 0 ? (
                                <div className="text-center py-6 border border-dashed border-gray-200 dark:border-[#27272a] rounded-xl">
                                    <CreditCard
                                        size={32}
                                        className="mx-auto text-gray-400 mb-2 opacity-60"
                                    />

                                    <p className="text-sm font-medium text-gray-600 dark:text-[#a1a1aa]">
                                        Nenhum cartão cadastrado.
                                    </p>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setModoNovoCartao(
                                                true
                                            )
                                        }
                                        className="mt-3 px-3 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg inline-flex items-center gap-1 shadow-sm transition-all"
                                    >
                                        <Plus size={14} />
                                        Cadastrar primeiro cartão
                                    </button>
                                </div>
                            ) : (
                                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                                    {cartoes.map(
                                        (cartao) => {
                                            const isSelected =
                                                cartaoAtivo?.id ===
                                                cartao.id;

                                            return (
                                                <button
                                                    key={
                                                        cartao.id
                                                    }
                                                    type="button"
                                                    onClick={() =>
                                                        setCartaoSelecionadoId(
                                                            cartao.id
                                                        )
                                                    }
                                                    className={`flex-shrink-0 text-left px-4 py-3 rounded-xl border transition-all ${isSelected
                                                        ? 'border-purple-600 bg-purple-50/50 dark:bg-purple-950/20 dark:border-purple-500 shadow-sm'
                                                        : 'border-gray-200 dark:border-[#27272a] bg-white dark:bg-[#121214] hover:border-gray-300 dark:hover:border-gray-700'
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-xs font-bold text-gray-900 dark:text-[#f4f4f5] truncate max-w-[120px]">
                                                            {
                                                                cartao.nome
                                                            }
                                                        </span>

                                                        {!cartao.ativo && (
                                                            <span className="text-[10px] bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-medium">
                                                                Arquivado
                                                            </span>
                                                        )}
                                                    </div>

                                                    <span className="text-[11px] text-gray-500 dark:text-[#71717a] block mt-0.5">
                                                        {
                                                            cartao.banco
                                                        }
                                                    </span>
                                                </button>
                                            );
                                        }
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Detalhes do Cartão Selecionado */}
                        {cartaoAtivo && (
                            <div className="bg-gray-50 dark:bg-[#121214] border border-gray-200 dark:border-[#27272a] rounded-xl p-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200 dark:border-[#27272a]">
                                    <div>
                                        <h4 className="text-base font-bold text-gray-900 dark:text-[#f4f4f5] flex items-center gap-2">
                                            {cartaoAtivo.nome}

                                            <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-gray-200 dark:bg-[#27272a] text-gray-700 dark:text-gray-300">
                                                {
                                                    cartaoAtivo.banco
                                                }
                                            </span>
                                        </h4>

                                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-[#a1a1aa] mt-1">
                                            <span className="flex items-center gap-1">
                                                <Calendar
                                                    size={
                                                        13
                                                    }
                                                    className="text-purple-500"
                                                />
                                                Fechamento:
                                                dia{' '}
                                                <strong>
                                                    {
                                                        cartaoAtivo.diaFechamento
                                                    }
                                                </strong>
                                            </span>

                                            <span className="flex items-center gap-1">
                                                <Clock
                                                    size={
                                                        13
                                                    }
                                                    className="text-emerald-500"
                                                />
                                                Vencimento:
                                                dia{' '}
                                                <strong>
                                                    {
                                                        cartaoAtivo.diaVencimento
                                                    }
                                                </strong>
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleAlternarStatusCartao(
                                                    cartaoAtivo
                                                )
                                            }
                                            className="text-xs font-medium px-2.5 py-1.5 border border-gray-200 dark:border-[#27272a] rounded-lg hover:bg-gray-100 dark:hover:bg-[#27272a] text-gray-600 dark:text-[#a1a1aa] flex items-center gap-1 transition-colors"
                                            title={
                                                cartaoAtivo.ativo
                                                    ? 'Arquivar cartão (não aparecerá em novas compras)'
                                                    : 'Reativar cartão'
                                            }
                                        >
                                            <Archive
                                                size={13}
                                            />

                                            {cartaoAtivo.ativo
                                                ? 'Arquivar'
                                                : 'Reativar'}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleDeletarCartao(
                                                    cartaoAtivo
                                                )
                                            }
                                            className="text-xs font-medium p-1.5 border border-rose-200 dark:border-rose-950/40 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600 dark:text-rose-400 transition-colors"
                                            title="Remover cartão"
                                        >
                                            <Trash2
                                                size={14}
                                            />
                                        </button>
                                    </div>
                                </div>

                                {/* Lista Consolidada de Compras do Cartão */}
                                <div className="mt-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-[#a1a1aa]">
                                            Compras Consolidadas (
                                            {
                                                comprasDoCartao.length
                                            }
                                            )
                                        </span>
                                    </div>

                                    {comprasDoCartao.length ===
                                        0 ? (
                                        <p className="text-xs text-gray-400 dark:text-[#71717a] py-4 text-center italic">
                                            Nenhuma compra parcelada registrada neste cartão.
                                        </p>
                                    ) : (
                                        <div className="space-y-2.5">
                                            {comprasDoCartao.map(
                                                (compra) => {
                                                    const status =
                                                        calcularStatusParcelamento(
                                                            compra.competenciaInicial,
                                                            compra.totalParcelas
                                                        );

                                                    return (
                                                        <div
                                                            key={
                                                                compra.id
                                                            }
                                                            className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs hover:border-purple-200 dark:hover:border-purple-900/40 transition-colors"
                                                        >
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <h5 className="text-sm font-bold text-gray-900 dark:text-[#f4f4f5]">
                                                                        {
                                                                            compra.descricao
                                                                        }
                                                                    </h5>

                                                                    {status.status ===
                                                                        'finalizado' ? (
                                                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                                                                            <CheckCircle2
                                                                                size={
                                                                                    11
                                                                                }
                                                                            />
                                                                            Finalizado
                                                                        </span>
                                                                    ) : status.status ===
                                                                        'nao_iniciado' ? (
                                                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-[#27272a] px-2 py-0.5 rounded-full">
                                                                            Ainda
                                                                            não
                                                                            iniciado
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-full">
                                                                            {
                                                                                status.texto
                                                                            }
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                <div className="text-xs text-gray-500 dark:text-[#a1a1aa] mt-1 space-x-2">
                                                                    <span>
                                                                        Comprado
                                                                        em:{' '}
                                                                        <strong>
                                                                            {compra.dataCompra
                                                                                .split(
                                                                                    '-'
                                                                                )
                                                                                .reverse()
                                                                                .join(
                                                                                    '/'
                                                                                )}
                                                                        </strong>
                                                                    </span>

                                                                    <span>
                                                                        •
                                                                    </span>

                                                                    <span>
                                                                        Início:{' '}
                                                                        <strong>
                                                                            {
                                                                                compra.competenciaInicial
                                                                            }
                                                                        </strong>
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center justify-between sm:justify-end gap-3 text-right">
                                                                <div>
                                                                    <div className="text-sm font-extrabold text-gray-900 dark:text-white">
                                                                        {formatarMoeda(
                                                                            centavosParaReais(
                                                                                compra.valorTotalCentavos
                                                                            )
                                                                        )}
                                                                    </div>

                                                                    <div className="text-[11px] text-gray-500 dark:text-[#a1a1aa]">
                                                                        {formatarTextoParcelas(
                                                                            compra
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleDeletarCompra(
                                                                            compra
                                                                        )
                                                                    }
                                                                    className="p-1.5 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-gray-100 dark:hover:bg-[#27272a] transition-colors"
                                                                    title="Excluir parcelamento"
                                                                >
                                                                    <Trash2
                                                                        size={
                                                                            15
                                                                        }
                                                                    />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-3.5 bg-gray-50 dark:bg-[#121214] border-t border-gray-100 dark:border-[#27272a] flex justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-[#f4f4f5] bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] hover:bg-gray-50 dark:hover:bg-[#27272a] rounded-lg transition-colors shadow-xs"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            </div>

            {/* Confirmação de exclusão de compra parcelada */}
            {parcelamentoParaDeletar && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-2xl shadow-2xl max-w-sm w-full p-5">
                        <h3 className="text-base font-bold text-gray-900 dark:text-[#f4f4f5]">
                            Excluir compra parcelada
                        </h3>

                        <p className="text-sm text-gray-500 dark:text-[#a1a1aa] mt-2">
                            Deseja realmente excluir "
                            {
                                parcelamentoParaDeletar.descricao
                            }
                            "? Todas as parcelas vinculadas serão
                            removidas do extrato.
                        </p>

                        <p className="text-xs text-rose-600 dark:text-rose-400 mt-2">
                            Esta ação não pode ser desfeita.
                        </p>

                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                type="button"
                                onClick={() =>
                                    setParcelamentoParaDeletar(
                                        null
                                    )
                                }
                                className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-[#f4f4f5] bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] hover:bg-gray-50 dark:hover:bg-[#27272a] rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>

                            <button
                                type="button"
                                onClick={
                                    confirmarDelecaoCompra
                                }
                                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600 rounded-lg transition-colors"
                            >
                                Excluir
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {cartaoParaAcao && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-2xl shadow-2xl max-w-sm w-full p-5">
                        <h3 className="text-base font-bold text-gray-900 dark:text-[#f4f4f5]">
                            {cartaoParaAcao.acao === 'arquivar'
                                ? 'Arquivar cartão'
                                : 'Excluir cartão'}
                        </h3>

                        <p className="text-sm text-gray-500 dark:text-[#a1a1aa] mt-2">
                            {cartaoParaAcao.acao === 'arquivar'
                                ? `O cartão "${cartaoParaAcao.cartao.nome}" possui compras vinculadas e não pode ser excluído sem perder o histórico. Deseja arquivá-lo?`
                                : `Deseja realmente excluir o cartão "${cartaoParaAcao.cartao.nome}"?`}
                        </p>

                        <p
                            className={`text-xs mt-2 ${cartaoParaAcao.acao === 'arquivar'
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-rose-600 dark:text-rose-400'
                                }`}
                        >
                            {cartaoParaAcao.acao === 'arquivar'
                                ? 'Ele deixará de aparecer para novas compras, mas o histórico será preservado.'
                                : 'Esta ação não pode ser desfeita.'}
                        </p>

                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                type="button"
                                onClick={() => setCartaoParaAcao(null)}
                                className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-[#f4f4f5] bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] hover:bg-gray-50 dark:hover:bg-[#27272a] rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>

                            <button
                                type="button"
                                onClick={confirmarAcaoCartao}
                                className={
                                    cartaoParaAcao.acao === 'arquivar'
                                        ? 'px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors'
                                        : 'px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors'
                                }
                            >
                                {cartaoParaAcao.acao === 'arquivar'
                                    ? 'Arquivar'
                                    : 'Excluir'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};