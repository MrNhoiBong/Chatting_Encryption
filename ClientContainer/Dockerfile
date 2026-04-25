FROM ubuntu:22.04

# Tránh các giao diện tương tác khi apt-get install
ENV DEBIAN_FRONTEND=noninteractive

# Cập nhật và cài đặt các gói phụ thuộc (Python, build tools, curl cho Node.js)
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    python3-pip \
    python3-dev \
    git \
    wget \
    curl \
    libgmp-dev \
    libssl-dev \
    flex \
    bison \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Cài đặt PBC từ source
WORKDIR /opt
RUN wget https://crypto.stanford.edu/pbc/files/pbc-0.5.14.tar.gz && \
    tar -xvzf pbc-0.5.14.tar.gz && \
    cd pbc-0.5.14 && \
    ./configure && make && make install

# Cập nhật cache thư viện để nhận diện libpbc
RUN echo "/usr/local/lib" > /etc/ld.so.conf.d/pbc.conf && ldconfig

# Cài đặt Charm từ GitHub
RUN git clone https://github.com/JHUISI/charm.git && \
    cd charm && \
    ./configure.sh && \
    make && \
    pip install .

# Thư mục làm việc chính
WORKDIR /app

# Copy thư mục frontend và cài đặt dependencies cho frontend
COPY frontend/package.json frontend/package-lock.json* ./frontend/
RUN cd frontend && npm install

# Copy thư mục backend (API_client) và cài đặt dependencies cho backend
COPY API_client/requirements.txt ./API_client/
RUN pip install -r API_client/requirements.txt

# Copy toàn bộ source code của frontend và backend
COPY frontend/ ./frontend/
COPY API_client/ ./API_client/

# Mở các port cần thiết: 6060 cho Frontend Vite, 5001 cho Backend API
EXPOSE 6060 5001

# Tạo script chạy cả hai dịch vụ (frontend và backend)
RUN echo '#!/bin/bash\n\
cd /app/API_client && python3 -u client_api.py &\n\
cd /app/frontend && npm run dev -- --host 0.0.0.0 --port 6060\n\
wait -n\n\
' > /app/start.sh && chmod +x /app/start.sh

# Chạy script khi khởi động container
CMD ["/app/start.sh"]
