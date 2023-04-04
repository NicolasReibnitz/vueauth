import { App } from 'vue-demi';
export interface VuePluginOptions {
    credentials: {
        supabaseUrl: string;
        supabaseKey: string;
    };
}
export declare const SupabasePlugin: {
    install: (vueApp: App, options: VuePluginOptions) => void;
};
export default SupabasePlugin;
