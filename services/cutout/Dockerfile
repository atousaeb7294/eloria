FROM python:3.12-slim
WORKDIR /service
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 OMP_NUM_THREADS=2 U2NET_HOME=/models XDG_CACHE_HOME=/tmp/cache NUMBA_CACHE_DIR=/tmp/numba
COPY services/cutout/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY services/cutout/worker.py services/cutout/test_worker.py ./
# Model download only at build time, before any product photos are processed.
RUN python worker.py --download-model && useradd --system --uid 1001 cutout && chmod -R a+rX /models
USER cutout
EXPOSE 8765
CMD ["python", "worker.py", "--bind", "0.0.0.0"]
