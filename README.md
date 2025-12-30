## F2F 项目

## 项目技术架构

1. Nuxt4
2. webrtc
3. websocket

## 开发

新建.env 文件编写下面的内容

```
NUXT_PUBLIC_TURN_URL="turn:xxx.com:3478"
NUXT_PUBLIC_TURN_USER="user"
NUXT_PUBLIC_TURN_PASSWORD="pass"

```

TRUN 服务器自建，这个服务的存在是为了解决双方打洞不成功的情况，所以需要一台服务器进行部署。采用 docker 简单部署

docker-compose.yml

```yml
version: "3.9"
services:
  coturn:
    image: coturn/coturn
    container_name: coturn
    ports:
      - "3478:3478"
      - "3478:3478/udp"
      - "5349:5349"
      - "5349:5349/udp"
      - "49160-49200:49160-49200/udp"
    volumes:
      - ./turnserver.conf:/etc/coturn/turnserver.conf:ro
      - ./turn-log:/var/log
    restart: unless-stopped
```

turnserver.conf

```text
# turnserver.conf

# 监听 standard TURN/STUN 端口
listening-port=3478
tls-listening-port=5349

# 定义 realm，相当于认证域
realm=webrtc

# 用户名/密码校验打开
lt-cred-mech


# 外部 IP，如果是本机 docker + NAT 可留空
# 如果有公网 IP 可以设置为 external-ip=<PUBLIC-IP>
#external-ip=

# 证书相关（本地测试可不用）
#cert=/config/cert.pem
#pkey=/config/privkey.pem

# TURN 中继地址分配端口范围
min-port=49160
max-port=49200

# 日志输出
log-file=/var/log/turn.log
simple-log

# 用户凭证
user=user:pass
```

`docker compose up -d` 启动，然后在上方的.env 文件中填写你的服务器信息

```shell
pnpm install

pnpm run dev
```

## 功能特色
