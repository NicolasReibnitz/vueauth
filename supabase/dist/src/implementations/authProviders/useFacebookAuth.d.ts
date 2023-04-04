export declare const useFacebookAuth: () => {
    signIn: () => Promise<void>;
    loading: import("vue-demi").Ref<boolean>;
    hasErrors: import("vue-demi").ComputedRef<boolean>;
    errors: import("vue-demi").Ref<{
        type: string;
        message: string;
    }[]>;
    resetStandardErrors: () => void;
    resetValidationErrors: () => void;
    resetErrors: () => void;
};
export default useFacebookAuth;
