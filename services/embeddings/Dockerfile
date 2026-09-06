FROM python:3.11-slim
WORKDIR /app
# CPU-only torch zuerst installieren -- sentence-transformers zieht sonst
# den vollen CUDA-Build von torch (mehrere GB), obwohl hier nie eine GPU
# zur Verfuegung steht. Das allein spart mehrere GB Image-Groesse.
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir flask sentence-transformers
COPY app.py .
EXPOSE 5000
CMD ["python", "app.py"]
