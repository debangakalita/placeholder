// A small tap you can feel.
// Android: the standard vibrate call. iPhone: Safari has no vibrate call, but since iOS 18
// flipping an iOS-style switch gives a native haptic tick, so we flip a hidden one.
// Works best inside a tap or touch handler; does nothing on devices without haptics.

import { isIOS } from './device.js'

let label = null
function iosSwitch() {
  if (label) return label
  const input = document.createElement('input')
  input.type = 'checkbox'
  input.setAttribute('switch', '')
  input.id = 'haptic-switch'
  input.tabIndex = -1
  label = document.createElement('label')
  label.htmlFor = input.id
  label.setAttribute('aria-hidden', 'true')
  label.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none'
  label.appendChild(input)
  document.body.appendChild(label)
  return label
}

// strength: 'light' for small ticks (filmstrip), 'medium' for a page change, 'strong' for the shutter.
const ANDROID_MS = { light: 8, medium: 14, strong: 22 }

export function haptic(strength = 'medium') {
  try {
    if (isIOS) iosSwitch().click()
    else navigator.vibrate?.(ANDROID_MS[strength] || 14)
  } catch {
    // no haptics on this device
  }
}
