#!/usr/bin/env node
/**
 * @file packages/publishing/src/cli/publish.cjs
 * @description 显式启动移动发布 HTTP 服务；成功响应表示仓库更新，不表示静态部署完成。
 */
const { startServer } = require('../api/index.cjs');

startServer();
