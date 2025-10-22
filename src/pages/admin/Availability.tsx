import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { toast } from '../../hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Calendar, Clock, Trash2, Plus } from 'lucide-react'
import { format } from 'date-fns'

interface BlockedSlot {
  id: string
  barber_id: string | null
  start_datetime: string
  end_datetime: string
  reason: string | null
  created_at: string
  barbers?: { name: string } | null
}

interface Barber {
  id: string
  name: string
  title: string
}

export default function Availability() {
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([])
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  const [formData, setFormData] = useState({
    barber_id: 'all',
    block_type: 'full_day',
    date: '',
    start_time: '09:00',
    end_time: '20:00',
    reason: '',
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)

    const { data: slotsData, error: slotsError } = await supabase
      .from('blocked_slots')
      .select(`
        *,
        barbers (name)
      `)
      .order('start_datetime', { ascending: false })

    if (slotsError) {
      console.error('Error fetching blocked slots:', slotsError)
    } else {
      setBlockedSlots(slotsData || [])
    }

    const { data: barbersData, error: barbersError } = await supabase
      .from('barbers')
      .select('id, name, title')
      .eq('is_active', true)

    if (barbersError) {
      console.error('Error fetching barbers:', barbersError)
    } else {
      setBarbers(barbersData || [])
    }

    setLoading(false)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!formData.date) {
      toast({ title: 'Missing date', description: 'Please select a date', variant: 'destructive' })
      return
    }

    setSubmitting(true)

    try {
      let startDatetime: string
      let endDatetime: string

      if (formData.block_type === 'full_day') {
        const date = new Date(formData.date)
        const startDate = new Date(date)
        startDate.setHours(0, 0, 0, 0)
        const endDate = new Date(date)
        endDate.setHours(23, 59, 59, 999)
        startDatetime = startDate.toISOString()
        endDatetime = endDate.toISOString()
      } else {
        const date = new Date(formData.date)
        const [startHours, startMinutes] = formData.start_time.split(':').map(Number)
        const [endHours, endMinutes] = formData.end_time.split(':').map(Number)
        const startDate = new Date(date)
        startDate.setHours(startHours, startMinutes, 0, 0)
        const endDate = new Date(date)
        endDate.setHours(endHours, endMinutes, 0, 0)
        startDatetime = startDate.toISOString()
        endDatetime = endDate.toISOString()
      }

      if (new Date(endDatetime) <= new Date(startDatetime)) {
        toast({ title: 'Invalid time range', description: 'End time must be after start time', variant: 'destructive' })
        setSubmitting(false)
        return
      }

      const { error } = await supabase
        .from('blocked_slots')
        .insert({
          barber_id: formData.barber_id === 'all' ? null : formData.barber_id,
          start_datetime: startDatetime,
          end_datetime: endDatetime,
          reason: formData.reason || null,
        })

      if (error) {
        console.error('Error creating blocked slot:', error)
        toast({ title: 'Error', description: 'Failed to block time slot', variant: 'destructive' })
      } else {
        toast({ title: 'Success', description: 'Time slot blocked successfully' })
        setFormData({
          barber_id: 'all',
          block_type: 'full_day',
          date: '',
          start_time: '09:00',
          end_time: '20:00',
          reason: '',
        })
        setDialogOpen(false)
        fetchData()
      }
    } catch (error) {
      console.error('Error:', error)
      toast({ title: 'Error', description: 'An error occurred', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this block?')) return
    const { error } = await supabase
      .from('blocked_slots')
      .delete()
      .eq('id', id)
    if (error) {
      console.error('Error deleting blocked slot:', error)
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' })
    } else {
      toast({ title: 'Deleted', description: 'Blocked slot removed' })
      fetchData()
    }
  }

  const getBlockDescription = (block: BlockedSlot) => {
    const start = new Date(block.start_datetime)
    const end = new Date(block.end_datetime)
    const isSameDay = start.toDateString() === end.toDateString()
    const isFullDay = start.getHours() === 0 && end.getHours() === 23
    if (isFullDay) {
      return `Full day - ${format(start, 'MMM dd, yyyy')}` 
    } else if (isSameDay) {
      return `${format(start, 'MMM dd, yyyy')} • ${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}` 
    } else {
      return `${format(start, 'MMM dd HH:mm')} - ${format(end, 'MMM dd HH:mm')}` 
    }
  }

  const now = new Date()
  const upcomingBlocks = blockedSlots.filter(b => new Date(b.end_datetime) >= now)
  const pastBlocks = blockedSlots.filter(b => new Date(b.end_datetime) < now)

  return (
    <div className="p-6 min-h-screen">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Availability Management</h2>
          <p className="text-gray-600 mt-1">Block time slots for holidays, breaks, or barber time off</p>
        </div>
        
        <DialogPrimitive.Root modal={false} open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogPrimitive.Trigger asChild onClick={() => setDialogOpen(true)}>
            <Button className="gap-2">
              <Plus size={20} />
              Block Time
            </Button>
          </DialogPrimitive.Trigger>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay
              className="fixed inset-0"
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.6)',
                zIndex: 2147483646,
              }}
            />
            <DialogPrimitive.Content
              onOpenAutoFocus={() => console.log('Dialog content mounted (auto focus)')}
              className="fixed"
              style={{
                position: 'fixed',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 2147483647,
                width: 'min(100%, 640px)',
                background: '#ffffff',
                padding: 24,
                boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                color: '#111827',
              }}
            >
              <div className="flex flex-col space-y-1.5 text-center sm:text-left">
                <DialogPrimitive.Title className="text-lg font-semibold leading-none tracking-tight">
                  Block Time Slot
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="text-sm text-gray-500">
                  Block availability for all barbers or a specific barber
                </DialogPrimitive.Description>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Apply to</Label>
                <select
                  value={formData.barber_id}
                  onChange={(e) => setFormData({ ...formData, barber_id: e.target.value })}
                  className="border rounded-md h-9 px-3 py-2 w-full bg-white text-sm"
                >
                  <option value="all">All Barbers (Shop Closed)</option>
                  {barbers.map((barber) => (
                    <option key={barber.id} value={barber.id}>
                      {barber.name} - {barber.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Block Type</Label>
                <select
                  value={formData.block_type}
                  onChange={(e) => setFormData({ ...formData, block_type: e.target.value })}
                  className="border rounded-md h-9 px-3 py-2 w-full bg-white text-sm"
                >
                  <option value="full_day">Full Day</option>
                  <option value="time_range">Specific Time Range</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>

              {formData.block_type === 'time_range' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Time</Label>
                      <Input
                        type="time"
                        value={formData.start_time}
                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Time</Label>
                      <Input
                        type="time"
                        value={formData.end_time}
                        onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label>Reason (Optional)</Label>
                <Textarea
                  placeholder="e.g., National Holiday, Personal Day, Training..."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <DialogPrimitive.Close asChild>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </DialogPrimitive.Close>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Blocking...' : 'Block Time'}
                </Button>
              </div>
            </form>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Upcoming Blocks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{upcomingBlocks.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Past Blocks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{pastBlocks.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Blocks */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Upcoming Blocked Time</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading...</p>
            </div>
          ) : upcomingBlocks.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">No upcoming blocked time slots</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingBlocks.map((block) => (
                <div
                  key={block.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Calendar className="text-gray-400" size={20} />
                      <span className="font-medium text-gray-900">
                        {getBlockDescription(block)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 ml-8">
                      <span>
                        {block.barber_id ? (
                          <span className="font-medium">{block.barbers?.name}</span>
                        ) : (
                          <span className="font-medium text-red-600">All Barbers (Shop Closed)</span>
                        )}
                      </span>
                      {block.reason && (
                        <>
                          <span>•</span>
                          <span>{block.reason}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(block.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 size={18} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past Blocks */}
      {pastBlocks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Past Blocked Time ({pastBlocks.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {pastBlocks.map((block) => (
                <div
                  key={block.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 opacity-60"
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-700">
                      {getBlockDescription(block)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {block.barber_id ? block.barbers?.name : 'All Barbers'}
                      {block.reason && ` • ${block.reason}`}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(block.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
