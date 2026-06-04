# Graph Report - POS System  (2026-06-04)

## Corpus Check
- 68 files · ~1,494,604 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 258 nodes · 451 edges · 28 communities (21 shown, 7 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d8803212`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]

## God Nodes (most connected - your core abstractions)
1. `useAuthStore` - 24 edges
2. `useSettingsStore` - 21 edges
3. `POS System — Full-Featured Desktop Point of Sale` - 14 edges
4. `buildReceiptText()` - 13 edges
5. `getDb()` - 11 edges
6. `buildReceiptText()` - 11 edges
7. `formatCurrency()` - 8 edges
8. `formatDate()` - 6 edges
9. `initDatabase()` - 5 edges
10. `fmtMoney()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `buildReceiptText()` --calls--> `rightAlign()`  [EXTRACTED]
  src/main/thermalPrinter.ts → dist-electron/main/thermalPrinter.js
- `RequireAuth()` --calls--> `useAuthStore`  [EXTRACTED]
  src/renderer/App.tsx → src/renderer/store/authStore.ts
- `TopBar()` --calls--> `useAuthStore`  [EXTRACTED]
  src/renderer/components/TopBar/TopBar.tsx → src/renderer/store/authStore.ts
- `LoginPage()` --calls--> `useAuthStore`  [EXTRACTED]
  src/renderer/pages/Login/LoginPage.tsx → src/renderer/store/authStore.ts
- `App()` --calls--> `useSettingsStore`  [EXTRACTED]
  src/renderer/App.tsx → src/renderer/store/settingsStore.ts

## Communities (28 total, 7 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (41): CustomersPage(), emptyForm, emptyPayment, DashboardPage(), emptyForm, ExpensesPage(), LoginPage(), ModalProps (+33 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (51): A, buildReceiptText(), C(), centerText(), connection_1, createWindow(), customers_1, d (+43 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (34): backupDatabase(), better_sqlite3_1, closeDatabase(), getDb(), initDatabase(), runMigrations(), seedDefaults(), connection_1 (+26 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (23): 🏗️ Build & Package, Build Windows Installer (.exe), code:bash (# 1. Install all dependencies), code:bash (npm run dist:win), code:block3 (src/), code:csv (name,barcode,purchase_price,sale_price,stock_quantity,unit,m), code:bash (# Windows installer), code:bash (npm install --save-dev @electron/rebuild) (+15 more)

### Community 4 - "Community 4"
Cohesion: 0.27
Nodes (16): buildReceiptText(), centerText(), drawLine(), electron_1, fmtMoney(), formatItemHeader(), formatItemRow(), formatTotalRow() (+8 more)

## Knowledge Gaps
- **81 isolated node(s):** `better_sqlite3_1`, `ApiType`, `electron_1`, `ReceiptData`, `electron_1` (+76 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createWindow()` connect `Community 1` to `Community 2`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `buildReceiptText()` connect `Community 4` to `Community 2`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `text` connect `Community 1` to `Community 2`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `better_sqlite3_1`, `ApiType`, `electron_1` to the rest of the system?**
  _81 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._