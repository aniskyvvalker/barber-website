import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
 
// Button not used in this page
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'
import { Calendar, Search, Check, Plus, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from '../../hooks/use-toast'

interface Appointment {
  id: string
  customer_name: string
  customer_email: string
  customer_phone: string
  appointment_date: string
  appointment_time: string
  status: string
  customer_message: string | null
  barber_id: string
  service_id: string
  barbers: { name: string } | null
  services: { name: string; price: number } | null
}

export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')

  const compareAppointments = (a: Appointment, b: Appointment) => {
    // Desc by date, then desc by time, then by id to stabilize
    const ad = a.appointment_date.localeCompare(b.appointment_date)
    if (ad !== 0) return -ad
    const at = a.appointment_time.localeCompare(b.appointment_time)
    if (at !== 0) return -at
    return a.id.localeCompare(b.id)
  }

  useEffect(() => {
    fetchAppointments(false)
    const noShowInterval = setInterval(() => {
      checkAndMarkNoShows()
    }, 60000)
    const refreshInterval = setInterval(() => {
      fetchAppointments(true)
    }, 15000)
    return () => {
      clearInterval(noShowInterval)
      clearInterval(refreshInterval)
    }
  }, [])

  const fetchAppointments = async (silent: boolean = false) => {
    if (!silent) setLoading(true)
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        barbers (name),
        services (name, price)
      `)
      .order('appointment_date', { ascending: false })
      .order('appointment_time', { ascending: false })

    if (error) {
      console.error('Error fetching appointments:', error)
    } else {
      const sorted = (data || []).slice().sort(compareAppointments)
      setAppointments(sorted)
    }
    if (!silent) setLoading(false)
  }

  const checkAndMarkNoShows = async () => {
    const now = new Date()
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60000)
    const today = now.toISOString().split('T')[0]
    const timeThreshold = `${fifteenMinutesAgo.getHours().toString().padStart(2, '0')}:${fifteenMinutesAgo.getMinutes().toString().padStart(2, '0')}:00`

    const { data: overdueAppointments } = await supabase
      .from('appointments')
      .select('id, appointment_date, appointment_time')
      .eq('status', 'pending')
      .lte('appointment_date', today)

    if (overdueAppointments) {
      for (const apt of overdueAppointments) {
        const aptDateTime = new Date(`${apt.appointment_date}T${apt.appointment_time}`)
        const fifteenMinutesAfter = new Date(aptDateTime.getTime() + 15 * 60000)
        if (now > fifteenMinutesAfter) {
          await supabase
            .from('appointments')
            .update({ status: 'no_show' })
            .eq('id', apt.id)
        }
      }
      fetchAppointments(true)
    }
  }

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    const { error } = await supabase
      .from('appointments')
      .update({ 
        status: newStatus,
        ...(newStatus === 'checked_in' && { checked_in_at: new Date().toISOString() }),
        ...(newStatus === 'cancelled' && { cancelled_at: new Date().toISOString() }),
      })
      .eq('id', appointmentId)

    if (error) {
      console.error('Error updating status:', error)
      toast({ title: 'Error', description: 'Failed to update appointment status', variant: 'destructive' })
    } else {
      // Optimistically update local state in place to prevent row jumping
      setAppointments(prev => {
        const next = prev.map(a => a.id === appointmentId ? { ...a, status: newStatus } : a)
        return next
      })
      toast({ title: 'Success', description: `Appointment status changed to ${newStatus.replace('_', ' ')}` })
      // Background refresh will reconcile periodically; no immediate resort
    }
  }

  const getStatusLabel = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'pending':
        return { backgroundColor: '#bfdbfe', color: '#1e3a8a', borderColor: '#60a5fa' } // blue-200 / blue-900 / blue-400
      case 'checked_in':
        return { backgroundColor: '#bbf7d0', color: '#14532d', borderColor: '#4ade80' } // green-200 / green-900 / green-400
      case 'cancelled':
        return { backgroundColor: '#fecaca', color: '#7f1d1d', borderColor: '#f87171' } // red-200 / red-900 / red-400
      case 'no_show':
        return { backgroundColor: '#d1d5db', color: '#111827', borderColor: '#9ca3af' } // gray-300 / gray-900 / gray-400
      default:
        return { backgroundColor: '#e5e7eb', color: '#111827', borderColor: '#9ca3af' } // gray-200 / gray-900 / gray-400
    }
  }

  const filteredAppointments = appointments.filter(apt => {
    const searchMatch = 
      apt.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.customer_phone.includes(searchTerm) ||
      apt.customer_email.toLowerCase().includes(searchTerm.toLowerCase())
    if (!searchMatch) return false
    if (statusFilter !== 'all' && apt.status !== statusFilter) return false
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const aptDate = new Date(apt.appointment_date); aptDate.setHours(0, 0, 0, 0)
    if (dateFilter === 'today' && aptDate.getTime() !== today.getTime()) return false
    if (dateFilter === 'upcoming' && aptDate < today) return false
    if (dateFilter === 'past' && aptDate >= today) return false
    return true
  })

  const todayCount = appointments.filter(apt => {
    const today = new Date().toISOString().split('T')[0]
    return apt.appointment_date === today && apt.status !== 'cancelled'
  }).length

  const upcomingCount = appointments.filter(apt => {
    const today = new Date().toISOString().split('T')[0]
    return apt.appointment_date >= today && apt.status === 'pending'
  }).length

  const pendingCheckIn = appointments.filter(apt => {
    const today = new Date().toISOString().split('T')[0]
    return apt.appointment_date === today && apt.status === 'pending'
  }).length

  const handlePermanentDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id)
      if (error) {
        toast({ title: 'Delete failed', description: error.message, variant: 'destructive' })
        return
      }
      setAppointments(prev => prev.filter(a => a.id !== id))
      toast({ title: 'Appointment deleted', description: 'The appointment was permanently removed.' })
    } catch (e: any) {
      toast({ title: 'Delete failed', description: e?.message || 'Unknown error', variant: 'destructive' })
    }
  }

  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id?: string }>({ open: false })

  return (
    <div className="p-6 min-h-screen">
      

      {confirmDelete.open && (
        <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 2147483647 }}>
          <div className="absolute inset-0 bg-black/70" onClick={() => setConfirmDelete({ open: false, id: undefined })} />
          <div
            className="relative rounded-lg border bg-white p-6 md:p-7 shadow-lg"
            style={{ backgroundColor: '#ffffff', zIndex: 2147483648, width: 'min(90vw, 560px)' }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="mb-5 text-center">
              <h3 className="text-xl font-black text-center leading-tight" style={{ fontWeight: 900, marginBottom: '10px' }}>Delete appointment?</h3>
              <p className="text-sm text-gray-600 text-center font-bold" style={{ marginTop: '15px' }}>
                This action cannot be undone.<br />
                Deleting this appointment will immediately cancel it in the system and an email notification will be sent to the customer informing them of the cancellation.
              </p>
            </div>
            <div className="flex justify-center gap-2 mt-6">
              <Button variant="outline" onClick={() => setConfirmDelete({ open: false, id: undefined })}>Keep Appointment</Button>
              <Button className="admin-cancel-btn" onClick={() => {
                if (confirmDelete.id) {
                  handlePermanentDelete(confirmDelete.id)
                }
                setConfirmDelete({ open: false, id: undefined })
              }}>Delete</Button>
            </div>
          </div>
        </div>
      )}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">Appointments</h2>
        <Button className="admin-primary-btn h-10 px-4 rounded-md outline-none focus:outline-none ring-0 focus:ring-0 focus-visible:ring-0 ring-offset-0 focus-visible:ring-offset-0 transition-colors">
          <Plus className="h-4 w-4 mr-2" />
          New Appointment
        </Button>
      </div>

      <div className="mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 md:flex-[3] min-w-0">
            <div className="relative">
              <Input
                placeholder="🔍 Search by name, phone, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                type="text"
                className="pl-3 h-12 w-full text-base text-gray-600 placeholder:text-gray-400 border border-gray-300 rounded-md bg-white outline-none focus:outline-none ring-0 focus:ring-0 focus-visible:ring-0 ring-offset-0 focus-visible:ring-offset-0 hover:border-gray-300 focus:border-gray-400"
                style={{ backgroundColor: '#ffffff' }}
              />
            </div>
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="admin-filter-trigger w-28 md:w-28 shrink-0 border border-gray-300 rounded-md bg-white outline-none focus:outline-none ring-0 focus:ring-0 focus-visible:ring-0 ring-offset-0 focus-visible:ring-offset-0 data-[state=open]:ring-0 data-[state=open]:ring-offset-0 hover:border-gray-300 focus:border-gray-400" style={{ backgroundColor: '#ffffff' }}>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="admin-status-menu rounded-md border border-gray-200 bg-white text-gray-900 shadow-md p-0 min-w-[180px]">
              <SelectItem value="all" className="px-3 py-2 text-sm bg-white hover:bg-gray-50 focus:bg-gray-50 data-[highlighted]:bg-gray-50 data-[state=checked]:bg-gray-100 data-[state=checked]:font-medium cursor-pointer border-0 hover:border-0 focus:border-0 outline-none focus:outline-none ring-0 focus:ring-0 focus-visible:ring-0">All Statuses</SelectItem>
              <SelectItem value="pending" className="px-3 py-2 text-sm bg-white hover:bg-gray-50 focus:bg-gray-50 data-[highlighted]:bg-gray-50 data-[state=checked]:bg-gray-100 data-[state=checked]:font-medium cursor-pointer border-0 hover:border-0 focus:border-0 outline-none focus:outline-none ring-0 focus:ring-0 focus-visible:ring-0">Pending</SelectItem>
              <SelectItem value="checked_in" className="px-3 py-2 text-sm bg-white hover:bg-gray-50 focus:bg-gray-50 data-[highlighted]:bg-gray-50 data-[state=checked]:bg-gray-100 data-[state=checked]:font-medium cursor-pointer border-0 hover:border-0 focus:border-0 outline-none focus:outline-none ring-0 focus:ring-0 focus-visible:ring-0">Checked In</SelectItem>
              <SelectItem value="no_show" className="px-3 py-2 text-sm bg-white hover:bg-gray-50 focus:bg-gray-50 data-[highlighted]:bg-gray-50 data-[state=checked]:bg-gray-100 data-[state=checked]:font-medium cursor-pointer border-0 hover:border-0 focus:border-0 outline-none focus:outline-none ring-0 focus:ring-0 focus-visible:ring-0">No Show</SelectItem>
              <SelectItem value="cancelled" className="px-3 py-2 text-sm bg-white hover:bg-gray-50 focus:bg-gray-50 data-[highlighted]:bg-gray-50 data-[state=checked]:bg-gray-100 data-[state=checked]:font-medium cursor-pointer border-0 hover:border-0 focus:border-0 outline-none focus:outline-none ring-0 focus:ring-0 focus-visible:ring-0">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="admin-filter-trigger w-28 md:w-28 shrink-0 border border-gray-300 rounded-md bg-white outline-none focus:outline-none ring-0 focus:ring-0 focus-visible:ring-0 ring-offset-0 focus-visible:ring-offset-0 data-[state=open]:ring-0 data-[state=open]:ring-offset-0 hover:border-gray-300 focus:border-gray-400" style={{ backgroundColor: '#ffffff' }}>
              <SelectValue placeholder="Filter by date" />
            </SelectTrigger>
            <SelectContent className="admin-status-menu rounded-md border border-gray-200 bg-white text-gray-900 shadow-md p-0 min-w-[180px]">
              <SelectItem value="all" className="px-3 py-2 text-sm bg-white hover:bg-gray-50 focus:bg-gray-50 data-[highlighted]:bg-gray-50 data-[state=checked]:bg-gray-100 data-[state=checked]:font-medium cursor-pointer border-0 hover:border-0 focus:border-0 outline-none focus:outline-none ring-0 focus:ring-0 focus-visible:ring-0">All Dates</SelectItem>
              <SelectItem value="today" className="px-3 py-2 text-sm bg-white hover:bg-gray-50 focus:bg-gray-50 data-[highlighted]:bg-gray-50 data-[state=checked]:bg-gray-100 data-[state=checked]:font-medium cursor-pointer border-0 hover:border-0 focus:border-0 outline-none focus:outline-none ring-0 focus:ring-0 focus-visible:ring-0">Today</SelectItem>
              <SelectItem value="upcoming" className="px-3 py-2 text-sm bg-white hover:bg-gray-50 focus:bg-gray-50 data-[highlighted]:bg-gray-50 data-[state=checked]:bg-gray-100 data-[state=checked]:font-medium cursor-pointer border-0 hover:border-0 focus:border-0 outline-none focus:outline-none ring-0 focus:ring-0 focus-visible:ring-0">Upcoming</SelectItem>
              <SelectItem value="past" className="px-3 py-2 text-sm bg-white hover:bg-gray-50 focus:bg-gray-50 data-[highlighted]:bg-gray-50 data-[state=checked]:bg-gray-100 data-[state=checked]:font-medium cursor-pointer border-0 hover:border-0 focus:border-0 outline-none focus:outline-none ring-0 focus:ring-0 focus-visible:ring-0">Past</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <Card>
          <CardHeader className="py-1">
            <CardTitle className="font-medium text-gray-600" style={{ fontSize: '1.2rem', lineHeight: 1.3 }}>Today's Appointments</CardTitle>
          </CardHeader>
          <CardContent className="py-1">
            <p className="font-bold text-gray-900" style={{ fontSize: '2.5rem', lineHeight: 1 }}>
              {todayCount}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-1">
            <CardTitle className="font-medium text-gray-600" style={{ fontSize: '1.2rem', lineHeight: 1.3 }}>Upcoming</CardTitle>
          </CardHeader>
          <CardContent className="py-1">
            <p className="font-bold text-gray-900" style={{ fontSize: '2.5rem', lineHeight: 1 }}>
              {upcomingCount}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-1">
            <CardTitle className="font-medium text-gray-600" style={{ fontSize: '1.2rem', lineHeight: 1.3 }}>Pending Check-in</CardTitle>
          </CardHeader>
          <CardContent className="py-1">
            <p className="font-bold text-gray-900" style={{ fontSize: '2.5rem', lineHeight: 1 }}>
              {pendingCheckIn}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="admin-appointments-card">
        <CardContent className="p-0" style={{ padding: 0 }}>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading appointments...</p>
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">No appointments found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="appointments-table w-full text-center">
                <thead>
                  <tr className="border-b">
                    <th className="text-center py-3 px-4 font-medium text-gray-700" style={{ textAlign: 'center' }}>Date & Time</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700" style={{ textAlign: 'center' }}>Customer</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700" style={{ textAlign: 'center' }}>Service</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700" style={{ textAlign: 'center' }}>Barber</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700" style={{ textAlign: 'center' }}>Status</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700" style={{ textAlign: 'center' }}>Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAppointments.map((apt) => (
                    <tr key={apt.id} className="border-b hover:bg-gray-50">
                      <td className="py-4 px-4 text-center" style={{ textAlign: 'center' }}>
                        <div className="w-max mx-auto text-center">
                          <span className="font-medium text-gray-900">
                            {format(new Date(apt.appointment_date), 'MMM dd, yyyy')}
                          </span>
                          <span className="text-gray-500">, {apt.appointment_time.slice(0, 5)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center" style={{ textAlign: 'center' }}>
                        <div className="w-max mx-auto text-center">
                          <div className="font-medium text-gray-900">{apt.customer_name}</div>
                          <div className="text-sm text-gray-500">{apt.customer_phone}</div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center" style={{ textAlign: 'center' }}>
                        <div className="w-max mx-auto text-center">
                          <div className="text-gray-900">{apt.services?.name}</div>
                          <div className="text-sm text-gray-500">{'$'}{apt.services?.price}</div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center text-gray-900" style={{ textAlign: 'center' }}>
                        <div className="w-max mx-auto text-center">
                          <span className="inline-block">
                            {apt.barbers?.name || 'Not assigned'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center" style={{ textAlign: 'center' }}>
                        <div className="inline-flex items-center justify-center w-full">
                          {(() => {
                            return (
                              <Select value={apt.status} onValueChange={(value) => handleStatusChange(apt.id, value as any)}>
                                <SelectTrigger className="inline-flex w-auto border-0 bg-transparent p-0 mx-auto cursor-pointer outline-none focus:outline-none ring-0 focus:ring-0 focus-visible:ring-0 ring-offset-0 focus-visible:ring-offset-0 shadow-none data-[state=open]:ring-0 data-[state=open]:ring-offset-0">
                                  <span
                                    className={`px-3 py-1 rounded-full text-xs font-medium border"`}
                                    style={getStatusStyle(apt.status)}
                                  >
                                    {getStatusLabel(apt.status)}
                                  </span>
                                </SelectTrigger>
                                <SelectContent className="admin-status-menu rounded-md border border-gray-200 bg-white text-gray-900 shadow-md p-0 min-w-[160px]">
                                  <SelectItem
                                    value="pending"
                                    className="px-3 py-2 text-sm bg-white hover:bg-gray-50 focus:bg-gray-50 data-[highlighted]:bg-gray-50 data-[state=checked]:bg-gray-100 data-[state=checked]:font-medium cursor-pointer border-0 hover:border-0 focus:border-0 outline-none focus:outline-none ring-0 focus:ring-0 focus-visible:ring-0"
                                  >
                                    Pending
                                  </SelectItem>
                                  <SelectItem
                                    value="cancelled"
                                    className="px-3 py-2 text-sm bg-white hover:bg-gray-50 focus:bg-gray-50 data-[highlighted]:bg-gray-50 data-[state=checked]:bg-gray-100 data-[state=checked]:font-medium cursor-pointer border-0 hover:border-0 focus:border-0 outline-none focus:outline-none ring-0 focus:ring-0 focus-visible:ring-0"
                                  >
                                    Cancelled
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center" style={{ textAlign: 'center' }}>
                        <Button
                          className="admin-cancel-btn h-8 px-3 text-xs outline-none focus:outline-none ring-0 focus:ring-0 focus-visible:ring-0"
                          onClick={() => {
                            if (apt.status === 'cancelled') {
                              handlePermanentDelete(apt.id)
                            } else {
                              setConfirmDelete({ open: true, id: apt.id })
                            }
                          }}
                        >
                          <Trash2 size={12} className="mr-1.5" aria-hidden="true" />
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
