/**
 * Robust clipboard utility with fallback for non-secure contexts or older browsers.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false

  // Try modern Clipboard API if supported and in secure context
  const isSecure = typeof window !== 'undefined' ? window.isSecureContext : true
  if (typeof navigator !== 'undefined' && navigator.clipboard && isSecure) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Fallback to execCommand below
    }
  }

  // Fallback using temporary textarea
  try {
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    textArea.setAttribute('readonly', '')
    textArea.style.opacity = '0'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    const successful = document.execCommand('copy')
    textArea.remove()
    return successful
  } catch {
    return false
  }
}
