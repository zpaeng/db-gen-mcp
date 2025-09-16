// MCP服务器入口文件
export { DatabaseMCPServer } from './server';

// 如果直接运行此文件，启动服务器
if (require.main === module) {
  import('./server.js').then((module) => {
    const { DatabaseMCPServer } = module;
    const server = new DatabaseMCPServer();
    server.run().catch(console.error);
  });
}