/**
 * useLogin Hook
 *
 * Mutation hook for login. Saves user and token to auth store on success.
 */
import { useMutation } from '@tanstack/react-query';
import { authRepo } from '@goportal/services';
import { useAuthStore } from '@goportal/store';
export const useLogin = () => {
    const setUser = useAuthStore((state) => state.setUser);
    const setToken = useAuthStore((state) => state.setToken);
    return useMutation({
        mutationFn: (body) => authRepo.login(body),
        onSuccess: (data) => {
            setToken(data.token);
            setUser(data.user);
        },
    });
};
//# sourceMappingURL=useLogin.js.map