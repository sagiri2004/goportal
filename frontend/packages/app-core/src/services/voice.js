import { apiClient } from '../lib/api-client';
export const getVoiceToken = async (channelId) => apiClient.post(`/api/v1/channels/${channelId}/voice/token`);
export const listVoiceParticipants = async (channelId) => apiClient.get(`/api/v1/channels/${channelId}/voice/participants`);
export const startChannelRecording = async (channelId) => apiClient.post(`/api/v1/channels/${channelId}/recording/start`);
export const stopChannelRecording = async (channelId) => apiClient.post(`/api/v1/channels/${channelId}/recording/stop`);
export const listChannelRecordings = async (channelId, opts = {}) => {
    const limit = opts.limit ?? 20;
    const offset = opts.offset ?? 0;
    return apiClient.get(`/api/v1/channels/${channelId}/recordings?limit=${limit}&offset=${offset}`);
};
export const startChannelStream = async (channelId, rtmpURL) => apiClient.post(`/api/v1/channels/${channelId}/stream/start`, {
    rtmp_url: rtmpURL,
});
export const stopChannelStream = async (channelId) => apiClient.post(`/api/v1/channels/${channelId}/stream/stop`);
//# sourceMappingURL=voice.js.map