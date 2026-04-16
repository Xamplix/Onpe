"use client";

import { useEffect, useState, useCallback } from "react";
import type { ResultadosPresidenciales } from "@/lib/onpe";

function formatNumber(n: number): string {
  return n.toLocaleString("es-PE");
}

function CandidateBar({
  rank,
  name,
  party,
  votes,
  percentage,
  maxPercentage,
  highlight,
}: {
  rank: number;
  name: string;
  party: string;
  votes: number;
  percentage: number;
  maxPercentage: number;
  highlight?: "second" | "third";
}) {
  const width = (percentage / maxPercentage) * 100;

  const barColor =
    highlight === "second"
      ? "bg-amber-500"
      : highlight === "third"
        ? "bg-rose-500"
        : "bg-slate-600";

  const ringColor =
    highlight === "second"
      ? "ring-amber-500/30"
      : highlight === "third"
        ? "ring-rose-500/30"
        : "";

  return (
    <div
      className={`rounded-lg p-3 sm:p-4 transition-all ${
        highlight
          ? `bg-slate-800/80 ring-2 ${ringColor}`
          : "bg-slate-800/40"
      }`}
    >
      <div className="flex items-baseline justify-between mb-2">
        <div className="flex items-baseline gap-2 min-w-0 flex-1">
          <span className="text-slate-500 text-sm font-mono shrink-0">
            {rank}.
          </span>
          <div className="min-w-0">
            <span className="font-semibold text-sm sm:text-base text-white truncate block">
              {name}
            </span>
            <span className="text-xs text-slate-400">{party}</span>
          </div>
        </div>
        <div className="text-right shrink-0 ml-2">
          <span className="font-mono font-bold text-sm sm:text-base text-white">
            {percentage.toFixed(3)}%
          </span>
          <span className="block text-xs text-slate-400">
            {formatNumber(votes)}
          </span>
        </div>
      </div>
      <div className="w-full bg-slate-700/50 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full ${barColor} transition-all duration-1000`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<ResultadosPresidenciales | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(60);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/resultados");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
      setLastFetch(new Date());
      setCountdown(60);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (error && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-6 max-w-md text-center">
          <p className="text-red-400 text-lg font-semibold mb-2">
            Error al cargar datos
          </p>
          <p className="text-red-300 text-sm">{error}</p>
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-red-700 hover:bg-red-600 rounded-lg text-sm transition-colors cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-slate-600 border-t-amber-500 rounded-full animate-spin" />
          <p className="text-slate-400">Cargando resultados ONPE...</p>
        </div>
      </div>
    );
  }

  const { candidatos, totales, segundo, tercero, diferenciaVotos, diferenciaPorcentaje, fechaActualizacion } = data;
  const maxPercentage = candidatos[0].porcentajeVotosValidos;

  const diffColor = diferenciaVotos > 0 ? "text-amber-400" : "text-rose-400";
  const diffLabel = diferenciaVotos > 0 ? segundo.nombreCandidato.split(" ").slice(-2).join(" ") : tercero.nombreCandidato.split(" ").slice(-2).join(" ");

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      {/* Timestamp header */}
      <div className="text-center mb-2">
        <p className="text-lg sm:text-xl md:text-2xl font-bold text-white uppercase tracking-wide">
          ACTUALIZADO AL {fechaActualizacion.toUpperCase()}
        </p>
        <p className="text-slate-400 text-sm mt-1">
          Fuente: ONPE — resultadoelectoral.onpe.gob.pe
          {lastFetch && (
            <span>
              {" "}| Consultado: {lastFetch.toLocaleTimeString("es-PE")}
            </span>
          )}
        </p>
      </div>

      {/* Header */}
      <header className="text-center mb-6 mt-4">
        <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">
          Elecciones Presidenciales 2026
        </h1>
        <p className="text-slate-400 text-sm">
          Diferencia entre 2.o y 3.er lugar — Segunda vuelta
        </p>
      </header>

      {/* Main diff card */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 sm:p-8 mb-6 border border-slate-700 text-center">
        <p className="text-slate-400 text-sm mb-2 uppercase tracking-wider">
          Diferencia de votos
        </p>
        <p className={`text-5xl sm:text-6xl lg:text-7xl font-mono font-black ${diffColor} tabular-nums`}>
          {formatNumber(Math.abs(diferenciaVotos))}
        </p>
        <p className="text-slate-400 text-lg mt-2">
          <span className={diffColor}>{diferenciaPorcentaje.toFixed(3)} pp</span>
          {" "}a favor de{" "}
          <span className="text-white font-semibold">{diffLabel}</span>
        </p>

        <div className="mt-6 flex flex-col sm:flex-row justify-center gap-4 sm:gap-8">
          <div className="bg-amber-500/10 rounded-xl px-5 py-3 border border-amber-500/20">
            <p className="text-amber-500 text-xs uppercase tracking-wider mb-1">
              2.o lugar
            </p>
            <p className="text-white font-bold text-sm">
              {segundo.nombreCandidato}
            </p>
            <p className="text-amber-400 font-mono text-lg">
              {formatNumber(segundo.totalVotosValidos)}
            </p>
            <p className="text-slate-400 text-xs">
              {segundo.porcentajeVotosValidos.toFixed(3)}%
            </p>
          </div>
          <div className="bg-rose-500/10 rounded-xl px-5 py-3 border border-rose-500/20">
            <p className="text-rose-500 text-xs uppercase tracking-wider mb-1">
              3.er lugar
            </p>
            <p className="text-white font-bold text-sm">
              {tercero.nombreCandidato}
            </p>
            <p className="text-rose-400 font-mono text-lg">
              {formatNumber(tercero.totalVotosValidos)}
            </p>
            <p className="text-slate-400 text-xs">
              {tercero.porcentajeVotosValidos.toFixed(3)}%
            </p>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-slate-800/60 rounded-xl p-4 mb-6 border border-slate-700">
        <div className="flex justify-between items-center mb-2">
          <span className="text-slate-400 text-sm">Actas contabilizadas</span>
          <span className="text-white font-mono font-bold">
            {totales.actasContabilizadas.toFixed(3)}%
          </span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-3">
          <div
            className="h-3 rounded-full bg-emerald-500 transition-all duration-1000"
            style={{ width: `${totales.actasContabilizadas}%` }}
          />
        </div>
        <p className="text-slate-500 text-xs mt-1">
          {formatNumber(totales.contabilizadas)} de{" "}
          {formatNumber(totales.totalActas)} actas
        </p>
      </div>

      {/* All candidates */}
      <div className="space-y-2 mb-6">
        <h2 className="text-slate-400 text-sm uppercase tracking-wider mb-3">
          Todos los candidatos
        </h2>
        {candidatos.map((c, i) => (
          <CandidateBar
            key={c.codigoAgrupacionPolitica}
            rank={i + 1}
            name={c.nombreCandidato}
            party={c.nombreAgrupacionPolitica}
            votes={c.totalVotosValidos}
            percentage={c.porcentajeVotosValidos}
            maxPercentage={maxPercentage}
            highlight={i === 1 ? "second" : i === 2 ? "third" : undefined}
          />
        ))}
      </div>

      {/* Footer */}
      <footer className="text-center text-slate-500 text-xs space-y-1 pb-4">
        <p className="text-slate-600">
          Próxima actualización en {countdown}s
          {error && (
            <span className="text-red-400 ml-2">(error en última consulta)</span>
          )}
        </p>
      </footer>
    </div>
  );
}
