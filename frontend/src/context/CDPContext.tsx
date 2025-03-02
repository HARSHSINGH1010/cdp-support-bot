import React, { createContext, useContext, useState, ReactNode } from 'react'

interface CDPContextType {
  selectedPlatform: string | null
  setSelectedPlatform: (platform: string | null) => void
  clearChat: () => void
}

const CDPContext = createContext<CDPContextType | undefined>(undefined)

interface CDPProviderProps {
  children: ReactNode
}

export const CDPProvider: React.FC<CDPProviderProps> = ({ children }) => {
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null)

  const clearChat = () => {
    window.dispatchEvent(new Event('clearChat'))
  }

  return (
    <CDPContext.Provider value={{ selectedPlatform, setSelectedPlatform, clearChat }}>
      {children}
    </CDPContext.Provider>
  )
}

export const useCDPContext = () => {
  const context = useContext(CDPContext)
  if (context === undefined) {
    throw new Error('useCDPContext must be used within a CDPProvider')
  }
  return context
} 