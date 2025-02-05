type AuthProvider = 'facebook' | 'github' | 'google' | 'twitter';
export declare const useAuthProvider: (authProvider: AuthProvider) => {
    signIn: () => Promise<void>;
    loading: import("vue-demi").Ref<boolean, boolean>;
    hasErrors: import("vue-demi").ComputedRef<boolean>;
    errors: import("vue-demi").Ref<{
        type: string;
        message: string;
    }[], {
        type: string;
        message: string;
    }[]>;
    resetStandardErrors: () => void;
    resetValidationErrors: () => void;
    resetErrors: () => void;
};
export default useAuthProvider;
