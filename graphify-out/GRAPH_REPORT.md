# Graph Report - POS System  (2026-05-24)

## Corpus Check
- 63 files · ~1,486,155 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 221 nodes · 374 edges · 29 communities (22 shown, 7 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d5f984a2`
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
- `RequireAuth()` --calls--> `useAuthStore`  [EXTRACTED]
  src/renderer/App.tsx → src/renderer/store/authStore.ts
- `App()` --calls--> `useSettingsStore`  [EXTRACTED]
  src/renderer/App.tsx → src/renderer/store/settingsStore.ts
- `Sidebar()` --calls--> `useAuthStore`  [EXTRACTED]
  src/renderer/components/Sidebar/Sidebar.tsx → src/renderer/store/authStore.ts
- `TopBar()` --calls--> `useAuthStore`  [EXTRACTED]
  src/renderer/components/TopBar/TopBar.tsx → src/renderer/store/authStore.ts
- `CustomersPage()` --calls--> `useSettingsStore`  [EXTRACTED]
  src/renderer/pages/Customers/CustomersPage.tsx → src/renderer/store/settingsStore.ts

## Communities (29 total, 7 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (34): backupDatabase(), better_sqlite3_1, closeDatabase(), getDb(), initDatabase(), runMigrations(), seedDefaults(), connection_1 (+26 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (38): A, C(), connection_1, createWindow(), customers_1, d, Database, electron (+30 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (23): 🏗️ Build & Package, Build Windows Installer (.exe), code:bash (# 1. Install all dependencies), code:bash (npm run dist:win), code:block3 (src/), code:csv (name,barcode,purchase_price,sale_price,stock_quantity,unit,m), code:bash (# Windows installer), code:bash (npm install --save-dev @electron/rebuild) (+15 more)

### Community 3 - "Community 3"
Cohesion: 0.15
Nodes (13): LoginPage(), App(), RequireAuth(), emptyUser, SettingsPage(), Tab, TABS, AuthState (+5 more)

### Community 4 - "Community 4"
Cohesion: 0.23
Nodes (8): CustomersPage(), emptyForm, emptyPayment, emptySupplier, SuppliersPage(), formatCurrency(), formatDate(), formatDateTime()

### Community 5 - "Community 5"
Cohesion: 0.29
Nodes (7): emptyForm, ProductsPage(), UNITS, navItems, Sidebar(), SettingsState, useSettingsStore

### Community 6 - "Community 6"
Cohesion: 0.31
Nodes (7): emptyForm, ExpensesPage(), ReportsPage(), Tab, TABS, startOfMonth(), todayStr()

### Community 7 - "Community 7"
Cohesion: 0.33
Nodes (4): ModalProps, sizeClasses, POSPage(), useCartStore

## Knowledge Gaps
- **77 isolated node(s):** `better_sqlite3_1`, `electron_1`, `path_1`, `fs_1`, `connection_1` (+72 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAuthStore` connect `Community 3` to `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 10`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `useSettingsStore` connect `Community 5` to `Community 3`, `Community 4`, `Community 6`, `Community 7`, `Community 10`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `better_sqlite3_1`, `electron_1`, `path_1` to the rest of the system?**
  _77 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._