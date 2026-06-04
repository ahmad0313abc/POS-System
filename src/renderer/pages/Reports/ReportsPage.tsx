import React, { useState, useEffect, useRef } from 'react'
import { formatCurrency, formatDate, todayStr, startOfMonth } from '../../utils/currency'
import { useSettingsStore } from '../../store/settingsStore'
import Modal from '../../components/Modal/Modal'
import { useReactToPrint } from 'react-to-print'
import toast from 'react-hot-toast'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

const TABS = ['sales','pl','inventory','top','credit','eod'] as const
type Tab = typeof TABS[number]

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>('sales')
  const [startDate, setStartDate] = useState(startOfMonth())
  const [endDate, setEndDate] = useState(todayStr())
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)
  const [totalOutstanding, setTotalOutstanding] = useState(0)
  const [eodDate, setEodDate] = useState(todayStr())

  // Dynamic bill states
  const [showBillModal, setShowBillModal] = useState(false)
  const [selectedSale, setSelectedSale] = useState<any>(null)
  const [loadingSale, setLoadingSale] = useState(false)
  const billReceiptRef = useRef<HTMLDivElement>(null)

  const currency = useSettingsStore(s => s.get('currency_symbol', '₨'))
  const storeName = useSettingsStore(s => s.get('store_name', 'My Store'))
  const storeAddress = useSettingsStore(s => s.get('store_address', ''))
  const storePhone = useSettingsStore(s => s.get('store_phone', ''))
  const storePhone2 = useSettingsStore(s => s.get('store_phone2', ''))
  const receiptFooter = useSettingsStore(s => s.get('receipt_footer', 'Thank you for shopping with us!'))
  const receiptWidth = useSettingsStore(s => s.get('receipt_width', '80'))
  const taxEnabled = useSettingsStore(s => s.get('tax_enabled', '0')) === '1'
  const taxName = useSettingsStore(s => s.get('tax_name', 'GST'))

  const fmt = (n: number) => formatCurrency(n, currency)

  useEffect(() => { loadReport() }, [tab, startDate, endDate, eodDate])

  const loadReport = async () => {
    setLoading(true)
    try {
      const filters = { start_date: startDate, end_date: endDate }
      if (tab === 'sales') setData(await window.api.getSalesReport(filters))
      else if (tab === 'pl') setData(await window.api.getProfitLossReport(filters))
      else if (tab === 'inventory') setData(await window.api.getInventoryReport())
      else if (tab === 'top') setData(await window.api.getTopProducts(filters))
      else if (tab === 'credit') setData(await window.api.getCreditReport())
      else if (tab === 'eod') setData(await window.api.getEndOfDayReport(eodDate))
      
      setTotalOutstanding(await window.api.getTotalOutstanding())
    } catch (error: any) {
      console.error('Failed to load report:', error)
      toast.error(error.message || 'Failed to load report')
      setData(null)
    } finally { 
      setLoading(false) 
    }
  }

  const openBillDetails = async (saleId: number) => {
    setLoadingSale(true)
    try {
      const sale = await window.api.getSale(saleId)
      setSelectedSale(sale)
      setShowBillModal(true)
    } catch (error: any) {
      toast.error('Failed to load bill details')
    } finally {
      setLoadingSale(false)
    }
  }

  const handlePrintBill = async () => {
    if (!selectedSale) return
    try {
      await window.api.printReceipt({
        storeName,
        storeAddress,
        storePhone,
        storePhone2,
        billNumber: selectedSale.bill_number,
        createdAt: selectedSale.created_at ? new Date(selectedSale.created_at).toLocaleString('en-PK') : '',
        cashierName: selectedSale.cashier_name || 'System',
        customerName: selectedSale.customer_name || 'Walk-in',
        paymentMethod: selectedSale.payment_method,
        items: selectedSale.items?.map((i: any) => ({
          product_name: i.product_name,
          quantity: i.quantity,
          unit_price: i.unit_price,
          total_price: i.total_price,
          discount_percent: i.discount_percent
        })) || [],
        subtotal: selectedSale.subtotal || 0,
        discount: selectedSale.discount_amount || 0,
        taxAmount: selectedSale.tax_amount || 0,
        taxName,
        total: selectedSale.total_amount || 0,
        paidAmount: selectedSale.paid_amount || 0,
        changeAmount: selectedSale.change_amount || 0,
        receiptFooter,
        receiptWidth
      })
    } catch (err) {
      console.error('Print failed:', err)
      toast.error('Receipt print failed')
    }
  }

  const exportPDF = () => {
    const doc = new jsPDF()
    const sym = (currency === '₨' || !currency) ? 'Rs.' : currency
    const fmtPDF = (n: number) => `${sym} ${(n ?? 0).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

    doc.setFontSize(16); doc.text(storeName, 14, 15)
    doc.setFontSize(11); doc.text(`Report: ${tab.toUpperCase()} | Period: ${startDate} to ${endDate}`, 14, 25)

    if (tab === 'sales' && data?.sales) {
      if (data.summary) {
        doc.setFontSize(10)
        doc.text(`Total Bills: ${data.summary.total_bills}   Revenue: ${fmtPDF(data.summary.total_revenue)}   Avg Bill: ${fmtPDF(data.summary.avg_bill)}`, 14, 33)
      }
      autoTable(doc, {
        startY: 40,
        head: [['Bill #', 'Customer', 'Method', 'Amount', 'Date']],
        body: data.sales.map((s: any) => [
          s.bill_number,
          s.customer_name || 'Walk-in',
          s.payment_method,
          fmtPDF(s.total_amount),
          formatDate(s.created_at)
        ])
      })

    } else if (tab === 'pl' && data) {
      autoTable(doc, {
        startY: 35,
        head: [['Item', 'Amount']],
        body: [
          ['Total Revenue', fmtPDF(data.revenue)],
          ['Cost of Goods Sold (COGS)', fmtPDF(data.cogs)],
          ['Gross Profit', fmtPDF(data.grossProfit)],
          ['Total Expenses', fmtPDF(data.expenses)],
          ['Net Profit', fmtPDF(data.netProfit)],
        ],
        styles: { fontStyle: 'normal' },
        didParseCell: (hookData: any) => {
          if (hookData.row.index === 4) hookData.cell.styles.fontStyle = 'bold'
        }
      })
      if (data.expenseByCategory?.length > 0) {
        const lastY = (doc as any).lastAutoTable.finalY + 10
        doc.setFontSize(12); doc.text('Expense Breakdown', 14, lastY)
        autoTable(doc, {
          startY: lastY + 5,
          head: [['Category', 'Amount']],
          body: data.expenseByCategory.map((e: any) => [e.category || 'Uncategorized', fmtPDF(e.total)])
        })
      }

    } else if (tab === 'inventory' && data) {
      autoTable(doc, {
        startY: 35,
        head: [['Product', 'Category', 'Stock', 'Buy Price', 'Sale Price', 'Stock Value']],
        body: data.map((p: any) => [p.name, p.category_name || '', `${p.stock_quantity} ${p.unit}`, fmtPDF(p.purchase_price), fmtPDF(p.sale_price), fmtPDF(p.stock_value)])
      })

    } else if (tab === 'top' && data) {
      autoTable(doc, {
        startY: 35,
        head: [['Product', 'Qty Sold', 'Revenue', 'Cost', 'Profit']],
        body: data.map((p: any) => [p.product_name, p.total_qty, fmtPDF(p.total_revenue), fmtPDF(p.total_cost), fmtPDF(p.profit)])
      })

    } else if (tab === 'credit' && data) {
      autoTable(doc, {
        startY: 35,
        head: [['Customer', 'Phone', 'Balance Due']],
        body: data.map((c: any) => [c.name, c.phone || '-', fmtPDF(c.current_balance)])
      })
    }

    doc.save(`report_${tab}_${todayStr()}.pdf`)
    toast.success('PDF exported')
  }

  const exportExcel = () => {
    let rows: any[] = []
    if (tab === 'sales' && data?.sales) rows = data.sales.map((s:any) => ({ Bill: s.bill_number, Customer: s.customer_name||'Walk-in', Method: s.payment_method, Total: s.total_amount, Date: s.created_at }))
    else if (tab === 'inventory' && data) rows = data.map((p:any) => ({ Product: p.name, Category: p.category_name, Stock: p.stock_quantity, Unit: p.unit, PurchasePrice: p.purchase_price, SalePrice: p.sale_price, StockValue: p.stock_value }))
    else if (tab === 'top' && data) rows = data.map((p:any) => ({ Product: p.product_name, QtySold: p.total_qty, Revenue: p.total_revenue, Cost: p.total_cost, Profit: p.profit }))
    else if (tab === 'credit' && data) rows = data.map((c:any) => ({ Customer: c.name, Phone: c.phone, Balance: c.current_balance }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Report')
    XLSX.writeFile(wb, `report_${tab}_${todayStr()}.xlsx`)
    toast.success('Excel exported')
  }

  const TAB_LABELS: Record<Tab, string> = { sales:'📊 Sales', pl:'💹 P&L', inventory:'📦 Inventory', top:'🏆 Top Products', credit:'💳 Credit', eod:'📋 End of Day' }

  return (
    <div className="page-scroll space-y-4 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">📈 Reports</h1>
        <div className="flex gap-2">
          <button onClick={exportPDF} className="btn-danger btn-sm">📄 PDF</button>
          <button onClick={exportExcel} className="btn-success btn-sm">📊 Excel</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-900/20 border border-red-800/50 p-4 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 bg-red-900/40 rounded-xl flex items-center justify-center text-2xl">💳</div>
          <div>
            <p className="text-[11px] text-gray-400 uppercase font-bold tracking-widest">Total Remaining (Udhaar)</p>
            <p className="text-2xl font-bold text-red-400 leading-tight">{fmt(totalOutstanding)}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 bg-dark-800 p-1 rounded-xl border border-dark-700">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${tab===t?'bg-primary-600 text-white':'text-gray-400 hover:text-white'}`}>{TAB_LABELS[t]}</button>
        ))}
      </div>

      {tab !== 'eod' && tab !== 'credit' && tab !== 'inventory' && (
        <div className="flex gap-3 items-end">
          <div className="form-group"><label className="label">From</label><input type="date" className="input" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
          <div className="form-group"><label className="label">To</label><input type="date" className="input" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
          <div className="flex gap-1">
            {[['Today', todayStr(), todayStr()],['This Month', startOfMonth(), todayStr()]].map(([l,s,e]) => (
              <button key={l} onClick={() => { setStartDate(s); setEndDate(e) }} className="btn-secondary btn-sm">{l}</button>
            ))}
          </div>
        </div>
      )}
      {tab === 'eod' && (
        <div className="form-group" style={{maxWidth:200}}>
          <label className="label">Date</label>
          <input type="date" className="input" value={eodDate} onChange={e => setEodDate(e.target.value)} />
        </div>
      )}

      {loading ? <div className="text-center py-20 text-gray-400">⏳ Loading...</div> : (
        <>
          {tab === 'sales' && data && !Array.isArray(data) && 'summary' in data && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                {[
                  { label:'Total Bills', value: data.summary?.total_bills||0 },
                  { label:'Revenue', value: fmt(data.summary?.total_revenue||0) },
                  { label:'Discounts', value: fmt(data.summary?.total_discounts||0) },
                  { label:'Tax', value: fmt(data.summary?.total_tax||0) },
                  { label:'Avg Bill', value: fmt(data.summary?.avg_bill||0) },
                ].map(s => (
                  <div key={s.label} className="card text-center py-3"><p className="text-xs text-gray-400">{s.label}</p><p className="text-lg font-bold text-white mt-1">{s.value}</p></div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {data.byPayment?.map((p:any) => (
                  <div key={p.payment_method} className="card text-center">
                    <p className="text-sm text-gray-400 capitalize">{p.payment_method}</p>
                    <p className="text-xl font-bold text-primary-400">{fmt(p.total)}</p>
                    <p className="text-xs text-gray-500">{p.count} bills</p>
                  </div>
                ))}
              </div>
              <div className="table-container animate-fade-in">
                <table className="table">
                  <thead><tr><th>Bill#</th><th>Customer</th><th>Method</th><th>Subtotal</th><th>Discount</th><th>Total</th><th>Date</th></tr></thead>
                  <tbody>
                    {data.sales?.slice(0,100).map((s:any) => (
                      <tr key={s.id}>
                        <td className="font-mono">
                          <button
                            onClick={() => openBillDetails(s.id)}
                            className="text-primary-400 hover:text-primary-300 font-bold underline text-left transition-colors"
                            title="Click to view purchased goods"
                          >
                            {s.bill_number}
                          </button>
                        </td>
                        <td>{s.customer_name||'Walk-in'}</td>
                        <td><span className="badge-blue capitalize">{s.payment_method}</span></td>
                        <td>{fmt(s.subtotal)}</td>
                        <td className="text-amber-400">{fmt(s.discount_amount)}</td>
                        <td className="font-bold text-white">{fmt(s.total_amount)}</td>
                        <td className="text-xs text-gray-400">{formatDate(s.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'pl' && data && !Array.isArray(data) && 'grossProfit' in data && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="card space-y-3">
                <h3 className="font-semibold text-white">Profit & Loss Summary</h3>
                {[
                  { label:'Revenue', value:fmt(data.revenue), color:'text-emerald-400' },
                  { label:'Cost of Goods Sold', value:fmt(data.cogs), color:'text-red-400' },
                  { label:'Gross Profit', value:fmt(data.grossProfit), color:data.grossProfit>=0?'text-emerald-400':'text-red-400' },
                  { label:'Total Expenses', value:fmt(data.expenses), color:'text-red-400' },
                  { label:'Net Profit', value:fmt(data.netProfit), color:data.netProfit>=0?'text-emerald-400 text-2xl font-bold':'text-red-400 text-2xl font-bold' },
                ].map(r => (
                  <div key={r.label} className={`flex justify-between py-2 border-b border-dark-700 ${r.label==='Net Profit'?'border-none pt-2':''}`}>
                    <span className="text-gray-400">{r.label}</span>
                    <span className={r.color}>{r.value}</span>
                  </div>
                ))}
              </div>
              <div className="card">
                <h3 className="font-semibold text-white mb-3">Expenses by Category</h3>
                <div className="space-y-2">
                  {data.expenseByCategory?.map((e:any) => (
                    <div key={e.category} className="flex justify-between text-sm p-2 bg-dark-700 rounded-lg">
                      <span className="text-gray-300">{e.category||'Uncategorized'}</span>
                      <span className="text-red-400 font-medium">{fmt(e.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'inventory' && Array.isArray(data) && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="card text-center"><p className="text-xs text-gray-400">Total Products</p><p className="text-2xl font-bold text-white">{data.length}</p></div>
                <div className="card text-center"><p className="text-xs text-gray-400">Stock Cost Value</p><p className="text-2xl font-bold text-primary-400">{fmt(data.reduce((s:number,p:any)=>s+(p.stock_value||0),0))}</p></div>
                <div className="card text-center"><p className="text-xs text-gray-400">Retail Value</p><p className="text-2xl font-bold text-emerald-400">{fmt(data.reduce((s:number,p:any)=>s+(p.retail_value||0),0))}</p></div>
              </div>
              <div className="table-container">
                <table className="table">
                  <thead><tr><th>Product</th><th>Category</th><th>Stock</th><th>Purchase Price</th><th>Sale Price</th><th>Stock Value</th><th>Retail Value</th></tr></thead>
                  <tbody>
                    {data.map((p:any) => (
                      <tr key={p.id}>
                        <td className="font-medium text-white">{p.name}</td>
                        <td>{p.category_name||'-'}</td>
                        <td className={p.stock_quantity<=p.min_stock_level?'text-red-400 font-bold':'text-white'}>{p.stock_quantity} {p.unit}</td>
                        <td>{fmt(p.purchase_price)}</td>
                        <td className="text-primary-400">{fmt(p.sale_price)}</td>
                        <td className="text-amber-400">{fmt(p.stock_value)}</td>
                        <td className="text-emerald-400">{fmt(p.retail_value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'top' && Array.isArray(data) && (
            <div className="table-container">
              <table className="table">
                <thead><tr><th>#</th><th>Product</th><th>Qty Sold</th><th>Revenue</th><th>Cost</th><th>Profit</th></tr></thead>
                <tbody>
                  {data.map((p:any,i:number) => (
                    <tr key={p.product_id||i}>
                      <td className="text-gray-400 font-mono">{i+1}</td>
                      <td className="font-medium text-white">{p.product_name}</td>
                      <td className="text-white">{p.total_qty}</td>
                      <td className="text-emerald-400">{fmt(p.total_revenue)}</td>
                      <td className="text-red-400">{fmt(p.total_cost)}</td>
                      <td className={`font-bold ${p.profit>=0?'text-emerald-400':'text-red-400'}`}>{fmt(p.profit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'credit' && Array.isArray(data) && (
            <div className="space-y-3">
              <div className="card flex gap-4">
                <div><p className="text-xs text-gray-400">Total Outstanding</p><p className="text-2xl font-bold text-red-400">{fmt(data.reduce((s:number,c:any)=>s+(c.current_balance||0),0))}</p></div>
              </div>
              <div className="table-container">
                <table className="table">
                  <thead><tr><th>Customer</th><th>Phone</th><th>Total Purchased</th><th>Total Paid</th><th>Outstanding</th></tr></thead>
                  <tbody>
                    {data.map((c:any) => (
                      <tr key={c.id}>
                        <td className="font-medium text-white">{c.name}</td>
                        <td className="text-gray-400">{c.phone||'-'}</td>
                        <td>{fmt(c.total_purchased)}</td>
                        <td className="text-emerald-400">{fmt(c.total_paid)}</td>
                        <td className="text-red-400 font-bold">{fmt(c.current_balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'eod' && data && !Array.isArray(data) && 'sales' in data && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  {l:'Total Bills',v:data.summary?.total_bills||0},
                  {l:'Revenue',v:fmt(data.summary?.total_revenue||0)},
                  {l:'Cash',v:fmt(data.summary?.cash_total||0)},
                  {l:'Credit Sales',v:fmt(data.summary?.credit_total||0)},
                ].map(s=><div key={s.l} className="card text-center py-3"><p className="text-xs text-gray-400">{s.l}</p><p className="text-xl font-bold text-white mt-1">{s.v}</p></div>)}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-white mb-2">Sales ({data.sales?.length})</h4>
                  <div className="table-container">
                    <table className="table">
                      <thead><tr><th>Bill#</th><th>Customer</th><th>Total</th></tr></thead>
                      <tbody>
                        {data.sales?.map((s:any)=>(
                          <tr key={s.id}>
                            <td className="font-mono text-xs">
                              <button
                                onClick={() => openBillDetails(s.id)}
                                className="text-primary-400 hover:text-primary-300 font-bold underline text-left transition-colors"
                                title="Click to view purchased goods"
                              >
                                {s.bill_number}
                              </button>
                            </td>
                            <td className="text-xs">{s.customer_name||'Walk-in'}</td>
                            <td className="font-bold">{fmt(s.total_amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-2">Expenses — Total: {fmt(data.expTotal||0)}</h4>
                  <div className="table-container">
                    <table className="table">
                      <thead><tr><th>Category</th><th>Description</th><th>Amount</th></tr></thead>
                      <tbody>
                        {data.expenses?.map((e:any)=><tr key={e.id}><td className="text-xs">{e.category_name||'-'}</td><td className="text-xs text-gray-400">{e.description||'-'}</td><td className="text-red-400 font-bold">{fmt(e.amount)}</td></tr>)}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Bill Details Modal */}
      <Modal
        isOpen={showBillModal}
        onClose={() => { setShowBillModal(false); setSelectedSale(null) }}
        title={`🧾 Bill Details — ${selectedSale?.bill_number}`}
        size="md"
        footer={
          <div className="flex gap-3 w-full">
            <button onClick={handlePrintBill} className="btn-success flex-1 font-semibold">
              🖨️ Print Receipt
            </button>
            <button onClick={() => { setShowBillModal(false); setSelectedSale(null) }} className="btn-secondary flex-1 font-semibold">
              Close
            </button>
          </div>
        }
      >
        {selectedSale && (
          <div className="space-y-4">
            <div className="p-3 bg-dark-700 rounded-xl grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-gray-400">Date:</span> <span className="text-white font-medium">{selectedSale.created_at ? new Date(selectedSale.created_at).toLocaleString('en-PK') : ''}</span></div>
              <div><span className="text-gray-400">Payment:</span> <span className="text-white font-medium capitalize">{selectedSale.payment_method}</span></div>
              <div><span className="text-gray-400">Customer:</span> <span className="text-white font-medium">{selectedSale.customer_name || 'Walk-in'}</span></div>
              <div><span className="text-gray-400">Cashier:</span> <span className="text-white font-medium">{selectedSale.cashier_name || 'N/A'}</span></div>
            </div>

            <div className="space-y-2">
              <p className="font-semibold text-white text-xs uppercase tracking-wider text-gray-400">🛍️ Items Bought</p>
              <div className="bg-dark-800 rounded-xl overflow-hidden border border-dark-700">
                <div className="table-container max-h-60 overflow-y-auto">
                  <table className="table text-xs">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th className="text-center">Qty</th>
                        <th className="text-right">Price</th>
                        <th className="text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSale.items?.map((item: any, idx: number) => (
                        <tr key={item.id || idx}>
                          <td className="font-medium text-white">{item.product_name}</td>
                          <td className="text-center text-gray-300">{item.quantity}</td>
                          <td className="text-right text-gray-300">{fmt(item.unit_price)}</td>
                          <td className="text-right font-semibold text-white">{fmt(item.total_price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="border-t border-dark-700 pt-3 text-xs space-y-1">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal</span>
                <span className="text-white">{fmt(selectedSale.subtotal)}</span>
              </div>
              {selectedSale.discount_amount > 0 && (
                <div className="flex justify-between text-amber-400">
                  <span>Discount</span>
                  <span>-{fmt(selectedSale.discount_amount)}</span>
                </div>
              )}
              {selectedSale.tax_amount > 0 && (
                <div className="flex justify-between text-gray-400">
                  <span>Tax ({selectedSale.tax_percent || 0}%)</span>
                  <span className="text-white">{fmt(selectedSale.tax_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold pt-2 border-t border-dark-700">
                <span className="text-white">GRAND TOTAL</span>
                <span className="text-primary-400">{fmt(selectedSale.total_amount)}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <div className="print-only" id="receipt">
        {selectedSale && (
          <div ref={billReceiptRef} style={{
            width: '100%',
            maxWidth: receiptWidth === '58' ? '58mm' : '80mm',
            fontFamily: "'Courier New', Courier, monospace",
            fontSize: '12px',
            color: '#000',
            background: '#fff',
            padding: '6px 8px',
            margin: '0 auto',
            boxSizing: 'border-box'
          }}>
            {/* ── Store Header ── */}
            <div className="receipt-header" style={{ textAlign: 'center', fontFamily: 'Arial, Helvetica, sans-serif', marginBottom: '6px' }}>
              <div className="receipt-shop-name" style={{ fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'center' }}>
                {storeName}
              </div>
              {storeAddress && (
                <div className="receipt-address" style={{ fontSize: '12px', marginTop: '2px', textAlign: 'center' }}>{storeAddress}</div>
              )}
              {storePhone && (
                <div className="receipt-phone" style={{ fontSize: '12px', marginTop: '2px', textAlign: 'center' }}>Tel: {storePhone}</div>
              )}
              {storePhone2 && (
                <div className="receipt-phone" style={{ fontSize: '12px', textAlign: 'center' }}>Tel: {storePhone2}</div>
              )}
            </div>

            <div style={{ borderTop: '1px dashed #000', margin: '5px 0' }} />

            <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '13px', margin: '5px 0' }}>
              SALES INVOICE
            </div>

            <div style={{ borderTop: '1px dashed #000', margin: '5px 0' }} />

            {/* ── Bill Info ── */}
            <div style={{ fontSize: '11px', marginBottom: '5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span><strong>Bill#:</strong> {selectedSale.bill_number}</span>
                <span>{selectedSale.created_at ? new Date(selectedSale.created_at).toLocaleString('en-PK') : ''}</span>
              </div>
              <div><strong>Cashier:</strong> {selectedSale.cashier_name || 'System'}</div>
              <div><strong>Customer:</strong> {selectedSale.customer_name || 'Walk-in'}</div>
              <div><strong>Payment:</strong> {selectedSale.payment_method?.toUpperCase()}</div>
            </div>

            <div style={{ borderTop: '1px dashed #000', margin: '5px 0' }} />

            {/* ── Items Header ── */}
            <div style={{ display: 'flex', fontSize: '11px', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '3px', marginBottom: '3px' }}>
              <span style={{ flex: 4 }}>ITEM</span>
              <span style={{ flex: 1, textAlign: 'right' }}>QTY</span>
              <span style={{ flex: 2, textAlign: 'right' }}>PRICE</span>
              <span style={{ flex: 2, textAlign: 'right' }}>TOTAL</span>
            </div>

            {/* ── Line Items ── */}
            {selectedSale.items?.map((item: any, idx: number) => (
              <div key={idx} style={{ marginBottom: '4px' }}>
                <div style={{ fontSize: '11px', fontWeight: '600' }}>{item.product_name}</div>
                <div style={{ display: 'flex', fontSize: '11px' }}>
                  <span style={{ flex: 4 }}></span>
                  <span style={{ flex: 1, textAlign: 'right' }}>{item.quantity}</span>
                  <span style={{ flex: 2, textAlign: 'right' }}>{fmt(item.unit_price)}</span>
                  <span style={{ flex: 2, textAlign: 'right' }}>{fmt(item.total_price)}</span>
                </div>
                {item.discount_percent > 0 && (
                  <div style={{ fontSize: '10px', textAlign: 'right', color: '#555' }}>Disc: {item.discount_percent}%</div>
                )}
              </div>
            ))}

            <div style={{ borderTop: '1px dashed #000', margin: '5px 0' }} />

            {/* ── Totals ── */}
            <div style={{ fontSize: '11px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal:</span><span>{fmt(selectedSale.subtotal)}</span>
              </div>
              {selectedSale.discount_amount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Discount:</span><span>-{fmt(selectedSale.discount_amount)}</span>
                </div>
              )}
              {selectedSale.tax_amount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{taxName}:</span><span>{fmt(selectedSale.tax_amount)}</span>
                </div>
              )}
            </div>

            <div style={{ borderTop: '2px solid #000', margin: '5px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 'bold', marginBottom: '5px' }}>
              <span>TOTAL:</span><span>{fmt(selectedSale.total_amount)}</span>
            </div>

            <div style={{ borderTop: '1px dashed #000', margin: '5px 0' }} />

            {/* ── Payment Details ── */}
            <div style={{ fontSize: '11px', marginBottom: '4px' }}>
              {selectedSale.payment_method === 'cash' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Cash Paid:</span><span>{fmt(selectedSale.paid_amount)}</span>
                  </div>
                  {selectedSale.change_amount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Change:</span><span>{fmt(selectedSale.change_amount)}</span>
                    </div>
                  )}
                </>
              )}
              {selectedSale.payment_method === 'card' && (
                <div style={{ textAlign: 'center', fontWeight: 'bold' }}>*** CARD PAYMENT ***</div>
              )}
              {selectedSale.payment_method === 'credit' && (
                <div style={{ textAlign: 'center', fontWeight: 'bold' }}>*** CREDIT SALE (Udhaar) ***</div>
              )}
              {selectedSale.payment_method === 'split' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Advance Paid:</span><span>{fmt(selectedSale.paid_amount)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Balance (Udhaar):</span><span>{fmt(selectedSale.total_amount - selectedSale.paid_amount)}</span>
                  </div>
                </>
              )}
            </div>

            <div style={{ borderTop: '1px dashed #000', margin: '5px 0' }} />

            {/* ── Footer ── */}
            <div style={{ textAlign: 'center', fontSize: '11px', marginTop: '4px' }}>
              {receiptFooter}
            </div>
            <div style={{ marginTop: '18px' }} />
          </div>
        )}
      </div>
    </div>
  )
}
