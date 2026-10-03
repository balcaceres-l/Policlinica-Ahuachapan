/**
 * Generador de plantilla HTML profesional para exportación / impresión
 * de recetas médicas en PDF (HU-29 / HU-21 / HU-44).
 * Basado en las especificaciones clínicas de Policlínica Ahuachapaneca.
 */

export interface MedicamentoRecetaPdf {
  nombre_medicamento: string;
  dosis: string;
  via_administracion?: string | null;
  frecuencia: string;
  duracion?: string | null;
  indicaciones?: string | null;
}

export interface DatosRecetaPdf {
  clinica?: {
    nombre?: string;
    subtitulo?: string;
    direccion?: string;
    telefono?: string;
    email?: string;
    logoUrl?: string;
  };
  medico?: {
    nombre?: string | null;
    especialidad?: string | null;
    cargo?: string | null;
    telefono?: string | null;
    jvpm?: string | null;
  };
  paciente?: {
    nombre?: string | null;
    expediente?: string | null;
    edad?: number | string | null;
    dui?: string | null;
    telefono?: string | null;
  };
  fecha?: string | Date | null;
  medicamentos: MedicamentoRecetaPdf[];
  observaciones_generales?: string | null;
}

const escapeHtml = (text?: string | null): string => {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Convierte una fecha a formato legible: "02 de octubre de 2026"
 */
const formatearFechaLarga = (fechaInput?: string | Date | null): { completa: string; dia: number; mes: string; anio: number } => {
  let d: Date;
  if (!fechaInput) {
    d = new Date();
  } else if (typeof fechaInput === 'string') {
    const norm = fechaInput.includes('T') ? fechaInput : fechaInput.replace(' ', 'T');
    d = new Date(norm);
    if (isNaN(d.getTime())) d = new Date();
  } else {
    d = fechaInput;
  }

  const dia = d.getDate();
  const mes = d.toLocaleDateString('es-SV', { month: 'long' });
  const anio = d.getFullYear();
  const completa = `${dia} de ${mes} de ${anio}`;

  return { completa, dia, mes, anio };
};

/**
 * Construye el documento HTML listo para imprimir o guardar como PDF.
 */
export const generarHtmlReceta = (datos: DatosRecetaPdf): string => {
  const clinica = {
    nombre: datos.clinica?.nombre || 'POLICLÍNICA AHUACHAPANECA',
    subtitulo: datos.clinica?.subtitulo || 'Atención Médica Integral y Diagnóstico Clínico',
    direccion: datos.clinica?.direccion || 'Calle Teodoro Moreno #3-4, Ahuachapán, El Salvador',
    telefono: datos.clinica?.telefono || 'PBX: (503) 2413-0000',
    email: datos.clinica?.email || 'consultas@policlinicaahuachapan.com',
    logoUrl: datos.clinica?.logoUrl || '/images/logo.png',
  };

  const medico = {
    nombre: datos.medico?.nombre ? (datos.medico.nombre.toLowerCase().startsWith('dr') ? datos.medico.nombre : `Dr. ${datos.medico.nombre}`) : 'Médico Tratante',
    especialidad: datos.medico?.especialidad || 'Medicina General',
    cargo: datos.medico?.cargo || 'Médico de Planta',
    telefono: datos.medico?.telefono || clinica.telefono,
    jvpm: datos.medico?.jvpm || 'En trámite / Registrado',
  };

  const paciente = {
    nombre: datos.paciente?.nombre || 'Paciente',
    expediente: datos.paciente?.expediente ? `N° ${datos.paciente.expediente}` : 'N/A',
    edad: datos.paciente?.edad !== null && datos.paciente?.edad !== undefined ? `${datos.paciente.edad} años` : 'No registrada',
    dui: datos.paciente?.dui || 'No registrado',
    telefono: datos.paciente?.telefono || '—',
  };

  const { completa: fechaCompleta, dia, mes, anio } = formatearFechaLarga(datos.fecha);

  const medicamentosValidos = datos.medicamentos.filter((m) => m.nombre_medicamento && m.nombre_medicamento.trim() !== '');

  const itemsHtml = medicamentosValidos.length > 0
    ? medicamentosValidos
        .map((med, index) => {
          const viaBadge = med.via_administracion
            ? `<span class="badge-via">${escapeHtml(med.via_administracion)}</span>`
            : '';
          const posologiaPartes = [];
          if (med.dosis) posologiaPartes.push(`<strong>Dosis:</strong> ${escapeHtml(med.dosis)}`);
          if (med.frecuencia) posologiaPartes.push(`<strong>Frecuencia:</strong> ${escapeHtml(med.frecuencia)}`);
          if (med.duracion) posologiaPartes.push(`<strong>Duración:</strong> ${escapeHtml(med.duracion)}`);

          const indicacionesBloque = med.indicaciones
            ? `<div class="med-indicaciones"><strong>Indicaciones:</strong> ${escapeHtml(med.indicaciones)}</div>`
            : '';

          return `
            <div class="med-card">
              <div class="med-header">
                <span class="med-num">${index + 1}</span>
                <span class="med-nombre">${escapeHtml(med.nombre_medicamento)}</span>
                ${viaBadge}
              </div>
              <div class="med-posologia">
                ${posologiaPartes.join(' &nbsp;·&nbsp; ')}
              </div>
              ${indicacionesBloque}
            </div>
          `;
        })
        .join('')
    : '<div class="sin-medicamentos">No se indicaron medicamentos específicos en esta prescripción.</div>';

  const observacionesHtml = datos.observaciones_generales?.trim()
    ? `
      <div class="observaciones-box">
        <div class="observaciones-titulo">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          Recomendaciones Generales e Indicaciones Médicas
        </div>
        <div class="observaciones-contenido">${escapeHtml(datos.observaciones_generales)}</div>
      </div>
    `
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Receta Médica - ${escapeHtml(paciente.nombre)}</title>
  <style>
    /* Configuración para pantalla y visor */
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      background-color: #ffffff;
      line-height: 1.45;
      padding: 32px 36px;
      font-size: 13px;
    }

    /* Encabezado Institucional */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2.5px solid #166534;
      padding-bottom: 16px;
      margin-bottom: 18px;
      gap: 16px;
    }

    .header-brand {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .header-logo {
      width: 68px;
      height: 68px;
      object-fit: contain;
      border-radius: 8px;
    }

    .header-title h1 {
      font-size: 18px;
      font-weight: 800;
      color: #166534;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 2px;
    }

    .header-title .subtitulo {
      font-size: 11px;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .header-title .contacto {
      font-size: 10.5px;
      color: #475569;
      margin-top: 3px;
    }

    .header-medico {
      text-align: right;
      border-left: 1px solid #e2e8f0;
      padding-left: 16px;
      min-width: 190px;
    }

    .header-medico .doc-name {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 2px;
    }

    .header-medico .doc-spec {
      font-size: 11.5px;
      color: #166534;
      font-weight: 600;
    }

    .header-medico .doc-jvpm {
      font-size: 10.5px;
      color: #64748b;
      margin-top: 1px;
    }

    /* Ficha del Paciente */
    .patient-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 20px;
      display: grid;
      grid-template-columns: 2fr 1fr 1fr;
      gap: 10px 16px;
    }

    .patient-field {
      font-size: 12px;
    }

    .patient-field .label {
      color: #64748b;
      font-size: 10.5px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      display: block;
      margin-bottom: 2px;
    }

    .patient-field .value {
      font-weight: 700;
      color: #0f172a;
    }

    /* Símbolo Rx */
    .rx-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
    }

    .rx-symbol {
      font-size: 32px;
      font-family: Georgia, 'Times New Roman', serif;
      font-weight: bold;
      font-style: italic;
      color: #166534;
      line-height: 1;
    }

    .rx-legend {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Listado de Medicamentos */
    .med-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-left: 3.5px solid #166534;
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 10px;
      page-break-inside: avoid;
    }

    .med-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }

    .med-num {
      background: #dcfce7;
      color: #166534;
      font-size: 10px;
      font-weight: 800;
      width: 20px;
      height: 20px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
    }

    .med-nombre {
      font-size: 13.5px;
      font-weight: 700;
      color: #0f172a;
      flex-grow: 1;
    }

    .badge-via {
      background: #f1f5f9;
      color: #475569;
      font-size: 10px;
      font-weight: 600;
      padding: 2px 7px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .med-posologia {
      font-size: 12px;
      color: #334155;
      margin-left: 28px;
    }

    .med-indicaciones {
      margin-top: 5px;
      margin-left: 28px;
      font-size: 11.5px;
      color: #475569;
      background: #f8fafc;
      padding: 4px 8px;
      border-radius: 4px;
      border-left: 2px solid #cbd5e1;
    }

    .sin-medicamentos {
      text-align: center;
      color: #94a3b8;
      padding: 24px;
      font-style: italic;
      border: 1px dashed #cbd5e1;
      border-radius: 6px;
    }

    /* Observaciones Generales */
    .observaciones-box {
      background: #fffbeb;
      border: 1px solid #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 10px 14px;
      border-radius: 6px;
      margin-top: 14px;
      page-break-inside: avoid;
    }

    .observaciones-titulo {
      font-size: 11px;
      font-weight: 700;
      color: #92400e;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .observaciones-contenido {
      font-size: 12px;
      color: #78350f;
      line-height: 1.4;
      white-space: pre-wrap;
    }

    /* Cierre, Fecha y Firma */
    .closing-section {
      margin-top: 36px;
      page-break-inside: avoid;
    }

    .date-statement {
      font-size: 11.5px;
      color: #475569;
      margin-bottom: 30px;
    }

    .signature-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }

    .disclaimer-box {
      max-width: 320px;
      font-size: 9.5px;
      color: #94a3b8;
      line-height: 1.35;
    }

    .signature-area {
      text-align: center;
      width: 250px;
    }

    .signature-line {
      border-top: 1.2px solid #0f172a;
      margin-bottom: 6px;
    }

    .signature-doctor {
      font-size: 12.5px;
      font-weight: 700;
      color: #0f172a;
    }

    .signature-spec {
      font-size: 10.5px;
      color: #475569;
      text-transform: uppercase;
      margin-top: 1px;
    }

    .signature-title {
      font-size: 10px;
      color: #64748b;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-top: 2px;
    }

    /* Estilos específicos para impresión / PDF */
    @media print {
      @page {
        size: letter portrait;
        margin: 14mm 16mm;
      }

      body {
        padding: 0;
        background: #ffffff !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      .header {
        border-bottom-color: #166534 !important;
      }

      .med-card {
        border-color: #cbd5e1 !important;
        border-left-color: #166534 !important;
      }

      .patient-card {
        background-color: #f8fafc !important;
        border-color: #e2e8f0 !important;
      }

      .observaciones-box {
        background-color: #fffbeb !important;
        border-color: #fef3c7 !important;
        border-left-color: #f59e0b !important;
      }

      .badge-via {
        background-color: #f1f5f9 !important;
      }
    }
  </style>
</head>
<body>
  <!-- ENCABEZADO -->
  <header class="header">
    <div class="header-brand">
      <img src="${clinica.logoUrl}" alt="Logo Clínica" class="header-logo" onerror="this.style.display='none'" />
      <div class="header-title">
        <h1>${escapeHtml(clinica.nombre)}</h1>
        <div class="subtitulo">${escapeHtml(clinica.subtitulo)}</div>
        <div class="contacto">
          ${escapeHtml(clinica.direccion)} &bull; ${escapeHtml(clinica.telefono)}
        </div>
      </div>
    </div>
    <div class="header-medico">
      <div class="doc-name">${escapeHtml(medico.nombre)}</div>
      <div class="doc-spec">${escapeHtml(medico.especialidad)}</div>
      <div class="doc-jvpm">JVPM: ${escapeHtml(medico.jvpm)}</div>
    </div>
  </header>

  <!-- FICHA DEL PACIENTE -->
  <section class="patient-card">
    <div class="patient-field">
      <span class="label">Paciente</span>
      <span class="value">${escapeHtml(paciente.nombre)}</span>
    </div>
    <div class="patient-field">
      <span class="label">N° Expediente</span>
      <span class="value">${escapeHtml(paciente.expediente)}</span>
    </div>
    <div class="patient-field">
      <span class="label">Fecha</span>
      <span class="value">${escapeHtml(fechaCompleta)}</span>
    </div>
    <div class="patient-field">
      <span class="label">Edad</span>
      <span class="value">${escapeHtml(paciente.edad)}</span>
    </div>
    <div class="patient-field">
      <span class="label">Documento (DUI)</span>
      <span class="value">${escapeHtml(paciente.dui)}</span>
    </div>
    <div class="patient-field">
      <span class="label">Teléfono de contacto</span>
      <span class="value">${escapeHtml(paciente.telefono)}</span>
    </div>
  </section>

  <!-- CUERPO DE LA RECETA -->
  <main>
    <div class="rx-header">
      <span class="rx-symbol">&#8478;</span>
      <span class="rx-legend">Prescripción de Medicamentos</span>
    </div>

    <div class="med-list">
      ${itemsHtml}
    </div>

    ${observacionesHtml}
  </main>

  <!-- CIERRE Y FIRMA -->
  <footer class="closing-section">
    <div class="date-statement">
      En <strong>Ahuachapán</strong>, a los ${dia} días del mes de ${mes} del año ${anio}.
    </div>

    <div class="signature-row">
      <div class="disclaimer-box">
        <strong>Aviso Importante:</strong> Esta receta médica constituye una prescripción clínica oficial.
        Cumpla estrictamente con las dosis y la duración indicadas por el médico tratante. No se automedique.
      </div>

      <div class="signature-area">
        <div class="signature-line"></div>
        <div class="signature-doctor">${escapeHtml(medico.nombre)}</div>
        <div class="signature-spec">${escapeHtml(medico.especialidad)}</div>
        <div class="signature-title">Firma y Sello Médico &bull; JVPM: ${escapeHtml(medico.jvpm)}</div>
      </div>
    </div>
  </footer>
</body>
</html>`;
};
