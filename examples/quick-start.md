# 快速开始指南

本指南将帮助您快速设置和使用 Database Generator MCP Server。

## 1. 安装和构建

```bash
# 克隆或下载项目后，安装依赖
npm install

# 构建项目
npm run build
```

## 2. 配置 Roo

在项目根目录的 `.roo/mcp.json` 文件中已经包含了正确的配置：

```json
{
  "mcpServers": {
    "database-generator": {
      "command": "node",
      "args": ["build/index.js"],
      "cwd": ".",
      "env": {}
    }
  }
}
```

## 3. 测试连接

启动 Roo 后，您可以使用以下工具来测试数据库连接：

### 测试 MySQL 连接

```
请帮我测试一下数据库连接，配置如下：
- 类型：mysql
- 主机：localhost
- 端口：3306
- 用户名：root
- 密码：your_password
- 数据库：test_db
```

### 获取表列表

```
请帮我获取数据库中的所有表，使用上面的连接配置。
```

### 查看表结构

```
请帮我查看 users 表的结构，使用上面的连接配置。
```

## 4. 执行 CRUD 操作

### 创建记录

```
请帮我在 users 表中创建一条新记录：
- name: "张三"
- email: "zhangsan@example.com"
- age: 25
```

### 查询记录

```
请帮我查询 users 表中年龄大于 20 的所有用户，限制返回 10 条记录。
```

### 更新记录

```
请帮我更新 users 表中 id 为 1 的用户的邮箱为 "newemail@example.com"。
```

### 删除记录

```
请帮我删除 users 表中 id 为 1 的用户。
```

## 5. 生成 Java 代码

```
请帮我为 users 表生成完整的 Java 代码，配置如下：
- 包名：com.example.demo
- 输出路径：./generated
- 作者：开发者
- 启用 Swagger：true
```

## 6. 分页查询

```
请帮我对 users 表进行分页查询：
- 第 1 页
- 每页 10 条记录
- 只查询状态为 "active" 的用户
```

## 常见问题

### Q: 连接数据库失败怎么办？

A: 请检查：
1. 数据库服务是否正在运行
2. 连接参数是否正确（主机、端口、用户名、密码）
3. 用户是否有足够的权限访问数据库
4. 防火墙设置是否允许连接

### Q: 生成的代码在哪里？

A: 生成的代码会保存在您指定的 `outputPath` 目录中，默认结构如下：
```
generated/
├── entity/
├── mapper/
├── service/
└── controller/
```

### Q: 支持哪些数据库？

A: 目前支持：
- MySQL
- PostgreSQL
- SQLite
- SQL Server (MSSQL)
- Oracle

### Q: 如何自定义生成的代码模板？

A: 您可以修改 `src/generator/templates/` 目录下的 Handlebars 模板文件来自定义生成的代码格式。

## 开发模式

如果您需要修改服务器代码，可以使用以下命令：

```bash
# 监听文件变化并自动重新编译
npm run watch

# 清理构建目录
npm run clean

# 重新构建
npm run rebuild
```

## 更多示例

查看 `examples/example-usage.md` 文件获取更多详细的使用示例。