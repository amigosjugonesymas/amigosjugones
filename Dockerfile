# ==============================================================================
# AMIGOS JUGONES — DOCKERFILE PARA RENDER CLOUD
# ==============================================================================
FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código fuente
COPY . .

# Puerto dinámico asignado por Render (default 8888)
ENV PORT=8888
EXPOSE 8888

# Ejecutar el servidor Python
CMD ["python", "server.py"]
