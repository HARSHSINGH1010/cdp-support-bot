import React, { createContext, useContext, useState, useEffect } from 'react'

interface CDPContextType {
  selectedPlatform: string | null
  setSelectedPlatform: (platform: string | null) => void
  clearChat: () => void
}

export const CDPContext = createContext<CDPContextType>({
  selectedPlatform: null,
  setSelectedPlatform: () => {},
  clearChat: () => {},
})

export const useCDPContext = () => useContext(CDPContext)

export const CDPProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(() => {
    const saved = localStorage.getItem('selectedPlatform')
    return saved || null
  })

  const [messages, setMessages] = useState<any[]>(() => {
    const savedMessages = localStorage.getItem('chatHistory')
    return savedMessages ? JSON.parse(savedMessages) : []
  })

  useEffect(() => {
    if (selectedPlatform) {
      localStorage.setItem('selectedPlatform', selectedPlatform)
    } else {
      localStorage.removeItem('selectedPlatform')
    }
  }, [selectedPlatform])

  const clearChat = () => {
    setMessages([])
    localStorage.removeItem('chatHistory')
  }

  return (
    <CDPContext.Provider value={{ selectedPlatform, setSelectedPlatform, clearChat }}>
      {children}
    </CDPContext.Provider>
  )
} 