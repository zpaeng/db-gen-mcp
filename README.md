<div align="center">

# Database Generator MCP Server

[![npm version](https://badge.fury.io/js/db-gen-mcp.svg)](https://badge.fury.io/js/db-gen-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub stars](https://img.shields.io/github/stars/zpaeng/db-gen-mcp?style=social)](https://github.com/zpaeng/db-gen-mcp/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/zpaeng/db-gen-mcp?style=social)](https://github.com/zpaeng/db-gen-mcp/network/members)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?logo=node.js&logoColor=white)](https://nodejs.org/)

一个功能强大的 MCP (Model Context Protocol) 服务器，用于连接各种数据库、执行 CRUD 操作，并生成完整的 Java Spring Boot + MyBatis-Plus 代码。

[快速开始](#快速开始) • [功能特性](#功能特性) • [文档](#文档) • [示例](#示例) • [贡献](#贡献)

</div>

---

## 📋 目录

- [功能特性](#功能特性)
- [系统要求](#系统要求)
- [快速开始](#快速开始)
- [安装和配置](#安装和配置)
- [可用工具](#可用工具)
- [生成的 Java 代码结构](#生成的-java-代码结构)
- [支持的数据库类型](#支持的数据库类型)
- [示例](#示例)
- [错误处理](#错误处理)
- [开发和扩展](#开发和扩展)
- [常见问题](#常见问题)
- [贡献](#贡献)
- [许可证](#许可证)
- [联系方式](#联系方式)

## ✨ 功能特性

- 🗄️ **多数据库支持**: MySQL, PostgreSQL, SQLite, SQL Server, Oracle
- 🔧 **CRUD 操作**: 完整的增删改查功能
- 📄 **分页查询**: 支持分页和条件查询
- 🏗️ **代码生成**: 自动生成 Java Entity、Mapper、Service、Controller
- 🔌 **MyBatis-Plus**: 集成 MyBatis-Plus 框架
- 🧪 **连接测试**: 数据库连接测试工具
- 📊 **元数据分析**: 获取表结构和字段信息
- 🚀 **MCP 协议**: 基于 Model Context Protocol 标准
- 🎯 **类型安全**: 使用 TypeScript 开发，提供完整的类型支持
- 📝 **模板定制**: 支持自定义 Handlebars 代码模板

## 📋 系统要求

- **Node.js**: >= 18.0.0
- **npm**: >= 8.0.0
- **TypeScript**: >= 5.0.0
- **支持的操作系统**: Windows, macOS, Linux

### 数据库驱动要求

根据您使用的数据库类型，可能需要额外的系统依赖：

- **Oracle**: 需要 Oracle Instant Client
- **SQL Server**: 在 Linux/macOS 上可能需要额外配置

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/zpaeng/db-gen-mcp.git
cd db-gen-mcp
```

### 2. 安装依赖

```bash
npm install
```

### 3. 构建项目

```bash
npm run build
```

### 4. 启动服务器

```bash
npm start
```

### 5. 配置 MCP 客户端

将以下配置添加到您的 MCP 客户端配置文件中：

**Roo 配置** (`.roo/mcp.json`):
```json
{
  "mcpServers": {
    "database-generator": {
      "command": "node",
      "args": ["build/index.js"],
      "cwd": "."
    }
  }
}
```

**Claude Desktop 配置**:
```json
{
  "mcpServers": {
    "database-generator": {
      "command": "node",
      "args": ["path/to/db-gen-mcp/build/index.js"],
      "cwd": "path/to/db-gen-mcp"
    }
  }
}
```

## 📦 安装和配置

### 开发模式

```bash
# 监听文件变化并自动重新编译
npm run watch

# 清理构建目录
npm run clean

# 重新构建
npm run rebuild

# 开发模式运行
npm run dev
```

### 生产部署

```bash
# 构建生产版本
npm run build

# 启动服务器
npm start
```

## 🛠️ 可用工具

### 1. 测试数据库连接

测试与数据库的连接是否正常。

```json
{
  "tool": "test_connection",
  "config": {
    "type": "mysql",
    "host": "localhost",
    "port": 3306,
    "user": "root",
    "password": "password",
    "database": "test_db"
  }
}
```

### 2. 获取数据库表列表

获取指定数据库中的所有表。

```json
{
  "tool": "list_tables",
  "config": {
    "type": "mysql",
    "host": "localhost",
    "port": 3306,
    "user": "root",
    "password": "password",
    "database": "test_db"
  }
}
```

### 3. 获取表结构

获取指定表的详细结构信息。

```json
{
  "tool": "get_table_schema",
  "config": {
    "type": "mysql",
    "host": "localhost",
    "port": 3306,
    "user": "root",
    "password": "password",
    "database": "test_db"
  },
  "tableName": "users"
}
```

### 4. 执行自定义 SQL 查询

执行自定义的 SQL 查询语句。

```json
{
  "tool": "execute_query",
  "config": {
    "type": "mysql",
    "host": "localhost",
    "port": 3306,
    "user": "root",
    "password": "password",
    "database": "test_db"
  },
  "query": "SELECT * FROM users WHERE age > ?",
  "params": [18]
}
```

### 5. CRUD 操作

#### 创建记录

```json
{
  "tool": "crud_create",
  "config": {
    "type": "mysql",
    "host": "localhost",
    "port": 3306,
    "user": "root",
    "password": "password",
    "database": "test_db"
  },
  "tableName": "users",
  "data": {
    "name": "张三",
    "email": "zhangsan@example.com",
    "age": 25
  }
}
```

#### 读取记录

```json
{
  "tool": "crud_read",
  "config": {
    "type": "mysql",
    "host": "localhost",
    "port": 3306,
    "user": "root",
    "password": "password",
    "database": "test_db"
  },
  "tableName": "users",
  "criteria": {
    "age": 25
  },
  "limit": 10,
  "offset": 0
}
```

#### 更新记录

```json
{
  "tool": "crud_update",
  "config": {
    "type": "mysql",
    "host": "localhost",
    "port": 3306,
    "user": "root",
    "password": "password",
    "database": "test_db"
  },
  "tableName": "users",
  "data": {
    "email": "newemail@example.com"
  },
  "criteria": {
    "id": 1
  }
}
```

#### 删除记录

```json
{
  "tool": "crud_delete",
  "config": {
    "type": "mysql",
    "host": "localhost",
    "port": 3306,
    "user": "root",
    "password": "password",
    "database": "test_db"
  },
  "tableName": "users",
  "criteria": {
    "id": 1
  }
}
```

### 6. 分页查询

支持分页和条件查询。

```json
{
  "tool": "paginate",
  "config": {
    "type": "mysql",
    "host": "localhost",
    "port": 3306,
    "user": "root",
    "password": "password",
    "database": "test_db"
  },
  "tableName": "users",
  "page": 1,
  "pageSize": 10,
  "criteria": {
    "status": "active"
  }
}
```

### 7. 生成 Java 代码

自动生成完整的 Java Spring Boot + MyBatis-Plus 代码。

```json
{
  "tool": "generate_java_code",
  "dbConfig": {
    "type": "mysql",
    "host": "localhost",
    "port": 3306,
    "user": "root",
    "password": "password",
    "database": "test_db"
  },
  "codeGenConfig": {
    "packageName": "com.example.demo",
    "outputPath": "./generated",
    "author": "开发者",
    "enableSwagger": true
  },
  "tableName": "users"
}
```

## 📁 生成的 Java 代码结构

生成的代码将包含以下文件：

```
generated/
├── entity/
│   └── User.java              # 实体类
├── mapper/
│   └── UserMapper.java        # MyBatis-Plus Mapper 接口
├── service/
│   ├── IUserService.java      # Service 接口
│   └── impl/
│       └── UserServiceImpl.java # Service 实现类
└── controller/
    └── UserController.java    # REST Controller
```

### 示例生成的代码

<details>
<summary>点击查看生成的代码示例</summary>

#### Entity 类

```java
package com.example.demo.entity;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.annotation.TableField;
import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * <p>
 * 用户表
 * </p>
 *
 * @author 开发者
 * @since 2024-01-01
 */
@TableName("users")
public class User implements Serializable {

    private static final long serialVersionUID = 1L;

    @TableId("id")
    private Long id;

    @TableField("name")
    private String name;

    @TableField("email")
    private String email;

    @TableField("age")
    private Integer age;

    @TableField("created_at")
    private LocalDateTime createdAt;

    // getter 和 setter 方法...
}
```

#### Mapper 接口

```java
package com.example.demo.mapper;

import com.example.demo.entity.User;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;

/**
 * <p>
 * 用户表 Mapper 接口
 * </p>
 *
 * @author 开发者
 * @since 2024-01-01
 */
public interface UserMapper extends BaseMapper<User> {

}
```

#### Service 接口

```java
package com.example.demo.service;

import com.example.demo.entity.User;
import com.baomidou.mybatisplus.extension.service.IService;

/**
 * <p>
 * 用户表 服务类
 * </p>
 *
 * @author 开发者
 * @since 2024-01-01
 */
public interface IUserService extends IService<User> {

}
```

#### Controller 类

```java
package com.example.demo.controller;

import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Autowired;
import com.example.demo.entity.User;
import com.example.demo.service.IUserService;

/**
 * <p>
 * 用户表 前端控制器
 * </p>
 *
 * @author 开发者
 * @since 2024-01-01
 */
@RestController
@RequestMapping("/user")
public class UserController {

    @Autowired
    private IUserService userService;

    @GetMapping("/{id}")
    public User getById(@PathVariable Long id) {
        return userService.getById(id);
    }

    @PostMapping
    public boolean save(@RequestBody User user) {
        return userService.save(user);
    }

    @PutMapping
    public boolean updateById(@RequestBody User user) {
        return userService.updateById(user);
    }

    @DeleteMapping("/{id}")
    public boolean removeById(@PathVariable Long id) {
        return userService.removeById(id);
    }
}
```

</details>

## 🗄️ 支持的数据库类型

| 数据库 | 类型标识 | 状态 | 备注 |
|--------|----------|------|------|
| MySQL | `mysql` | ✅ 完全支持 | 推荐使用 |
| PostgreSQL | `postgresql` | ✅ 完全支持 | 推荐使用 |
| SQLite | `sqlite` | ✅ 完全支持 | 适合开发测试 |
| SQL Server | `mssql` | ✅ 完全支持 | 企业级支持 |
| Oracle | `oracle` | ✅ 完全支持 | 需要 Oracle Client |

## 📚 示例

查看 [`examples/quick-start.md`](examples/quick-start.md) 获取详细的使用示例和教程。

## ⚠️ 错误处理

服务器会返回详细的错误信息，包括：

- **连接失败**: 数据库连接参数错误、网络问题
- **SQL 语法错误**: 查询语句格式错误
- **权限问题**: 用户权限不足
- **数据类型错误**: 参数类型不匹配
- **约束违反**: 主键冲突、外键约束等

### 错误响应格式

```json
{
  "error": {
    "code": "CONNECTION_FAILED",
    "message": "无法连接到数据库",
    "details": "ECONNREFUSED 127.0.0.1:3306"
  }
}
```

## 🔧 开发和扩展

### 添加新的数据库适配器

1. 在 `src/database/adapters/` 目录下创建新的适配器文件
2. 继承 `BaseDatabaseAdapter` 类
3. 实现所有抽象方法
4. 在 `DatabaseManager` 中注册新适配器

```typescript
// src/database/adapters/newdb.ts
import { BaseDatabaseAdapter } from './base';

export class NewDBAdapter extends BaseDatabaseAdapter {
  // 实现抽象方法
}
```

### 自定义代码模板

1. 修改 `src/generator/templates/` 目录下的 Handlebars 模板
2. 添加新的模板变量
3. 更新相应的生成器类

```handlebars
{{!-- src/generator/templates/entity.hbs --}}
package {{packageName}}.entity;

/**
 * {{comment}}
 * @author {{author}}
 */
public class {{className}} {
    // 自定义模板内容
}
```

### 项目结构

```
src/
├── database/           # 数据库相关
│   ├── adapters/      # 数据库适配器
│   ├── manager.ts     # 数据库管理器
│   └── pool.ts        # 连接池
├── generator/         # 代码生成器
│   ├── generators/    # 各类型生成器
│   └── templates/     # Handlebars 模板
├── metadata/          # 元数据分析
├── query/             # 查询构建器
├── types/             # 类型定义
└── utils/             # 工具函数
```

## ❓ 常见问题

<details>
<summary><strong>Q: 连接数据库失败怎么办？</strong></summary>

A: 请检查：
1. 数据库服务是否正在运行
2. 连接参数是否正确（主机、端口、用户名、密码）
3. 用户是否有足够的权限访问数据库
4. 防火墙设置是否允许连接
5. 数据库驱动是否正确安装

</details>

<details>
<summary><strong>Q: 生成的代码在哪里？</strong></summary>

A: 生成的代码会保存在您指定的 `outputPath` 目录中，默认结构如下：
```
generated/
├── entity/
├── mapper/
├── service/
└── controller/
```

</details>

<details>
<summary><strong>Q: 如何自定义生成的代码模板？</strong></summary>

A: 您可以修改 `src/generator/templates/` 目录下的 Handlebars 模板文件来自定义生成的代码格式。修改后需要重新构建项目。

</details>

<details>
<summary><strong>Q: 支持哪些 Java 框架？</strong></summary>

A: 目前主要支持：
- Spring Boot
- MyBatis-Plus
- 可选的 Swagger 文档生成

</details>

<details>
<summary><strong>Q: 如何处理大型数据库？</strong></summary>

A: 对于大型数据库，建议：
1. 使用分页查询避免一次性加载大量数据
2. 针对特定表生成代码，而不是整个数据库
3. 适当调整连接池配置

</details>

## 🤝 贡献

我们欢迎所有形式的贡献！

### 如何贡献

1. **Fork** 本仓库
2. **创建** 您的特性分支 (`git checkout -b feature/AmazingFeature`)
3. **提交** 您的更改 (`git commit -m 'Add some AmazingFeature'`)
4. **推送** 到分支 (`git push origin feature/AmazingFeature`)
5. **打开** 一个 Pull Request

### 贡献指南

- 遵循现有的代码风格
- 添加适当的测试
- 更新相关文档
- 确保所有测试通过

### 开发环境设置

```bash
# 克隆仓库
git clone https://github.com/zpaeng/db-gen-mcp.git
cd db-gen-mcp

# 安装依赖
npm install

# 启动开发模式
npm run dev
```

## 📄 许可证

本项目采用 [MIT 许可证](LICENSE)。

## 📞 联系方式

- **GitHub Issues**: [提交问题](https://github.com/zpaeng/db-gen-mcp/issues)
- **讨论**: [GitHub Discussions](https://github.com/zpaeng/db-gen-mcp/discussions)

## 🙏 致谢

感谢以下开源项目：

- [Model Context Protocol](https://github.com/modelcontextprotocol) - MCP 协议标准
- [MyBatis-Plus](https://github.com/baomidou/mybatis-plus) - 优秀的 MyBatis 增强工具
- [Handlebars.js](https://handlebarsjs.com/) - 模板引擎
- [TypeScript](https://www.typescriptlang.org/) - 类型安全的 JavaScript

---

<div align="center">

**如果这个项目对您有帮助，请给它一个 ⭐️**

</div>