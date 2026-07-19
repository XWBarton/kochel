FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN useradd --create-home --uid 1000 kochel \
    && chown -R kochel:kochel /app \
    && chmod +x docker-entrypoint.sh
USER kochel

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/v1/health', timeout=3)" || exit 1

EXPOSE 8000

ENTRYPOINT ["./docker-entrypoint.sh"]
