FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install requirements.txt
COPY . .
WORKDIR /app/services/stream-worker/src
CMD ["python", "consumer.py"]