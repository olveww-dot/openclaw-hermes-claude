# OKX 永续合约（USDT-Margined）操盘指南

> 更新：2026-04-18 | 重点：做空策略（熊市思路）

---

## 一、核心概念速查

| 术语 | 含义 |
|------|------|
| **永续合约** | 没有到期日的合约，可永久持有（USDT-Margined = USDT 保证金） |
| **开多/做多** | 买入，等价格涨了赚钱 |
| **开空/做空** | 卖出，等价格跌了赚钱 ← 熊市重点 |
| **全仓（Cross）** | 账户所有余额共同承担风险 |
| **逐仓（Isolated）** | 每个仓位单独承担风险，亏完就爆 |
| **保证金** | 开仓时锁定的资金，作为履约担保 |
| **强平** | 保证金不足，仓位被强制平掉 |
| **资金费率** | 每 8 小时多空双方互相付利息（0.01% 双向常见） |

---

## 二、合约规格（以 BTC-USDT-SWAP 为例）

```
每张合约价值（ctVal）= 0.01 BTC
最小下单量（minSz）   = 0.01 合约
下单步长（lotSz）     = 0.01
价格精度（tickSz）    = 0.1 USDT
保证金模式            = USDT（USDT-Margined）
```

**BTC 开 1 张空单 = 0.01 BTC 名义价值**

常见主流币的合约参数：
- ETH-USDT-SWAP：ctVal = 0.1 ETH，最小 0.01 张
- SOL-USDT-SWAP：ctVal = 1 SOL，最小 0.01 张
- DOGE-USDT-SWAP：ctVal = 1000 DOGE，最小 0.01 张

---

## 三、开仓 / 平仓 / 设置止盈止损

### 开仓（以做空为例）

```python
# 做空 0.1 BTC（= 10 张 BTC-USDT-SWAP）
# 5x 杠杆，全仓模式

swap_place_order(
    instId="BTC-USDT-SWAP",
    tdMode="cross",        # cross=全仓, isolated=逐仓
    side="sell",           # sell=做空, buy=做多
    ordType="market",      # 市价单（立即以市场价成交）
    sz="10",               # 10 张合约（ctVal=0.01，所以 10 张=0.1 BTC）
    lever="5",             # 5x 杠杆
)
```

### 平仓

**方式一：市价平仓（一键平仓，推荐）**
```python
swap_close_position(
    instId="BTC-USDT-SWAP",
    mgnMode="cross",
    # 不填 posSide = 平掉全部仓位
)
```

**方式二：市价单反向平仓**
```python
swap_place_order(
    instId="BTC-USDT-SWAP",
    tdMode="cross",
    side="buy",            # 平空单 = 买入
    ordType="market",
    sz="10",
)
```

**方式三：限价单平仓（价格到了再平）**
```python
swap_place_order(
    instId="BTC-USDT-SWAP",
    tdMode="cross",
    side="buy",
    ordType="limit",
    sz="10",
    px="82000",            # 价格达到 82000 时自动平
)
```

### 止盈止损（TP/SL）— 附在下单上

```python
# 开仓 + 同时挂止盈止损
swap_place_order(
    instId="BTC-USDT-SWAP",
    tdMode="cross",
    side="sell",
    ordType="market",
    sz="10",
    lever="5",
    # 止盈：价格跌到 80000 时触发
    tpTriggerPx="80000",
    tpOrdPx="-1",          # -1 = 市价平仓
    # 止损：价格涨到 82500 时触发
    slTriggerPx="82500",
    slOrdPx="-1",
)
```

**TP/SL 触发价格类型**（默认 `last`）：
- `last` = 成交价触发（最常用）
- `mark` = 标记价格触发（防操纵，推荐）
- `index` = 指数价格触发

---

## 四、杠杆操作（5x 详解）

### 什么是 5x 杠杆？

- 你有 **100 USDT**，开 5x 杠杆 = **500 USDT** 名义价值
- 相当于用 5 倍资金撬动仓位
- 收益和亏损都 **放大 5 倍**

### 设置杠杆

```python
# 全局设置（开仓前必须设置）
swap_set_leverage(
    instId="BTC-USDT-SWAP",
    lever="5",
    mgnMode="cross",       # 全仓
)

# 也可以在下单时指定 lever 参数（更常用）
```

### 5x 杠杆风险对照

| 账户余额 | 名义价值 | 可承受价格波动（BTC） |
|---------|---------|-------------------|
| 100 USDT | 500 USDT（5x） | ±3.3% 爆仓（假设保证金=100） |
| 100 USDT | 1000 USDT（10x）| ±1.7% 爆仓 |

**5x 杠杆安全线**：价格反向波动约 **13-15%** 才接近爆仓线（扣除维持保证金后）

### 逐仓 vs 全仓

| 模式 | 说明 | 适合场景 |
|------|------|---------|
| **全仓（Cross）** | 所有仓位共享保证金，1 个仓位亏损可用另 1 个仓位盈利弥补 | 对冲、趋势交易 |
| **逐仓（Isolated）** | 每个仓位独立，最多亏完该仓位保证金 | 剥头皮、限制亏损 |

---

## 五、订单类型详解

### 市价单（market）
- 立即以当前最优价格成交
- **适合**：快速入场/出场，不在乎滑点
- **注意**：价格波动大时可能有较大滑点

### 限价单（limit）
- 指定价格成交
- **适合**：想以特定价格买入/卖出
- 参数：`px` = 指定价格

### Post-only（只做maker）
- 如果会立即成交（吃单），则自动撤单
- **适合**：挂单吃手续费返还（maker），不想被动成交
- 参数：`ordType="post_only"`

### FOK（全成交或取消）
- 指定时间内未全部成交则自动撤单
- **适合**：希望一定成交量的订单

### IOC（立即成交剩余取消）
- 立即成交部分，然后取消剩余
- **适合**：不想留在订单簿的订单

### 条件单 / 止盈止损单（conditional / oco）

```python
# 条件单 = 触发后下另一个订单
swap_place_algo_order(
    instId="BTC-USDT-SWAP",
    tdMode="cross",
    side="buy",             # 平空单
    ordType="conditional",
    sz="10",
    tpTriggerPx="80000",    # 价格触发
    tpOrdPx="-1",           # 触发后下市价单
)

# OCO = 止盈 + 止损同时挂，一个触发另一个取消
swap_place_algo_order(
    instId="BTC-USDT-SWAP",
    tdMode="cross",
    side="sell",            # 开空
    ordType="oco",          # OCO 模式
    sz="10",
    tpTriggerPx="78000",    # 止盈触发价
    tpOrdPx="-1",
    slTriggerPx="82500",   # 止损触发价
    slOrdPx="-1",
)
```

---

## 六、资金费率（Funding Rate）

### 基本原理

- 每 **8 小时** 结算一次（00:00 / 08:00 / 16:00 UTC+8）
- **正资金费率** = 多头付给空头（对空头有利 ✅）
- **负资金费率** = 空头付给多头（对多头有利）

### 当前 OKX 常见币种资金费率

| 币种 | 典型资金费率 | 倾向 |
|------|------------|------|
| BTC-USDT-SWAP | ±0.01% ~ ±0.03% | 中性 |
| ETH-USDT-SWAP | ±0.01% ~ ±0.05% | 中性 |
| ALT（山寨币） | ±0.1% ~ ±0.5% | 波动大 |
| 熊市高波动期 | 正费率常见 | **有利于做空者** |

### 资金费率实战用法

1. **做空时选正费率时段**：00:00 / 08:00 / 16:00 前做空，可以收到资金费
2. **避免在负费率时做空**：做空要付资金费，增加成本
3. **高资金费率币种要小心**：可能是市场过度做多的信号（反向指标）
4. **山寨币资金费率高**：持有反向仓位可获得可观收益，但要防爆

---

## 七、熊市做空策略（重点）

### 策略核心

熊市思路 = **以做空为主**，等待反弹做空

### 入场信号

| 信号类型 | 说明 | 置信度 |
|---------|------|--------|
| RSI 超买 | RSI(14) 5分钟 从 >70 回落至 <65 | ⭐⭐⭐ |
| 均线压制 | 价格反弹到 MA20/MA30 附近受阻 | ⭐⭐⭐ |
| 顶部结构 | K线出现双顶、吞没、黄昏星等反转形态 | ⭐⭐⭐⭐ |
| 消息面 | 重大利空、ETF 流出、大户抛售 | ⭐⭐⭐⭐⭐ |
| 资金费率飙升 | 多头高度拥挤，反向信号 | ⭐⭐⭐⭐ |

### 止损设置原则

- **固定止损**：入场价 ± 2%（5x 杠杆约 ±10% 波动 → 约 20% 潜在损失）
- **移动止损**：价格往有利方向移动后，不断提高止损线（锁住利润）
- **时间止损**：持仓超过 X 小时未盈利，强制平仓（避免扛单）

### 止盈策略

| 方法 | 说明 |
|------|------|
| 固定比例 | 入场价 - 3%（做空目标）= 止盈 |
| 分批止盈 | 50% 仓位先平，剩下跟踪移动止损 |
| RSI 企稳 | RSI 进入超卖区（<30）后分批平仓 |

### 仓位管理

- **单币仓位**：保证金 ≤ 总资金 5-10%
- **总仓位**：同时持有不超过 3-5 个空单
- **加仓原则**：方向确认后金字塔式加仓，不追单

### 剥头皮式做空（参考 2026-04-17 实盘记录）

```
做空信号：RSI(14) 5m 从 >60 回落至 <55
止损：入场价 × 1.005（约 +0.5%）
止盈：入场价 × 0.995（约 -0.5%）
杠杆：5x-10x
持仓周期：5 分钟 - 2 小时
```

---

## 八、API 操作速查

### 核心工具一览

| 操作 | 工具函数 |
|------|---------|
| 查询持仓 | `account_get_positions` / `swap_get_positions` |
| 下单 | `swap_place_order` |
| 查订单 | `swap_get_order` |
| 撤销订单 | `swap_cancel_order` |
| 平仓 | `swap_close_position` |
| 设置杠杆 | `swap_set_leverage` |
| 查资金费率 | `market_get_funding_rate` |
| 查合约信息 | `market_get_instruments` |

### 下单时必须确认的参数

1. `instId` — 合约名称，格式：`BTC-USDT-SWAP`
2. `sz` — 合约张数（不是金额！），可用 `tgtCcy="quote_ccy"` 改为 USDT 数量
3. `lever` — 杠杆倍数
4. `tdMode` — `cross`（全仓）或 `isolated`（逐仓）
5. `side` — `buy`（做多）/ `sell`（做空）

### 查询最大可开数量

```python
account_get_max_size(
    instId="BTC-USDT-SWAP",
    tdMode="cross",
    px="82000",    # 限价单要填价格
    leverage="5",
)
```

---

## 九、风险警示

⚠️ **高杠杆合约风险极高，以下情况可能爆仓：**

1. 5x 杠杆：价格反向波动约 15-20% → 爆仓（视保证金而定）
2. 10x 杠杆：约 7-10% → 爆仓
3. 20x 杠杆：约 3-5% → 爆仓

⚠️ **资金费率会累积成本**：持有仓位过夜的资金费不可忽视

⚠️ **山寨币波动极大**：可能几分钟内涨跌 10-20%，高杠杆下直接归零

⚠️ **建议**：实盘前先在 demo 模拟盘充分测试，熟悉后再上手

---

## 十、快速参考卡片

```
# 1. 查持仓
swap_get_positions(instType="SWAP")

# 2. 做空 BTC，5x，全仓，市价
swap_place_order(
    instId="BTC-USDT-SWAP",
    tdMode="cross", side="sell",
    ordType="market", sz="10", lever="5"
)

# 3. 做空 + TP/SL（条件单）
swap_place_algo_order(
    instId="BTC-USDT-SWAP",
    tdMode="cross", side="sell", ordType="oco",
    sz="10", lever="5",
    tpTriggerPx="78000", tpOrdPx="-1",
    slTriggerPx="82500", slOrdPx="-1",
)

# 4. 一键平仓
swap_close_position(instId="BTC-USDT-SWAP", mgnMode="cross")

# 5. 设置杠杆
swap_set_leverage(instId="BTC-USDT-SWAP", lever="5", mgnMode="cross")

# 6. 查资金费率
market_get_funding_rate(instId="BTC-USDT-SWAP")
```
