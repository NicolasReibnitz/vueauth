export declare const useGithubAuth: () => {
    signIn: () => Promise<void>;
    loading: import("vue").Ref<boolean, boolean>;
    hasErrors: import("vue").ComputedRef<boolean>;
    errors: import("vue").Ref<{
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
export default useGithubAuth;
