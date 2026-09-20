import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import path from 'node:path';
export default defineConfig({root:path.resolve('portable'),base:'./',resolve:{alias:{'@':path.resolve('.')}},plugins:[react()],css:{postcss:{plugins:[tailwindcss()]}},build:{outDir:path.resolve('outputs/Study Room/web'),emptyOutDir:true}});
