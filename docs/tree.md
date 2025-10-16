怪物课程管理系统
├─ 前端表示层（Next.js + Tailwind）
│ ├─ 入口与鉴权
│ │ ├─ /login 登录
│ │ └─ 鉴权守卫（基于角色的侧边栏/路由）
│ ├─ 仪表盘
│ │ └─ /dashboard （按角色展示三指标与待办）
│ ├─ 课程目录
│ │ ├─ /courses 列表/筛选/检索
│ │ └─ /courses/[id] 课程详情
│ ├─ 班级中心 /classes/[id]
│ │ ├─ schedule 周历排课
│ │ ├─ members 成员/报名
│ │ ├─ assignments 作业与批改
│ │ ├─ attendance 出勤点名
│ │ ├─ evaluations 课后评价结果
│ │ ├─ materials 资源（文件列表）
│ │ └─ analytics 班级看板（出勤率/按时率/满意度）
│ ├─ 公告中心 /announcements
│ └─ 管理页 /admin（用户/角色、少量字典）
│
├─ 应用服务层（Django REST Framework）
│ ├─ 认证与权限（RBAC）
│ │ ├─ 登录/会话：POST /auth/login, GET /auth/me
│ │ └─ 对象级权限校验（组织/ownership）
│ ├─ 课程与班级（catalog, classes）
│ │ ├─ 课程：GET /courses?keyword=&tag=, GET /courses/{id}
│ │ └─ 开班：POST /classes, GET /classes/{id}
│ ├─ 排课（schedule）
│ │ ├─ 读写排课：GET/POST /classes/{id}/schedule
│ │ └─ 冲突校验：教师 × 时间段（MVP）
│ ├─ 选课与成员（enrollments）
│ │ ├─ 报名/导入：POST /classes/{id}/enroll
│ │ └─ 退选：DELETE /enrollments/{id}
│ ├─ 出勤（attendance）
│ │ └─ 批量写入：POST /classes/{id}/attendance
│ ├─ 作业与评分（assignments, submissions, grades）
│ │ ├─ 布置作业：POST /classes/{id}/assignments
│ │ ├─ 学生提交：POST /assignments/{id}/submissions
│ │ └─ 教师评分：POST /submissions/{id}/grade
│ ├─ 课后评价（evaluations）
│ │ ├─ 发布问卷：POST /classes/{id}/evaluations
│ │ └─ 结果汇总：GET /evaluations/{id}/results
│ ├─ 公告与提醒（notifications）
│ │ ├─ 发布公告：POST /announcements
│ │ └─ 自动提醒：作业发布 & 截止前 24h
│ ├─ 数据看板（analytics）
│ │ └─ 班级摘要：GET /analytics/class/{id}/summary
│ ├─ 导出与审计（export, auditlog）
│ │ ├─ CSV 导出（出勤、成绩）
│ │ └─ 审计日志：登录/CRUD/文件访问
│ └─ 管理与配置（admin）
│ └─ 用户、角色、基础字典
│
├─ 数据与基础设施层
│ ├─ 数据库：PostgreSQL
│ │ ├─ User（含角色/部门）
│ │ ├─ Course
│ │ ├─ ClassSection
│ │ ├─ Schedule → Lesson（按节次落表/派生）
│ │ ├─ Enrollment（学生 ↔ 班级）
│ │ ├─ Attendance
│ │ ├─ Assignment / Submission / Grade
│ │ ├─ Evaluation（问卷/答卷）
│ │ ├─ Announcement
│ │ └─ AuditLog
│ ├─ 对象存储：S3/MinIO（直传，签名 URL 10 分钟）
│ ├─ 缓存与队列：Redis + Celery（通知、统计异步化）
│ ├─ 网关与静态：Nginx + CDN（前端静态资源）
│ ├─ 监控与日志：Sentry、结构化审计
│ ├─ CI/CD：GitHub Actions（lint/tests/build/deploy）
│ └─ 运维环境：dev / staging / prod（蓝绿发布、回滚）
│
└─ 横切关注点（Cross-cutting）
├─ 身份鉴权与对象级权限
├─ 数据一致性（事务/幂等/批量接口 ≤2s/200 条）
├─ 性能指标（主列表 P95 ≤ 400ms；首屏 ≤ 3s）
├─ 安全（最小权限、上传白名单、敏感数据保护）
└─ 容错与观测（错误率 ≤ 0.5%，SLO/告警）

---

| 模块     | 技术栈                          | 功能                     |
| -------- | ------------------------------- | ------------------------ |
| UI 层    | React (Next.js)                 | 组件式开发、页面路由     |
| 样式层   | Tailwind CSS                    | 原子化样式、响应式布局   |
| 数据通信 | Axios / fetch                   | 调用 Django REST API     |
| 状态管理 | 可选：Zustand / Redux / Context | 登录态、全局数据缓存     |
| 构建部署 | Next.js 内置工具链              | Vercel 或 Nginx/CDN 部署 |

---

1. 系统总体定位

   - 该系统面向四类用户（部门经理、教务、教师、学生），目标是形成“能教、能学、能管”的教学闭环。
   - MVP 范围覆盖从课程创建 → 排课 → 选课 → 上课（出勤） → 作业 → 课后评价 → 数据看板的全流程。

2. 主要功能逻辑结构

   认证与权限（RBAC）

   - 登录方式：账号/邮箱 + 密码（JWT/Session）。
   - 四类角色：
   - 部门经理：查看汇总指标、审核。
   - 教务：课程/班级管理、排课、导入学生。
   - 教师：点名、布置作业、评分、发布公告。
   - 学生：选课、提交作业、填写评价。
   - 权限模型：对象级校验（基于组织/ownership）。

3. 课程与班级管理

   - 课程（Course）：模板信息（名称、简介、标签等）。
   - 开班（ClassSection）：课程的具体开设实例。
   - 功能：
     - 创建、修改、删除课程/班级。
     - 支持筛选、检索课程目录。
     - 班级详情页下设多标签页（排课、成员、作业、出勤、评价、看板等）。

4. 排课管理（Schedule）

   - 每班可配置每周上课时段。
   - 冲突校验规则：教师 × 时间段。
   - 支持日/周视图（日历组件）。
   - 教室/设备冲突留待 v1.1。

5. 选课与成员（Enrollment）

   - 学生可自助报名或由教务导入。
   - 成员列表：展示教师、学生及其状态。
   - 自动触发加入班级、生成出勤和作业关联。

6. 出勤管理（Attendance）

   - 教师移动端点名（到、迟到、缺勤、请假）。
   - 批量提交接口。
   - 支持查看班级出勤率。
   - 可导出 CSV 报表。

7. 作业与评分（Assignment / Submission / Grade）

   - 教师布置作业：标题、截止时间、权重。
   - 学生提交：文本或附件（S3 直传）。
   - 教师评分：分数 + 评语，可批量保存草稿。
   - 截止前 24 小时自动提醒（通知系统）。

8. 课后评价（Evaluation）

   - 固定模板问卷（满意度/建议）。
   - 汇总统计：平均分、分布图。
   - 结果在班级看板可视化展示。

9. 公告与通知（Announcement / Notification）

   - 教师或教务可发布班级公告。
   - 系统自动提醒两类事件：
   - 作业发布；
   - 作业截止前 24h。
   - 延迟容忍 ≤ 60 秒。

10. 数据看板与统计（Analytics）

    - 班级级别三大核心指标：
    - 出勤率；
    - 作业按时率；
    - 满意度。
    - 支持趋势图与概览汇总接口。
    - 后期扩展报表中心、教师工作量分析等。

11. 审计与导出（AuditLog / Export）

    - 记录登录、CRUD、文件操作等操作日志。
    - CSV 导出：出勤、成绩。
    - 文件安全：签名 URL（10 分钟有效）。

12. 版本与迭代逻辑
    - MVP（v1.0）：完成“教学闭环”。
    - v1.1+：排课增强、Rubric 评分、Webhook 通知。
    - v1.2：测验题库、成绩册、反作弊。
    - v1.3：问卷中心、报表中心、标签化运营。
    - v1.4：内容版本管理、隐私与外部系统对接。
