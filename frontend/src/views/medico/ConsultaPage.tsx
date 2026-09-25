import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import Button from "@/components/ui/Button";
import { useConsultas } from "@/hooks/medico/useConsultas";
import type { PacienteConsulta } from "@/types/consulta";
import CronometroConsulta from "@/components/medico/CronometroConsulta";

const campo =
  "mt-1 w-full rounded-field border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-600/10 disabled:bg-canvas";

type CampoConsulta =
  | "anamnesis"
  | "examen"
  | "diagnostico"
  | "plan"
  | "observaciones";

const camposConsulta = [
  {
    clave: "anamnesis",
    etiqueta: "Anamnesis / historia actual",
    placeholder: "Síntomas y evolución del cuadro",
  },
  {
    clave: "examen",
    etiqueta: "Examen físico",
    placeholder: "Hallazgos del examen",
  },
  {
    clave: "diagnostico",
    etiqueta: "Diagnóstico clínico",
    placeholder: "Impresión diagnóstica",
  },
  {
    clave: "plan",
    etiqueta: "Plan de atención",
    placeholder: "Indicaciones y seguimiento",
  },
  {
    clave: "observaciones",
    etiqueta: "Observaciones adicionales",
    placeholder: "Notas relevantes",
  },
] as const;

const camposSignos = [
  ["sistolica", "Sistólica", "mmHg"],
  ["diastolica", "Diastólica", "mmHg"],
  ["temperatura", "Temperatura", "°C"],
  ["frecuencia", "Frecuencia", "lpm"],
  ["saturacion", "Saturación", "%"],
  ["peso", "Peso", "kg"],
  ["talla", "Estatura", "cm"],
] as const;

export default function ConsultaPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();

  const { pacientes, modificar, finalizar } = useConsultas();

  const paciente = pacientes.find((item) => item.id === id);

  const [confirmando, setConfirmando] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!paciente) {
    return (
      <div className="p-6">
        <p className="text-ink">Paciente no encontrado.</p>

        <Link
          to="/medico/sala-espera"
          className="mt-3 inline-block text-brand-700 underline"
        >
          Volver a la lista de espera
        </Link>
      </div>
    );
  }

  const activo = paciente.estado === "consulta";

  const peso = Number(paciente.signos.peso);
  const talla = Number(paciente.signos.talla) / 100;

  const imc = peso > 0 && talla > 0 ? (peso / (talla * talla)).toFixed(1) : "—";

  // Actualización de signos vitales.
  const cambiarSigno = (
    clave: keyof PacienteConsulta["signos"],
    valor: string,
  ) => {
    void modificar(id, {
      signos: {
        ...paciente.signos,
        [clave]: valor,
      },
    }).catch(() => {
      setError("No se pudo guardar el signo vital.");
    });
  };

  // Actualización del registro médico.
  const cambiarCampo = (clave: CampoConsulta, valor: string) => {
    void modificar(id, {
      [clave]: valor,
    }).catch(() => {
      setError("No se pudo guardar el registro médico.");
    });
  };

  // Finalización de la consulta.
  const confirmarFinalizacion = async () => {
    if (finalizando) return;

    setFinalizando(true);
    setError(null);

    try {
      await finalizar(id);
      navigate("/medico/sala-espera");
    } catch {
      setError("No se pudo finalizar la consulta.");
      setConfirmando(false);
    } finally {
      setFinalizando(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* Navegación */}

      <Link
        to="/medico/sala-espera"
        className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700"
      >
        <i className="ri-arrow-left-line" />
        Volver a lista de espera
      </Link>

      {/* Encabezado */}

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-brand-600">
            Consulta médica
          </p>

          <h1 className="mt-1 text-2xl font-bold text-ink">
            {paciente.nombre}
          </h1>

          <p className="mt-1 text-sm text-muted">
            {paciente.edad} años · Expediente {paciente.expediente} ·{" "}
            {paciente.tipo}
          </p>
        </div>

        <span className="rounded-full bg-brand-50 px-3 py-2 text-xs font-bold text-brand-800">
          {activo ? "En consulta" : "Consulta finalizada"}
        </span>
      </header>

      {/* Errores */}

      {error && (
        <div
          role="alert"
          className="rounded-field border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      {/* Contenido principal */}

      <div className="grid items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* Columna izquierda */}

        <aside className="space-y-5">
          {/* Motivo */}

          <section className="rounded-card border border-line bg-surface p-5 shadow-card">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">
              Motivo de consulta
            </p>

            <p className="mt-2 text-sm font-semibold text-ink">
              {paciente.motivo}
            </p>
          </section>

          {/* Cronómetro compacto MA-111 */}

          {paciente.inicio !== undefined && (
            <CronometroConsulta
              inicio={paciente.inicio}
              fin={paciente.fin}
              activo={activo}
            />
          )}

          {/* Signos vitales */}

          <section className="rounded-card border border-line bg-surface p-5 shadow-card">
            <h2 className="mb-4 font-bold text-ink">Signos vitales</h2>

            <div className="grid grid-cols-2 gap-3">
              {camposSignos.map(([clave, etiqueta, unidad]) => (
                <label key={clave} className="text-xs font-semibold text-muted">
                  {etiqueta} ({unidad})
                  <input
                    className={campo}
                    type="number"
                    min="0"
                    step={
                      ["temperatura", "peso", "talla"].includes(clave)
                        ? "0.1"
                        : "1"
                    }
                    value={paciente.signos[clave]}
                    onChange={(e) => cambiarSigno(clave, e.target.value)}
                    disabled={!activo}
                  />
                </label>
              ))}
            </div>

            <div className="mt-4 rounded-field bg-brand-50 p-3 text-sm font-semibold text-brand-800">
              IMC calculado: {imc}
            </div>
          </section>
        </aside>

        {/* Columna derecha */}

        <main className="space-y-5">
          {/* Registro médico */}

          <section className="rounded-card border border-line bg-surface p-5 shadow-card">
            <h2 className="mb-4 text-lg font-bold text-ink">
              Registro de consulta
            </h2>

            {camposConsulta.map(({ clave, etiqueta, placeholder }) => (
              <label
                key={clave}
                className="mb-4 block text-sm font-semibold text-ink"
              >
                {etiqueta}

                <textarea
                  className={campo}
                  rows={clave === "anamnesis" ? 4 : 3}
                  placeholder={placeholder}
                  value={paciente[clave]}
                  onChange={(e) => cambiarCampo(clave, e.target.value)}
                  disabled={!activo}
                />
              </label>
            ))}
          </section>

          {/* Finalización */}

          {activo && (
            <section className="rounded-card border border-line bg-surface p-5 shadow-card">
              {!confirmando ? (
                <Button className="w-full" onClick={() => setConfirmando(true)}>
                  Finalizar consulta
                </Button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-ink">
                    ¿Desea finalizar esta consulta? El cronómetro se detendrá.
                  </p>

                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => setConfirmando(false)}
                      disabled={finalizando}
                    >
                      Volver
                    </Button>

                    <Button
                      onClick={confirmarFinalizacion}
                      disabled={finalizando}
                    >
                      {finalizando
                        ? "Finalizando..."
                        : "Confirmar finalización"}
                    </Button>
                  </div>
                </div>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
