import React from 'react'
import { 
  Box, 
  Flex, 
  Heading, 
  Select, 
  IconButton, 
  useColorMode,
  useColorModeValue,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Button,
  useToast,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Switch,
  VStack,
} from '@chakra-ui/react'
import { FiMoon, FiSun, FiSettings } from 'react-icons/fi'
import { useCDPContext } from '../context/CDPContext'

interface PreferencesProps {
  isOpen: boolean
  onClose: () => void
}

const PreferencesModal = ({ isOpen, onClose }: PreferencesProps) => {
  const [autoScroll, setAutoScroll] = React.useState(true)
  const [notifications, setNotifications] = React.useState(true)
  const toast = useToast()

  const handleSave = () => {
    // Save preferences to localStorage
    localStorage.setItem('preferences', JSON.stringify({ autoScroll, notifications }))
    toast({
      title: 'Preferences saved',
      status: 'success',
      duration: 2000,
    })
    onClose()
  }

  React.useEffect(() => {
    // Load saved preferences
    const savedPrefs = localStorage.getItem('preferences')
    if (savedPrefs) {
      const { autoScroll: saved_autoScroll, notifications: saved_notifications } = JSON.parse(savedPrefs)
      setAutoScroll(saved_autoScroll)
      setNotifications(saved_notifications)
    }
  }, [])

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Preferences</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <FormControl display="flex" alignItems="center">
              <FormLabel mb="0">Auto-scroll to new messages</FormLabel>
              <Switch isChecked={autoScroll} onChange={(e) => setAutoScroll(e.target.checked)} />
            </FormControl>
            <FormControl display="flex" alignItems="center">
              <FormLabel mb="0">Show notifications</FormLabel>
              <Switch isChecked={notifications} onChange={(e) => setNotifications(e.target.checked)} />
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>Cancel</Button>
          <Button colorScheme="blue" onClick={handleSave}>Save</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

const Header = () => {
  const { selectedPlatform, setSelectedPlatform, clearChat } = useCDPContext()
  const { colorMode, toggleColorMode } = useColorMode()
  const bgColor = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.700')
  const textColor = useColorModeValue('blue.600', 'blue.200')
  const selectBg = useColorModeValue('white', 'gray.700')
  const toast = useToast()
  const { isOpen, onOpen, onClose } = useDisclosure()

  const platforms = [
    'Segment',
    'mParticle',
    'Lytics',
    'Zeotap',
    'Adobe',
    'Tealium',
    'Treasure Data',
    'Other'
  ]

  const handleClearChat = () => {
    clearChat()
    window.dispatchEvent(new Event('clearChat'))
    toast({
      title: 'Chat cleared',
      status: 'info',
      duration: 2000,
    })
  }

  const handleExportChat = () => {
    // Get chat history from localStorage or state
    const messages = localStorage.getItem('chatHistory')
    if (!messages || JSON.parse(messages).length === 0) {
      toast({
        title: 'No messages to export',
        status: 'warning',
        duration: 2000,
      })
      return
    }

    // Create file content
    const content = JSON.parse(messages).map((msg: any) => 
      `${msg.isUser ? 'User' : 'Bot'} (${new Date(msg.timestamp).toLocaleString()}): ${msg.content}`
    ).join('\n\n')

    // Create and download file
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chat-export-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: 'Chat exported successfully',
      status: 'success',
      duration: 2000,
    })
  }

  return (
    <Box 
      bg={bgColor} 
      borderBottom="1px" 
      borderColor={borderColor} 
      py={4} 
      px={8} 
      position="sticky" 
      top={0} 
      zIndex={100}
      h="64px"
      width="100%"
    >
      <Flex justify="space-between" align="center" maxW="container.lg" mx="auto">
        <Heading size="lg" color={textColor}>CDP Support Assistant</Heading>
        
        <Flex gap={4} align="center">
          <Select
            placeholder="Select CDP Platform"
            maxW="200px"
            value={selectedPlatform || ''}
            onChange={(e) => {
              const value = e.target.value || null
              setSelectedPlatform(value)
              localStorage.setItem('selectedPlatform', value || '')
            }}
            bg={selectBg}
            _hover={{ bg: selectBg }}
            zIndex={101}
          >
            {platforms.map((platform) => (
              <option key={platform} value={platform}>
                {platform}
              </option>
            ))}
          </Select>

          <IconButton
            aria-label="Toggle dark mode"
            icon={colorMode === 'dark' ? <FiSun /> : <FiMoon />}
            onClick={toggleColorMode}
            variant="ghost"
            _hover={{ bg: useColorModeValue('gray.100', 'gray.700') }}
          />

          <Menu>
            <MenuButton
              as={IconButton}
              aria-label="Settings"
              icon={<FiSettings />}
              variant="ghost"
              _hover={{ bg: useColorModeValue('gray.100', 'gray.700') }}
            />
            <MenuList zIndex={102}>
              <MenuItem onClick={onOpen}>Preferences</MenuItem>
              <MenuItem onClick={handleClearChat}>Clear Chat</MenuItem>
              <MenuItem onClick={handleExportChat}>Export Chat</MenuItem>
            </MenuList>
          </Menu>
        </Flex>
      </Flex>

      <PreferencesModal isOpen={isOpen} onClose={onClose} />
    </Box>
  )
}

export default Header 