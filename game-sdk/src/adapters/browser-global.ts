import { GoPortalSDKClient } from '../core/client'

declare global {
  interface Window {
    GoPortalGameSDK?: GoPortalSDKClient
  }
}

export const mountBrowserGlobalSDK = () => {
  const sdk = new GoPortalSDKClient()
  window.GoPortalGameSDK = sdk
  return sdk
}
