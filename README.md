# 坦克大战 · TANK BATTLE

一个无需构建、打开即玩的 HTML5 Canvas 坦克大战。复古街机视觉、纯合成音效，支持键盘与触屏，包含 3 个关卡、3 种敌军坦克和 5 种战场道具。

**[在线试玩](https://sidhxy.github.io/tank-battle/)** · **[GitHub 仓库](https://github.com/sidhxy/tank-battle)**

<p align="center">
  <img src="docs/menu.png" width="49%" alt="坦克大战主菜单">
  <img src="docs/gameplay.png" width="49%" alt="坦克大战战斗画面">
</p>

<p align="center">
  <img src="docs/mobile-game.png" width="300" alt="手机触屏布局">
</p>

## 玩法

驾驶孤军深入的坦克，守住地图底部的鹰徽基地，击退三波敌军。砖墙可以被炮弹摧毁，钢板不可穿透，河流阻挡坦克但炮弹能飞过，树林会遮挡视线。

- **3 个关卡**：沙漠前哨、钢铁回廊、钢铁洪流，敌军数量与强度逐关提升。
- **3 种敌军**：轻型 `grunt`、快速 `scout`、三格装甲 `armor`，击毁得分不同。
- **5 种道具**：护盾、急速射击、额外生命、全屏轰炸、时间冻结。
- **基地防线**：鹰徽被击毁或三条命耗尽都会结束游戏。
- **街机反馈**：屏幕震动、粒子爆炸、浮动得分、CRT 扫描线与复古合成音效。
- **最高分记录**：使用 `localStorage` 自动保存。

## 操作

| 操作 | 键盘 |
| --- | --- |
| 移动 | `W` `A` `S` `D` / 方向键 |
| 开火 | `Space` / `J` |
| 暂停 / 继续 | `P` / `Esc` |
| 静音 | `M` |
| 触屏 | 屏幕下方方向键 + `FIRE` |

## 本地运行

项目是纯静态页面，不需要安装依赖或构建：

```bash
# 方式一：直接双击 index.html

# 方式二：起一个本地静态服务器（推荐）
python -m http.server 8080
# 浏览器打开 http://localhost:8080
```

## 项目结构

```text
tank-battle/
├── index.html          # 街机外壳、HUD 与菜单/触屏 UI
├── css/
│   └── style.css       # 复古街机视觉、CRT 效果与响应式布局
├── js/
│   └── game.js         # 游戏循环、地图、AI、碰撞、音效与渲染
├── assets/
│   └── favicon.svg
├── docs/               # README 展示截图
├── LICENSE
└── README.md
```

技术栈只有原生 HTML、CSS、JavaScript 和 Canvas 2D，没有外部字体、图片或运行时依赖。

## 部署到 GitHub Pages

1. 打开仓库的 **Settings → Pages**。
2. **Source** 选择 **Deploy from a branch**。
3. 分支选择 `main`，目录选择 `/ (root)`，保存。
4. 等待 Actions 完成，访问 <https://sidhxy.github.io/tank-battle/>。

## License

[MIT](LICENSE) © 2026 sidhxy
