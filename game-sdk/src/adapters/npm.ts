import { GoPortalSDKClient } from '../core/client'

export type CreateSDKOptions = ConstructorParameters<typeof GoPortalSDKClient>[0]

export const createGoPortalSDK = (options: CreateSDKOptions = {}) => new GoPortalSDKClient(options)
