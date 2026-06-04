/**
 * Thermal Receipt Printer Module
 * Builds plain-text receipts with padEnd() column formatting
 * and prints via Electron's silent print to the default printer.
 *
 * Designed for ESC/POS thermal printers (80mm / 48 chars or 58mm / 32 chars per line).
 * Uses ONLY plain ASCII — no unicode, no special currency symbols.
 */

import { BrowserWindow, app } from 'electron'
import { writeFileSync } from 'fs'
import path from 'path'

// ── Formatting helpers ──

function centerText(text: string, width: number): string {
  if (text.length >= width) return text
  const totalPadding = width - text.length
  const leftPad = Math.floor(totalPadding / 2)
  return ' '.repeat(leftPad) + text
}

function drawLine(char = '-', width: number): string {
  return char.repeat(width)
}

function fmtMoney(n: number | null | undefined): string {
  const num = n == null || isNaN(n) ? 0 : n
  // Use en-US to ensure standard commas and dots (plain ASCII)
  return 'Rs.' + num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function truncate(str: string, max: number): string {
  if (!str) return ''
  return str.length > max ? str.substring(0, max) : str
}

function formatItemHeader(colItem: number, colQty: number, colPrice: number, colTotal: number): string {
  return 'ITEM'.padEnd(colItem) +
    'QTY'.padEnd(colQty) +
    'PRICE'.padEnd(colPrice) +
    'TOTAL'.padStart(colTotal)
}

function formatItemRow(
  name: string,
  qty: number,
  price: number,
  total: number,
  colItem: number,
  colQty: number,
  colPrice: number,
  colTotal: number
): string {
  const itemName = truncate(name, colItem - 1).padEnd(colItem)
  const itemQty = String(qty).padEnd(colQty)
  const itemPrice = fmtMoney(price).padEnd(colPrice)
  const itemTotal = fmtMoney(total).padStart(colTotal)
  return itemName + itemQty + itemPrice + itemTotal
}

function formatTotalRow(label: string, amount: number | string, lineWidth: number): string {
  const amtStr = typeof amount === 'number' ? fmtMoney(amount) : amount
  return label + amtStr.padStart(lineWidth - label.length)
}

// ── Word wrapping helper ──

function wrapText(text: string, maxLen: number): string[] {
  if (!text) return []
  const words = text.split(/\s+/)
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    if ((currentLine + (currentLine ? ' ' : '') + word).length <= maxLen) {
      currentLine += (currentLine ? ' ' : '') + word
    } else {
      if (currentLine) {
        lines.push(currentLine)
      }
      currentLine = word.substring(0, maxLen)
    }
  }
  if (currentLine) {
    lines.push(currentLine)
  }
  return lines
}

// ── Unicode & Currency Sanitization ──

function sanitizeText(text: string): string {
  if (!text) return ''
  return text
    // Replace all currency symbols with "Rs."
    .replace(/[₨\u20A8]/g, 'Rs.')
    .replace(/[$€£¥]/g, 'Rs.')
    // Replace common unicode typography characters with ASCII equivalents
    .replace(/[\u2018\u2019]/g, "'") // Smart single quotes
    .replace(/[\u201C\u201D]/g, '"') // Smart double quotes
    .replace(/[\u2013\u2014]/g, '-') // Em/en dashes
    .replace(/\u00A0/g, ' ')         // Non-breaking space
    // Remove any remaining non-ASCII characters (keep code points 0-127)
    .replace(/[^\x00-\x7F]/g, '')
}

// ── Receipt builder ──

export interface ReceiptData {
  storeName: string
  storeAddress?: string
  storePhone?: string
  storePhone2?: string
  billNumber: string
  createdAt: string
  cashierName: string
  customerName: string
  paymentMethod: string
  items: Array<{
    product_name: string
    quantity: number
    unit_price: number
    total_price: number
    discount_percent?: number
  }>
  subtotal: number
  discount: number
  taxAmount: number
  taxName: string
  total: number
  paidAmount: number
  changeAmount: number
  receiptFooter: string
  receiptWidth?: string
}

export function buildReceiptText(data: ReceiptData): string {
  const lines: string[] = []
  const widthStr = data.receiptWidth || '80'
  const lineWidth = widthStr === '58' ? 32 : 48

  // Dynamic column widths:
  // For 80mm (48 chars): ITEM(20) QTY(5) PRICE(8) | TOTAL (15)
  // For 58mm (32 chars): ITEM(12) QTY(4) PRICE(6) | TOTAL (10)
  const colItem = widthStr === '58' ? 12 : 20
  const colQty = widthStr === '58' ? 4 : 5
  const colPrice = widthStr === '58' ? 6 : 8
  const colTotal = lineWidth - colItem - colQty - colPrice

  // 1. [CENTER] Shop Name (Double-strike simulate bold)
  const shopNameLine = centerText(data.storeName.toUpperCase(), lineWidth)
  lines.push(shopNameLine)
  lines.push(shopNameLine)

  // 2. [CENTER] Address
  if (data.storeAddress) {
    lines.push(centerText(data.storeAddress, lineWidth))
  }

  // 3. [CENTER] Phone
  if (data.storePhone) {
    let phoneStr = 'Tel: ' + data.storePhone
    if (data.storePhone2) {
      phoneStr += ' / ' + data.storePhone2
    }
    lines.push(centerText(phoneStr, lineWidth))
  }

  // 4. [CENTER] separator drawLine()
  lines.push(drawLine('=', lineWidth))

  // 5. [LEFT] Bill#
  lines.push('Bill#: ' + data.billNumber)

  // 6. [LEFT] Date
  lines.push('Date:  ' + data.createdAt)

  // 7. [LEFT] Cashier
  lines.push('Cashier: ' + data.cashierName)

  // 8. [LEFT] Customer
  lines.push('Customer: ' + (data.customerName || 'Walk-in'))

  // 9. [LEFT] Payment
  lines.push('Payment: ' + data.paymentMethod.toUpperCase())

  // 10. separator drawLine()
  lines.push(drawLine('-', lineWidth))

  // 11. [LEFT] ITEM | QTY | PRICE | TOTAL headers
  lines.push(formatItemHeader(colItem, colQty, colPrice, colTotal))

  // 12. separator drawLine()
  lines.push(drawLine('-', lineWidth))

  // 13. [LEFT] all items with proper column spacing
  for (const item of data.items) {
    lines.push(formatItemRow(
      item.product_name,
      item.quantity,
      item.unit_price,
      item.total_price,
      colItem,
      colQty,
      colPrice,
      colTotal
    ))
    if (item.discount_percent && item.discount_percent > 0) {
      lines.push('  Disc: ' + item.discount_percent + '%')
    }
  }

  // 14. separator drawLine()
  lines.push(drawLine('-', lineWidth))

  // 15. [RIGHT aligned amounts] Subtotal
  lines.push(formatTotalRow('Subtotal:', data.subtotal, lineWidth))

  // 16. separator drawLine()
  lines.push(drawLine('-', lineWidth))

  // 17. [RIGHT aligned amounts] TOTAL
  lines.push(formatTotalRow('TOTAL:', data.total, lineWidth))

  // 18. separator drawLine()
  lines.push(drawLine('-', lineWidth))

  // 19. [RIGHT aligned amounts] Cash Paid
  lines.push(formatTotalRow('Cash Paid:', data.paidAmount, lineWidth))

  // 20. separator drawLine()
  lines.push(drawLine('-', lineWidth))

  // NOTE: "Thank you" is rendered in the HTML .footer div
  // below the <pre> block, NOT inside the pre text.

  return sanitizeText(lines.join('\n'))
}

// ── Print function using Electron's native print ──

export async function printReceipt(data: ReceiptData): Promise<boolean> {
  const receiptWidth = data.receiptWidth || '80'
  const receiptText = buildReceiptText(data)

  const printWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  const widthMm = receiptWidth === '58' ? '58mm' : '80mm'
  const fontSize = receiptWidth === '58' ? '9px' : '10px'
  const bodyPadding = receiptWidth === '58' ? '1.5mm' : '2mm'

  // Build HTML page with styled header block and monospace preformatted text body.
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page {
    margin: 0;
    size: ${widthMm} auto;
  }
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: ${fontSize};
    line-height: 1.2;
    color: #000;
    background: #fff;
    width: ${widthMm};
    padding: ${bodyPadding};
  }
  pre {
    font-family: 'Courier New', Courier, monospace;
    font-size: inherit;
    line-height: inherit;
    white-space: pre;
    text-align: left;
    margin: 0;
    padding: 0;
  }
  .footer {
    text-align: center !important;
    display: block !important;
    width: 100% !important;
    margin-top: 8px;
    margin-bottom: 2px;
    font-family: Arial, Helvetica, sans-serif;
    font-size: ${fontSize};
    line-height: 1.4;
  }
  .paper-feed {
    height: 60mm; /* Advances paper past the cutter — no content here */
  }
</style>
</head>
<body>
  <pre>${receiptText}</pre>
  <div class="footer">
    <center>
      ${sanitizeText(data.receiptFooter || 'Thank you for shopping with us!')}
    </center>
  </div>
  <div class="paper-feed">&nbsp;</div>
  <div style="page-break-after: always;"></div>
</body>
</html>`

  await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)

  writeFileSync(path.join(app.getPath('desktop'), 'receipt-debug.html'), html, 'utf8')

  return new Promise((resolve) => {
    printWindow.webContents.print(
      {
        silent: true,
        printBackground: false,
        margins: { marginType: 'none' }
      },
      (success, errorType) => {
        setTimeout(() => {
          if (!printWindow.isDestroyed()) printWindow.close()
        }, 2000)
        if (!success) {
          console.error('[ThermalPrinter] Print failed:', errorType)
        }
        resolve(success)
      }
    )
  })
}
