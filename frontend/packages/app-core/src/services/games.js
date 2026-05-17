import { apiClient } from '../lib/api-client';
import { useAuthStore } from '@goportal/store';
const toSearchParams = (filter) => {
    const query = new URLSearchParams();
    Object.entries(filter).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') {
            return;
        }
        query.set(key, String(value));
    });
    const output = query.toString();
    return output ? `?${output}` : '';
};
export const listGames = async (filter = {}) => apiClient.get(`/api/v1/games/market${toSearchParams(filter)}`);
export const listTrendingGames = async (filter = {}) => apiClient.get(`/api/v1/games/trending${toSearchParams(filter)}`);
export const searchGames = async (filter) => apiClient.get(`/api/v1/games/search${toSearchParams(filter)}`);
export const getGame = async (id) => apiClient.get(`/api/v1/games/${id}`);
export const createGame = async (payload) => apiClient.post('/api/v1/games', payload);
export const createSystemGame = async (payload) => apiClient.post('/api/v1/admin/games/system', payload);
export const submitGameForReview = async (gameId) => apiClient.post(`/api/v1/games/${gameId}/submit-review`, {});
export const updateGamePublishState = async (gameId, payload) => apiClient.patch(`/api/v1/admin/games/${gameId}/publish-state`, payload);
export const featureGame = async (gameId, payload) => apiClient.post(`/api/v1/admin/games/${gameId}/feature`, payload);
export const listMyGames = async () => apiClient.get('/api/v1/games/me');
export const listReviewQueue = async (params = {}) => apiClient.get(`/api/v1/admin/games/review-queue${toSearchParams(params)}`);
export const uploadGameBuild = async (gameId, file, version) => {
    const token = getToken();
    if (!token) {
        throw new Error('Session expired. Please log in again.');
    }
    const formData = new FormData();
    formData.append('file', file);
    if (version?.trim()) {
        formData.append('version', version.trim());
    }
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';
        xhr.open('POST', `${baseURL}/api/v1/games/${gameId}/builds`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.onerror = () => {
            reject(new Error('Unable to upload game bundle. Please try again.'));
        };
        xhr.onload = () => {
            let payload = null;
            try {
                payload = JSON.parse(xhr.responseText);
            }
            catch {
                payload = null;
            }
            if (xhr.status < 200 || xhr.status >= 300 || !payload?.data) {
                reject(new Error(payload?.message ?? 'Unable to upload game bundle.'));
                return;
            }
            resolve(payload.data);
        };
        xhr.send(formData);
    });
};
export const createPlaySession = async (gameId) => apiClient.get(`/api/v1/games/${gameId}/play-session`);
export const rateGame = async (gameId, score) => apiClient.post(`/api/v1/games/${gameId}/ratings`, { score });
export const createReview = async (gameId, payload) => apiClient.post(`/api/v1/games/${gameId}/reviews`, payload);
export const listReviews = async (gameId, params = {}) => apiClient.get(`/api/v1/games/${gameId}/reviews${toSearchParams(params)}`);
export const moderateReview = async (reviewId, payload) => apiClient.patch(`/api/v1/admin/reviews/${reviewId}/moderate`, payload);
export const reportGame = async (gameId, payload) => apiClient.post(`/api/v1/games/${gameId}/reports`, payload);
export const startGameSession = async (gameId, payload = {}) => apiClient.post(`/api/v1/games/${gameId}/session/start`, payload);
export const createGameEvent = async (gameId, sessionId, payload) => apiClient.post(`/api/v1/games/${gameId}/sessions/${sessionId}/events`, payload);
export const shareGameToChannel = async (gameId, payload) => {
    await apiClient.post(`/api/v1/games/${gameId}/share`, payload);
};
export const createGameRoom = async (gameId, payload = {}) => apiClient.post(`/api/v1/games/${gameId}/rooms`, payload);
export const joinGameRoom = async (gameId, roomId) => apiClient.post(`/api/v1/games/${gameId}/rooms/${roomId}/join`, {});
export const leaveGameRoom = async (gameId, roomId) => apiClient.post(`/api/v1/games/${gameId}/rooms/${roomId}/leave`, {});
export const getGameRoomState = async (gameId, roomId) => apiClient.get(`/api/v1/games/${gameId}/rooms/${roomId}/state`);
export const listOpenGameRooms = async (gameId, params = {}) => apiClient.get(`/api/v1/games/${gameId}/rooms/open${toSearchParams(params)}`);
const getToken = () => {
    const token = useAuthStore.getState().token;
    if (token) {
        return token;
    }
    const direct = localStorage.getItem('auth_token');
    if (direct) {
        return direct;
    }
    const legacy = localStorage.getItem('auth-token');
    if (legacy) {
        return legacy;
    }
    const persisted = localStorage.getItem('auth-store');
    if (!persisted) {
        return null;
    }
    try {
        const parsed = JSON.parse(persisted);
        return parsed.state?.token ?? null;
    }
    catch {
        return null;
    }
};
//# sourceMappingURL=games.js.map