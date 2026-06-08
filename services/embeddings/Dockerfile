FROM python:3.11-slim
WORKDIR /app
RUN pip install flask sentence-transformers
COPY app.py .
EXPOSE 5000
CMD ["python", "app.py"]
