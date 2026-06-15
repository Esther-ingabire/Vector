import { createContext, useContext } from 'react'

const ThemeCtx = createContext({ dark: false, toggle: () => {} })

export function ThemeProvider({ children }) {
  // Dark mode removed — always light
  return <ThemeCtx.Provider value={{ dark: false, toggle: () => {} }}>{children}</ThemeCtx.Provider>
}

export const useTheme = () => useContext(ThemeCtx)
