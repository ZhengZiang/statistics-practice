# ==================== 构建阶段 ====================
FROM node:22-alpine AS builder

WORKDIR /app

# 复制 package 文件（利用 Docker 层缓存）
COPY package.json package-lock.json* ./

# 安装依赖（ci 更快更可靠，有 lock 文件时用 ci，否则用 install）
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# 复制全部源码
COPY . .

# 构建（限制内存以防 OOM）
RUN NODE_OPTIONS="--max-old-space-size=2048" npm run build

# ==================== 运行阶段 ====================
FROM nginx:1.27-alpine

# 复制 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 从构建阶段复制静态产物
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
