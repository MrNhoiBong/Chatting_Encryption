# Sử dụng image Ubuntu làm nền (Tương tự dự án trước)
FROM ubuntu:22.04

# Tránh các giao diện tương tác khi apt-get install
ENV DEBIAN_FRONTEND=noninteractive

# Cập nhật và cài đặt các gói phụ thuộc
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    python3-pip \
    python3-dev \
    git \
    wget \
    libgmp-dev \
    libssl-dev \
    flex \
    bison \
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

# Tạo thư mục làm việc cho code
WORKDIR /app

# Copy requirement và cài đặt
COPY requirements.txt /app/requirements.txt
RUN pip install -r requirements.txt

# Copy client code vào container
COPY client_api.py /app/client_api.py

# Mở port 5001 cho Client API (Flask)
EXPOSE 5001

# Chạy Flask Server
CMD ["python3", "-u", "client_api.py"]
