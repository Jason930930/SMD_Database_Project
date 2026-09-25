FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    APP_ENV=production \
    PORT=8080

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/__init__.py backend/app.py backend/
COPY static/ static/
COPY resources/icon.png resources/

RUN useradd --create-home appuser
USER appuser

# Cloud Run 會以 PORT 環境變數指定監聽埠
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 backend.app:app
