TÀI LIỆU TRIỂN KHAI SELFWASHSTATION SERVER

Ubuntu Server 24.04 – Docker – Domain – Nginx Reverse Proxy

1. Thông tin hệ thống
Thành phần	Giá trị
Server IP	192.168.1.250
SSH Port	22896
User	selfwash
Project	selfwashstation
Domain	serverninhbinh.gotdns.ch
Thư mục deploy	/opt/selfwashstation
Frontend	Docker + Nginx container
Backend	NodeJS Docker
Database	MySQL Docker
MQTT	Mosquitto Docker
2. SSH vào server
ssh selfwash@192.168.1.250 -p 22896
3. Cài Docker (Official)
3.1 Cài dependency
sudo apt update
sudo apt install ca-certificates curl gnupg -y

3.2 Add Docker Repository
sudo install -m 0755 -d /etc/apt/keyrings

curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
"deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu \
$(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

3.3 Cài Docker Engine + Compose
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin -y

3.4 Enable Docker
sudo systemctl enable docker
sudo systemctl start docker

3.5 Cho user chạy docker
sudo usermod -aG docker selfwash

Logout SSH → login lại.

Test:

docker ps
4. Chuẩn bị thư mục deploy
sudo mkdir -p /opt/SelfWashStation
sudo chown -R selfwash:selfwash /opt/SelfWashStation
5. Clone project
cd /opt
git clone https://github.com/trinhthehuy/SelfWashStation.git
cd SelfWashStation
6. Tạo file môi trường .env.production
nano .env.production

Nội dung: (điền đầy đủ các biến môi trường production)

Sau khi tạo xong, tạo symlink .env trỏ vào .env.production để Docker Compose tự đọc:

ln -sf .env.production .env

7. Chạy hệ thống Docker
docker compose up -d --build

Kiểm tra:

docker ps

Phải thấy:

selfwash_mysql
selfwash_mqtt
selfwash_backend
selfwash_frontend
8. Cài Nginx Reverse Proxy (Domain)
8.1 Cài nginx
sudo apt install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx
8.2 Mở firewall
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
8.3 Tạo cấu hình domain
sudo nano /etc/nginx/sites-available/selfwashstation

Nội dung:

server {
    listen 80;
    server_name serverninhbinh.gotdns.ch;

    location / {
        proxy_pass http://localhost:5190;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
8.4 Enable site
sudo ln -s /etc/nginx/sites-available/selfwashstation /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
8.5 Kiểm tra nginx
sudo nginx -t

Restart:

sudo systemctl restart nginx
9. Rebuild project sau khi đổi domain
cd /opt/selfwashstation
docker compose down
docker compose up -d --build

Lưu ý: Nếu chưa có symlink .env, chạy lại:

ln -sf .env.production .env

10. Truy cập hệ thống

Frontend:

http://serverninhbinh.gotdns.ch

API:

http://serverninhbinh.gotdns.ch/api
11. Update project sau này
cd /opt/selfwashstation
git pull
docker compose up -d --build

Lưu ý: Symlink .env → .env.production chỉ cần tạo 1 lần. Nếu mất symlink thì chạy lại: ln -sf .env.production .env
12. Lệnh quản trị hệ thống
Xem log
docker compose logs -f
Restart
docker compose restart
Stop
docker compose down
13. Kiến trúc sau khi hoàn thành
Internet
   ↓
Domain serverninhbinh.gotdns.ch
   ↓
Nginx Reverse Proxy
   ↓
Frontend Container
   ↓
Backend API
   ↓
MySQL + MQTT


5) Cài Certbot

Ubuntu 24.04 dùng cách này là tốt nhất:

sudo apt install certbot python3-certbot-nginx -y

6) Cấp HTTPS certificate

Chạy:

sudo certbot --nginx -d serverninhbinh.gotdns.ch

Nó sẽ hỏi:

email
agree terms
redirect HTTP → HTTPS

👉 chọn:

Redirect

để tự động ép HTTPS.

Sau khi xong sẽ tự sửa file Nginx.

7) Kiểm tra kết quả

Mở:

https://serverninhbinh.gotdns.ch

Nếu hiện ổ khóa là OK.

8) Kiểm tra tự gia hạn

Let's Encrypt hết hạn sau 90 ngày.

Test:

sudo certbot renew --dry-run