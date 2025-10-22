import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'
import { MessageSquare, Search, Mail, MailOpen, Trash2 } from 'lucide-react'
import { format } from 'date-fns'

interface Message {
  id: string
  customer_name: string
  customer_email: string
  customer_phone: string | null
  message: string
  is_read: boolean
  created_at: string
  appointment_id: string | null
}

interface AppointmentMessage {
  id: string
  customer_name: string
  customer_email: string
  customer_phone: string
  customer_message: string
  appointment_date: string
  appointment_time: string
  created_at: string
  services: { name: string } | null
}

export default function Messages() {
  const [contactMessages, setContactMessages] = useState<Message[]>([])
  const [appointmentMessages, setAppointmentMessages] = useState<AppointmentMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all') // all, contact, appointment
  const [filterRead, setFilterRead] = useState('all') // all, read, unread
  const [selectedMessage, setSelectedMessage] = useState<(Message | (AppointmentMessage & { type: 'appointment' })) | null>(null)

  useEffect(() => {
    fetchMessages()
  }, [])

  const fetchMessages = async () => {
    setLoading(true)

    const { data: contactData, error: contactError } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })

    if (contactError) {
      console.error('Error fetching contact messages:', contactError)
    } else {
      setContactMessages(contactData || [])
    }

    const { data: appointmentData, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        id,
        customer_name,
        customer_email,
        customer_phone,
        customer_message,
        appointment_date,
        appointment_time,
        created_at,
        services (name)
      `)
      .not('customer_message', 'is', null)
      .order('created_at', { ascending: false })

    if (appointmentError) {
      console.error('Error fetching appointment messages:', appointmentError)
    } else {
      setAppointmentMessages(appointmentData || [])
    }

    setLoading(false)
  }

  const handleMarkAsRead = async (id: string) => {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('id', id)

    if (error) {
      console.error('Error marking as read:', error)
      alert('Failed to mark as read')
    } else {
      fetchMessages()
      if (selectedMessage && 'is_read' in selectedMessage && selectedMessage.id === id) {
        setSelectedMessage({ ...selectedMessage, is_read: true } as Message)
      }
    }
  }

  const handleMarkAsUnread = async (id: string) => {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: false })
      .eq('id', id)

    if (error) {
      console.error('Error marking as unread:', error)
      alert('Failed to mark as unread')
    } else {
      fetchMessages()
      if (selectedMessage && 'is_read' in selectedMessage && selectedMessage.id === id) {
        setSelectedMessage({ ...selectedMessage, is_read: false } as Message)
      }
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return

    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting message:', error)
      alert('Failed to delete message')
    } else {
      fetchMessages()
      if (selectedMessage && selectedMessage.id === id) {
        setSelectedMessage(null)
      }
    }
  }

  const allMessages = [
    ...contactMessages.map(m => ({ ...m, type: 'contact' as const })),
    ...appointmentMessages.map(m => ({ ...m, type: 'appointment' as const, message: m.customer_message, is_read: true }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const filteredMessages = allMessages.filter(msg => {
    const searchMatch = 
      msg.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.message.toLowerCase().includes(searchTerm.toLowerCase())

    if (!searchMatch) return false

    if (filterType === 'contact' && msg.type !== 'contact') return false
    if (filterType === 'appointment' && msg.type !== 'appointment') return false

    if (msg.type === 'contact') {
      if (filterRead === 'read' && !msg.is_read) return false
      if (filterRead === 'unread' && msg.is_read) return false
    }

    return true
  })

  const unreadCount = contactMessages.filter(m => !m.is_read).length

  return (
    <div className="p-6 min-h-screen">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Messages</h2>
        <p className="text-gray-600 mt-1">View and manage customer messages</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{allMessages.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Unread</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{unreadCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">From Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{appointmentMessages.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  placeholder="Search messages..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Messages</SelectItem>
                <SelectItem value="contact">Contact Form</SelectItem>
                <SelectItem value="appointment">Appointment Notes</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterRead} onValueChange={setFilterRead}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Messages List and Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Messages List */}
        <Card>
          <CardHeader>
            <CardTitle>Messages ({filteredMessages.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Loading messages...</p>
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500">No messages found</p>
              </div>
            ) : (
              <div className="divide-y max-h-[600px] overflow-y-auto">
                {filteredMessages.map((msg) => (
                  <div
                    key={`${msg.type}-${msg.id}`}
                    onClick={() => setSelectedMessage(msg as any)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedMessage?.id === msg.id ? 'bg-blue-50' : ''
                    } ${msg.type === 'contact' && !('is_read' in msg) ? '' : (msg as any).is_read === false ? 'bg-blue-50/30' : ''}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{msg.customer_name}</h3>
                        {msg.type === 'contact' && (msg as any).is_read === false && (
                          <Badge variant="default" className="text-xs">New</Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {msg.type === 'contact' ? 'Contact' : 'Appointment'}
                        </Badge>
                      </div>
                      <span className="text-xs text-gray-500">
                        {format(new Date(msg.created_at), 'MMM dd, HH:mm')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{msg.message}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Message Detail */}
        <Card>
          <CardHeader>
            <CardTitle>Message Details</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedMessage ? (
              <div>
                <div className="mb-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{selectedMessage.customer_name}</h3>
                      <p className="text-sm text-gray-600">{selectedMessage.customer_email}</p>
                      {'customer_phone' in selectedMessage && selectedMessage.customer_phone && (
                        <p className="text-sm text-gray-600">{selectedMessage.customer_phone}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {'is_read' in selectedMessage && (
                        <>
                          {(selectedMessage as Message).is_read ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkAsUnread(selectedMessage.id)}
                            >
                              <Mail size={16} className="mr-2" />
                              Mark Unread
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkAsRead(selectedMessage.id)}
                            >
                              <MailOpen size={16} className="mr-2" />
                              Mark Read
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(selectedMessage.id)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 mb-4">
                    <Badge variant="outline">
                      {'type' in selectedMessage && selectedMessage.type === 'contact' ? 'Contact Form' : 'Appointment Note'}
                    </Badge>
                    <Badge variant="outline">
                      {format(new Date(selectedMessage.created_at), 'MMM dd, yyyy HH:mm')}
                    </Badge>
                  </div>

                  {'type' in selectedMessage && (selectedMessage as any).type === 'appointment' && 'appointment_date' in selectedMessage && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-700">Related Appointment</p>
                      <p className="text-sm text-gray-600">
                        {(selectedMessage as any).services?.name} - {format(new Date((selectedMessage as any).appointment_date), 'MMM dd, yyyy')} at {(selectedMessage as any).appointment_time.slice(0, 5)}
                      </p>
                    </div>
                  )}

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-800 whitespace-pre-wrap">{('message' in selectedMessage) ? (selectedMessage as any).message : ''}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Contact Customer</h4>
                  <div className="space-y-2">
                    <a
                      href={`mailto:${selectedMessage.customer_email}`}
                      className="block text-blue-600 hover:underline text-sm"
                    >
                      Send Email: {selectedMessage.customer_email}
                    </a>
                    {'customer_phone' in selectedMessage && selectedMessage.customer_phone && (
                      <a
                        href={`tel:${selectedMessage.customer_phone}`}
                        className="block text-blue-600 hover:underline text-sm"
                      >
                        Call: {selectedMessage.customer_phone}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                Select a message to view details
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
