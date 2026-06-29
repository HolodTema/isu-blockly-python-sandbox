import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    {
      name: 'cdn-codemirror-resolver',
      resolveId(id) {
        // Фиксируем единые версии для ядра CodeMirror во избежание дублирования инстансов
        const STATE_VER = '6.4.1';
        const VIEW_VER = '6.26.3';
        const sharedDeps = `?deps=@codemirror/state@${STATE_VER},@codemirror/view@${VIEW_VER}`;
        
        const cdnMap = {
          // Точечно возвращаем родной пакет для state (вернет EditorState)
          '@codemirror/state': `https://esm.sh/@codemirror/state@${STATE_VER}`,
          
          // Точечно возвращаем родной пакет для view (вернет EditorView)
          '@codemirror/view': `https://esm.sh/@codemirror/view@${VIEW_VER}`,
          
          // Перенаправляем устаревший basic-setup на современный umbrella-пакет, где он лежит
          '@codemirror/basic-setup': `https://esm.sh/codemirror@6.10.1${sharedDeps}`,
          
          // Для всех остальных команд и плагинов жестко привязываем то же самое ядро
          '@codemirror/commands': `https://esm.sh/@codemirror/commands@6.6.0${sharedDeps}`,
          '@codemirror/lang-python': `https://esm.sh/@codemirror/lang-python@6.1.6${sharedDeps}`,
          '@codemirror/theme-one-dark': `https://esm.sh/@codemirror/theme-one-dark@6.1.2${sharedDeps}`,
        };

        if (id in cdnMap) {
          return { id: cdnMap[id], external: true };
        }
      },
    },
  ],
  server: {
    hmr: {
      overlay: false,
    },
  },
});
