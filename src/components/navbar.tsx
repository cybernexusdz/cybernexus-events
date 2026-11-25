"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Calendar,
  Ticket,
  LayoutDashboard,
  LogOut,
  LogIn,
  Menu,
  X,
  Shield,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand-logo";
import { UserAvatar } from "@/components/user-avatar";

export function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = React.useState(false);
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);

  const handleGoogleSignIn = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      await signIn("google");
    } catch (err) {
      console.error("Sign in failed:", err);
      setIsLoggingIn(false);
    }
  };

  const role = session?.user?.role;
  const isOrganizerOrAdmin = role === "ORGANIZER" || role === "ADMIN";

  // Automatically close any open menus on route change
  React.useEffect(() => {
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
  }, [pathname]);

  const navLinks = React.useMemo(
    () => [
      {
        name: "Events",
        href: "/events",
        icon: Calendar,
        show: true,
      },
      {
        name: "My Tickets",
        href: "/my-tickets",
        icon: Ticket,
        show: !!session,
      },
      {
        name: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        show: isOrganizerOrAdmin,
      },
    ],
    [session, isOrganizerOrAdmin]
  );

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md transition-colors">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-8">
        {/* Brand / Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <BrandLogo
            variant="icon"
            className="h-8 w-auto text-primary group-hover:drop-shadow-[0_0_10px_var(--glow-color)] transition-all"
          />
          <div className="flex items-center gap-2">
            <span className="font-mono text-lg font-black tracking-widest text-foreground group-hover:text-primary transition-colors">
              CYBERNEXUS
            </span>
            <Badge
              variant="cyber"
              className="px-1.5 py-0 text-[10px] uppercase font-bold tracking-widest"
            >
              EVENTS
            </Badge>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          {navLinks
            .filter((link) => link.show)
            .map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary/15 text-primary border border-primary/30 shadow-[0_0_12px_var(--glow-color)]"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{link.name}</span>
                </Link>
              );
            })}
        </nav>

        {/* Right Section: Theme Toggle & User Auth */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />

          {status === "loading" ? (
            <div className="h-9 w-28 rounded-lg bg-muted/40 animate-pulse" />
          ) : session ? (
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2.5 rounded-lg border border-border/80 bg-card/70 p-1.5 pr-3 hover:border-primary/50 transition-all focus:outline-none"
              >
                <UserAvatar
                  src={session.user?.image}
                  name={session.user?.name}
                  size={28}
                />
                <span className="text-xs font-medium text-foreground max-w-[100px] truncate">
                  {session.user?.name || "Member"}
                </span>
                <Badge
                  variant={role === "ADMIN" ? "neon" : role === "ORGANIZER" ? "cyber" : "secondary"}
                  className="text-[10px] px-1 py-0"
                >
                  {role}
                </Badge>
              </button>

              {userDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border/80 bg-card p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95">
                    <div className="px-3 py-2 border-b border-border/60 mb-1">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {session.user?.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {session.user?.email}
                      </p>
                    </div>

                    <Link
                      href="/events"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      Browse Events
                    </Link>

                    <Link
                      href="/my-tickets"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Ticket className="h-3.5 w-3.5" />
                      My Tickets
                    </Link>

                    {isOrganizerOrAdmin && (
                      <Link
                        href="/dashboard"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-primary hover:bg-primary/10"
                      >
                        <Shield className="h-3.5 w-3.5" />
                        Organizer Dashboard
                      </Link>
                    )}

                    <div className="mt-1 border-t border-border/60 pt-1">
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          signOut();
                        }}
                        className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Button
              onClick={handleGoogleSignIn}
              disabled={isLoggingIn}
              size="sm"
              variant="cyber"
              className="flex items-center gap-2"
            >
              <LogIn className={cn("h-4 w-4 text-primary", isLoggingIn && "animate-spin")} />
              <span>{isLoggingIn ? "Connecting..." : "Sign in with Google"}</span>
            </Button>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-foreground"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/60 bg-background/95 backdrop-blur-lg px-4 py-4 space-y-3">
          <div className="space-y-1">
            {navLinks
              .filter((link) => link.show)
              .map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/15 text-primary border border-primary/30"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{link.name}</span>
                  </Link>
                );
              })}
          </div>

          <div className="pt-3 border-t border-border/60">
            {session ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2.5">
                    <UserAvatar
                      src={session.user?.image}
                      name={session.user?.name}
                      size={36}
                    />
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        {session.user?.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {session.user?.email}
                      </p>
                    </div>
                  </div>
                  <Badge variant="cyber">{role}</Badge>
                </div>
                <Button
                  onClick={() => signOut()}
                  variant="destructive"
                  size="sm"
                  className="w-full flex items-center justify-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleGoogleSignIn}
                disabled={isLoggingIn}
                variant="cyber"
                size="sm"
                className="w-full flex items-center justify-center gap-2"
              >
                <LogIn className={cn("h-4 w-4 text-primary", isLoggingIn && "animate-spin")} />
                <span>{isLoggingIn ? "Connecting to Google..." : "Sign in with Google"}</span>
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
