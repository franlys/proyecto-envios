// Hook para manejar el tema (claro/oscuro) globalmente
import { useEffect, useState } from 'react';

export const useTheme = () => {
  const [theme, setTheme] = useState(() => {
    // Cargar tema guardado en localStorage
    const savedConfig = localStorage.getItem('userConfig');
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        return config.apariencia?.tema || 'claro';
      } catch (e) {
        return 'claro';
      }
    }
    return 'claro';
  });

  useEffect(() => {
    // Aplicar tema al documento
    if (theme === 'oscuro') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === 'claro' ? 'oscuro' : 'claro';
    setTheme(newTheme);

    // Guardar en localStorage
    const savedConfig = localStorage.getItem('userConfig');
    let config = {};
    if (savedConfig) {
      try {
        config = JSON.parse(savedConfig);
      } catch (e) {
        config = {};
      }
    }

    config.apariencia = {
      ...config.apariencia,
      tema: newTheme
    };

    localStorage.setItem('userConfig', JSON.stringify(config));
  };

  return { theme, setTheme, toggleTheme, isDark: theme === 'oscuro' };
};

export default useTheme;
