"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Calendar,
  Users,
  Shield,
  Plus,
  ScanLine,
  Download,
  Trash2,
  Edit,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  GraduationCap,
  FileSpreadsheet,
  Star,
  Search,
  UserCheck,
  UserCog,
  Check,
} from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { BrandLogo } from "@/components/brand-logo";
import { PosterUploader } from "@/components/poster-uploader";

// Lazy-load QRScanner so html5-qrcode is NOT bundled into the initial dashboard page load
const QRScanner = dynamic(
  () => import("@/components/qr-scanner").then((mod) => mod.QRScanner),
  {
    ssr: false,
    loading: () => (
      <div className="p-12 text-center text-xs font-mono text-muted-foreground animate-pulse border border-dashed border-border/70 rounded-xl">
        Loading camera scanner engine...
      </div>
    ),
  }
);

interface DashboardEvent {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  posterUrl?: string | null;
  startAt: string;
  endAt: string;
  maxCapacity: number;
  status: "DRAFT" | "PUBLISHED" | "COMPLETED" | "CANCELLED";
  registeredCount: number;
  waitlistCount: number;
  spotsLeft: number;
  speakerName?: string | null;
  speakerRole?: string | null;
  prerequisites?: string | null;
  slidesUrl?: string | null;
  repoUrl?: string | null;
  videoUrl?: string | null;
  averageRating?: number;
  totalReviews?: number;
}

interface AttendeeRecord {
  id: string;
  ticketToken: string;
  status: "REGISTERED" | "WAITLIST" | "CHECKED_IN" | "CANCELLED";
  checkedInAt?: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image?: string | null;
    studentId: string | null;
    level?: string | null;
    specialty?: string | null;
    role: string;
  };
  event: {
    id: string;
    title: string;
    category: string;
    maxCapacity: number;
  };
  certificate?: {
    id: string;
    serialNumber: string;
    issuedAt: string;
  } | null;
}

interface AdminUserRecord {
  id: string;
  name: string | null;
  email: string | null;
  image?: string | null;
  studentId?: string | null;
  level?: string | null;
  specialty?: string | null;
  role: "STUDENT" | "ORGANIZER" | "ADMIN";
  createdAt: string;
  _count: {
    registrations: number;
    events: number;
  };
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const role = session?.user?.role || "ORGANIZER";

  const [activeTab, setActiveTab] = React.useState("events");
  const [events, setEvents] = React.useState<DashboardEvent[]>([]);
  const [attendees, setAttendees] = React.useState<AttendeeRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedEventId, setSelectedEventId] = React.useState<string>("ALL");

  // Admin Team & Roles state
  const [adminUsers, setAdminUsers] = React.useState<AdminUserRecord[]>([]);
  const [adminLoading, setAdminLoading] = React.useState(false);
  const [adminSearch, setAdminSearch] = React.useState("");
  const [updatingUserId, setUpdatingUserId] = React.useState<string | null>(null);

  // Create / Edit Event Dialog State
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingEventId, setEditingEventId] = React.useState<string | null>(null);
  const [formData, setFormData] = React.useState({
    title: "",
    description: "",
    category: "WORKSHOPS",
    location: "Campus Lab C & Discord",
    posterUrl: "",
    startAt: "",
    endAt: "",
    maxCapacity: 50,
    status: "PUBLISHED" as const,
    speakerName: "",
    speakerRole: "",
    prerequisites: "",
    slidesUrl: "",
    repoUrl: "",
    videoUrl: "",
  });
  const [formSubmitting, setFormSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});

  const fetchDashboardData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [eventsRes, attendeesRes] = await Promise.all([
        fetch("/api/events?status=ALL"),
        fetch("/api/check-in"),
      ]);

      if (eventsRes.ok) {
        const evData = await eventsRes.json();
        setEvents(evData);
      }
      if (attendeesRes.ok) {
        const attData = await attendeesRes.json();
        setAttendees(attData);
      }
    } catch (err) {
      console.error("Dashboard data load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Fetch users for Admin Team & Roles tab
  const fetchAdminUsers = React.useCallback(async (query: string = "") => {
    if (session?.user?.role !== "ADMIN") return;
    try {
      setAdminLoading(true);
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAdminUsers(data);
      }
    } catch (err) {
      console.error("Failed to load admin users:", err);
    } finally {
      setAdminLoading(false);
    }
  }, [session?.user?.role]);

  React.useEffect(() => {
    if (activeTab === "team" && session?.user?.role === "ADMIN") {
      fetchAdminUsers(adminSearch);
    }
  }, [activeTab, adminSearch, session?.user?.role, fetchAdminUsers]);

  const handleToggleRole = async (targetUser: AdminUserRecord) => {
    if (targetUser.role === "ADMIN") return;
    const newRole = targetUser.role === "ORGANIZER" ? "STUDENT" : "ORGANIZER";
    const confirmMsg =
      newRole === "ORGANIZER"
        ? `Promote ${targetUser.name || targetUser.email} to ORGANIZER?\n\nThey will be able to create events, manage registrations, and scan door tickets.`
        : `Demote ${targetUser.name || targetUser.email} to STUDENT?\n\nThey will lose access to the Organizer Dashboard.`;

    if (!confirm(confirmMsg)) return;

    try {
      setUpdatingUserId(targetUser.id);
      const res = await fetch(`/api/admin/users/${targetUser.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (res.ok) {
        setAdminUsers((prev) =>
          prev.map((u) => (u.id === targetUser.id ? { ...u, role: newRole } : u))
        );
      } else {
        alert(data.error || "Failed to update role.");
      }
    } catch (err) {
      console.error("Error updating user role:", err);
      alert("Network error updating role.");
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Open modal for new event (empty posterUrl by default, WORKSHOPS by default)
  const handleOpenCreate = () => {
    const now = new Date();
    const defaultStart = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const defaultEnd = new Date(defaultStart.getTime() + 3 * 60 * 60 * 1000);

    setEditingEventId(null);
    setFormData({
      title: "",
      description: "",
      category: "WORKSHOPS",
      location: "Innovation Hub Hall A",
      posterUrl: "",
      startAt: defaultStart.toISOString().slice(0, 16),
      endAt: defaultEnd.toISOString().slice(0, 16),
      maxCapacity: 60,
      status: "PUBLISHED",
      speakerName: "",
      speakerRole: "",
      prerequisites: "",
      slidesUrl: "",
      repoUrl: "",
      videoUrl: "",
    });
    setFormError(null);
    setFieldErrors({});
    setIsDialogOpen(true);
  };

  // Open modal to edit existing event
  const handleOpenEdit = (evt: DashboardEvent) => {
    setEditingEventId(evt.id);
    setFormData({
      title: evt.title,
      description: evt.description,
      category: evt.category,
      location: evt.location,
      posterUrl: evt.posterUrl || "",
      startAt: new Date(evt.startAt).toISOString().slice(0, 16),
      endAt: new Date(evt.endAt).toISOString().slice(0, 16),
      maxCapacity: evt.maxCapacity,
      status: evt.status as any,
      speakerName: evt.speakerName || "",
      speakerRole: evt.speakerRole || "",
      prerequisites: evt.prerequisites || "",
      slidesUrl: evt.slidesUrl || "",
      repoUrl: evt.repoUrl || "",
      videoUrl: evt.videoUrl || "",
    });
    setFormError(null);
    setFieldErrors({});
    setIsDialogOpen(true);
  };

  // Submit create or edit with granular error mapping
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    try {
      const url = editingEventId ? `/api/events/${editingEventId}` : "/api/events";
      const method = editingEventId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || "Failed to save event.");
        if (data.fieldErrors) {
          setFieldErrors(data.fieldErrors);
        }
      } else {
        setIsDialogOpen(false);
        await fetchDashboardData();
      }
    } catch (err: any) {
      console.error(err);
      setFormError("Network error while communicating with server.");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete event
  const handleDeleteEvent = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete event "${title}"? This will cancel all attendee passes.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchDashboardData();
      } else {
        alert("Failed to delete event.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Quick status toggle
  const handleUpdateStatus = async (id: string, nextStatus: string) => {
    try {
      const res = await fetch(`/api/events/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        await fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter attendees
  const filteredAttendees = selectedEventId === "ALL"
    ? attendees
    : attendees.filter((a) => a.event.id === selectedEventId);

  // Export attendees roster via backend API (.xlsx or .csv)
  const handleExport = (format: "xlsx" | "csv") => {
    if (filteredAttendees.length === 0) {
      alert("No attendee records to export.");
      return;
    }
    const targetId = selectedEventId === "ALL" ? "all" : selectedEventId;
    window.location.href = `/api/events/${targetId}/export?format=${format}`;
  };

  const totalRegistered = filteredAttendees.filter(
    (a) => a.status === "REGISTERED" || a.status === "CHECKED_IN"
  ).length;
  const totalCheckedIn = filteredAttendees.filter(
    (a) => a.status === "CHECKED_IN"
  ).length;
  const totalWaitlist = filteredAttendees.filter(
    (a) => a.status === "WAITLIST"
  ).length;

  return (
    <div className="container mx-auto max-w-6xl px-4 sm:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-black tracking-tight text-foreground">
              CyberNexus Operations Hub
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time workshop capacity, QR ticket scanner, and attendance records.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={role === "ADMIN" ? "neon" : "cyber"} className="px-3 py-1 font-mono text-xs">
            {role} ACCESS
          </Badge>
          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="gap-2 cyber-glow font-semibold"
          >
            <Plus className="h-4 w-4" />
            <span>Create Event</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboardData}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/60 bg-card/60">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-mono uppercase">Club Events</CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">
              {events.length} Total
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            {events.filter((e) => e.status === "PUBLISHED").length} Published •{" "}
            {events.filter((e) => e.status === "DRAFT").length} Drafts
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-mono uppercase">Confirmed Passes</CardDescription>
            <CardTitle className="text-2xl font-bold text-primary">
              {totalRegistered} Students
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            Active seat reservations
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-mono uppercase">Door Check-ins</CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-400">
              {totalCheckedIn} Verified
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            {totalRegistered > 0
              ? `${Math.round((totalCheckedIn / totalRegistered) * 100)}% turnout rate`
              : "0% turnout rate"}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-mono uppercase">Waitlist Queue</CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-400">
              {totalWaitlist} Standby
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            Auto-promotes on cancellation
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList
          className={`grid w-full sm:w-auto ${
            session?.user?.role === "ADMIN" ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"
          }`}
        >
          <TabsTrigger value="events" className="gap-2">
            <Calendar className="h-4 w-4" />
            <span>Manage Events ({events.length})</span>
          </TabsTrigger>
          <TabsTrigger value="scanner" className="gap-2">
            <ScanLine className="h-4 w-4" />
            <span>QR Scanner</span>
          </TabsTrigger>
          <TabsTrigger value="attendees" className="gap-2">
            <Users className="h-4 w-4" />
            <span>Attendees ({attendees.length})</span>
          </TabsTrigger>
          {session?.user?.role === "ADMIN" && (
            <TabsTrigger value="team" className="gap-2">
              <Shield className="h-4 w-4 text-amber-400" />
              <span>Team &amp; Roles</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Tab 1: Manage Events */}
        <TabsContent value="events" className="space-y-4">
          <Card className="border-border/70 bg-card/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg">Club Events Directory</CardTitle>
                <CardDescription>
                  Configure upcoming workshops, adjust limits, and update publication status.
                </CardDescription>
              </div>
              <Button size="sm" onClick={handleOpenCreate} className="gap-1.5 cyber-glow">
                <Plus className="h-4 w-4" />
                <span>Add Event</span>
              </Button>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground space-y-3">
                  <p>No events in database yet.</p>
                  <Button size="sm" variant="cyber" onClick={handleOpenCreate}>
                    Create Your First Event
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Date / Venue</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((evt) => (
                      <TableRow key={evt.id}>
                        <TableCell>
                          <div className="font-semibold text-foreground flex items-center gap-2">
                            <span>{evt.title}</span>
                            {evt.averageRating && evt.averageRating > 0 ? (
                              <span
                                className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20 font-semibold"
                                title={`Average Rating: ${evt.averageRating.toFixed(1)} based on ${evt.totalReviews || 0} reviews`}
                              >
                                <Star className="h-3 w-3 fill-amber-400" />
                                {evt.averageRating.toFixed(1)}
                                <span className="text-[10px] text-muted-foreground font-normal">
                                  ({evt.totalReviews || 0})
                                </span>
                              </span>
                            ) : null}
                          </div>
                          <div className="text-[11px] text-muted-foreground line-clamp-1">
                            {evt.description}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="neon" className="text-[10px] uppercase font-mono">
                            {evt.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div>{new Date(evt.startAt).toLocaleDateString()}</div>
                          <div className="text-muted-foreground text-[11px] truncate max-w-[150px]">
                            {evt.location}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          <span className="text-primary font-bold">{evt.registeredCount}</span>
                          <span className="text-muted-foreground">/{evt.maxCapacity}</span>
                          {evt.waitlistCount > 0 && (
                            <span className="text-amber-400 text-[10px] block">
                              +{evt.waitlistCount} waitlist
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <select
                            value={evt.status}
                            onChange={(e) => handleUpdateStatus(evt.id, e.target.value)}
                            className="bg-card text-xs font-mono rounded px-2 py-1 border border-border/70 focus:outline-none focus:border-primary"
                          >
                            <option value="DRAFT">DRAFT</option>
                            <option value="PUBLISHED">PUBLISHED</option>
                            <option value="COMPLETED">COMPLETED</option>
                            <option value="CANCELLED">CANCELLED</option>
                          </select>
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Export Attendees (.xlsx)"
                            onClick={() => {
                              window.location.href = `/api/events/${evt.id}/export?format=xlsx`;
                            }}
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                          >
                            <FileSpreadsheet className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Edit Event"
                            onClick={() => handleOpenEdit(evt)}
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Delete Event"
                            onClick={() => handleDeleteEvent(evt.id, evt.title)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: QR Scanner (Only rendered when tab is active) */}
        <TabsContent value="scanner" className="space-y-4">
          <Card className="border-border/70 bg-card/60 p-6">
            {activeTab === "scanner" && (
              <QRScanner onCheckInSuccess={fetchDashboardData} />
            )}
          </Card>
        </TabsContent>

        {/* Tab 3: Attendees List & CSV Export */}
        <TabsContent value="attendees" className="space-y-4">
          <Card className="border-border/70 bg-card/60">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
              <div>
                <CardTitle className="text-lg">Attendee Registry</CardTitle>
                <CardDescription>
                  Official student attendance list with academic level, specialty, and check-in logs.
                </CardDescription>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Event Selector Filter */}
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="bg-card text-xs font-mono rounded-lg px-3 py-1.5 border border-border/70 focus:outline-none focus:border-primary max-w-xs"
                >
                  <option value="ALL">All Events ({attendees.length})</option>
                  {events.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title}
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-2">
                  <Button
                    variant="cyber"
                    size="sm"
                    onClick={() => handleExport("xlsx")}
                    className="gap-1.5 font-medium"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-primary" />
                    <span>Export Excel (.xlsx)</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport("csv")}
                    className="gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>CSV</span>
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {filteredAttendees.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No registrations found for this filter.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Academic Info</TableHead>
                      <TableHead>Student ID</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Check-in Time</TableHead>
                      <TableHead>Certificate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAttendees.map((att) => (
                      <TableRow key={att.id}>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <UserAvatar
                              src={att.user.image}
                              name={att.user.name}
                              size={32}
                            />
                            <div>
                              <div className="font-semibold text-foreground">
                                {att.user.name || "Student Member"}
                              </div>
                              <div className="text-xs text-muted-foreground">{att.user.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Badge variant="neon" className="font-mono text-[10px]">
                              {att.user.level || "N/A"}
                            </Badge>
                            <span className="text-xs font-medium text-foreground max-w-[140px] truncate">
                              {att.user.specialty || "N/A"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {att.user.studentId || "—"}
                        </TableCell>
                        <TableCell className="text-xs max-w-[150px] truncate">
                          {att.event.title}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              att.status === "CHECKED_IN"
                                ? "success"
                                : att.status === "WAITLIST"
                                ? "secondary"
                                : "cyber"
                            }
                            className="text-[10px]"
                          >
                            {att.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {att.checkedInAt ? (
                            <span className="text-emerald-400">
                              {new Date(att.checkedInAt).toLocaleTimeString()}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {att.status === "CHECKED_IN" ? (
                            <a
                              href={`/api/certificates/${att.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline flex items-center gap-1 font-mono text-[11px]"
                            >
                              <span>{att.certificate?.serialNumber || "Generate"}</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">Locked</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Team & Roles Management (ADMIN ONLY) */}
        {session?.user?.role === "ADMIN" && (
          <TabsContent value="team" className="space-y-4">
            <Card className="border-border/70 bg-card/60">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">CyberNexus Team &amp; Roles</CardTitle>
                    <Badge variant="neon" className="font-mono text-[10px]">
                      ADMIN ACCESS
                    </Badge>
                  </div>
                  <CardDescription>
                    Promote active club members to Organizers to enable event creation and door scanning.
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search member or email..."
                      value={adminSearch}
                      onChange={(e) => setAdminSearch(e.target.value)}
                      className="pl-9 h-8 text-xs bg-card"
                    />
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchAdminUsers(adminSearch)}
                    className="h-8 gap-1.5"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${adminLoading ? "animate-spin" : ""}`} />
                    <span className="hidden sm:inline">Refresh</span>
                  </Button>
                </div>
              </CardHeader>

              <CardContent>
                {adminLoading && adminUsers.length === 0 ? (
                  <div className="py-12 text-center text-xs text-muted-foreground">
                    Loading club member directory...
                  </div>
                ) : adminUsers.length === 0 ? (
                  <div className="py-12 text-center text-xs text-muted-foreground">
                    No users matching &quot;{adminSearch}&quot;.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Academic Track</TableHead>
                        <TableHead>Activity</TableHead>
                        <TableHead>Current Role</TableHead>
                        <TableHead className="text-right">Permission Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {adminUsers.map((u) => {
                        const isSelf = u.id === session?.user?.id;
                        const isTargetAdmin = u.role === "ADMIN";
                        const isUpdating = updatingUserId === u.id;

                        return (
                          <TableRow key={u.id}>
                            <TableCell>
                              <div className="flex items-center gap-2.5">
                                <UserAvatar src={u.image} name={u.name} size={32} />
                                <div>
                                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                                    <span>{u.name || "Student Member"}</span>
                                    {isSelf && (
                                      <Badge variant="outline" className="text-[9px] px-1 py-0 border-primary/40 text-primary">
                                        You
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground">{u.email}</div>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="text-xs space-y-0.5">
                                <div className="font-medium text-foreground">
                                  {u.specialty || "—"}
                                </div>
                                <div className="text-[11px] font-mono text-muted-foreground">
                                  {u.level ? `Level: ${u.level}` : "Level not set"}
                                  {u.studentId ? ` • #${u.studentId}` : ""}
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="text-xs font-mono text-muted-foreground">
                              <div>{u._count.registrations} passes</div>
                              {u._count.events > 0 && (
                                <div className="text-primary">{u._count.events} events created</div>
                              )}
                            </TableCell>

                            <TableCell>
                              <Badge
                                variant={
                                  u.role === "ADMIN"
                                    ? "neon"
                                    : u.role === "ORGANIZER"
                                    ? "cyber"
                                    : "secondary"
                                }
                                className="font-mono text-[10px] uppercase font-bold"
                              >
                                {u.role}
                              </Badge>
                            </TableCell>

                            <TableCell className="text-right">
                              {isTargetAdmin ? (
                                <span className="text-xs font-mono text-muted-foreground italic">
                                  {isSelf ? "Lead Admin (Current)" : "Lead Admin"}
                                </span>
                              ) : u.role === "ORGANIZER" ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={isUpdating}
                                  onClick={() => handleToggleRole(u)}
                                  className="h-8 text-xs text-destructive border-destructive/40 hover:bg-destructive/10"
                                >
                                  {isUpdating ? "Updating..." : "Demote to Student"}
                                </Button>
                              ) : (
                                <Button
                                  variant="cyber"
                                  size="sm"
                                  disabled={isUpdating}
                                  onClick={() => handleToggleRole(u)}
                                  className="h-8 text-xs gap-1.5 font-semibold"
                                >
                                  <UserCheck className="h-3.5 w-3.5 text-primary" />
                                  <span>{isUpdating ? "Promoting..." : "Promote to Organizer"}</span>
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Simplified Create / Edit Event Dialog focused on essentials */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="p-6 pb-3 shrink-0 border-b border-border/60">
            <DialogTitle>
              {editingEventId ? "Edit Club Event" : "Create New Workshop or Event"}
            </DialogTitle>
            <DialogDescription>
              Configure essential details, date &amp; time, venue, and seat limits.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* 1. Title */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Event Title <span className="text-destructive">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. Reverse Engineering & Binary Exploitation 101"
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({ ...formData, title: e.target.value });
                    if (fieldErrors.title) {
                      setFieldErrors({ ...fieldErrors, title: [] });
                    }
                  }}
                  className={fieldErrors.title ? "border-destructive" : ""}
                />
                {fieldErrors.title && (
                  <p className="text-[11px] text-destructive font-medium">{fieldErrors.title[0]}</p>
                )}
              </div>

              {/* 2. Category (default WORKSHOPS) & Max Capacity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Category <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full h-10 rounded-lg border border-input bg-card/60 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary font-mono text-xs"
                  >
                    <option value="WORKSHOPS">WORKSHOPS</option>
                    <option value="HACKATHONS">HACKATHONS</option>
                    <option value="DEV">DEV &amp; AI</option>
                    <option value="CYBERSECURITY">CYBERSECURITY</option>
                    <option value="COMPETITION">COMPETITION</option>
                  </select>
                  {fieldErrors.category && (
                    <p className="text-[11px] text-destructive font-medium">{fieldErrors.category[0]}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Max Capacity <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="number"
                    min="1"
                    required
                    value={formData.maxCapacity}
                    onChange={(e) => {
                      setFormData({ ...formData, maxCapacity: parseInt(e.target.value) || 1 });
                      if (fieldErrors.maxCapacity) {
                        setFieldErrors({ ...fieldErrors, maxCapacity: [] });
                      }
                    }}
                    className={fieldErrors.maxCapacity ? "border-destructive" : ""}
                  />
                  {fieldErrors.maxCapacity && (
                    <p className="text-[11px] text-destructive font-medium">{fieldErrors.maxCapacity[0]}</p>
                  )}
                </div>
              </div>

              {/* 3. Venue / Location */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Venue / Location <span className="text-destructive">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. Lab Hall C & Discord Stream"
                  value={formData.location}
                  onChange={(e) => {
                    setFormData({ ...formData, location: e.target.value });
                    if (fieldErrors.location) {
                      setFieldErrors({ ...fieldErrors, location: [] });
                    }
                  }}
                  className={fieldErrors.location ? "border-destructive" : ""}
                />
                {fieldErrors.location && (
                  <p className="text-[11px] text-destructive font-medium">{fieldErrors.location[0]}</p>
                )}
              </div>

              {/* 4. Start & End Times */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Start Time <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="datetime-local"
                    required
                    value={formData.startAt}
                    onChange={(e) => {
                      setFormData({ ...formData, startAt: e.target.value });
                      if (fieldErrors.startAt) {
                        setFieldErrors({ ...fieldErrors, startAt: [] });
                      }
                    }}
                    className={fieldErrors.startAt ? "border-destructive" : ""}
                  />
                  {fieldErrors.startAt && (
                    <p className="text-[11px] text-destructive font-medium">{fieldErrors.startAt[0]}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    End Time <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="datetime-local"
                    required
                    value={formData.endAt}
                    onChange={(e) => {
                      setFormData({ ...formData, endAt: e.target.value });
                      if (fieldErrors.endAt) {
                        setFieldErrors({ ...fieldErrors, endAt: [] });
                      }
                    }}
                    className={fieldErrors.endAt ? "border-destructive" : ""}
                  />
                  {fieldErrors.endAt && (
                    <p className="text-[11px] text-destructive font-medium">{fieldErrors.endAt[0]}</p>
                  )}
                </div>
              </div>

              {/* 5. Description */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Description <span className="text-destructive">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Detailed workshop schedule, prerequisites, tools required..."
                  value={formData.description}
                  onChange={(e) => {
                    setFormData({ ...formData, description: e.target.value });
                    if (fieldErrors.description) {
                      setFieldErrors({ ...fieldErrors, description: [] });
                    }
                  }}
                  className={`w-full rounded-lg border border-input bg-card/60 p-3 text-sm text-foreground focus:outline-none focus:border-primary ${
                    fieldErrors.description ? "border-destructive" : ""
                  }`}
                />
                {fieldErrors.description && (
                  <p className="text-[11px] text-destructive font-medium">{fieldErrors.description[0]}</p>
                )}
              </div>

              {/* 6. Event Poster Image (Supabase Storage upload with live preview & URL fallback) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Event Poster (Optional)</span>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    Drag & drop local image, or leave empty for default banner
                  </span>
                </label>
                <PosterUploader
                  value={formData.posterUrl}
                  onChange={(url) => {
                    setFormData({ ...formData, posterUrl: url });
                    if (fieldErrors.posterUrl) {
                      setFieldErrors({ ...fieldErrors, posterUrl: [] });
                    }
                  }}
                />
                {fieldErrors.posterUrl && (
                  <p className="text-[11px] text-destructive font-medium">{fieldErrors.posterUrl[0]}</p>
                )}
              </div>

              {/* Speaker / Instructor Section */}
              <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5 space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold text-foreground">Speaker & Instructor (Optional)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground">Speaker Name</label>
                    <Input
                      placeholder="e.g. Sarah Mansouri"
                      value={formData.speakerName}
                      onChange={(e) => setFormData({ ...formData, speakerName: e.target.value })}
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground">Speaker Role / Bio</label>
                    <Input
                      placeholder="e.g. Lead Backend Dev @ CyberNexus"
                      value={formData.speakerRole}
                      onChange={(e) => setFormData({ ...formData, speakerRole: e.target.value })}
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Prerequisites Section */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Prerequisites & What to Bring (Optional)</span>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    Tools, software, or accounts students need
                  </span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. - Laptop with Node.js 20+ installed&#10;- GitHub account&#10;- Basic JavaScript / React knowledge"
                  value={formData.prerequisites}
                  onChange={(e) => setFormData({ ...formData, prerequisites: e.target.value })}
                  className="w-full rounded-lg border border-input bg-card/60 p-2.5 text-xs text-foreground focus:outline-none focus:border-primary font-mono"
                />
              </div>

              {/* Post-Workshop Resources Section */}
              <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold text-foreground">Post-Workshop Resources (Optional)</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Slides, Repo & Video
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground">Slides URL</label>
                    <Input
                      type="url"
                      placeholder="https://speakerdeck.com/... or Google Slides link"
                      value={formData.slidesUrl}
                      onChange={(e) => setFormData({ ...formData, slidesUrl: e.target.value })}
                      className="text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground">GitHub Repo URL</label>
                    <Input
                      type="url"
                      placeholder="https://github.com/cybernexusdz/..."
                      value={formData.repoUrl}
                      onChange={(e) => setFormData({ ...formData, repoUrl: e.target.value })}
                      className="text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground">Recording / Video URL</label>
                    <Input
                      type="url"
                      placeholder="https://youtube.com/watch?v=..."
                      value={formData.videoUrl}
                      onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                      className="text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* 7. Publication Status */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Publication Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full h-10 rounded-lg border border-input bg-card/60 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary font-mono text-xs"
                >
                  <option value="PUBLISHED">PUBLISHED (Accepting registrations)</option>
                  <option value="DRAFT">DRAFT (Hidden from students)</option>
                  <option value="COMPLETED">COMPLETED (Event ended)</option>
                  <option value="CANCELLED">CANCELLED (Cancelled event)</option>
                </select>
              </div>
            </div>

            {/* Sticky / Fixed Footer inside dialog */}
            <DialogFooter className="p-4 px-6 shrink-0 border-t border-border/60 bg-card/90">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={formSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="cyber"
                disabled={formSubmitting}
                className="cyber-glow font-bold"
              >
                {formSubmitting ? "Saving..." : editingEventId ? "Save Changes" : "Create Event"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
