export function getDomPath(el: Element): string {
  const stack: string[] = []
  while (el && el.nodeType === 1) {
    let selector = el.nodeName.toLowerCase()
    if (el.id) {
      selector += `#${el.id}`
      stack.unshift(selector)
      break
    } else {
      let sib = el as Element | null
      let nth = 1
      while (sib && sib.previousElementSibling) {
        sib = sib.previousElementSibling
        if (sib.nodeName.toLowerCase() === selector) nth++
      }
      selector += `:nth-of-type(${nth})`
    }
    stack.unshift(selector)
    el = el.parentElement as Element
  }
  return stack.join(' > ')
}

