import { http, createConfig } from 'wagmi'
import { mainnet, sepolia, polygon, polygonAmoy } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

export const config = createConfig({
  chains: [mainnet, sepolia, polygon, polygonAmoy],
  connectors: [
    injected(),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [polygon.id]: http(),
    [polygonAmoy.id]: http(),
  },
  ssr: true,
  multiInjectedProviderDiscovery: false,
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
