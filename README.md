# auto_excel_fe

## Chạy bằng Docker

Đường dẫn API được đóng gói vào frontend tại thời điểm build. Mặc định là `/api`:

```bash
docker build \
  --build-arg VITE_API_BASE_URL=/api \
  -t <dockerhub-username>/auto-excel-fe:latest .

docker run --rm -p 8080:80 <dockerhub-username>/auto-excel-fe:latest
```

Mở `http://localhost:8080`.

Khi dùng `VITE_API_BASE_URL=/api`, reverse proxy hoặc Ingress của môi trường
triển khai cần chuyển các request `/api/*` tới backend.

Đẩy image lên Docker Hub:

```bash
docker login
docker push <dockerhub-username>/auto-excel-fe:latest
```
