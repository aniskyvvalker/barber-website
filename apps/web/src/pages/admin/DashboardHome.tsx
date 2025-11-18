import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { 
  Calendar, 
  MessageSquare, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Clock,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'

// Format Date to local YYYY-MM-DD to avoid UTC shifts when comparing to DATE columns
const toLocalDateString = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

interface Stats {
  todayAppointments: number
  weekAppointments: number
  monthAppointments: number
  unreadMessages: number
  totalRevenue: number
  weekRevenue: number
  pendingCheckIns: number
  activeBarbers: number
  popularService: string
  upcomingBlocks: number
}

interface RecentAppointment {
  id: string
  customer_name: string
  appointment_time: string
  status: string
  services: { name: string; price?: number } | null
  barbers: { name: string } | null
  appointment_date?: string
}

export default function DashboardHome() {
  const [stats, setStats] = useState<Stats>({
    todayAppointments: 0,
    weekAppointments: 0,
    monthAppointments: 0,
    unreadMessages: 0,
    totalRevenue: 0,
    weekRevenue: 0,
    pendingCheckIns: 0,
    activeBarbers: 0,
    popularService: 'N/A',
    upcomingBlocks: 0,
  })
  const [recentAppointments, setRecentAppointments] = useState<RecentAppointment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)

    const today = toLocalDateString(new Date())
    const weekStart = toLocalDateString(startOfWeek(new Date()))
    const weekEnd = toLocalDateString(endOfWeek(new Date()))
    const monthStart = toLocalDateString(startOfMonth(new Date()))
    const monthEnd = toLocalDateString(endOfMonth(new Date()))

    try {
      // Fetch recent appointments with related service+barber for revenue and labels
      const { data: allAppointments } = await supabase
        .from('appointments')
        .select('*, services(name, price), barbers(name)')
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false })
        .limit(200)

      const safeApts = allAppointments || []

      // Today's appointments (exclude cancelled)
      const todayApts = safeApts.filter(apt => apt.appointment_date === today && apt.status !== 'cancelled')

      // Week's appointments
      const weekApts = safeApts.filter(apt => 
        apt.appointment_date >= weekStart && 
        apt.appointment_date <= weekEnd && 
        apt.status !== 'cancelled'
      )

      // Month's appointments
      const monthApts = safeApts.filter(apt => 
        apt.appointment_date >= monthStart && 
        apt.appointment_date <= monthEnd && 
        apt.status !== 'cancelled'
      )

      // Pending check-ins (today's confirmed)
      const pendingCheckIns = todayApts.filter(apt => apt.status === 'confirmed').length

      // Revenue from completed appointments
      const completedApts = safeApts.filter(apt => apt.status === 'completed')
      const totalRevenue = completedApts.reduce((sum, apt) => sum + (apt.services?.price || 0), 0)
      const weekCompleted = completedApts.filter(apt => 
        apt.appointment_date >= weekStart && apt.appointment_date <= weekEnd
      )
      const weekRevenue = weekCompleted.reduce((sum, apt) => sum + (apt.services?.price || 0), 0)

      // Most popular service
      const serviceCounts: Record<string, number> = {}
      safeApts.forEach(apt => {
        if (apt.services?.name) {
          serviceCounts[apt.services.name] = (serviceCounts[apt.services.name] || 0) + 1
        }
      })
      const popularService = Object.keys(serviceCounts).length > 0
        ? Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])[0][0]
        : 'N/A'

      // Unread messages
      const { data: messages } = await supabase
        .from('messages')
        .select('id')
        .eq('is_read', false)

      // Active barbers
      const { data: barbers } = await supabase
        .from('barbers')
        .select('id')
        .eq('is_active', true)

      // Upcoming blocks
      const { data: blocks } = await supabase
        .from('blocked_slots')
        .select('id')
        .gte('end_datetime', new Date().toISOString())

      // Recent appointments (today and tomorrow)
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowStr = toLocalDateString(tomorrow)
      const recentApts = safeApts
        .filter(apt => (apt.appointment_date === today || apt.appointment_date === tomorrowStr) && apt.status !== 'cancelled')
        .slice(0, 5)
        .map(a => ({
          id: a.id,
          customer_name: a.customer_name,
          appointment_time: a.appointment_time,
          status: a.status,
          services: a.services,
          barbers: a.barbers,
        }))

      setStats({
        todayAppointments: todayApts.length,
        weekAppointments: weekApts.length,
        monthAppointments: monthApts.length,
        unreadMessages: messages?.length || 0,
        totalRevenue: totalRevenue,
        weekRevenue: weekRevenue,
        pendingCheckIns: pendingCheckIns,
        activeBarbers: barbers?.length || 0,
        popularService: popularService,
        upcomingBlocks: blocks?.length || 0,
      })

      setRecentAppointments(recentApts)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    }

    setLoading(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-blue-100 text-blue-800'
      case 'checked_in': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  if (loading) {
    return (
      <div className="p-6 min-h-screen">
        <div className="text-center py-12">
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 min-h-screen">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Dashboard Overview</h2>
        <p className="text-gray-600 mt-1">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Today's Appointments</CardTitle>
              <Calendar className="text-blue-600" size={20} />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{stats.todayAppointments}</p>
            <p className="text-sm text-gray-500 mt-1">{stats.pendingCheckIns} pending check-in</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">This Week</CardTitle>
              <TrendingUp className="text-green-600" size={20} />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{stats.weekAppointments}</p>
            <p className="text-sm text-gray-500 mt-1">{stats.monthAppointments} this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Unread Messages</CardTitle>
              <MessageSquare className="text-orange-600" size={20} />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{stats.unreadMessages}</p>
            <p className="text-sm text-gray-500 mt-1">Requires attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Week Revenue</CardTitle>
              <DollarSign className="text-[#D4AF37]" size={20} />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-[#D4AF37]">${'{'}stats.weekRevenue{'}'}</p>
            <p className="text-sm text-gray-500 mt-1">${'{'}stats.totalRevenue{'}'} total</p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Active Barbers</CardTitle>
              <Users className="text-gray-600" size={20} />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">{stats.activeBarbers}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Popular Service</CardTitle>
              <TrendingUp className="text-gray-600" size={20} />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-gray-900">{stats.popularService}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Upcoming Blocks</CardTitle>
              <Clock className="text-gray-600" size={20} />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">{stats.upcomingBlocks}</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {(stats.pendingCheckIns > 0 || stats.unreadMessages > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {stats.pendingCheckIns > 0 && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-blue-600 mt-1" size={20} />
                  <div>
                    <h3 className="font-semibold text-blue-900">Pending Check-ins</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      {stats.pendingCheckIns} customer{stats.pendingCheckIns > 1 ? 's' : ''} waiting to be checked in
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {stats.unreadMessages > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <MessageSquare className="text-orange-600 mt-1" size={20} />
                  <div>
                    <h3 className="font-semibold text-orange-900">Unread Messages</h3>
                    <p className="text-sm text-orange-700 mt-1">
                      {stats.unreadMessages} new message{stats.unreadMessages > 1 ? 's' : ''} from customers
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Recent Appointments */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          {recentAppointments.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">No upcoming appointments</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentAppointments.map((apt) => (
                <div key={apt.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-gray-900">{apt.customer_name}</h3>
                      <Badge className={getStatusColor(apt.status)}>
                        {getStatusLabel(apt.status)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>{apt.services?.name}</span>
                      <span>•</span>
                      <span>{apt.barbers?.name || 'No barber assigned'}</span>
                      <span>•</span>
                      <span>{apt.appointment_time.slice(0, 5)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
