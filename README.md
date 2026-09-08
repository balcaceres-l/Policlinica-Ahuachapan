# Policlínica Ahuachapaneca — Sistema de Gestión Clínica

Sistema web para la gestión de citas médicas, expedientes clínicos electrónicos y emisión de documentos médicos de la Policlínica Ahuachapaneca.

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| **Frontend** | React 19 + TypeScript + Vite + Tailwind CSS |
| **Backend** | Laravel 12 + PHP 8.2 + Sanctum (API REST) |
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
composer setup
php artisan serve
```

`composer setup` prepara el `.env`, genera la llave y carga las migraciones con seeders.
Por defecto usa **SQLite**, así que no hace falta instalar MariaDB, ni credenciales, ni
Tailscale: los seeders reproducen todos los datos de prueba.

Si necesitas la base compartida del equipo —o vas a trabajar en agenda y citas— existe la
opción de MariaDB por Tailscale. Ver [backend/README.md](backend/README.md).

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

El frontend necesita el backend corriendo: las pantallas están detrás del login.

## Licencia

Proyecto académico — Universidad Católica de El Salvador, 2026.
