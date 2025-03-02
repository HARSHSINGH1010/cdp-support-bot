import { useState, useRef, useEffect } from 'react'
import {
  Box,
  VStack,
  Input,
  InputGroup,
  InputRightElement,
  IconButton,
  Text,
  useToast,
  useColorModeValue,
  Flex,
  SlideFade,
  Avatar,
  Tooltip,
  Badge,
} from '@chakra-ui/react'
import { FiSend, FiCopy, FiCheck } from 'react-icons/fi'
import { motion } from 'framer-motion'
import axios from 'axios'
import { useCDPContext } from '../context/CDPContext'

interface Message {
  content: string
  isUser: boolean
  timestamp: Date
  status?: 'sent' | 'delivered' | 'error'
  id: string
}

const TypingIndicator = () => (
  <Flex gap={1} px={2} py={1} bg="gray.100" borderRadius="full" w="fit-content">
    <motion.div
      animate={{ scale: [1, 1.2, 1] }}
      transition={{ duration: 1, repeat: Infinity }}
      style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'gray' }}
    />
    <motion.div
      animate={{ scale: [1, 1.2, 1] }}
      transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
      style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'gray' }}
    />
    <motion.div
      animate={{ scale: [1, 1.2, 1] }}
      transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
      style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'gray' }}
    />
  </Flex>
)

const API_BASE_URL = import.meta.env.PROD 
  ? 'https://cdp-support-bot-backend.onrender.com/api'  // Production: use deployed backend
  : 'http://localhost:8000/api' // Development: use localhost

const ChatInterface = () => {
  const { selectedPlatform } = useCDPContext()
  const [messages, setMessages] = useState<Message[]>(() => {
    const savedMessages = localStorage.getItem('chatHistory')
    if (savedMessages) {
      const parsedMessages = JSON.parse(savedMessages)
      return parsedMessages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }))
    }
    return []
  })
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const toast = useToast()

  // Load preferences
  const [preferences, setPreferences] = useState(() => {
    const savedPrefs = localStorage.getItem('preferences')
    return savedPrefs ? JSON.parse(savedPrefs) : { autoScroll: true, notifications: true }
  })

  // Update preferences when they change
  useEffect(() => {
    const savedPrefs = localStorage.getItem('preferences')
    if (savedPrefs) {
      setPreferences(JSON.parse(savedPrefs))
    }
  }, [])

  // Save messages to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('chatHistory', JSON.stringify(messages))
  }, [messages])

  // Listen for chat clear events
  useEffect(() => {
    const handleClearChat = () => {
      setMessages([])
    }
    
    // Subscribe to clearChat events
    window.addEventListener('clearChat', handleClearChat)
    
    return () => {
      window.removeEventListener('clearChat', handleClearChat)
    }
  }, [])

  const bgColor = useColorModeValue('gray.50', 'gray.900')
  const botMessageBg = useColorModeValue('white', 'gray.700')
  const botMessageBorder = useColorModeValue('gray.200', 'gray.600')
  const inputBg = useColorModeValue('white', 'gray.800')

  const scrollToBottom = () => {
    if (preferences.autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const copyToClipboard = async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedMessageId(messageId)
      setTimeout(() => setCopiedMessageId(null), 2000)
    } catch (err) {
      toast({
        title: 'Failed to copy',
        status: 'error',
        duration: 2000,
      })
    }
  }

  const handleSend = async () => {
    if (!input.trim()) return

    const messageId = Math.random().toString(36).substring(7)
    const userMessage: Message = {
      content: input,
      isUser: true,
      timestamp: new Date(),
      status: 'sent',
      id: messageId,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const payload = {
        message: input,
        platform: selectedPlatform || 'Other'
      }

      const response = await axios.post(`${API_BASE_URL}/chat`, payload)

      if (!response.data || !response.data.response) {
        throw new Error('Invalid response format from server')
      }

      const botMessage: Message = {
        content: response.data.response,
        isUser: false,
        timestamp: new Date(),
        status: 'delivered',
        id: Math.random().toString(36).substring(7),
      }

      setMessages((prev) => prev.map(msg => 
        msg.id === messageId ? { ...msg, status: 'delivered' as const } : msg
      ))
      
      setTimeout(() => {
        setMessages((prev) => [...prev, botMessage])
      }, 500)

    } catch (error: any) {
      console.error('Error details:', {
        error,
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status
      })
      
      setMessages((prev) => prev.map(msg => 
        msg.id === messageId ? { ...msg, status: 'error' as const } : msg
      ))

      toast({
        title: 'Error',
        description: error?.response?.data?.detail || error?.message || 'Failed to get response',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Box 
      position="relative"
      height="calc(100vh - 64px)"
      display="flex"
      flexDirection="column"
      bg={bgColor}
      width="100%"
      overflow="hidden"
      className="glass-effect"
    >
      <Box 
        flex="1"
        overflowY="auto"
        px={4}
        py={4}
        position="relative"
        css={{
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            width: '10px',
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(128, 128, 128, 0.5)',
            borderRadius: '24px',
          },
        }}
      >
        <VStack 
          spacing={6} 
          align="stretch" 
          width="100%" 
          maxW="900px" 
          mx="auto"
          minH="100%"
          position="relative"
        >
          {messages.map((message) => (
            <SlideFade key={message.id} in={true} offsetY="20px">
              <Flex
                justify={message.isUser ? 'flex-end' : 'flex-start'}
                width="100%"
                mb={2}
                className="message-animation"
              >
                {!message.isUser && (
                  <Avatar
                    size="sm"
                    name="AI Assistant"
                    src="/bot-avatar.png"
                    bg="purple.500"
                    color="white"
                    mr={2}
                  />
                )}
                <Box
                  maxW="80%"
                  p={4}
                  borderRadius="xl"
                  bg={message.isUser ? 'purple.500' : botMessageBg}
                  color={message.isUser ? 'white' : 'inherit'}
                  boxShadow="md"
                  className="message-bubble"
                  position="relative"
                  borderWidth={!message.isUser ? '1px' : '0'}
                  borderColor={botMessageBorder}
                >
                  <Text fontSize="md" whiteSpace="pre-wrap">
                    {message.content}
                  </Text>
                  {!message.isUser && (
                    <Tooltip
                      label={copiedMessageId === message.id ? 'Copied!' : 'Copy message'}
                      placement="top"
                    >
                      <IconButton
                        icon={copiedMessageId === message.id ? <FiCheck /> : <FiCopy />}
                        size="sm"
                        variant="ghost"
                        position="absolute"
                        top={2}
                        right={2}
                        onClick={() => copyToClipboard(message.content, message.id)}
                        color={copiedMessageId === message.id ? 'green.500' : 'gray.500'}
                        _hover={{ bg: 'transparent', color: 'purple.500' }}
                        aria-label="Copy message"
                      />
                    </Tooltip>
                  )}
                  <Text
                    fontSize="xs"
                    color={message.isUser ? 'whiteAlpha.700' : 'gray.500'}
                    mt={2}
                  >
                    {message.timestamp.toLocaleTimeString()}
                    {message.isUser && (
                      <Badge
                        ml={2}
                        colorScheme={
                          message.status === 'delivered'
                            ? 'green'
                            : message.status === 'error'
                            ? 'red'
                            : 'gray'
                        }
                        variant="subtle"
                        fontSize="xx-small"
                      >
                        {message.status}
                      </Badge>
                    )}
                  </Text>
                </Box>
                {message.isUser && (
                  <Avatar
                    size="sm"
                    name="User"
                    ml={2}
                    bg="blue.500"
                    color="white"
                  />
                )}
              </Flex>
            </SlideFade>
          ))}
          {isLoading && (
            <Flex justify="flex-start" width="100%" mb={2}>
              <Box
                p={4}
                borderRadius="xl"
                bg={botMessageBg}
                borderWidth="1px"
                borderColor={botMessageBorder}
                className="message-bubble"
              >
                <TypingIndicator />
              </Box>
            </Flex>
          )}
          <div ref={messagesEndRef} />
        </VStack>
      </Box>

      <Box
        p={4}
        borderTopWidth="1px"
        borderColor={botMessageBorder}
        bg={useColorModeValue('white', 'gray.800')}
        className="glass-effect"
      >
        <Flex maxW="900px" mx="auto">
          <InputGroup size="lg">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your message..."
              bg={inputBg}
              borderRadius="full"
              pr="4.5rem"
              className="chat-input"
              _focus={{
                borderColor: 'purple.500',
                boxShadow: '0 0 0 1px purple.500',
              }}
            />
            <InputRightElement width="4.5rem">
              <IconButton
                h="1.75rem"
                size="sm"
                icon={<FiSend />}
                onClick={handleSend}
                isLoading={isLoading}
                colorScheme="purple"
                variant="ghost"
                _hover={{ bg: 'purple.50' }}
                aria-label="Send message"
              />
            </InputRightElement>
          </InputGroup>
        </Flex>
      </Box>
    </Box>
  )
}

export default ChatInterface 