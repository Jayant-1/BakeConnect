'use client';

import React, { useEffect, useState, use } from 'react';
import { notFound, usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../../lib/store/auth-context';
import { backendClient, getApiBase } from '../../lib/api/backend-client';
import {
  Shield,
  ChefHat,
  Bell,
  LogOut,
  ShoppingBag,
  TrendingUp,
  Package,
  Users,
  AlertCircle,
  CreditCard,
  MessageSquare,
  Check,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

interface StaffNotification {
  id: string;
  orderId?: string;
  orderNumber: string;
  channel: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function StaffLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ staffPrefix: string }>;
}) {
  const resolvedParams = use(params);
  const staffPrefix = resolvedParams.staffPrefix;
  const configuredPrefix = process.env.NEXT_PUBLIC_STAFF_PREFIX || 'staff-mgmt-9a4c1f7b';

  // Strict prefix validation: if route prefix doesn't match configured staff prefix, 404
  if (staffPrefix !== configuredPrefix) {
    notFound();
  }

  const pathname = usePathname();
  const router = useRouter();
  const { user, role, isAuthenticated, isLoading, logout } = useAuth();

  const [notifications, setNotifications] = useState<StaffNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [newOrderToast, setNewOrderToast] = useState<StaffNotification | null>(null);

  const isLoginPage = pathname === `/${staffPrefix}/login`;

  // Protect staff routes: redirect unauthenticated or non-staff users
  useEffect(() => {
    if (isLoading || isLoginPage) return;

    if (!isAuthenticated || !user) {
      router.push(`/${staffPrefix}/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    if (user.role !== 'BAKERY_ADMIN' && user.role !== 'BAKERY_MANAGER') {
      router.push('/');
    }
  }, [isLoading, isAuthenticated, user, isLoginPage, pathname, router, staffPrefix]);

  // Polling for real-time notifications
  useEffect(() => {
    if (!isAuthenticated || isLoginPage || (role !== 'BAKERY_ADMIN' && role !== 'BAKERY_MANAGER')) {
      return;
    }

    let isMounted = true;
    let prevLatestId: string | null = null;

    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem('bakeconnect_token_v1');
        if (!token) return;

        const res = await fetch(`${getApiBase()}/api/v1/manager/notifications/recent`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(5000),
        });

        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.success && Array.isArray(data.data)) {
            const list: StaffNotification[] = data.data;
            setNotifications(list);
            const unread = list.filter((n) => !n.isRead).length;
            setUnreadCount(unread);

            // Trigger toaster on newly arrived notification
            if (list.length > 0 && prevLatestId && list[0].id !== prevLatestId && !list[0].isRead) {
              setNewOrderToast(list[0]);
              setTimeout(() => {
                if (isMounted) setNewOrderToast(null);
              }, 6000);
            }
            if (list.length > 0) {
              prevLatestId = list[0].id;
            }
          }
        }
      } catch (err) {
        // Ignore polling errors
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 8000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isAuthenticated, role, isLoginPage]);

  const markAllRead = async () => {
    try {
      const token = localStorage.getItem('bakeconnect_token_v1');
      if (!token) return;

      await fetch(`${getApiBase()}/api/v1/manager/notifications/mark-all-read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(5000),
      });

      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // Ignore
    }
  };

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2] text-[#342421]">
      {/* Real-time Toast Alert */}
      {newOrderToast && (
        <div className="fixed top-5 right-5 z-50 max-w-sm bg-[#342421] text-white p-4 rounded-2xl border-2 border-[#FF7836] shadow-[4px_4px_0px_#FF7836] animate-bounce">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF7836] animate-ping" />
              <h4 className="font-bold text-xs uppercase tracking-wider text-[#FF7836]">
                {newOrderToast.title}
              </h4>
            </div>
            <button
              onClick={() => setNewOrderToast(null)}
              className="text-white/60 hover:text-white text-xs font-bold"
            >
              ✕
            </button>
          </div>
          <p className="text-xs text-white/90 mt-1.5 font-medium">{newOrderToast.message}</p>
        </div>
      )}

      {/* Staff Master Header */}
      <header className="sticky top-0 z-40 bg-[#342421] text-white border-b-2 border-[#1E1412] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Emblem & Workspace Identifier */}
            <div className="flex items-center gap-3">
              <Link href={`/${staffPrefix}/bakery-manager`} className="flex items-center gap-3 group">
                <div className="relative w-9 h-9 rounded-xl bg-white border-2 border-[#FF7836] p-1 flex items-center justify-center">
                  <Image
                    src="/images/logo-icon.png"
                    alt="BakeConnect Staff"
                    width={32}
                    height={32}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display uppercase text-lg tracking-wider text-white">
                      Bake<span className="text-[#FF7836]">Connect</span>
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-[#FF7836] text-[#342421] px-2 py-0.5 rounded-full">
                      Staff Deck
                    </span>
                  </div>
                  <span className="text-[10px] text-white/60 block font-semibold">
                    Koregaon Park, Pune • Asia/Kolkata
                  </span>
                </div>
              </Link>
            </div>

            {/* Center: Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 bg-white/10 p-1 rounded-full border border-white/15 text-xs font-bold uppercase tracking-wider">
              <Link
                href={`/${staffPrefix}/bakery-manager`}
                className={`px-4 py-1.5 rounded-full transition-all ${
                  pathname.includes('/bakery-manager')
                    ? 'bg-[#FF7836] text-[#342421] shadow-xs'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                Fulfillment Deck
              </Link>
              {role === 'BAKERY_ADMIN' && (
                <Link
                  href={`/${staffPrefix}/admin`}
                  className={`px-4 py-1.5 rounded-full transition-all ${
                    pathname === `/${staffPrefix}/admin`
                      ? 'bg-white text-[#342421] shadow-xs'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Admin Analytics & Approvals
                </Link>
              )}
            </nav>

            {/* Right: Notifications, User Pill & Logout */}
            <div className="flex items-center gap-3">
              {/* Notification Inbox Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Staff notification inbox"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-[#FF7836] text-[#342421] text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-[#342421]">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown Drawer */}
                {showNotifications && (
                  <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-[#FFF7EB] text-[#342421] rounded-2xl border-2 border-[#342421] shadow-[5px_5px_0px_#342421] overflow-hidden z-50">
                    <div className="p-3.5 bg-white border-b-2 border-[#342421]/15 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-[#FF7836]" />
                        <span className="text-xs font-bold uppercase tracking-wider text-[#342421]">
                          Staff Notifications ({unreadCount} unread)
                        </span>
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllRead}
                          className="text-[11px] font-bold text-[#FF7836] hover:underline"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-[#342421]/10">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-xs text-[#342421]/60 font-semibold">
                          No notifications in inbox
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            className={`p-3 text-xs transition-colors ${
                              n.isRead ? 'bg-[#FFF7EB]' : 'bg-[#D9EAF3]/50 font-semibold'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="font-bold text-[#342421]">{n.title}</span>
                              <span className="text-[10px] text-[#342421]/50 font-normal">
                                {new Date(n.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <p className="text-[#342421]/80 text-[11px] leading-relaxed">
                              {n.message}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Pill */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/20 text-xs">
                {role === 'BAKERY_ADMIN' ? (
                  <Shield className="w-3.5 h-3.5 text-[#FF7836]" />
                ) : (
                  <ChefHat className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span className="font-bold text-white text-[11px]">
                  {user?.fullName || 'Bakery Staff'}
                </span>
                <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-black/40 text-white/80">
                  {role === 'BAKERY_ADMIN' ? 'Admin' : 'Manager'}
                </span>
              </div>

              {/* Sign out */}
              <button
                onClick={logout}
                className="p-2 text-white/70 hover:text-rose-400 hover:bg-white/10 rounded-full transition-colors"
                title="Sign out of staff workspace"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
