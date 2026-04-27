function expandIPv6(ip: string): string {
  if (!ip.includes('::')) return ip
  const [left, right] = ip.split('::')
  const left_parts = left ? left.split(':') : []
  const right_parts = right ? right.split(':') : []
  const fill = Array(8 - left_parts.length - right_parts.length).fill('0')
  return [...left_parts, ...fill, ...right_parts].join(':')
}

function ipv6ToBigInt(ip: string): bigint {
  return expandIPv6(ip)
    .split(':')
    .reduce((acc, group) => (acc << 16n) | BigInt(parseInt(group || '0', 16)), 0n)
}

function isInIPv6Cidr(ip: string, cidr: string): boolean {
  const [network, prefix_str] = cidr.split('/')
  const prefix = parseInt(prefix_str)
  const shift = BigInt(128 - prefix)
  return ipv6ToBigInt(ip) >> shift === ipv6ToBigInt(network) >> shift
}

function isInIPv4Cidr(ip: string, cidr: string): boolean {
  const [network, prefix_str] = cidr.split('/')
  const prefix = parseInt(prefix_str)
  const to_num = (addr: string) =>
    addr.split('.').reduce((acc, part) => (acc << 8) | Number(part), 0) >>> 0
  const mask = ~((1 << (32 - prefix)) - 1) >>> 0
  return (to_num(ip) & mask) === (to_num(network) & mask)
}

export function isAllowedIP(ip: string, allowlist: readonly string[]): boolean {
  return allowlist.some((entry) => {
    if (!entry.includes('/')) return ip === entry
    return entry.includes(':') ? isInIPv6Cidr(ip, entry) : isInIPv4Cidr(ip, entry)
  })
}
