import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useReactToPrint } from 'react-to-print'
import { useCartStore } from '../../store/cartStore'
import { useAuthStore } from '../../store/authStore'
import { useSettingsStore } from '../../store/settingsStore'
import { formatCurrency } from '../../utils/currency'
import Modal from '../../components/Modal/Modal'
import toast from 'react-hot-toast'

export default function POSPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [heldBills, setHeldBills] = useState<any[]>([])
  const [cashPaid, setCashPaid] = useState('')
  const [showPayModal, setShowPayModal] = useState(false)
  const [showHoldModal, setShowHoldModal] = useState(false)
  const [showHeldModal, setShowHeldModal] = useState(false)
  const [holdLabel, setHoldLabel] = useState('')
  const [billDiscountInput, setBillDiscountInput] = useState('')
  const [processing, setProcessing] = useState(false)
  const [lastSale, setLastSale] = useState<any>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const receiptRef = useRef<HTMLDivElement>(null)
  const cart = useCartStore()
  const user = useAuthStore(s => s.user)
  const currency = useSettingsStore(s => s.get('currency_symbol', '₨'))
  const taxEnabled = useSettingsStore(s => s.get('tax_enabled', '0')) === '1'
  const taxPercent = parseFloat(useSettingsStore(s => s.get('tax_percent', '0')) || '0')
  const taxName = useSettingsStore(s => s.get('tax_name', 'GST'))
  const storeName = useSettingsStore(s => s.get('store_name', 'My Store'))
  const storeAddress = useSettingsStore(s => s.get('store_address', ''))
  const storePhone = useSettingsStore(s => s.get('store_phone', ''))
  const storePhone2 = useSettingsStore(s => s.get('store_phone2', ''))
  const receiptFooter = useSettingsStore(s => s.get('receipt_footer', 'Thank you for shopping with us!'))
  const receiptWidth = useSettingsStore(s => s.get('receipt_width', '80'))

  const fmt = (n: number) => formatCurrency(n, currency)

  const handlePrint = useReactToPrint({
    content: () => receiptRef.current,
    pageStyle: `
      @page { margin: 4mm; size: ${receiptWidth === '58' ? '58mm' : '80mm'} auto; }
      body { margin: 0; background: white; color: black; font-family: 'Courier New', Courier, monospace; }
    `,
  })

  useEffect(() => {
    loadCustomers()
    searchRef.current?.focus()
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F2') searchRef.current?.focus()
      if (e.key === 'F10') setShowPayModal(true)
      if (e.key === 'Escape') { setShowPayModal(false); setShowHoldModal(false) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Trigger print after receipt data is set
  useEffect(() => {
    if (lastSale) {
      const t = setTimeout(() => handlePrint(), 300)
      return () => clearTimeout(t)
    }
  }, [lastSale])

  const loadCustomers = async () => {
    const data = await window.api.getCustomers()
    setCustomers(data)
  }

  const handleSearch = useCallback(async (q: string) => {
    setSearchQuery(q)
    if (q.length < 1) { setSearchResults([]); return }
    const results = await window.api.searchProducts(q)
    setSearchResults(results)
  }, [])

  const addToCart = (product: any) => {
    if (product.stock_quantity <= 0) { toast.error('Out of stock!'); return }
    cart.addItem(product, taxEnabled ? taxPercent : 0)
    setSearchQuery('')
    setSearchResults([])
    searchRef.current?.focus()
  }

  const total = cart.getTotal()
  const change = cashPaid ? Math.max(0, parseFloat(cashPaid) - total) : 0

  const splitPaid = cart.split_paid_amount || 0
  const splitRemaining = Math.max(0, total - splitPaid)

  const handleCompleteSale = async () => {
    if (cart.items.length === 0) { toast.error('Cart is empty'); return }
    if (cart.payment_method === 'credit' && !cart.customer_id) { toast.error('Select a customer for credit sale'); return }
    if (cart.payment_method === 'split' && !cart.customer_id) { toast.error('Select a customer for split payment'); return }
    if (cart.payment_method === 'split' && splitPaid <= 0) { toast.error('Enter advance amount paid'); return }
    if (cart.payment_method === 'split' && splitPaid >= total) { toast.error('Advance covers full amount — use Cash instead'); return }
    setProcessing(true)
    try {
      const paidAmount = cart.payment_method === 'cash'
        ? parseFloat(cashPaid || '0')
        : cart.payment_method === 'split'
        ? splitPaid
        : total
      const saleData = {
        customer_id: cart.customer_id,
        user_id: user?.id,
        subtotal: cart.getSubtotal(),
        discount_amount: cart.getTotalDiscount(),
        tax_amount: cart.getTaxAmount(),
        total_amount: total,
        paid_amount: paidAmount,
        change_amount: cart.payment_method === 'cash' ? change : 0,
        payment_method: cart.payment_method,
        notes: cart.notes,
        items: cart.items.map(i => ({
          product_id: i.product_id,
          product_name: i.product_name,
          quantity: i.quantity,
          unit_price: i.unit_price,
          discount_percent: i.discount_percent,
          discount_amount: i.discount_amount,
          tax_percent: i.tax_percent,
          total_price: i.total_price
        }))
      }
      const result = await window.api.createSale(saleData)
      await window.api.logActivity({ user_id: user?.id, username: user?.username, action: `Sale ${result.bill_number}`, module: 'POS', details: `Total: ${fmt(total)}` })

      // Capture full receipt data BEFORE clearing cart
      setLastSale({
        bill_number: result.bill_number,
        items: cart.items.map(i => ({ ...i })),
        subtotal: cart.getSubtotal(),
        discount: cart.getTotalDiscount(),
        tax: cart.getTaxAmount(),
        total,
        paid: paidAmount,
        change: cart.payment_method === 'cash' ? change : 0,
        payment_method: cart.payment_method,
        customer_name: cart.customer_name,
        cashier: user?.full_name || user?.username || 'N/A',
        created_at: new Date().toLocaleString('en-PK'),
      })

      toast.success(`Bill ${result.bill_number} completed!`)
      cart.clearCart()
      setCashPaid('')
      setShowPayModal(false)
      // window.print() is triggered by the useEffect above
    } catch (err: any) {
      toast.error('Failed to complete sale')
    } finally {
      setProcessing(false)
    }
  }

  const handleHoldBill = async () => {
    if (cart.items.length === 0) { toast.error('Cart is empty'); return }
    await window.api.holdBill({ label: holdLabel, cart: { items: cart.items, customer_id: cart.customer_id, customer_name: cart.customer_name, payment_method: cart.payment_method }, customer_id: cart.customer_id })
    toast.success('Bill held')
    cart.clearCart()
    setShowHoldModal(false)
    setHoldLabel('')
  }

  const handleRecallBill = async (bill: any) => {
    const cartData = JSON.parse(bill.cart_data || '{}')
    cart.loadFromHeld(cartData)
    await window.api.deleteHeldBill(bill.id)
    setShowHeldModal(false)
    toast.success('Bill recalled')
  }

  const loadHeldBills = async () => {
    const data = await window.api.getHeldBills()
    setHeldBills(data)
    setShowHeldModal(true)
  }

  return (
    <div className="page-fixed flex h-full gap-4">
      {/* Left: Product search + results */}
      <div className="flex flex-col flex-1 min-w-0 gap-3">
        <div className="flex gap-2">
          <input ref={searchRef} value={searchQuery} onChange={e => handleSearch(e.target.value)}
            className="input input-lg flex-1" placeholder="🔍 Search product by name or scan barcode... (F2)" />
          <button onClick={loadHeldBills} className="btn-secondary">📋 Held ({heldBills.length})</button>
          <button onClick={() => setShowHoldModal(true)} className="btn-warning">⏸ Hold</button>
        </div>

        {searchResults.length > 0 && (
          <div className="card p-2 max-h-64 overflow-y-auto">
            {searchResults.map(p => (
              <button key={p.id} onClick={() => addToCart(p)}
                className="w-full flex items-center gap-3 p-3 hover:bg-dark-700 rounded-lg transition-colors text-left">
                <div className="flex-1">
                  <p className="font-medium text-white text-sm">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.category_name || 'General'} • Stock: {p.stock_quantity} {p.unit}</p>
                </div>
                <span className="text-primary-400 font-bold">{fmt(p.sale_price)}</span>
              </button>
            ))}
          </div>
        )}

        {/* Cart */}
        <div className="flex-1 card overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-white">🛒 Cart ({cart.items.length} items)</h2>
            {cart.items.length > 0 && (
              <button onClick={() => cart.clearCart()} className="btn-danger btn-sm">Clear</button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto space-y-2">
            {cart.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-600">
                <span className="text-4xl mb-2">🛍️</span>
                <p>Cart is empty — search for a product above</p>
              </div>
            ) : cart.items.map(item => (
              <div key={item.id} className="cart-item">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white text-sm truncate">{item.product_name}</p>
                  <p className="text-xs text-gray-500">{fmt(item.unit_price)} × {item.quantity}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => cart.updateQuantity(item.id, item.quantity - 1)} className="w-7 h-7 bg-dark-600 rounded-lg text-white flex items-center justify-center hover:bg-dark-500 active:scale-90">−</button>
                  <span className="w-8 text-center font-mono text-sm text-white">{item.quantity}</span>
                  <button onClick={() => cart.updateQuantity(item.id, item.quantity + 1)} className="w-7 h-7 bg-dark-600 rounded-lg text-white flex items-center justify-center hover:bg-dark-500 active:scale-90">+</button>
                </div>
                <div className="text-right min-w-16">
                  <p className="font-bold text-white text-sm">{fmt(item.total_price)}</p>
                  {item.discount_percent > 0 && <p className="text-xs text-amber-400">-{item.discount_percent}%</p>}
                </div>
                <button onClick={() => cart.removeItem(item.id)} className="text-red-400 hover:text-red-300 ml-1">✕</button>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <label className="label mb-0 whitespace-nowrap">Bill Discount %</label>
            <input value={billDiscountInput} onChange={e => {
              setBillDiscountInput(e.target.value)
              const pct = parseFloat(e.target.value) || 0
              cart.setBillDiscount(pct, (cart.getSubtotal() * pct) / 100)
            }} className="input w-24 text-center" type="number" min="0" max="100" placeholder="0" />
            <label className="label mb-0 whitespace-nowrap">Customer</label>
            <select className="input flex-1" value={cart.customer_id || ''} onChange={e => {
              const c = customers.find(x => x.id === parseInt(e.target.value))
              cart.setCustomer(c?.id || null, c?.name || null)
            }}>
              <option value="">-- Walk-in Customer --</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.current_balance > 0 ? `(Bal: ${fmt(c.current_balance)})` : ''}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Right: Bill Summary */}
      <div className="w-72 flex flex-col gap-3">
        <div className="card flex-1">
          <h3 className="font-semibold text-white mb-4">💰 Bill Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-400">Subtotal</span><span className="text-white">{fmt(cart.getSubtotal())}</span></div>
            {cart.getTotalDiscount() > 0 && <div className="flex justify-between"><span className="text-amber-400">Discount</span><span className="text-amber-400">-{fmt(cart.getTotalDiscount())}</span></div>}
            {taxEnabled && <div className="flex justify-between"><span className="text-gray-400">Tax ({taxPercent}%)</span><span className="text-white">{fmt(cart.getTaxAmount())}</span></div>}
            <div className="divider"/>
            <div className="flex justify-between text-lg font-bold">
              <span className="text-white">TOTAL</span>
              <span className="text-primary-400">{fmt(total)}</span>
            </div>
          </div>

          <div className="mt-4">
            <p className="label">Payment Method</p>
            <div className="grid grid-cols-4 gap-2">
              {(['cash', 'card', 'credit', 'split'] as const).map(m => (
                <button key={m} onClick={() => cart.setPaymentMethod(m)}
                  className={`payment-method-btn py-2 text-xs font-semibold capitalize ${cart.payment_method === m ? 'selected' : 'unselected'}`}>
                  {m === 'cash' ? '💵' : m === 'card' ? '💳' : m === 'credit' ? '📒' : '✂️'} {m}
                </button>
              ))}
            </div>
          </div>

          {cart.payment_method === 'cash' && (
            <div className="mt-3">
              <label className="label">Cash Received</label>
              <input value={cashPaid} onChange={e => setCashPaid(e.target.value)}
                className="input text-center text-lg font-bold" type="number" placeholder="0.00" />
              {cashPaid && (
                <div className="mt-2 p-3 bg-emerald-900/30 border border-emerald-800 rounded-lg text-center">
                  <p className="text-xs text-gray-400">Change</p>
                  <p className="text-xl font-bold text-emerald-400">{fmt(change)}</p>
                </div>
              )}
            </div>
          )}

          {cart.payment_method === 'credit' && (
            <div className="mt-3 p-3 bg-purple-900/30 border border-purple-800 rounded-lg text-xs text-purple-300">
              {cart.customer_id
                ? <>Full credit sale for: <strong>{cart.customer_name}</strong>. Full {fmt(total)} added to Udhaar.</>  
                : <span className="text-red-400">⚠️ Select a customer for credit sale</span>}
            </div>
          )}

          {cart.payment_method === 'split' && (
            <div className="mt-3 space-y-2">
              {!cart.customer_id && (
                <div className="p-2 bg-red-900/30 border border-red-800 rounded-lg text-xs text-red-300">
                  ⚠️ Select a customer above for split payment
                </div>
              )}
              <label className="label">Advance Paid Now</label>
              <input
                value={splitPaid || ''}
                onChange={e => cart.setSplitPaidAmount(parseFloat(e.target.value) || 0)}
                className="input text-center text-lg font-bold"
                type="number" min="0" max={total} placeholder="0.00"
              />
              {splitPaid > 0 && splitPaid < total && (
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2 bg-emerald-900/30 border border-emerald-800 rounded-lg">
                    <p className="text-xs text-gray-400">Paid Now</p>
                    <p className="font-bold text-emerald-400">{fmt(splitPaid)}</p>
                  </div>
                  <div className="p-2 bg-red-900/30 border border-red-800 rounded-lg">
                    <p className="text-xs text-gray-400">Remaining (Udhaar)</p>
                    <p className="font-bold text-red-400">{fmt(splitRemaining)}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <button onClick={() => cart.items.length > 0 && setShowPayModal(true)}
          disabled={cart.items.length === 0}
          className="btn-success btn-lg w-full text-lg shadow-lg shadow-emerald-900/30">
          ✅ Complete Sale (F10)
        </button>
      </div>

      {/* Pay Confirmation Modal */}
      <Modal isOpen={showPayModal} onClose={() => setShowPayModal(false)} title="Confirm Payment" size="sm"
        footer={
          <div className="flex gap-3 w-full">
            <button onClick={() => setShowPayModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleCompleteSale} disabled={processing} className="btn-success flex-1">
              {processing ? '⏳ Processing...' : '✅ Confirm & Print'}
            </button>
          </div>
        }>
        <div className="text-center space-y-3">
          <div className="text-5xl">{cart.payment_method === 'split' ? '✂️' : '💳'}</div>
          <div>
            <p className="text-gray-400 text-sm">Total Amount</p>
            <p className="text-4xl font-bold text-primary-400">{fmt(total)}</p>
          </div>
          <p className="text-sm text-gray-400">Method: <span className="text-white capitalize font-medium">{cart.payment_method}</span></p>
          {cart.payment_method === 'cash' && cashPaid && (
            <div className="p-3 bg-dark-700 rounded-xl">
              <p className="text-gray-400 text-xs">Cash: {fmt(parseFloat(cashPaid))}</p>
              <p className="text-emerald-400 font-bold">Change: {fmt(change)}</p>
            </div>
          )}
          {cart.payment_method === 'split' && (
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-emerald-900/30 border border-emerald-800 rounded-xl">
                <p className="text-gray-400 text-xs">Advance Paid</p>
                <p className="text-emerald-400 font-bold">{fmt(splitPaid)}</p>
              </div>
              <div className="p-3 bg-red-900/30 border border-red-800 rounded-xl">
                <p className="text-gray-400 text-xs">Added to Udhaar</p>
                <p className="text-red-400 font-bold">{fmt(splitRemaining)}</p>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Hold Bill Modal */}
      <Modal isOpen={showHoldModal} onClose={() => setShowHoldModal(false)} title="Hold Bill" size="sm"
        footer={
          <div className="flex gap-3 w-full">
            <button onClick={() => setShowHoldModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleHoldBill} className="btn-warning flex-1">⏸ Hold Bill</button>
          </div>
        }>
        <div className="form-group">
          <label className="label">Label (optional)</label>
          <input value={holdLabel} onChange={e => setHoldLabel(e.target.value)} className="input" placeholder="e.g. Table 1, Customer Name..." />
        </div>
      </Modal>

      {/* Held Bills Modal */}
      <Modal isOpen={showHeldModal} onClose={() => setShowHeldModal(false)} title="Held Bills" size="md">
        {heldBills.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No held bills</p>
        ) : (
          <div className="space-y-2">
            {heldBills.map(bill => (
              <div key={bill.id} className="flex items-center gap-3 p-3 bg-dark-700 rounded-xl">
                <div className="flex-1">
                  <p className="font-medium text-white">{bill.label || `Bill #${bill.id}`}</p>
                  <p className="text-xs text-gray-500">{bill.customer_name || 'Walk-in'} • {bill.created_at}</p>
                </div>
                <button onClick={() => handleRecallBill(bill)} className="btn-primary btn-sm">Recall</button>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Print Receipt Area - react-to-print captures receiptRef into its own iframe */}
      <div className="print-only" id="receipt">
        {lastSale && (
          <div ref={receiptRef} style={{
            width: receiptWidth === '58' ? '58mm' : '80mm',
            fontFamily: "'Courier New', Courier, monospace",
            fontSize: '12px',
            color: '#000',
            background: '#fff',
            padding: '6px 8px',
            margin: '0 auto',
          }}>
            {/* ── Store Header ── */}
            <div style={{ textAlign: 'center', marginBottom: '6px' }}>
              <div style={{ fontSize: '17px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
                {storeName}
              </div>
              {storeAddress && (
                <div style={{ fontSize: '11px', marginTop: '2px' }}>{storeAddress}</div>
              )}
              {storePhone && (
                <div style={{ fontSize: '11px', marginTop: '2px' }}>Tel: {storePhone}</div>
              )}
              {storePhone2 && (
                <div style={{ fontSize: '11px' }}>Tel: {storePhone2}</div>
              )}
            </div>

            <div style={{ borderTop: '1px dashed #000', margin: '5px 0' }} />

            {/* ── Bill Info ── */}
            <div style={{ fontSize: '11px', marginBottom: '5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span><strong>Bill#:</strong> {lastSale.bill_number}</span>
                <span>{lastSale.created_at}</span>
              </div>
              <div><strong>Cashier:</strong> {lastSale.cashier}</div>
              <div><strong>Customer:</strong> {lastSale.customer_name || 'Walk-in'}</div>
              <div><strong>Payment:</strong> {lastSale.payment_method?.toUpperCase()}</div>
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
            {lastSale.items?.map((item: any, idx: number) => (
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
                <span>Subtotal:</span><span>{fmt(lastSale.subtotal)}</span>
              </div>
              {lastSale.discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Discount:</span><span>-{fmt(lastSale.discount)}</span>
                </div>
              )}
              {lastSale.tax > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{taxName}:</span><span>{fmt(lastSale.tax)}</span>
                </div>
              )}
            </div>

            <div style={{ borderTop: '2px solid #000', margin: '5px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 'bold', marginBottom: '5px' }}>
              <span>TOTAL:</span><span>{fmt(lastSale.total)}</span>
            </div>

            <div style={{ borderTop: '1px dashed #000', margin: '5px 0' }} />

            {/* ── Payment Details ── */}
            <div style={{ fontSize: '11px', marginBottom: '4px' }}>
              {lastSale.payment_method === 'cash' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Cash Paid:</span><span>{fmt(lastSale.paid)}</span>
                  </div>
                  {lastSale.change > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Change:</span><span>{fmt(lastSale.change)}</span>
                    </div>
                  )}
                </>
              )}
              {lastSale.payment_method === 'card' && (
                <div style={{ textAlign: 'center', fontWeight: 'bold' }}>*** CARD PAYMENT ***</div>
              )}
              {lastSale.payment_method === 'credit' && (
                <div style={{ textAlign: 'center', fontWeight: 'bold' }}>*** CREDIT SALE (Udhaar) ***</div>
              )}
              {lastSale.payment_method === 'split' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Advance Paid:</span><span>{fmt(lastSale.paid)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Balance (Udhaar):</span><span>{fmt(lastSale.total - lastSale.paid)}</span>
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
