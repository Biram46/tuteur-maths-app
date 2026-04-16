FROM python:3.11-slim

# TeX Live + poppler — SANS --no-install-recommends car TeX Live
# a des dépendances recommandées essentielles (binaires, fonts, kpathsea)
RUN apt-get update && apt-get install -y \
    texlive-latex-base \
    texlive-latex-recommended \
    texlive-latex-extra \
    texlive-lang-french \
    texlive-science \
    texlive-pictures \
    texlive-fonts-recommended \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Vérifier que pdflatex est bien présent
RUN which pdflatex && pdflatex --version | head -1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 10000

# 1 worker uniquement — 512 MB RAM sur Render free
CMD ["gunicorn", "app:app", "--bind", "0.0.0.0:10000", "--workers", "1", "--timeout", "120"]
