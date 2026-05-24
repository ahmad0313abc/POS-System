import React, { useState, useEffect, useRef } from 'react'
import Modal from '../../components/Modal/Modal'
import { formatCurrency, formatDate, formatDateTime } from '../../utils/currency'
import { useSettingsStore } from '../../store/settingsStore'
import { useAuthStore } from '../../store/authStore'
import { useReactToPrint } from 'react-to-print'
import toast from 'react-hot-toast'

const emptyForm = { name: '', phone: '', address: '', credit_limit: '', opening_balance: '', notes: '' }
const emptyPayment = { amount: '', notes: '' }

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showLedger, setShowLedger] = useState(false)
  const [showPayModal, setShowPayModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [selected, setSelected] = useState<any>(null)
  const [ledger, setLedger] = useState<any>(null)
  const [form, setForm] = useState(emptyForm)
  const [payForm, setPayForm] = useState(emptyPayment)
  const [ledgerTab, setLedgerTab] = useState<'history' | 'bills'>('history')
  const [selectedBillId, setSelectedBillId] = useState<number | null>(null)
  const [lastPaymentReceipt, setLastPaymentReceipt] = useState<any>(null)
  
  const receiptRef = useRef<HTMLDivElement>(null)
  const currency = useSettingsStore(s => s.get('currency_symbol', '₨'))
  const user = useAuthStore(s => s.user)
  
  const storeName = useSettingsStore(s => s.get('store_name', 'My Store'))
  const storeAddress = useSettingsStore(s => s.get('store_address', ''))
  const storePhone = useSettingsStore(s => s.get('store_phone', ''))
  const storePhone2 = useSettingsStore(s => s.get('store_phone2', ''))
  const receiptFooter = useSettingsStore(s => s.get('receipt_footer', 'Thank you for shopping with us!'))
  const receiptWidth = useSettingsStore(s => s.get('receipt_width', '80'))

  const fmt = (n: number) => formatCurrency(n, currency)

  useEffect(() => { load() }, [])

  const load = async () => {
    const data = await window.api.getCustomers()
    setCustomers(data)
  }

  const handlePrint = useReactToPrint({
    content: () => receiptRef.current,
    pageStyle: `
      @page { margin: 4mm; size: ${receiptWidth === '58' ? '58mm' : '80mm'} auto; }
      body { margin: 0; background: white; color: black; font-family: 'Courier New', Courier, monospace; }
    `,
  })

  // Trigger print after receipt data is set
  useEffect(() => {
    if (lastPaymentReceipt) {
      const t = setTimeout(() => {
        handlePrint()
        setLastPaymentReceipt(null)
      }, 300)
      return () => clearTimeout(t)
    }
  }, [lastPaymentReceipt])

  const filtered = customers.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.phone||'').includes(search)
  )

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowModal(true) }
  const openEdit = (c: any) => { setEditing(c); setForm({ name:c.name, phone:c.phone||'', address:c.address||'', credit_limit:c.credit_limit||'', opening_balance: '', notes:c.notes||'' }); setShowModal(true) }

  const handleSave = async () => {
    if (!form.name) { toast.error('Name is required'); return }
    const data = { ...form, credit_limit: parseFloat(form.credit_limit)||0, opening_balance: parseFloat(form.opening_balance)||0, user_id: user?.id }
    if (editing) { await window.api.updateCustomer(editing.id, data) } else { await window.api.createCustomer(data) }
    toast.success(editing ? 'Customer updated' : 'Customer added')
    setShowModal(false); load()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this customer?')) return
    await window.api.deleteCustomer(id); toast.success('Deleted'); load()
  }

  const openLedger = async (c: any) => {
    setSelected(c)
    setLedgerTab('history')
    const data = await window.api.getCustomerLedger(c.id)
    setLedger(data); setShowLedger(true)
  }

  const handlePayment = async () => {
    if (!payForm.amount || parseFloat(payForm.amount) <= 0) { toast.error('Enter valid amount'); return }
    try {
      const res = await window.api.addCreditPayment({
        customer_id: selected.id,
        sale_id: selectedBillId || null,
        amount: parseFloat(payForm.amount),
        notes: payForm.notes,
        user_id: user?.id
      })
      if (res.success && res.receipt) {
        toast.success('Payment recorded')
        setLastPaymentReceipt(res.receipt)
        setShowPayModal(false)
        setPayForm(emptyPayment)
        setSelectedBillId(null)
        load()
        if (selected) {
          const data = await window.api.getCustomerLedger(selected.id)
          setLedger(data)
        }
      } else {
        toast.error('Failed to record payment')
      }
    } catch (err: any) {
      toast.error('Error recording payment')
    }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">👥 Customers</h1>
        <button onClick={openAdd} className="btn-primary">+ Add Customer</button>
      </div>

      <div className="flex gap-3 items-center">
        <input value={search} onChange={e => setSearch(e.target.value)} className="input flex-1" placeholder="Search by name or phone..." />
        <div className="card py-2 px-4 text-sm">
          <span className="text-gray-400">Total Credit: </span>
          <span className="text-red-400 font-bold">{fmt(customers.reduce((s,c)=>s+(c.current_balance||0),0))}</span>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead><tr><th>Name</th><th>Phone</th><th>Address</th><th>Credit Limit</th><th>Balance (Udhaar)</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.length === 0
              ? <tr><td colSpan={6} className="text-center py-12 text-gray-500">No customers found</td></tr>
              : filtered.map(c => (
              <tr key={c.id}>
                <td className="font-medium text-white">{c.name}</td>
                <td className="text-gray-400">{c.phone||'-'}</td>
                <td className="text-gray-400 text-xs">{c.address||'-'}</td>
                <td>{fmt(c.credit_limit)}</td>
                <td className={c.current_balance > 0 ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>{fmt(c.current_balance)}</td>
                <td>
                  <div className="flex gap-1">
                    <button onClick={() => openLedger(c)} className="btn-secondary btn-sm">📒 Ledger</button>
                    <button onClick={() => openEdit(c)} className="btn-secondary btn-sm">Edit</button>
                    <button onClick={() => handleDelete(c.id)} className="btn-danger btn-sm">Del</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Customer' : 'Add Customer'} size="md"
        footer={<><button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button><button onClick={handleSave} className="btn-primary">💾 Save</button></>}>
        <div className="space-y-3">
          <div className="form-group"><label className="label">Name *</label><input className="input" value={form.name} onChange={e => setForm({...form,name:e.target.value})} placeholder="Full name" /></div>
          <div className="form-row">
            <div className="form-group"><label className="label">Phone</label><input className="input" value={form.phone} onChange={e => setForm({...form,phone:e.target.value})} placeholder="+92..." /></div>
            <div className="form-group"><label className="label">Credit Limit</label><input className="input" type="number" value={form.credit_limit} onChange={e => setForm({...form,credit_limit:e.target.value})} placeholder="0" /></div>
          </div>
          {!editing && (
            <div className="form-group"><label className="label">Opening Balance (Previous Udhaar)</label><input className="input border-red-900/50 focus:ring-red-500" type="number" value={form.opening_balance} onChange={e => setForm({...form,opening_balance:e.target.value})} placeholder="0.00" /></div>
          )}
          <div className="form-group"><label className="label">Address</label><input className="input" value={form.address} onChange={e => setForm({...form,address:e.target.value})} /></div>
          <div className="form-group"><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={e => setForm({...form,notes:e.target.value})} /></div>
        </div>
      </Modal>

      {/* Ledger Modal */}
      <Modal isOpen={showLedger} onClose={() => setShowLedger(false)} title={`📒 Ledger — ${selected?.name}`} size="xl"
        footer={
          <div className="flex gap-3 w-full">
            <button onClick={() => { setShowPayModal(true) }} className="btn-success">💵 Collect Payment</button>
            <button onClick={() => setShowLedger(false)} className="btn-secondary ml-auto">Close</button>
          </div>
        }>
        {ledger && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="card text-center py-3"><p className="text-xs text-gray-400">Total Purchased</p><p className="text-lg font-bold text-white">{fmt(ledger.customer?.total_purchased||0)}</p></div>
              <div className="card text-center py-3"><p className="text-xs text-gray-400">Total Paid</p><p className="text-lg font-bold text-emerald-400">{fmt(ledger.transactions?.filter((t:any)=>t.payment_type==='payment').reduce((s:number,t:any)=>s+t.amount,0)||0)}</p></div>
              <div className="card text-center py-3"><p className="text-xs text-gray-400">Outstanding</p><p className="text-lg font-bold text-red-400">{fmt(ledger.customer?.current_balance||0)}</p></div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-1 bg-dark-800 p-1 rounded-xl w-fit border border-dark-700">
              <button
                onClick={() => setLedgerTab('history')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  ledgerTab === 'history' ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                📜 Ledger History
              </button>
              <button
                onClick={() => setLedgerTab('bills')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  ledgerTab === 'bills' ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                📄 Credit Bills
              </button>
            </div>

            {ledgerTab === 'history' ? (
              <div className="table-container">
                <table className="table">
                  <thead><tr><th>Date</th><th>Type</th><th>Bill #</th><th>Amount</th><th>Notes</th></tr></thead>
                  <tbody>
                    {ledger.transactions?.length === 0 ? <tr><td colSpan={5} className="text-center py-6 text-gray-500">No transactions</td></tr>
                    : ledger.transactions?.map((t: any) => (
                      <tr key={t.id}>
                        <td className="text-xs text-gray-400">{formatDateTime(t.created_at)}</td>
                        <td><span className={t.payment_type==='payment' ? 'badge-green' : 'badge-red'}>{t.payment_type==='payment' ? 'Payment' : 'Credit Sale'}</span></td>
                        <td className="font-mono text-xs">{t.bill_number||'-'}</td>
                        <td className={`font-bold ${t.payment_type==='payment' ? 'text-emerald-400' : 'text-red-400'}`}>{t.payment_type==='payment' ? '-' : '+'}{fmt(t.amount)}</td>
                        <td className="text-xs text-gray-500">{t.notes||'-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="table-container animate-fade-in">
                <table className="table">
                  <thead><tr><th>Date</th><th>Bill #</th><th>Total</th><th>Credit Created</th><th>Paid So Far</th><th>Remaining</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {ledger.sales?.length === 0 ? <tr><td colSpan={8} className="text-center py-6 text-gray-500">No credit bills found</td></tr>
                    : ledger.sales?.map((s: any) => {
                      const remaining = Math.max(0, s.credit_amount - s.paid_credit_amount)
                      const isFullyPaid = remaining <= 0
                      const isPartiallyPaid = s.paid_credit_amount > 0 && remaining > 0
                      return (
                        <tr key={s.id}>
                          <td className="text-xs text-gray-400">{formatDate(s.created_at)}</td>
                          <td className="font-mono text-xs text-white font-medium">{s.bill_number}</td>
                          <td>{fmt(s.total_amount)}</td>
                          <td className="text-red-400 font-semibold">{fmt(s.credit_amount)}</td>
                          <td className="text-emerald-400 font-semibold">{fmt(s.paid_credit_amount)}</td>
                          <td className={`font-bold ${remaining > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{fmt(remaining)}</td>
                          <td>
                            {isFullyPaid ? (
                              <span className="badge-green text-xs">Paid</span>
                            ) : isPartiallyPaid ? (
                              <span className="badge-blue text-xs">Partial</span>
                            ) : (
                              <span className="badge-red text-xs">Unpaid</span>
                            )}
                          </td>
                          <td>
                            {!isFullyPaid && (
                              <button
                                onClick={() => {
                                  setSelectedBillId(s.id)
                                  setPayForm({ amount: remaining.toString(), notes: `Payment for ${s.bill_number}` })
                                  setShowPayModal(true)
                                }}
                                className="btn-success btn-xs py-1 px-2.5 text-xs font-semibold rounded-lg hover:scale-105 active:scale-95 transition-transform"
                              >
                                💵 Pay
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Payment Modal */}
      <Modal isOpen={showPayModal} onClose={() => { setShowPayModal(false); setSelectedBillId(null); setPayForm(emptyPayment) }} title="Collect Payment" size="sm"
        footer={<><button onClick={() => { setShowPayModal(false); setSelectedBillId(null); setPayForm(emptyPayment) }} className="btn-secondary">Cancel</button><button onClick={handlePayment} className="btn-success">✅ Record Payment</button></>}>
        <div className="space-y-3">
          <div className="p-3 bg-dark-700 rounded-xl text-sm space-y-1">
            <p className="text-gray-400">Customer: <span className="text-white font-medium">{selected?.name}</span></p>
            <p className="text-gray-400">Outstanding: <span className="text-red-400 font-bold">{fmt(selected?.current_balance||0)}</span></p>
            {selectedBillId && (
              <p className="text-xs text-amber-400 font-semibold mt-1">
                Paying against Bill: <strong>{ledger?.sales?.find((s: any) => s.id === selectedBillId)?.bill_number}</strong>
              </p>
            )}
          </div>
          
          <div className="form-group">
            <label className="label">Pay Against Bill</label>
            <select
              className="input text-sm"
              value={selectedBillId || ''}
              onChange={e => {
                const billId = e.target.value ? parseInt(e.target.value) : null
                setSelectedBillId(billId)
                if (billId) {
                  const bill = ledger?.sales?.find((s: any) => s.id === billId)
                  if (bill) {
                    const remaining = Math.max(0, bill.credit_amount - bill.paid_credit_amount)
                    setPayForm({ amount: remaining.toString(), notes: `Payment for ${bill.bill_number}` })
                  }
                } else {
                  setPayForm(emptyPayment)
                }
              }}
            >
              <option value="">-- General Payment (No specific bill) --</option>
              {ledger?.sales?.filter((s: any) => (s.credit_amount - s.paid_credit_amount) > 0).map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.bill_number} (Remaining: {fmt(s.credit_amount - s.paid_credit_amount)})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="label">Amount *</label>
            <input className="input input-lg text-center" type="number" value={payForm.amount} onChange={e => setPayForm({...payForm,amount:e.target.value})} placeholder="0.00" />
          </div>
          <div className="form-group">
            <label className="label">Notes</label>
            <input className="input" value={payForm.notes} onChange={e => setPayForm({...payForm,notes:e.target.value})} placeholder="Payment notes..." />
          </div>
        </div>
      </Modal>

      {/* Hidden Print Receipt Template */}
      <div className="print-only" id="receipt">
        {lastPaymentReceipt && (
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

            <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '13px', margin: '5px 0' }}>
              RECEIPT OF PAYMENT (UDHAAR)
            </div>

            <div style={{ borderTop: '1px dashed #000', margin: '5px 0' }} />

            {/* ── Receipt Info ── */}
            <div style={{ fontSize: '11px', marginBottom: '5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span><strong>Receipt#:</strong> REC-{lastPaymentReceipt.payment_id}</span>
                <span>{lastPaymentReceipt.created_at ? formatDateTime(lastPaymentReceipt.created_at) : ''}</span>
              </div>
              <div><strong>Customer:</strong> {lastPaymentReceipt.customer_name}</div>
              {lastPaymentReceipt.customer_phone && (
                <div><strong>Phone:</strong> {lastPaymentReceipt.customer_phone}</div>
              )}
            </div>

            <div style={{ borderTop: '1px dashed #000', margin: '5px 0' }} />

            {/* ── Payment Details ── */}
            <div style={{ fontSize: '11px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0' }}>
                <span>Amount Paid Now:</span>
                <span style={{ fontWeight: 'bold' }}>{fmt(lastPaymentReceipt.amount)}</span>
              </div>
              {lastPaymentReceipt.notes && (
                <div style={{ margin: '3px 0' }}>
                  <span>Notes:</span> <span style={{ fontStyle: 'italic' }}>{lastPaymentReceipt.notes}</span>
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px dashed #000', margin: '5px 0' }} />

            {/* ── Bill specific breakdown ── */}
            {lastPaymentReceipt.bill_number ? (
              <div style={{ fontSize: '11px', background: '#f5f5f5', padding: '5px', margin: '5px 0', border: '1px solid #ddd' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '3px', textDecoration: 'underline' }}>
                  Bill Allocation Details:
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Bill Number:</span>
                  <span>{lastPaymentReceipt.bill_number}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Previous Bill Due:</span>
                  <span>{fmt(lastPaymentReceipt.prev_bill_balance)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Payment Applied:</span>
                  <span>-{fmt(lastPaymentReceipt.amount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderTop: '1px dashed #aaa', paddingTop: '2px', marginTop: '2px' }}>
                  <span>New Bill Due:</span>
                  <span>{fmt(lastPaymentReceipt.new_bill_balance)}</span>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '11px', fontStyle: 'italic', color: '#555', textAlign: 'center', margin: '5px 0' }}>
                General payment applied to account.
              </div>
            )}

            <div style={{ borderTop: '1px dashed #000', margin: '5px 0' }} />

            {/* ── Total Outstanding Summary ── */}
            <div style={{ fontSize: '11px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Old Account Balance:</span>
                <span>{fmt(lastPaymentReceipt.prev_customer_balance)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Payment Received:</span>
                <span>-{fmt(lastPaymentReceipt.amount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '13px', borderTop: '1px solid #000', paddingTop: '3px', marginTop: '3px' }}>
                <span>NEW ACCOUNT BAL:</span>
                <span>{fmt(lastPaymentReceipt.new_customer_balance)}</span>
              </div>
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
