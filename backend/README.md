# API — Policlínica Ahuachapaneca

API REST construida con Laravel 12, PHP 8.2, Laravel Sanctum y MariaDB.

## Instalación

```bash
composer install
composer setup
php artisan serve
```

`composer setup` copia `.env.example` a `.env`, genera la `APP_KEY` y corre las migraciones
con seeders. La API queda en `http://localhost:8000/api`.

Con la configuración por defecto eso es **todo** lo que hace falta: no requiere instalar
MariaDB, ni credenciales, ni Tailscale.

### Elegir base de datos

`.env.example` trae las dos opciones; solo hay que dejar una activa.

**Opción A — SQLite (por defecto).** Cero configuración: sin servidor de base de datos,
sin usuario ni contraseña. Cada quien tiene su propia copia, así que nadie pisa los datos
de otro. `php artisan migrate` crea el archivo automáticamente. Es lo indicado para
frontend y diseño, que solo necesitan que la API responda para pasar del login.

**Opción B — MariaDB compartida vía Tailscale.** Base común del equipo, igual que
producción. Necesaria cuando todos deben ver los mismos datos, y **obligatoria para el
trabajo de agenda y citas**: la regla RB-07 (dos reservas simultáneas no pueden ocupar el
mismo bloque) depende de transacciones y bloqueos de fila que SQLite maneja distinto, y un
bug de concurrencia que no aparece en SQLite y sí en producción cuesta días encontrarlo.

Requiere Tailscale conectado y las credenciales, que se piden a Dennis y no van en el
repositorio. En `.env`, comenta `DB_CONNECTION=sqlite` y descomenta el bloque de MariaDB.

> **La opción B es una base compartida.** `migrate:fresh` y `composer fresh` borran los
> datos de todo el equipo, no solo los tuyos. Avisa antes de ejecutarlos.

### Reiniciar la base

```bash
composer fresh
```

Seguro en SQLite. En la base compartida, destructivo para todos.

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
