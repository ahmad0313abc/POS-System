import { ipcMain } from 'electron'
import { getDb } from '../../database/connection'

export function registerCustomerHandlers() {
  const db = () => getDb()

  ipcMain.handle('get-customers', (_, filters: any = {}) => {
    let query = 'SELECT * FROM customers WHERE 1=1'
    const params: any[] = []
    if (filters.search) { query += ' AND (name LIKE ? OR phone LIKE ?)'; params.push(`%${filters.search}%`, `%${filters.search}%`) }
    query += ' ORDER BY name ASC'
    return db().prepare(query).all(...params)
  })

  ipcMain.handle('get-customer', (_, id: number) => {
    return db().prepare('SELECT * FROM customers WHERE id = ?').get(id)
  })

  ipcMain.handle('create-customer', (_, data: any) => {
    const create = db().transaction(() => {
      const balance = parseFloat(data.opening_balance) || 0
      const result = db().prepare(`
        INSERT INTO customers (name, phone, address, credit_limit, current_balance, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(data.name, data.phone || null, data.address || null, data.credit_limit || 0, balance, data.notes || null)
      
      const customerId = result.lastInsertRowid
      
      if (balance > 0) {
        db().prepare(`
          INSERT INTO credit_payments (customer_id, amount, payment_type, notes, user_id)
          VALUES (?, ?, 'credit', 'Opening Balance (from physical register)', ?)
        `).run(customerId, balance, data.user_id || null)
      }
      
      return { id: customerId, ...data }
    })
    return create()
  })

  ipcMain.handle('update-customer', (_, id: number, data: any) => {
    db().prepare(`
      UPDATE customers SET name=?, phone=?, address=?, credit_limit=?, notes=?, updated_at=datetime('now','localtime')
      WHERE id=?
    `).run(data.name, data.phone || null, data.address || null, data.credit_limit || 0, data.notes || null, id)
    return { success: true }
  })

  ipcMain.handle('delete-customer', (_, id: number) => {
    db().prepare('DELETE FROM customers WHERE id=?').run(id)
    return { success: true }
  })

  ipcMain.handle('get-customer-ledger', (_, id: number) => {
    const customer = db().prepare('SELECT * FROM customers WHERE id=?').get(id)
    const transactions = db().prepare(`
      SELECT cp.*, s.bill_number FROM credit_payments cp
      LEFT JOIN sales s ON cp.sale_id = s.id
      WHERE cp.customer_id = ?
      ORDER BY cp.created_at DESC
    `).all(id)
    const sales = db().prepare(`
      SELECT 
        s.*, 
        COUNT(si.id) as item_count,
        CASE 
          WHEN s.payment_method = 'credit' THEN s.total_amount
          WHEN s.payment_method = 'split' THEN (s.total_amount - s.paid_amount)
          ELSE 0
        END as credit_amount,
        COALESCE((
          SELECT SUM(cp.amount) 
          FROM credit_payments cp 
          WHERE cp.sale_id = s.id AND cp.payment_type = 'payment'
        ), 0) as paid_credit_amount
      FROM sales s
      LEFT JOIN sale_items si ON si.sale_id = s.id
      WHERE s.customer_id = ? AND s.status = 'completed' AND s.payment_method IN ('credit', 'split')
      GROUP BY s.id 
      ORDER BY s.created_at DESC LIMIT 50
    `).all(id)
    return { customer, transactions, sales }
  })

  ipcMain.handle('add-credit-payment', (_, data: any) => {
    const addPayment = db().transaction(() => {
      // 1. Get the customer's previous balance
      const customerBefore = db().prepare('SELECT * FROM customers WHERE id = ?').get(data.customer_id) as any
      if (!customerBefore) throw new Error('Customer not found')

      const prevCustomerBalance = customerBefore.current_balance

      // 2. Get the sale's previous balance (if sale_id is provided)
      let prevBillBalance = 0
      let billNumber = ''
      if (data.sale_id) {
        const sale = db().prepare('SELECT * FROM sales WHERE id = ?').get(data.sale_id) as any
        if (sale) {
          billNumber = sale.bill_number
          const creditAmount = sale.payment_method === 'credit' 
            ? sale.total_amount 
            : (sale.payment_method === 'split' ? (sale.total_amount - sale.paid_amount) : 0)
          
          const paidCreditAmount = db().prepare(`
            SELECT COALESCE(SUM(amount), 0) as total 
            FROM credit_payments 
            WHERE sale_id = ? AND payment_type = 'payment'
          `).get(data.sale_id) as any
          
          prevBillBalance = creditAmount - (paidCreditAmount?.total || 0)
        }
      }

      // 3. Insert the payment
      const insertResult = db().prepare(`
        INSERT INTO credit_payments (customer_id, sale_id, amount, payment_type, notes, user_id)
        VALUES (?, ?, ?, 'payment', ?, ?)
      `).run(data.customer_id, data.sale_id || null, data.amount, data.notes || null, data.user_id || null)
      
      const paymentId = insertResult.lastInsertRowid

      // 4. Update the customer's current balance
      db().prepare('UPDATE customers SET current_balance = current_balance - ? WHERE id=?')
        .run(data.amount, data.customer_id)

      // 5. Get customer details after payment
      const customerAfter = db().prepare('SELECT * FROM customers WHERE id = ?').get(data.customer_id) as any

      // 6. Get payment record
      const paymentRecord = db().prepare('SELECT * FROM credit_payments WHERE id = ?').get(paymentId) as any

      return {
        success: true,
        receipt: {
          payment_id: paymentId,
          customer_name: customerBefore.name,
          customer_phone: customerBefore.phone || '',
          amount: data.amount,
          notes: data.notes || '',
          created_at: paymentRecord.created_at,
          bill_number: billNumber,
          sale_id: data.sale_id || null,
          prev_bill_balance: prevBillBalance,
          new_bill_balance: data.sale_id ? (prevBillBalance - data.amount) : 0,
          prev_customer_balance: prevCustomerBalance,
          new_customer_balance: customerAfter.current_balance
        }
      }
    })
    return addPayment()
  })
  ipcMain.handle('get-total-outstanding', (_) => {
    const result = db().prepare('SELECT COALESCE(SUM(current_balance),0) as total FROM customers WHERE current_balance > 0').get() as any
    return result?.total || 0
  })
}
