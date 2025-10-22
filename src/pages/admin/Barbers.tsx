import { useEffect, useState } from 'react'
import type React from 'react'
import { supabase } from '../../lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { toast } from '../../hooks/use-toast'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Badge } from '../../components/ui/badge'
import { Users, Plus, Edit, Trash2, UserCheck, UserX, Clock } from 'lucide-react'

interface Barber {
  id: string
  name: string
  title: string
  photo_url: string | null
  is_active: boolean
  created_at: string
}

interface BarberSchedule {
  id: string
  barber_id: string
  day_of_week: number
  is_working: boolean
  start_time: string | null
  end_time: string | null
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function Barbers() {
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null)
  const [selectedBarberForSchedule, setSelectedBarberForSchedule] = useState<string | null>(null)
  const [barberSchedules, setBarberSchedules] = useState<BarberSchedule[]>([])
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    title: '',
    photo_url: '',
  })

  useEffect(() => {
    fetchBarbers()
  }, [])

  const fetchBarbers = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('barbers')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching barbers:', error)
    } else {
      setBarbers(data || [])
    }
    setLoading(false)
  }

  const fetchBarberSchedule = async (barberId: string) => {
    const { data, error } = await supabase
      .from('barber_schedules')
      .select('*')
      .eq('barber_id', barberId)
      .order('day_of_week')

    if (error) {
      console.error('Error fetching schedule:', error)
      return [] as BarberSchedule[]
    }
    return (data || []) as BarberSchedule[]
  }

  const handleOpenScheduleDialog = async (barberId: string) => {
    setSelectedBarberForSchedule(barberId)
    const schedules = await fetchBarberSchedule(barberId)
    setBarberSchedules(schedules)
    console.log('Setting scheduleDialogOpen to true')
    setScheduleDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.title) {
      toast({ title: 'Missing fields', description: 'Please fill in all required fields', variant: 'destructive' })
      return
    }

    setSubmitting(true)

    try {
      if (editingBarber) {
        const { error } = await supabase
          .from('barbers')
          .update({
            name: formData.name,
            title: formData.title,
            photo_url: formData.photo_url || null,
          })
          .eq('id', editingBarber.id)

        if (error) throw error
      } else {
        const { data: newBarber, error } = await supabase
          .from('barbers')
          .insert({
            name: formData.name,
            title: formData.title,
            photo_url: formData.photo_url || null,
            is_active: true,
          })
          .select()
          .single()

        if (error) throw error

        if (newBarber) {
          const defaultSchedules: Omit<BarberSchedule, 'id'>[] = []
          for (let day = 0; day <= 6; day++) {
            if (day === 5) {
              defaultSchedules.push({
                barber_id: newBarber.id,
                day_of_week: day,
                is_working: true,
                start_time: '14:00:00',
                end_time: '20:00:00',
              })
            } else {
              defaultSchedules.push({
                barber_id: newBarber.id,
                day_of_week: day,
                is_working: true,
                start_time: '10:00:00',
                end_time: '20:00:00',
              })
            }
          }

          await supabase.from('barber_schedules').insert(defaultSchedules)
        }
      }

      setFormData({ name: '', title: '', photo_url: '' })
      setEditingBarber(null)
      setDialogOpen(false)
      fetchBarbers()
    } catch (error) {
      console.error('Error saving barber:', error)
      toast({ title: 'Error', description: 'Failed to save barber', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (barber: Barber) => {
    setEditingBarber(barber)
    setFormData({
      name: barber.name,
      title: barber.title,
      photo_url: barber.photo_url || '',
    })
    setDialogOpen(true)
  }

  const handleToggleActive = async (barber: Barber) => {
    const { error } = await supabase
      .from('barbers')
      .update({ is_active: !barber.is_active })
      .eq('id', barber.id)

    if (error) {
      console.error('Error toggling barber status:', error)
      toast({ title: 'Error', description: 'Failed to update barber status', variant: 'destructive' })
    } else {
      toast({ title: 'Success', description: 'Barber status updated' })
      fetchBarbers()
    }
  }

  const handleDelete = async (barber: Barber) => {
    if (!confirm(`Are you sure you want to delete ${barber.name}? This will also delete their schedule and may affect existing appointments.`)) {
      return
    }

    const { error } = await supabase
      .from('barbers')
      .delete()
      .eq('id', barber.id)

    if (error) {
      console.error('Error deleting barber:', error)
      toast({ title: 'Error', description: 'Failed to delete barber', variant: 'destructive' })
    } else {
      toast({ title: 'Deleted', description: 'Barber deleted successfully' })
      fetchBarbers()
    }
  }

  const handleUpdateSchedule = async (dayOfWeek: number, field: string, value: any) => {
    const scheduleIndex = barberSchedules.findIndex(s => s.day_of_week === dayOfWeek)
    
    if (scheduleIndex >= 0) {
      const updated = [...barberSchedules]
      updated[scheduleIndex] = { ...updated[scheduleIndex], [field]: value }
      setBarberSchedules(updated)
    }
  }

  const handleSaveSchedule = async () => {
    if (!selectedBarberForSchedule) return

    setSubmitting(true)

    try {
      for (const schedule of barberSchedules) {
        const { error } = await supabase
          .from('barber_schedules')
          .update({
            is_working: schedule.is_working,
            start_time: schedule.start_time,
            end_time: schedule.end_time,
          })
          .eq('id', schedule.id)

        if (error) throw error
      }

      toast({ title: 'Success', description: 'Schedule updated successfully' })
      setScheduleDialogOpen(false)
    } catch (error) {
      console.error('Error updating schedule:', error)
      toast({ title: 'Error', description: 'Failed to update schedule', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const activeBarbers = barbers.filter(b => b.is_active)
  const inactiveBarbers = barbers.filter(b => !b.is_active)

  return (
    <div className="p-6 min-h-screen">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Barber Management</h2>
          <p className="text-gray-600 mt-1">Manage your team and their schedules</p>
        </div>
        
          <Button
            className="gap-2"
            onClick={() => {
              console.log('Add Barber clicked')
              setEditingBarber(null)
              setFormData({ name: '', title: '', photo_url: '' })
              setDialogOpen(true)
            }}
          >
            <Plus size={20} />
            Add Barber
          </Button>
          {dialogOpen && (
            <div
              className="fixed inset-0"
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2147483600 }}
              onClick={() => {
                setDialogOpen(false)
                setEditingBarber(null)
                setFormData({ name: '', title: '', photo_url: '' })
              }}
            >
              <div
                className="fixed"
                style={{
                  position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', zIndex: 2147483601,
                  width: 'min(100%, 640px)', background: '#fff', padding: 24, borderRadius: 8, border: '1px solid #e5e7eb'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-col space-y-1.5 text-center sm:text-left">
                  <h3 className="text-lg font-semibold leading-none tracking-tight">{editingBarber ? 'Edit Barber' : 'Add New Barber'}</h3>
                  <p className="text-sm text-gray-500">{editingBarber ? 'Update barber information' : 'Add a new team member'}</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  placeholder="Marcus Chen"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  placeholder="Master Barber"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Photo URL (Optional)</Label>
                <Input
                  placeholder="https://example.com/photo.jpg"
                  value={formData.photo_url}
                  onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                />
              </div>
            </form>
              </div>
            </div>
          )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Barbers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{barbers.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{activeBarbers.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Inactive</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-400">{inactiveBarbers.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Active Barbers</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading...</p>
            </div>
          ) : activeBarbers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">No active barbers</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeBarbers.map((barber) => (
                <div key={barber.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-[#D4AF37] flex items-center justify-center text-[#3D2817] font-bold text-lg">
                        {barber.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{barber.name}</h3>
                        <p className="text-sm text-gray-600">{barber.title}</p>
                      </div>
                    </div>
                    <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-2"
                      onClick={() => { console.log('Schedule clicked', barber.id); handleOpenScheduleDialog(barber.id) }}
                    >
                      <Clock size={16} />
                      Schedule
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { console.log('Edit clicked', barber.id); handleEdit(barber) }}
                    >
                      <Edit size={16} />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { console.log('Toggle active clicked', barber.id); handleToggleActive(barber) }}
                    >
                      <UserX size={16} />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => { console.log('Delete clicked', barber.id); handleDelete(barber) }}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {inactiveBarbers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Inactive Barbers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {inactiveBarbers.map((barber) => (
                <div key={barber.id} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-bold">
                      {barber.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-700">{barber.name}</h3>
                      <p className="text-sm text-gray-500">{barber.title}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleActive(barber)}
                    >
                      <UserCheck size={16} className="mr-2" />
                      Activate
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(barber)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {scheduleDialogOpen && (
        <div
          className="fixed inset-0"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2147483600 }}
          onClick={() => setScheduleDialogOpen(false)}
        >
          <div
            className="fixed"
            style={{
              position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', zIndex: 2147483601,
              width: 'min(100%, 768px)', background: '#fff', padding: 24, borderRadius: 8, border: '1px solid #e5e7eb'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col space-y-1.5 text-center sm:text-left">
              <h3 className="text-lg font-semibold leading-none tracking-tight">Manage Weekly Schedule</h3>
              <p className="text-sm text-gray-500">Set working hours for each day of the week</p>
            </div>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {barberSchedules.map((schedule) => (
              <div key={schedule.day_of_week} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-semibold">{DAYS[schedule.day_of_week]}</Label>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Working</Label>
                    <input
                      type="checkbox"
                      checked={schedule.is_working}
                      onChange={(e) => handleUpdateSchedule(schedule.day_of_week, 'is_working', e.target.checked)}
                      className="w-4 h-4"
                    />
                  </div>
                </div>
                {schedule.is_working && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm">Start Time</Label>
                      <Input
                        type="time"
                        value={schedule.start_time?.slice(0, 5) || '10:00'}
                        onChange={(e) => handleUpdateSchedule(schedule.day_of_week, 'start_time', e.target.value + ':00')}
                      />
                    </div>
                    <div>
                      <Label className="text-sm">End Time</Label>
                      <Input
                        type="time"
                        value={schedule.end_time?.slice(0, 5) || '20:00'}
                        onChange={(e) => handleUpdateSchedule(schedule.day_of_week, 'end_time', e.target.value + ':00')}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button type="button" variant="outline" onClick={() => setScheduleDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveSchedule} disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Schedule'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
