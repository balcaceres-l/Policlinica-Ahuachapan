# API — Policlínica Ahuachapaneca

API REST construida con Laravel 12, PHP 8.2, Laravel Sanctum y MariaDB.

## Instalación

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

La API queda disponible en `http://localhost:8000/api`.

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
