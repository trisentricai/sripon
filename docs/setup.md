# SriPon Local Setup

## 0. Prerequisites

- Python 3.11+
- Node.js 20+ (LTS)
- Flutter 3.x (stable) with Android toolchain (or iOS via macOS)
- Optional for full features: a Supabase project, Firebase project,
  Cloudinary account, Redis (`redis-server` or Render Redis)

## 1. Backend (Django)

```bash
cd backend

# virtual environment
python -m venv venv
# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

# dependencies
pip install -r requirements.txt

# environment
copy .env.example .env        # Windows
cp .env.example .env          # macOS / Linux
# edit .env with your values (DATABASE_URL, FIREBASE_*, SUPABASE_*, etc.)

# migrate (SQLite can be used to get going sooner; DATABASE_URL overrides)
python manage.py migrate
python manage.py createsuperuser   # Django admin (optional)

# run
python manage.py runserver
```

Health check: `http://localhost:8000/health/`
API docs: `http://localhost:8000/api/docs/` and `http://localhost:8000/api/schema/`

Without `DATABASE_URL` the backend runs on SQLite + in-memory cache so you can
develop immediately. Point `DATABASE_URL` at Supabase to exercise PostgreSQL.

## 2. Customer website

```bash
cd web
npm install
copy .env.example .env     # fill VITE_* values
npm run dev                # http://localhost:5173
npm run build              # production build
```

## 3. Admin dashboard

```bash
cd admin
npm install
copy .env.example .env     # fill VITE_* values
npm run dev                # http://localhost:5174
npm run build
```

## 4. Flutter app

```bash
cd mobile
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000/api/v1   # Android emulator
flutter run --dart-define=API_BASE_URL=http://localhost:8000/api/v1  # iOS simulator
```

Add `google-services.json`/`GoogleService-Info.plist` and the
`google-services` Gradle plugin before enabling Firebase sign-in.

## 5. Useful commands

| Command | Purpose |
|---|---|
| `python manage.py check` | Django config validation |
| `python manage.py makemigrations` | Create migration files |
| `python manage.py migrate` | Apply migrations |
| `python manage.py test` | Run backend tests |
| `npm run build` (web/admin) | Type-check + production build |
| `flutter analyze` / `flutter test` | Lint + run Flutter tests |

## 6. Typically used env variables

Backend: `DJANGO_SECRET_KEY`, `DATABASE_URL`, `REDIS_URL`,
`FIREBASE_*`, `SUPABASE_*`, `CLOUDINARY_*`, `PAYMENT_*`,
`CORS_ALLOWED_ORIGINS`, `DJANGO_ALLOWED_HOSTS`.

Web: `VITE_API_BASE_URL`, `VITE_FIREBASE_*` (all else is cosmetic).

Admin: `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

Flutter: `API_BASE_URL` (`--dart-define`).