@echo off
rem Student Board - запуск бэкенда и фронтенда одной командой (Windows).
chcp 65001 >nul
cd /d "%~dp0"

where python >nul 2>nul || (echo Нужен Python 3.12+ ^(python.org, галочка "Add to PATH"^) & pause & exit /b 1)
where npm >nul 2>nul || (echo Нужен Node.js 20+ ^(nodejs.org^) & pause & exit /b 1)

echo == Бэкенд: зависимости и база ==
cd backend
if not exist .venv python -m venv .venv
.venv\Scripts\python -m pip install -q --disable-pip-version-check -r requirements.txt || (pause & exit /b 1)
.venv\Scripts\python manage.py migrate -v0 || (pause & exit /b 1)
.venv\Scripts\python manage.py seed_demo
cd ..

echo == Фронтенд: зависимости ==
cd frontend
if not exist node_modules call npm install --no-audit --no-fund
cd ..

echo == Запуск ==
start "Student Board - backend" cmd /k "cd /d %~dp0backend && .venv\Scripts\python manage.py runserver 8000"

echo.
echo   Сайт:    http://localhost:5173
echo   Админка: http://localhost:8000/admin
echo   Демо-вход: student1 / demo12345  (преподаватель: demo_teacher / demo12345)
echo   Остановить: закройте оба окна (или Ctrl+C)
echo.
cd frontend
call npm run dev
