/**
 * Format a number as currency
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Truncate an address for display
 */
export function truncateAddress(address: string, startLength = 6, endLength = 4): string {
  if (address.length <= startLength + endLength) {
    return address;
  }
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
}

/**
 * Check if a string is a valid Ethereum address
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// USDm (Mento Dollar) addresses per Celo network chain ID
export const USDM_ADDRESSES: Record<number, `0x${string}`> = {
  42220: "0x765DE816845861e75A25fCA122bb6898B8B1282a", // Celo Mainnet
  44787: "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1", // Celo Alfajores (formerly cUSD)
  11142220: "0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b", // Celo Sepolia
};

export const getUsdmAddress = (chainId: number): `0x${string}` => {
  return USDM_ADDRESSES[chainId] || "0x765DE816845861e75A25fCA122bb6898B8B1282a";
};
