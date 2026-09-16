/**
 * Utilitários para obtenção e manipulação de datas usando o horário local do dispositivo,
 * sem depender de toISOString() que converte para UTC e pode causar discrepâncias de fuso horário.
 */

export function getDataLocalHoje(data: Date = new Date()): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export function getCompetenciaLocalHoje(data: Date = new Date()): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  return `${ano}-${mes}`;
}
