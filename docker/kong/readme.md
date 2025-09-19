# Kong: Настройка проксирования и HTTPS

## 1. Приём всех HTTP(S) запросов на порты 80 и 443

### **kong.yml**
```yaml
_format_version: "3.0"

services:
  - name: my_service
    url: http://backend-service:3000
    routes:
      - name: catch_all
        paths:
          - /
        strip_path: false
```

### **Настройка портов**
В `kong.conf`:
```yaml
proxy_listen: "0.0.0.0:80, 0.0.0.0:443 ssl"
```

### **Запуск Kong в DB-less режиме**
```sh
kong config db-less --conf kong.yml
```

### **Docker-compose конфигурация**
```yaml
services:
  kong:
    image: kong
    volumes:
      - ./kong.yml:/usr/local/kong/kong.yml
    environment:
      KONG_DATABASE: "off"
      KONG_PROXY_LISTEN: "0.0.0.0:80, 0.0.0.0:443 ssl"
      KONG_DECLARATIVE_CONFIG: "/usr/local/kong/kong.yml"
    ports:
      - "80:80"
      - "443:443"
```

---

## 2. Настройка HTTPS (сертификаты)

### **Использование встроенных сертификатов**
```yaml
certificates:
  - cert: |
      -----BEGIN CERTIFICATE-----
      (ТВОЙ СЕРТИФИКАТ)
      -----END CERTIFICATE-----
    key: |
      -----BEGIN PRIVATE KEY-----
      (ТВОЙ ПРИВАТНЫЙ КЛЮЧ)
      -----END PRIVATE KEY-----
    snis:
      - example.com
      - www.example.com
```

### **Использование сертификатов из файлов**
```yaml
certificates:
  - cert: "/etc/kong/certs/example.com.crt"
    key: "/etc/kong/certs/example.com.key"
    snis:
      - example.com
      - www.example.com
```

### **Docker-compose с сертификатами**
```yaml
services:
  kong:
    image: kong
    volumes:
      - ./kong.yml:/usr/local/kong/kong.yml
      - ./certs:/etc/kong/certs  # Монтируем папку с сертификатами
    environment:
      KONG_DATABASE: "off"
      KONG_DECLARATIVE_CONFIG: "/usr/local/kong/kong.yml"
    ports:
      - "80:80"
      - "443:443"
```

