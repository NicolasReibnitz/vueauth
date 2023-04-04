import { createClient } from '@supabase/supabase-js';
import { effectScope, ref, computed, inject, unref, watch } from 'vue-demi';
import { useRouter } from 'vue-router';

const SupabaseClientKey = Symbol('SupabaseDefaultClient');

var _a;
const isClient = typeof window !== "undefined";
isClient && ((_a = window == null ? void 0 : window.navigator) == null ? void 0 : _a.userAgent) && /iP(ad|hone|od)/.test(window.navigator.userAgent);

function createGlobalState(stateFactory) {
  let initialized = false;
  let state;
  const scope = effectScope(true);
  return () => {
    if (!initialized) {
      state = scope.run(stateFactory);
      initialized = true;
    }
    return state;
  };
}

const useAuthState = createGlobalState(() => {
    const user = ref(null);
    const isAuthenticated = computed(() => !!user.value);
    const authIsReady = ref(true);
    return {
        authIsReady,
        isAuthenticated,
        user,
    };
});

const SupabasePlugin = {
    install: (vueApp, options) => {
        if (!options || !options.credentials || !options.credentials.supabaseKey || !options.credentials.supabaseUrl) {
            throw Error('Credentials must be provided when installing supabase');
        }
        const { supabaseUrl, supabaseKey } = options.credentials;
        const client = createClient(supabaseUrl, supabaseKey);
        const { user, authIsReady } = useAuthState();
        client.auth.onAuthStateChange((_, session) => {
            authIsReady.value = true;
            user.value = session?.user ?? null;
        });
        vueApp.provide(SupabaseClientKey, client);
    },
};

const useClient = () => {
    const client = inject(SupabaseClientKey);
    if (!client) {
        throw Error('Error injecting supabase client');
    }
    return client;
};

const DefaultAuthProviderSymbol = Symbol.for('auth:defaultProvider');

const getDefaultProvider = () => {
    const defaultAuthProvider = inject(DefaultAuthProviderSymbol);
    if (defaultAuthProvider) {
        return unref(defaultAuthProvider);
    }
    throw new Error('default auth provider key not found');
};

const getConfig = (featureId = '', authProvider = '') => {
    authProvider = authProvider || getDefaultProvider();
    let config;
    if (featureId) {
        config = inject(Symbol.for(`auth:${authProvider}.${featureId}.config`));
        return config ?? {};
    }
    else {
        config = inject(Symbol.for(`auth:${authProvider}.config`));
        return config ?? {};
    }
};

const useFeature = (featureId, config, ...args) => {
    config.authProvider = config.authProvider ?? getDefaultProvider();
    // Merge base config with supplied config
    const baseConfig = getConfig(featureId, config.authProvider);
    // Create the provide key
    const ProvideKey = Symbol.for(`auth:${config.authProvider}:${featureId}`);
    // Inject the composable using provide key
    const composable = inject(ProvideKey);
    // if we have the composable return it, otherwise error
    if (composable && typeof composable === 'function') {
        let mergedConfig;
        if (composable.baseConfig && typeof composable.baseConfig === 'object') {
            mergedConfig = { ...composable.baseConfig, ...baseConfig, ...config };
        }
        else {
            mergedConfig = { ...baseConfig, ...config };
        }
        return composable(mergedConfig, ...args);
    }
    else {
        throw new Error(`unable to find inject key: ${ProvideKey.toString()}`);
    }
};

const redirectTriggers = [
    'authenticated',
    'unauthenticated',
    'error',
];

const featureId$6 = 'authRedirector';
const useAuthRedirector$1 = (config) => {
    if (!config.redirectOn || !redirectTriggers.includes(config.redirectOn)) {
        throw new Error("useAuthRedirector config: 'redirectOn' is either missing or invalid");
    }
    return useFeature(featureId$6, config);
};

const useHandlesErrors$1 = () => {
    // Standard Errors
    const errors = ref([]);
    function resetStandardErrors() {
        errors.value = [];
    }
    const hasStandardErrors = computed(() => {
        return !!errors.value.length;
    });
    // Validation Errors
    const validationErrors = ref({});
    const hasValidationErrors = computed(() => {
        return !!Object.keys(validationErrors.value).length;
    });
    function resetValidationErrors() {
        validationErrors.value = {};
    }
    // All Errors
    const hasErrors = computed(() => hasStandardErrors.value || hasValidationErrors.value);
    function resetErrors() {
        resetStandardErrors();
        resetValidationErrors();
    }
    return {
        errors,
        hasStandardErrors,
        resetStandardErrors,
        validationErrors,
        hasValidationErrors,
        resetValidationErrors,
        hasErrors,
        resetErrors,
    };
};

const useHandlesErrors = () => {
    const errorService = useHandlesErrors$1();
    const { resetErrors, errors } = errorService;
    function fromResponse(error) {
        resetErrors();
        errors.value.push({
            type: `CODE: ${error.status}`,
            message: error.message,
        });
    }
    return {
        ...errorService,
        fromResponse,
    };
};

const useIdentityPasswordLogout = () => {
    const loading = ref(false);
    const supabase = useClient();
    const { hasErrors, errors, resetStandardErrors, resetErrors, fromResponse: setErrorsFromResponse, } = useHandlesErrors();
    const logout = async () => {
        loading.value = true;
        const { error } = await supabase.auth.signOut();
        if (error)
            setErrorsFromResponse(error);
        loading.value = false;
    };
    return {
        logout,
        loading,
        hasErrors,
        errors,
        resetStandardErrors,
        resetErrors,
    };
};

const useIdentityPasswordRegister = () => {
    const supabaseClient = useClient();
    const loading = ref(false);
    const { errors, hasErrors, fromResponse: setErrorsFromResponse, validationErrors, hasValidationErrors, resetStandardErrors, resetValidationErrors, resetErrors, } = useHandlesErrors();
    const form = ref({
        email: '',
        password: '',
        password_confirmation: '',
    });
    function resetForm() {
        Object.keys(form.value).forEach(key => { form.value[key] = ''; });
    }
    watch(form.value, () => {
        resetErrors();
    });
    const register = async () => {
        loading.value = true;
        if (form.value.password !== form.value.password_confirmation) {
            errors.value.push({
                type: 'validation',
                message: 'The password confirmation does not match.',
            });
            loading.value = false;
            return;
        }
        const { error } = await supabaseClient.auth.signUp(form.value);
        if (error)
            setErrorsFromResponse(error);
        loading.value = false;
    };
    return {
        form,
        register,
        loading,
        validationErrors,
        hasValidationErrors,
        hasErrors,
        errors,
        resetStandardErrors,
        resetValidationErrors,
        resetErrors,
        resetForm,
    };
};
useIdentityPasswordRegister.baseConfig = {
    emailConfirm: false,
};

const useIdentityPasswordLogin = () => {
    const loading = ref(false);
    const supabase = useClient();
    const { validationErrors, hasValidationErrors, hasErrors, errors, resetErrors, fromResponse: setErrorsFromResponse, resetStandardErrors, resetValidationErrors, } = useHandlesErrors();
    const form = ref({
        email: '',
        password: '',
    });
    function resetForm() {
        Object.keys(form.value).forEach(key => { form.value[key] = ''; });
    }
    watch(form.value, () => {
        resetErrors();
    });
    const login = async () => {
        loading.value = true;
        const { error } = await supabase.auth.signInWithPassword(form.value);
        if (error)
            setErrorsFromResponse(error);
        loading.value = false;
    };
    return {
        form,
        login,
        loading,
        validationErrors,
        hasValidationErrors,
        hasErrors,
        errors,
        resetErrors,
        resetStandardErrors,
        resetValidationErrors,
        resetForm,
    };
};

const useFetchUser = () => {
    const { hasErrors, errors, resetStandardErrors, resetErrors, } = useHandlesErrors();
    const loading = ref(false);
    const supabase = useClient();
    function fetch() {
        return new Promise(resolve => {
            // const user = 
            supabase.auth.getUser().then(({ data }) => resolve(data?.user));
            //   const user = supabase.auth.user()
            //   resolve(user)
        });
    }
    return {
        loading,
        fetch,
        hasErrors,
        errors,
        resetStandardErrors,
        resetErrors,
    };
};

const usePasswordResetViaEmail = () => {
    const loading = ref(false);
    const client = useClient();
    const auth = client.auth;
    const { errors, hasErrors, fromResponse: setErrorsFromResponse, validationErrors, hasValidationErrors, resetStandardErrors, resetValidationErrors, resetErrors, } = useHandlesErrors();
    const requestForm = ref({ email: '' });
    function resetRequestForm() {
        Object.keys(requestForm.value).forEach(key => { requestForm.value[key] = ''; });
    }
    const resetPasswordForm = ref({
        password: '',
        password_confirmation: '',
    });
    function resetResetPasswordForm() {
        Object.keys(resetPasswordForm.value).forEach(key => { resetPasswordForm.value[key] = ''; });
    }
    const requestReset = async () => {
        loading.value = true;
        const { error } = await auth.resetPasswordForEmail(requestForm.value.email, {
            redirectTo: window.location.origin + '/password-reset',
        });
        if (error)
            setErrorsFromResponse(error);
        loading.value = false;
    };
    const reset = async () => {
        loading.value = true;
        const { error } = await auth.updateUser(
        //   getAccessToken(),
        { password: resetPasswordForm.value.password });
        if (error)
            setErrorsFromResponse(error);
        loading.value = false;
    };
    //   function getAccessToken (): string {
    //     const session = auth.session()
    //     if (!session) {
    //       throw new Error('Missing session data. Ensure the password reset link is correct.')
    //     }
    //     return session.access_token
    //   }
    return {
        requestForm,
        resetRequestForm,
        resetResetPasswordForm,
        requestReset,
        reset,
        loading,
        resetPasswordForm,
        // Error Handling
        validationErrors,
        hasValidationErrors,
        hasErrors,
        errors,
        resetStandardErrors,
        resetValidationErrors,
        resetErrors,
    };
};

const useUpdatePassword = () => {
    const loading = ref(false);
    const supabase = useClient();
    const { errors, hasErrors, fromResponse: setErrorsFromResponse, validationErrors, hasValidationErrors, resetStandardErrors, resetValidationErrors, resetErrors, } = useHandlesErrors();
    const form = ref({
        password: '',
        password_confirmation: '',
    });
    function resetForm() {
        Object.keys(form.value).forEach(key => { form.value[key] = ''; });
    }
    const update = async () => {
        if (form.value.password !== form.value.password_confirmation) {
            validationErrors.value.password = ['password and password confirmation must match'];
            return;
        }
        if (typeof form.value.password === 'string' && form.value.password.length < 6) {
            validationErrors.value.password = ['password must be at least 6 characters long'];
            return;
        }
        loading.value = true;
        const { error } = await supabase.auth.updateUser({ password: form.value.password });
        if (error)
            setErrorsFromResponse(error);
        loading.value = false;
    };
    return {
        form,
        update,
        loading,
        resetForm,
        // error Handling
        validationErrors,
        hasValidationErrors,
        hasErrors,
        errors,
        resetStandardErrors,
        resetValidationErrors,
        resetErrors,
    };
};

const useAuthenticatedRedirector = (config = {
    redirectTo: ref('/'),
    router: useRouter(),
}) => {
    config.redirectOn = 'authenticated';
    return {
        ...useAuthRedirector$1(config),
    };
};
useAuthenticatedRedirector.baseConfig = {};

const useUnauthenticatedRedirector = (config = {
    redirectTo: ref('/'),
    router: useRouter(),
}) => {
    config.redirectOn = 'unauthenticated';
    return {
        ...useAuthRedirector$1(config),
    };
};

const useAuthRedirector = (config = {
    redirectOn: 'authenticated',
    redirectTo: ref('/'),
}) => {
    const checking = ref(false);
    const supabase = useClient();
    config.redirectTo = config.redirectTo ?? ref('/');
    config.router = config.router ?? useRouter();
    const { isAuthenticated, user, authIsReady, } = useAuthState();
    const onChecked = ref(null);
    function exec() {
        if (typeof onChecked.value === 'function') {
            onChecked.value(user.value);
        }
        checking.value = false;
        triggerRedirect();
    }
    function execOnAuthStateEnsured() {
        if (authIsReady.value) {
            return exec();
        }
        return execOnAuthStateChange();
    }
    function handleUnauthenticatedRedirect() {
        if (!isAuthenticated.value && config.redirectOn === 'unauthenticated') {
            if (!config.router) {
                throw new Error('config.router not defined: cannot redirect');
            }
            if (!config.redirectTo) {
                throw new Error('config.redirectTo not defined: cannot redirect');
            }
            config.router.push(unref(config.redirectTo));
        }
    }
    function handleAuthenticatedRedirect() {
        if (isAuthenticated.value && config.redirectOn === 'authenticated') {
            if (!config.router) {
                throw new Error('config.router not defined: cannot redirect');
            }
            if (!config.redirectTo) {
                throw new Error('config.redirectTo not defined: cannot redirect');
            }
            config.router.push(unref(config.redirectTo));
        }
    }
    function execOnAuthStateChange() {
        checking.value = true;
        const { data } = supabase.auth.onAuthStateChange((_, session) => {
            authIsReady.value = true;
            if (typeof onChecked.value === 'function') {
                onChecked.value(session?.user);
            }
            handleUnauthenticatedRedirect();
            handleAuthenticatedRedirect();
            checking.value = false;
            data?.subscription.unsubscribe();
        });
    }
    function triggerRedirect() {
        handleAuthenticatedRedirect();
        handleUnauthenticatedRedirect();
    }
    return {
        execOnAuthStateChange,
        execOnAuthStateEnsured,
        exec,
        redirectTo: config.redirectTo,
        checking,
        onChecked,
    };
};
useAuthRedirector.baseConfig = {};

export { SupabasePlugin, useAuthRedirector, useAuthState, useAuthenticatedRedirector, useClient, useFetchUser, useHandlesErrors, useIdentityPasswordLogin, useIdentityPasswordLogout, useIdentityPasswordRegister, usePasswordResetViaEmail, useUnauthenticatedRedirector, useUpdatePassword };
