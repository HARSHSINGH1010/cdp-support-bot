import { ChakraProvider, Box } from '@chakra-ui/react'
import Header from './components/Header'
import ChatInterface from './components/ChatInterface'
import { CDPProvider } from './context/CDPContext'

function App() {
  return (
    <ChakraProvider>
      <CDPProvider>
        <Box minH="100vh" bg="gray.50">
          <Header />
          <ChatInterface />
        </Box>
      </CDPProvider>
    </ChakraProvider>
  )
}

export default App 