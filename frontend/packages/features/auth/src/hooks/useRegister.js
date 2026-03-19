/**
 * useRegister Hook
 *
 * Mutation hook for registration.
 */
import { useMutation } from '@tanstack/react-query';
import { authRepo } from '@goportal/services';
export const useRegister = () => useMutation({
    mutationFn: (body) => authRepo.register(body),
});
//# sourceMappingURL=useRegister.js.map