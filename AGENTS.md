# Hafiportrait Platform - AI Agent Context

## 项目概述

Hafiportrait Platform 是一个基于 Next.js 15 的婚礼和活动摄影管理平台，采用 TypeScript、Prisma ORM、PostgreSQL 和 Tailwind CSS 构建。该平台为摄影师提供了一个完整的管理系统，用于管理预订、客户、相册和照片选择。

### 核心功能
- **用户认证系统**: 基于 NextAuth.js 的登录认证，支持管理员和客户角色
- **预订管理**: 创建和管理婚礼/活动预订，包括套餐选择、价格、日期等
- **客户管理**: 维护客户信息，跟踪预订历史
- **相册管理**: 创建和管理照片相册，生成客户访问令牌
- **照片选择**: 允许客户从相册中选择照片进行编辑或打印
- **数据统计**: 仪表板显示活动预订、总预订数、相册数和客户数

## 技术栈

- **前端**: Next.js 15 (App Router), React 19, TypeScript
- **样式**: Tailwind CSS, CSS Modules
- **后端**: Next.js API Routes
- **数据库**: PostgreSQL (通过 Prisma ORM)
- **认证**: NextAuth.js
- **实时通信**: Ably (用于实时更新)
- **缓存**: Upstash Redis
- **API**: Google APIs (用于 Google Drive/Photos 集成)
- **UI 组件**: 自定义组件，使用 Lucide React 图标

## 项目结构

```
my-platform/
├── prisma/                 # Prisma 数据库 schema 和迁移
├── public/                 # 静态资源
├── scripts/                # 脚本文件
├── src/
│   ├── app/               # Next.js App Router 页面
│   │   ├── admin/         # 管理员仪表板路由
│   │   ├── api/           # API 路由
│   │   ├── gallery/       # 客户相册访问路由
│   │   ├── login/         # 登录页面
│   │   └── ...            # 其他页面
│   ├── components/        # React 组件
│   │   ├── admin/         # 管理面板组件
│   │   └── ...
│   ├── hooks/             # 自定义 React hooks
│   ├── lib/               # 工具函数和配置
│   └── types/             # TypeScript 类型定义
├── middleware.ts          # Next.js 中间件 (认证控制)
└── ...
```

## 数据模型

### 主要实体
- **Vendor**: 系统中的摄影师/工作室，管理所有业务
- **Client**: 客户信息，与预订相关联
- **Booking**: 预订记录，包含套餐、价格、日期等信息
- **Gallery**: 照片相册，包含客户访问令牌
- **Photo**: 照片实体，存储在 Google Drive 中的文件信息
- **PhotoSelection**: 客户选择的照片，用于编辑或打印

### 关键表关系
- Vendor 一对多关系 Client, Booking, Gallery
- Booking 可选关联到 Client
- Gallery 一对多关系 Photo, PhotoSelection
- Gallery 拥有可选的 GallerySetting

## 认证和授权

- 使用 NextAuth.js 实现基于 JWT 的会话管理
- 通过中间件保护 `/admin` 和 `/api/admin` 路由
- 仅允许认证用户访问管理功能
- 客户通过相册令牌访问特定相册

## API 端点

### 管理员 API
- `/api/admin/clients` - 客户管理
- `/api/admin/events` - 预订管理
- `/api/admin/galleries` - 相册管理
- `/api/admin/metrics` - 统计数据
- `/api/admin/settings` - 设置管理

### 公共 API
- `/api/public/gallery/[token]/route.ts` - 相册访问
- `/api/public/gallery/[token]/count/route.ts` - 相册计数
- `/api/public/gallery/[token]/select/route.ts` - 照片选择

## 开发约定

### 命名约定
- 文件名使用小写和连字符 (kebab-case): `admin-page.tsx`
- 组件名使用大驼峰命名 (PascalCase): `AdminNavigation`
- 变量和函数使用小驼峰命名 (camelCase): `userName`

### 代码结构
- 使用 React Hooks 进行状态管理
- API 调用封装在自定义 hooks 中 (如 `useAdminMetrics`)
- 类型定义使用 TypeScript 接口和类型
- 数据访问通过 Prisma ORM 封装

### 样式约定
- 使用 Tailwind CSS 进行样式设计
- 采用一致的颜色方案和间距系统
- 组件具有响应式设计

## 构建和运行

### 开发环境
```bash
npm run dev
# 或
yarn dev
# 或
pnpm dev
```

### 生产构建
```bash
npm run build
npm start
```

### 测试
```bash
npm run test:e2e
```

## 环境变量

项目需要以下环境变量:

- `DATABASE_URL` - PostgreSQL 数据库连接字符串
- `NEXTAUTH_URL` - NextAuth.js 基础 URL
- `NEXTAUTH_SECRET` - NextAuth.js 密钥
- `UPSTASH_REDIS_REST_URL` - Upstash Redis URL
- `UPSTASH_REDIS_REST_TOKEN` - Upstash Redis 令牌
- `ABLY_API_KEY` - Ably 实时通信 API 密钥
- `GOOGLE_CLIENT_ID` - Google API 客户端 ID
- `GOOGLE_CLIENT_SECRET` - Google API 客户端密钥

## 部署信息

- 支持在 Vercel 平台部署
- 需要配置环境变量
- 需要 PostgreSQL 数据库连接
- 需要 Redis 缓存服务