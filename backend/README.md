# API — Policlínica Ahuachapaneca

API REST construida con Laravel 12, PHP 8.2, Laravel Sanctum y MariaDB.

## Base de datos

El equipo trabaja contra **una sola base**: el servidor MariaDB al que se llega por
Tailscale. No hay copias locales.

Antes de instalar necesitas dos cosas de Dennis: acceso al tailnet y las credenciales de
MariaDB, que no viajan en el repositorio.

## Instalación

```bash
composer install
composer setup
```

`composer setup` copia `.env.example` a `.env` y genera la `APP_KEY`. Luego escribe
`DB_USERNAME` y `DB_PASSWORD` en tu `.env` y levanta la API:

```bash
php artisan serve
```

Queda en `http://localhost:8000/api`. **No hace falta migrar ni sembrar**: la base ya está
creada y con datos.

### Comandos de base de datos

| Comando | Efecto |
|---|---|
| `php artisan migrate` | Aplica migraciones pendientes. Seguro |
| `php artisan migrate:status` | Muestra qué falta por aplicar |
| `php artisan db:seed` | Reescribe las 12 cuentas del seeder **para todos** |
| `php artisan migrate:fresh` | Borra la base **de todo el equipo** |

Los dos últimos afectan a los demás. Avisa antes de ejecutarlos.

Al agregar una migración nueva, aplícala tú y avisa al equipo para que hagan `pull`:
mientras no tengan el archivo, su `migrate:status` mostrará migraciones que no poseen.

### Pruebas

`php artisan test` corre sobre SQLite en memoria (ver `phpunit.xml`), así que **no toca la
base compartida** y puede ejecutarse en cualquier momento.

## Credenciales de desarrollo

- Usuario: `kalgarin@policlinica.com`
- Contraseña: `Policlinica2026!`

Estas credenciales proceden del seeder y deben cambiarse antes de usar el sistema fuera de desarrollo.

## Autenticación

Enviar `POST /api/auth/login` con `usuario` y `password`. Las rutas protegidas requieren:

```text
Authorization: Bearer <token>
Accept: application/json
```

## Endpoints principales

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET|POST /api/usuarios`
- `GET|PUT|PATCH /api/usuarios/{usuario}`
- `PATCH /api/usuarios/{usuario}/estado`
- `GET|POST /api/especialidades`
- `GET|PUT|PATCH /api/especialidades/{especialidad}`
- `GET|POST /api/medicos/{medico}/especialidades`
- `DELETE /api/medicos/{medico}/especialidades/{especialidad}`
- `GET /api/catalogo/especialidades`

## Pruebas

```bash
php artisan test
```
