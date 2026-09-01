# Policlínica Ahuachapaneca — Sistema de Gestión Clínica

Sistema web para la gestión de citas médicas, expedientes clínicos electrónicos y emisión de documentos médicos de la Policlínica Ahuachapaneca.

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| **Frontend** | React 19 + TypeScript + Vite + Tailwind CSS |
| **Backend** | PHP 8.2+ (API REST) |
| **Base de datos** | MariaDB 10.11 |
| **Servidor** | Apache 2.4 + PHP-FPM |

## Estructura del repositorio

```
├── backend/          API REST en PHP
├── frontend/         SPA en React + TypeScript
├── docs/             Documentación del proyecto
└── README.md
```

## Roles del sistema

- **Administrador** — Gestión de usuarios, especialidades y configuración.
- **Secretaría/Recepcionista** — Agendamiento de citas, registro de pacientes, signos vitales.
- **Médico** — Consulta médica, expediente clínico, recetas, documentos.

## Equipo de desarrollo

| Integrante | Rol |
|---|---|
| Katherinne Jeannette Cruz Algarín | UI/UX - Frontend |
| René David Chávez Solito | Frontend |
| Miguel Alejandro Reyes Amaya | Frontend |
| Luis Felipe Balcaceres Silvestre | Backend |
| Dennis Ademir Guevara Martínez | Backend |
| Mario Edgardo Villeda Alabí | Base de datos / Servidores |

## Instalación

### Backend

```bash
cd backend
composer install
cp .env.example .env
# Configurar credenciales de BD en .env
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## Licencia

Proyecto académico — Universidad Católica de El Salvador, 2026.