export type Candidato = {
  /** Orden en la cédula (1, 2, 3, ...). */
  posicion: number;
  /** Partido / organización política. */
  organizacion: string;
  /** Nombre del candidato presidencial. */
  nombre: string;
  /** Votos absolutos escrutados hasta el momento. */
  votos: number;
  /** Porcentaje sobre votos válidos (0-100). */
  porcentaje: number;
};

export type Resumen = {
  /** Etiqueta de la elección, ej. "Elecciones Generales 2026 – Presidencial". */
  eleccion: string;
  /** Porcentaje de actas procesadas (0-100). */
  actasProcesadas: number;
  /** Fecha/hora ISO en que se obtuvo la muestra. */
  obtenidoEn: string;
  /** Lista ordenada de candidatos de mayor a menor votos. */
  candidatos: Candidato[];
};

export type DiferenciaSegundoTercero = {
  eleccion: string;
  actasProcesadas: number;
  obtenidoEn: string;
  segundo: Candidato;
  tercero: Candidato;
  /** votos(segundo) - votos(tercero) */
  diferenciaVotos: number;
  /** porcentaje(segundo) - porcentaje(tercero), en puntos porcentuales */
  diferenciaPorcentaje: number;
};
