import { App } from 'vue-demi';
import type { SupabaseClient } from '@supabase/supabase-js';
export interface VuePluginOptions {
    supabaseInstance: SupabaseClient;
}
export declare const SupabasePlugin: {
    install: (vueApp: App, options: VuePluginOptions) => void;
};
export default SupabasePlugin;
