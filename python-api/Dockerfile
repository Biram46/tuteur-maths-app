FROM python:3.11-slim

# 1) Binaires TeX Live (contient pdflatex) + poppler
RUN apt-get update && apt-get install -y --no-install-recommends \
    texlive-binaries \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# 2) Packages TeX Live (séparé pour limiter le pic RAM sur Render free 512 MB)
RUN apt-get update && apt-get install -y --no-install-recommends \
    texlive-latex-base \
    texlive-latex-recommended \
    texlive-latex-extra \
    texlive-lang-french \
    texlive-science \
    texlive-pictures \
    texlive-fonts-recommended \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 10000

# 1 worker uniquement — 512 MB RAM sur Render free
CMD ["gunicorn", "app:app", "--bind", "0.0.0.0:10000", "--workers", "1", "--timeout", "120"]
