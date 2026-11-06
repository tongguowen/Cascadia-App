# Cascadia PLM 简体中文术语表

| 项 | 值 |
|----|----|
| 对应 PRD | `PRD-20261102-cascadia-i18n-zh` §5 |
| 状态 | 初稿可执行；争议词见文末 |
| 规则 | 先改本表，再改 `zh-CN` 资源；禁用列不得出现在 UI |

## 取义优先级

1. 公司已有说法（Watchlink / 图纸制度）  
2. 国内主流 PLM/PDM 中文惯用  
3. 国标/行标概念锚  
4. Cascadia 产品特有语义（可中英并列）

## 核心术语

| 概念 ID / 英文 | 规范中文 | 禁用 | 定义 | 出处取向 |
|----------------|----------|------|------|----------|
| Program | 项目 | 程序、方案 | 权限与成员边界的顶层容器 | 国产 PLM「项目」 |
| Design | 设计空间 | 设计图 | 项目下的版本化工程容器（非一张 CAD 图） | 产品语义 |
| Workspace | 工作区 | — | 个人/临时编辑空间 | 协同软件惯用 |
| Part | 零件 | — | 可修订的制造对象 | 机械惯用 |
| Document | 图文档 | — | 受控工程文档/图纸类对象 | 公司「图文档」（可改定） |
| BOM | 物料清单 (BOM) | 账单 | 多级结构关系 | 制造业惯用 |
| ChangeOrder / ECO | 工程变更单 | 仅写「变更」 | 带审批与发布的正式更改 | PDM/PLM 惯用 |
| check-out | 检出 | — | 取得编辑权/锁定 | 国产 PDM |
| check-in | 检入 | — | 提交并释放锁 | 国产 PDM |
| Revision | 修订 | 与 Version 混称「版本」 | 受控修订号 | 技术状态 |
| Version | 版本 | 与 Revision 混用 | 文件/对象历史版本 | 需与修订区分 |
| Vault / Files | 文件库 / 文件 | 金库、保险库 | 受控文件存储 | 近「图文档库」 |
| Lifecycle | 生命周期 | — | 状态机配置 | PLM |
| Release | 发布 | — | 正式生效 | 惯用 |
| Approve | 批准 | — | 审批通过 | 流程 |
| Reject | 驳回 | — | 审批不通过 | 流程 |
| Where-used | 反查 | — | 父件/使用处查询 | 国产 PDM |
| Draft | 草稿 | — | 初始未发布态 | 惯用 |
| In Work | 工作中 | — | 编辑过程态 | 惯用 |
| In Review | 审核中 | — | 评审过程态 | 惯用 |
| Released | 已发布 | — | 正式态 | 惯用 |
| Obsolete | 已废止 | — | 停止使用 | 技术状态 |
| ECO-as-Branch | 工程变更单（分支隔离） | Git 分支（单独使用） | 变更在隔离分支上编辑再合并 | Cascadia 特有 |

## 导航补充

| 英文 | 规范中文 |
|------|----------|
| Dashboard | 仪表盘 |
| Organization | 组织 |
| Designs | 设计空间 |
| All Designs | 全部设计空间 |
| My Workspaces | 我的工作区 |
| Items | 对象 |
| Change Orders | 工程变更单 |
| Parts | 零件 |
| Software | 软件 |
| Documents | 图文档 |
| Requirements | 需求 |
| System Elements | 产品需求 |
| Test Plans | 测试计划 |
| Test Cases | 测试用例 |
| Issues | 问题 |
| Tasks | 任务 |
| Work Orders | 工单 |
| Physical Parts | 实物零件 |
| Work Instructions | 作业指导书 |
| Tools | 工装工具 |
| Files | 文件 |
| Analytics | 分析 |
| Reports | 报表 |
| System | 系统 |
| Lifecycles | 生命周期 |
| Users | 用户 |
| Administration | 管理 |
| Settings | 设置 |
| Roles & Permissions | 角色与权限 |
| Item Types | 对象类型 |
| API Keys | API 密钥 |
| Jobs | 后台任务 |
| Domain Events | 领域事件 |
| Webhooks | Webhook |
| AI Assistant | AI 助手 |

## 待确认

1. Document →「图文档」或「文档」  
2. check-in/out →「检入/检出」或「签入/签出」  
