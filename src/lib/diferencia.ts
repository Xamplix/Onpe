import type { DiferenciaSegundoTercero, Resumen } from "./types";

/**
 * Calcula la diferencia de votos y de puntos porcentuales entre el 2° y el 3°
 * lugar de una elección presidencial. Lanza si no hay al menos 3 candidatos.
 */
export function calcularDiferencia(resumen: Resumen): DiferenciaSegundoTercero {
  const ordenados = [...resumen.candidatos].sort((a, b) => b.votos - a.votos);
  const segundo = ordenados[1];
  const tercero = ordenados[2];
  if (!segundo || !tercero) {
    throw new Error(
      `Se necesitan al menos 3 candidatos para calcular la diferencia; se obtuvieron ${ordenados.length}.`,
    );
  }
  return {
    eleccion: resumen.eleccion,
    actasProcesadas: resumen.actasProcesadas,
    obtenidoEn: resumen.obtenidoEn,
    segundo: { ...segundo, posicion: 2 },
    tercero: { ...tercero, posicion: 3 },
    diferenciaVotos: segundo.votos - tercero.votos,
    diferenciaPorcentaje: Number(
      (segundo.porcentaje - tercero.porcentaje).toFixed(4),
    ),
  };
}
