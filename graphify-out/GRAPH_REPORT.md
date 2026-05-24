# Graph Report - POS System  (2026-05-24)

## Corpus Check
- 63 files · ~1,491,465 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 206 nodes · 345 edges · 40 communities (34 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `35d13a26`
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
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]

## God Nodes (most connected - your core abstractions)
1. `useAuthStore` - 24 edges
2. `useSettingsStore` - 21 edges
3. `POS System — Full-Featured Desktop Point of Sale` - 14 edges
4. `getDb()` - 11 edges
5. `formatCurrency()` - 8 edges
6. `formatDate()` - 6 edges
7. `initDatabase()` - 5 edges
8. `todayStr()` - 5 edges
9. `initDatabase()` - 4 edges
10. `CustomersPage()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `TopBar()` --calls--> `useAuthStore`  [EXTRACTED]
  src/renderer/components/TopBar/TopBar.tsx → src/renderer/store/authStore.ts
- `RequireAuth()` --calls--> `useAuthStore`  [EXTRACTED]
  src/renderer/App.tsx → src/renderer/store/authStore.ts
- `App()` --calls--> `useSettingsStore`  [EXTRACTED]
  src/renderer/App.tsx → src/renderer/store/settingsStore.ts
- `Sidebar()` --calls--> `useAuthStore`  [EXTRACTED]
  src/renderer/components/Sidebar/Sidebar.tsx → src/renderer/store/authStore.ts
- `CustomersPage()` --calls--> `useSettingsStore`  [EXTRACTED]
  src/renderer/pages/Customers/CustomersPage.tsx → src/renderer/store/settingsStore.ts

## Communities (40 total, 6 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (25): A, C(), createWindow(), d, Database, electron, fs, getDb() (+17 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (23): 🏗️ Build & Package, Build Windows Installer (.exe), code:bash (# 1. Install all dependencies), code:bash (npm run dist:win), code:block3 (src/), code:csv (name,barcode,purchase_price,sale_price,stock_quantity,unit,m), code:bash (# Windows installer), code:bash (npm install --save-dev @electron/rebuild) (+15 more)

### Community 2 - "Community 2"
Cohesion: 0.2
Nodes (11): LoginPage(), App(), RequireAuth(), emptyUser, SettingsPage(), Tab, TABS, AuthState (+3 more)

### Community 3 - "Community 3"
Cohesion: 0.29
Nodes (8): emptyForm, ExpensesPage(), ReportsPage(), Tab, TABS, formatDate(), startOfMonth(), todayStr()

### Community 4 - "Community 4"
Cohesion: 0.36
Nodes (3): DashboardPage(), formatCurrency(), percentChange()

### Community 5 - "Community 5"
Cohesion: 0.39
Nodes (5): POSPage(), navItems, Sidebar(), SettingsState, useSettingsStore

### Community 6 - "Community 6"
Cohesion: 0.29
Nodes (4): ModalProps, sizeClasses, emptySupplier, SuppliersPage()

### Community 7 - "Community 7"
Cohesion: 0.4
Nodes (3): connection_1, electron_1, registerSupplierHandlers()

### Community 8 - "Community 8"
Cohesion: 0.6
Nodes (4): better_sqlite3_1, initDatabase(), runMigrations(), seedDefaults()

### Community 9 - "Community 9"
Cohesion: 0.33
Nodes (4): getDb(), connection_1, electron_1, registerReportHandlers()

### Community 10 - "Community 10"
Cohesion: 0.4
Nodes (3): connection_1, electron_1, registerSettingsHandlers()

### Community 11 - "Community 11"
Cohesion: 0.4
Nodes (3): connection_1, electron_1, registerCustomerHandlers()

### Community 12 - "Community 12"
Cohesion: 0.4
Nodes (3): connection_1, electron_1, registerExpenseHandlers()

### Community 13 - "Community 13"
Cohesion: 0.4
Nodes (3): connection_1, electron_1, registerUserHandlers()

### Community 14 - "Community 14"
Cohesion: 0.4
Nodes (3): connection_1, electron_1, registerSaleHandlers()

### Community 15 - "Community 15"
Cohesion: 0.4
Nodes (3): connection_1, electron_1, registerProductHandlers()

### Community 16 - "Community 16"
Cohesion: 0.4
Nodes (3): connection_1, electron_1, registerStockHandlers()

### Community 18 - "Community 18"
Cohesion: 0.5
Nodes (4): CustomersPage(), emptyForm, emptyPayment, formatDateTime()

### Community 19 - "Community 19"
Cohesion: 0.4
Nodes (3): CartItem, CartState, useCartStore

### Community 21 - "Community 21"
Cohesion: 0.5
Nodes (3): emptyForm, ProductsPage(), UNITS

## Knowledge Gaps
- **64 isolated node(s):** `better_sqlite3_1`, `ApiType`, `electron_1`, `electron_1`, `connection_1` (+59 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createWindow()` connect `Community 0` to `Community 7`?**
  _High betweenness centrality (0.086) - this node is a cross-community bridge._
- **Why does `useAuthStore` connect `Community 2` to `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 17`, `Community 18`, `Community 21`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `useSettingsStore` connect `Community 5` to `Community 2`, `Community 3`, `Community 4`, `Community 6`, `Community 18`, `Community 21`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `better_sqlite3_1`, `ApiType`, `electron_1` to the rest of the system?**
  _64 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._