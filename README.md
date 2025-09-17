<div align="center">

# Database Generator MCP Server

[![npm version](https://badge.fury.io/js/db-gen-mcp.svg)](https://badge.fury.io/js/db-gen-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub stars](https://img.shields.io/github/stars/zpaeng/db-gen-mcp?style=social)](https://github.com/zpaeng/db-gen-mcp/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/zpaeng/db-gen-mcp?style=social)](https://github.com/zpaeng/db-gen-mcp/network/members)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?logo=node.js&logoColor=white)](https://nodejs.org/)

A powerful MCP (Model Context Protocol) server for connecting to various databases, performing CRUD operations, and generating complete Java Spring Boot + MyBatis-Plus code.

[Quick Start](#quick-start) • [Features](#features) • [Documentation](#documentation) • [Examples](#examples) • [Contributing](#contributing)

[中文文档](README_zh.md)

</div>

## 📈 Star History

<div align="center">

[![Star History Chart](https://api.star-history.com/svg?repos=zpaeng/db-gen-mcp&type=Date)](https://star-history.com/#zpaeng/db-gen-mcp&Date)

### 🏆 Project Metrics
![GitHub stars](https://img.shields.io/github/stars/zpaeng/db-gen-mcp?style=for-the-badge&logo=github&color=yellow)
![GitHub forks](https://img.shields.io/github/forks/zpaeng/db-gen-mcp?style=for-the-badge&logo=github&color=blue)
![GitHub watchers](https://img.shields.io/github/watchers/zpaeng/db-gen-mcp?style=for-the-badge&logo=github&color=green)
![GitHub contributors](https://img.shields.io/github/contributors/zpaeng/db-gen-mcp?style=for-the-badge&logo=github&color=orange)

</div>

---

## 📋 Table of Contents

- [Features](#features)
- [System Requirements](#system-requirements)
- [Quick Start](#quick-start)
- [Installation and Configuration](#installation-and-configuration)
- [Available Tools](#available-tools)
- [Generated Java Code Structure](#generated-java-code-structure)
- [Supported Database Types](#supported-database-types)
- [Examples](#examples)
- [Error Handling](#error-handling)
- [Development and Extension](#development-and-extension)
- [FAQ](#faq)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## ✨ Features

- 🗄️ **Multi-Database Support**: MySQL, PostgreSQL, SQLite, SQL Server, Oracle
- 🔧 **CRUD Operations**: Complete Create, Read, Update, Delete functionality
- 📄 **Pagination**: Support for pagination and conditional queries
- 🏗️ **Code Generation**: Automatically generate Java Entity, Mapper, Service, Controller
- 🔌 **MyBatis-Plus**: Integrated MyBatis-Plus framework
- 🧪 **Connection Testing**: Database connection testing tools
- 📊 **Metadata Analysis**: Retrieve table structure and field information
- 🚀 **MCP Protocol**: Based on Model Context Protocol standard
- 🎯 **Type Safety**: Developed with TypeScript, providing complete type support
- 📝 **Template Customization**: Support for custom Handlebars code templates

## 📋 System Requirements

- **Node.js**: >= 18.0.0
- **npm**: >= 8.0.0
- **TypeScript**: >= 5.0.0
- **Supported OS**: Windows, macOS, Linux

### Database Driver Requirements

Depending on the database type you use, additional system dependencies may be required:

- **Oracle**: Requires Oracle Instant Client
- **SQL Server**: May require additional configuration on Linux/macOS

## 🚀 Quick Start

### 1. Clone the Project

```bash
git clone https://github.com/zpaeng/db-gen-mcp.git
cd db-gen-mcp
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build the Project

```bash
npm run build
```

### 4. Start the Server

```bash
npm start
```

### 5. Configure MCP Client

Add the following configuration to your MCP client configuration file:

**Roo Configuration** (`.roo/mcp.json`):
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

**Claude Desktop Configuration**:
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

## 📦 Installation and Configuration

### Development Mode

```bash
# Watch for file changes and auto-recompile
npm run watch

# Clean build directory
npm run clean

# Rebuild
npm run rebuild

# Run in development mode
npm run dev
```

### Production Deployment

```bash
# Build production version
npm run build

# Start server
npm start
```

## 🛠️ Available Tools

### 1. Test Database Connection

Test if the database connection is working properly.

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

### 2. Get Database Table List

Get all tables in the specified database.

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

### 3. Get Table Schema

Get detailed structure information of the specified table.

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

### 4. Execute Custom SQL Query

Execute custom SQL query statements.

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

### 5. CRUD Operations

#### Create Record

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
    "name": "John Doe",
    "email": "john@example.com",
    "age": 25
  }
}
```

#### Read Records

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

#### Update Records

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

#### Delete Records

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

### 6. Pagination Query

Support for pagination and conditional queries.

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

### 7. Generate Java Code

Automatically generate complete Java Spring Boot + MyBatis-Plus code.

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
    "author": "Developer",
    "enableSwagger": true
  },
  "tableName": "users"
}
```

## 📁 Generated Java Code Structure

The generated code will include the following files:

```
generated/
├── entity/
│   └── User.java              # Entity class
├── mapper/
│   └── UserMapper.java        # MyBatis-Plus Mapper interface
├── service/
│   ├── IUserService.java      # Service interface
│   └── impl/
│       └── UserServiceImpl.java # Service implementation
└── controller/
    └── UserController.java    # REST Controller
```

### Example Generated Code

<details>
<summary>Click to view generated code examples</summary>

#### Entity Class

```java
package com.example.demo.entity;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.annotation.TableField;
import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * <p>
 * User table
 * </p>
 *
 * @author Developer
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

    // getter and setter methods...
}
```

#### Mapper Interface

```java
package com.example.demo.mapper;

import com.example.demo.entity.User;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;

/**
 * <p>
 * User table Mapper interface
 * </p>
 *
 * @author Developer
 * @since 2024-01-01
 */
public interface UserMapper extends BaseMapper<User> {

}
```

#### Service Interface

```java
package com.example.demo.service;

import com.example.demo.entity.User;
import com.baomidou.mybatisplus.extension.service.IService;

/**
 * <p>
 * User table service class
 * </p>
 *
 * @author Developer
 * @since 2024-01-01
 */
public interface IUserService extends IService<User> {

}
```

#### Controller Class

```java
package com.example.demo.controller;

import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Autowired;
import com.example.demo.entity.User;
import com.example.demo.service.IUserService;

/**
 * <p>
 * User table front controller
 * </p>
 *
 * @author Developer
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

## 🗄️ Supported Database Types

| Database | Type Identifier | Status | Notes |
|----------|----------------|--------|-------|
| MySQL | `mysql` | ✅ Fully Supported | Recommended |
| PostgreSQL | `postgresql` | ✅ Fully Supported | Recommended |
| SQLite | `sqlite` | ✅ Fully Supported | Good for development/testing |
| SQL Server | `mssql` | ✅ Fully Supported | Enterprise support |
| Oracle | `oracle` | ✅ Fully Supported | Requires Oracle Client |

## 📚 Examples

See [`examples/quick-start.md`](examples/quick-start.md) for detailed usage examples and tutorials.

## ⚠️ Error Handling

The server returns detailed error information, including:

- **Connection Failed**: Database connection parameter errors, network issues
- **SQL Syntax Error**: Query statement format errors
- **Permission Issues**: Insufficient user permissions
- **Data Type Error**: Parameter type mismatch
- **Constraint Violation**: Primary key conflicts, foreign key constraints, etc.

### Error Response Format

```json
{
  "error": {
    "code": "CONNECTION_FAILED",
    "message": "Unable to connect to database",
    "details": "ECONNREFUSED 127.0.0.1:3306"
  }
}
```

## 🔧 Development and Extension

### Adding New Database Adapters

1. Create a new adapter file in the `src/database/adapters/` directory
2. Extend the `BaseDatabaseAdapter` class
3. Implement all abstract methods
4. Register the new adapter in `DatabaseManager`

```typescript
// src/database/adapters/newdb.ts
import { BaseDatabaseAdapter } from './base';

export class NewDBAdapter extends BaseDatabaseAdapter {
  // Implement abstract methods
}
```

### Custom Code Templates

1. Modify Handlebars templates in the `src/generator/templates/` directory
2. Add new template variables
3. Update corresponding generator classes

```handlebars
{{!-- src/generator/templates/entity.hbs --}}
package {{packageName}}.entity;

/**
 * {{comment}}
 * @author {{author}}
 */
public class {{className}} {
    // Custom template content
}
```

### Project Structure

```
src/
├── database/           # Database related
│   ├── adapters/      # Database adapters
│   ├── manager.ts     # Database manager
│   └── pool.ts        # Connection pool
├── generator/         # Code generator
│   ├── generators/    # Various type generators
│   └── templates/     # Handlebars templates
├── metadata/          # Metadata analysis
├── query/             # Query builder
├── types/             # Type definitions
└── utils/             # Utility functions
```

## ❓ FAQ

<details>
<summary><strong>Q: What to do if database connection fails?</strong></summary>

A: Please check:
1. Whether the database service is running
2. Whether connection parameters are correct (host, port, username, password)
3. Whether the user has sufficient permissions to access the database
4. Whether firewall settings allow connections
5. Whether database drivers are correctly installed

</details>

<details>
<summary><strong>Q: Where is the generated code?</strong></summary>

A: The generated code will be saved in the `outputPath` directory you specified, with the default structure as follows:
```
generated/
├── entity/
├── mapper/
├── service/
└── controller/
```

</details>

<details>
<summary><strong>Q: How to customize generated code templates?</strong></summary>

A: You can modify the Handlebars template files in the `src/generator/templates/` directory to customize the generated code format. You need to rebuild the project after modification.

</details>

<details>
<summary><strong>Q: Which Java frameworks are supported?</strong></summary>

A: Currently mainly supports:
- Spring Boot
- MyBatis-Plus
- Optional Swagger documentation generation

</details>

<details>
<summary><strong>Q: How to handle large databases?</strong></summary>

A: For large databases, it is recommended to:
1. Use pagination queries to avoid loading large amounts of data at once
2. Generate code for specific tables rather than the entire database
3. Appropriately adjust connection pool configuration

</details>

## 🤝 Contributing

We welcome all forms of contributions!

### How to Contribute

1. **Fork** this repository
2. **Create** your feature branch (`git checkout -b feature/AmazingFeature`)
3. **Commit** your changes (`git commit -m 'Add some AmazingFeature'`)
4. **Push** to the branch (`git push origin feature/AmazingFeature`)
5. **Open** a Pull Request

### Contribution Guidelines

- Follow existing code style
- Add appropriate tests
- Update relevant documentation
- Ensure all tests pass

### Development Environment Setup

```bash
# Clone repository
git clone https://github.com/zpaeng/db-gen-mcp.git
cd db-gen-mcp

# Install dependencies
npm install

# Start development mode
npm run dev
```

## 📄 License

This project is licensed under the [MIT License](LICENSE).

## 📞 Contact

- **GitHub Issues**: [Submit Issues](https://github.com/zpaeng/db-gen-mcp/issues)
- **Discussions**: [GitHub Discussions](https://github.com/zpaeng/db-gen-mcp/discussions)

## 🙏 Acknowledgments

Thanks to the following open source projects:

- [Model Context Protocol](https://github.com/modelcontextprotocol) - MCP protocol standard
- [MyBatis-Plus](https://github.com/baomidou/mybatis-plus) - Excellent MyBatis enhancement tool
- [Handlebars.js](https://handlebarsjs.com/) - Template engine
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript

---

<div align="center">

**If this project helps you, please give it a ⭐️**

</div>