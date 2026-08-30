/**
 * Dev server for testing on a phone.
 *
 * Serves over HTTPS with a self-signed certificate and binds to every network
 * interface, then prints the LAN URLs to open on the phone.
 *
 * HTTPS is not a nicety here. Browsers expose navigator.mediaDevices and the
 * Web Speech API only in a secure context, and localhost is the single
 * exemption — so over plain http://<lan-ip> the Record button cannot work at
 * all, no matter what else is configured.
 *
 * A cross-platform way to set MOBILE=1 without adding a dependency: npm
 * scripts have no portable inline env-var syntax.
 */

import { spawn } from 'node:child_process'
import { networkInterfaces } from 'node:os'

const PORT = 5173

/** Every non-internal IPv4 address, so the phone has something to aim at. */
function lanAddresses() {
  return Object.entries(networkInterfaces())
    .flatMap(([name, addrs]) => (addrs ?? []).map((addr) => ({ name, ...addr })))
    .filter((addr) => addr.family === 'IPv4' && !addr.internal)
}

const addresses = lanAddresses()

console.log('\n  Phone testing — serving over HTTPS with a self-signed certificate.\n')
if (addresses.length === 0) {
  console.log('  No network interface found. Is Wi-Fi connected?\n')
} else {
  for (const addr of addresses) {
    console.log(`    https://${addr.address}:${PORT}/   (${addr.name})`)
  }
  console.log(
    '\n  The phone will warn that the certificate is not trusted. That is expected:\n' +
      '  tap Advanced, then Proceed. The microphone works once you are through.\n' +
      '  Phone and computer must be on the same Wi-Fi network.\n',
  )
}

const child = spawn('npx', ['vite', '--port', String(PORT)], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, MOBILE: '1' },
})

child.on('exit', (code) => process.exit(code ?? 0))
