FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements*.txt ./
RUN pip install --no-cache-dir -r requirements-camera.txt && useradd --uid 10001 --create-home tracker
COPY *.py ./
USER tracker
ENV PYTHONUNBUFFERED=1
EXPOSE 8765
CMD ["python", "eye_tracker.py"]
