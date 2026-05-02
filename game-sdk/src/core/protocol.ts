import { GOPORTAL_PROTOCOL_VERSION, type SDKRequestEnvelope, type SDKResponseEnvelope } from '../types'

const RESPONSE_TYPE = 'GOPORTAL_SDK_RESPONSE'

export const createRequestEnvelope = <TPayload>(request: {
  requestId: string
  action: SDKRequestEnvelope<TPayload>['action']
  payload: TPayload
  protocolVersion?: string
}): SDKRequestEnvelope<TPayload> => ({
  type: 'GOPORTAL_SDK_REQUEST',
  protocol_version: request.protocolVersion ?? GOPORTAL_PROTOCOL_VERSION,
  request_id: request.requestId,
  action: request.action,
  payload: request.payload,
})

export const isResponseEnvelope = (input: unknown): input is SDKResponseEnvelope => {
  if (!input || typeof input !== 'object') return false
  const raw = input as Record<string, unknown>
  return raw.type === RESPONSE_TYPE && typeof raw.request_id === 'string' && typeof raw.ok === 'boolean'
}
